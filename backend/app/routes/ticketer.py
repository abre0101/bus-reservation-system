from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import mongo
from datetime import datetime, timedelta
import random
from bson import ObjectId
import json
import requests
import os

ticketer_bp = Blueprint('ticketer', __name__)

# Helper function to serialize ObjectId
def serialize_doc(doc):
    if not doc:
        return doc
    
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    
    # Serialize all ObjectId fields that might exist
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, ObjectId):
                    value[i] = str(item)
        elif isinstance(value, datetime):
            doc[key] = value.isoformat()
    
    return doc

def validate_booking_data(data):
    """Validate booking data before processing"""
    errors = []
    
    required_fields = ['schedule_id', 'passenger_name', 'passenger_phone', 'seat_numbers']
    for field in required_fields:
        if not data.get(field):
            errors.append(f"Missing required field: {field}")
    
    # Validate seat_numbers
    if data.get('seat_numbers'):
        seat_numbers = data['seat_numbers']
        if not isinstance(seat_numbers, list):
            errors.append("seat_numbers must be an array")
        elif len(seat_numbers) == 0:
            errors.append("At least one seat must be selected")
    
    # Validate phone number format
    phone = data.get('passenger_phone', '')
    if phone and len(phone) < 9:
        errors.append("Phone number must be at least 9 digits")
    
    return errors

# ==================== DASHBOARD ENDPOINTS ====================

@ticketer_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_ticketer_dashboard_stats():
    try:
        # Get current ticketer from JWT
        current_user_id = get_jwt_identity()
        
        today = datetime.now().date()
        today_str = today.isoformat()
        today_datetime = datetime.combine(today, datetime.min.time())
        tomorrow_datetime = today_datetime + timedelta(days=1)
        
        print(f"📊 Ticketer dashboard stats for {today_str} - Ticketer ID: {current_user_id}")
        
        # Pending check-ins (confirmed bookings for today created by THIS ticketer)
        pending_checkins = mongo.db.bookings.count_documents({
            'travel_date': today_str,
            'status': 'confirmed',
            'created_by': current_user_id  # Filter by ticketer
        })
        
        print(f"⏳ Pending check-ins (by this ticketer): {pending_checkins}")

        # Today's revenue - from bookings CREATED today by THIS ticketer
        today_bookings_list = list(mongo.db.bookings.find({
            'created_at': {'$gte': today_datetime, '$lt': tomorrow_datetime},
            'created_by': current_user_id  # Filter by ticketer
        }))
        
        # Calculate revenue (full amount for non-cancelled, cancellation fee for cancelled)
        today_revenue = 0
        for booking in today_bookings_list:
            if booking.get('status') == 'cancelled':
                today_revenue += booking.get('cancellation_fee', 0)
            else:
                today_revenue += booking.get('total_amount', 0)
        
        print(f"💰 Today's revenue (by this ticketer): ETB {today_revenue}")

        # Today's bookings count - bookings CREATED today by THIS ticketer
        today_bookings = len([b for b in today_bookings_list if b.get('status') != 'cancelled'])
        
        print(f"🎫 Today's bookings (by this ticketer): {today_bookings}")

        # Active schedules - ALL upcoming schedules (today and future) - this can remain global
        active_schedules = mongo.db.busschedules.count_documents({
            'departure_date': {'$gte': today_str},
            'status': {'$in': ['scheduled', 'boarding', 'departed', 'active']}
        })
        
        print(f"🚌 Active schedules (upcoming): {active_schedules}")

        return jsonify({
            'success': True,
            'stats': {
                'pendingCheckins': pending_checkins,
                'todayRevenue': today_revenue,
                'todayBookings': today_bookings,
                'activeSchedules': active_schedules
            }
        }), 200

    except Exception as e:
        print(f"❌ Ticketer dashboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== SCHEDULE MANAGEMENT ====================

@ticketer_bp.route('/schedules', methods=['GET'])
def get_schedules():
    try:
        date_str = request.args.get('date')
        status = request.args.get('status')
        
        query = {}
        
        # Date filtering
        if date_str:
            # Specific date requested
            query['departure_date'] = date_str
        else:
            # No date specified - show all upcoming schedules (today and future)
            from datetime import datetime
            today = datetime.now().strftime('%Y-%m-%d')
            query['departure_date'] = {'$gte': today}
            
        # Status filtering
        if status and status != 'all':
            query['status'] = status
        else:
            # Default to active trips (scheduled + boarding + departed + active)
            query['status'] = {'$in': ['scheduled', 'boarding', 'departed', 'active']}
        
        print(f"🔍 Ticketer schedules query: {query}")
        schedules = list(mongo.db.busschedules.find(query).sort([('departure_date', 1), ('departure_time', 1)]))
        print(f"📊 Found {len(schedules)} schedules")
        
        schedules_data = []
        for schedule in schedules:
            schedule_data = serialize_doc(schedule)
            
            # Calculate actual booked seats from bookings
            # The schedule_id in bookings is stored as ObjectId, so we need to use the ObjectId directly
            from bson import ObjectId
            
            schedule_id_str = str(schedule['_id'])
            
            print(f"  🔍 Checking bookings for schedule: {schedule_id_str}")
            
            # Try with string format first
            booked_seats_count = mongo.db.bookings.count_documents({
                'schedule_id': schedule_id_str,
                'status': {'$nin': ['cancelled', 'refunded']}
            })
            
            print(f"     String format: {booked_seats_count} bookings")
            
            # If no bookings found with string, try ObjectId format
            if booked_seats_count == 0:
                try:
                    schedule_id_obj = ObjectId(schedule_id_str)
                    booked_seats_count = mongo.db.bookings.count_documents({
                        'schedule_id': schedule_id_obj,
                        'status': {'$nin': ['cancelled', 'refunded']}
                    })
                    print(f"     ObjectId format: {booked_seats_count} bookings")
                except Exception as e:
                    print(f"     Error trying ObjectId: {e}")
            
            print(f"  ✅ Total booked seats: {booked_seats_count}")
            
            # Get route information
            route = None
            if schedule.get('route_id'):
                route = mongo.db.routes.find_one({'_id': ObjectId(schedule['route_id'])})
            
            # Get bus information
            bus = None
            if schedule.get('bus_id'):
                bus = mongo.db.buses.find_one({'_id': ObjectId(schedule['bus_id'])})
            
            # Enrich schedule data
            schedule_data.update({
                'booked_seats': booked_seats_count,
                'available_seats': schedule.get('total_seats', 0) - booked_seats_count,
                'route_name': schedule.get('route_name', 'Unknown Route'),
                'origin_city': schedule.get('origin_city', 'Unknown'),
                'destination_city': schedule.get('destination_city', 'Unknown'),
                'bus_number': schedule.get('bus_number', 'Unknown'),
                'bus_type': schedule.get('bus_type', 'standard'),
                'fare_birr': schedule.get('fare_birr', 0)
            })
            
            # Add route details if available
            if route:
                distance = route.get('distance_km') or route.get('distanceKm') or route.get('distance')
                duration_hours = route.get('estimated_duration_hours') or route.get('estimatedDurationHours') or route.get('duration')
                
                schedule_data.update({
                    'distance_km': distance,
                    'duration': f"{duration_hours} hours" if duration_hours else None,
                    'route_description': route.get('description', '')
                })
            
            # Add bus details if available
            if bus:
                schedule_data.update({
                    'bus': {
                        'name': bus.get('name', bus.get('bus_number')),
                        'number': bus.get('bus_number', bus.get('number')),
                        'type': bus.get('type', 'standard'),
                        'capacity': bus.get('capacity', schedule.get('total_seats', 45))
                    }
                })
            
            schedules_data.append(schedule_data)
        
        print(f"✅ Returning {len(schedules_data)} schedules to ticketer")
        if schedules_data:
            print(f"📋 Sample schedule: {schedules_data[0].get('route_name')} on {schedules_data[0].get('departure_date')}")
        
        return jsonify({
            'success': True,
            'schedules': schedules_data,
            'total': len(schedules_data)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in ticketer get_schedules: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/schedules/<string:schedule_id>/occupied-seats', methods=['GET'])
def get_occupied_seats(schedule_id):
    try:
        print(f"🔍 Looking for bookings with schedule_id: {schedule_id}")
        
        # Try both string and ObjectId formats
        from bson import ObjectId
        
        # First try as string (most common)
        bookings = list(mongo.db.bookings.find({
            'schedule_id': schedule_id,
            'status': {'$nin': ['cancelled', 'refunded']}
        }))
        
        print(f"📊 Found {len(bookings)} bookings using string format")
        
        # If no bookings found, try with ObjectId
        if len(bookings) == 0:
            try:
                bookings = list(mongo.db.bookings.find({
                    'schedule_id': ObjectId(schedule_id),
                    'status': {'$nin': ['cancelled', 'refunded']}
                }))
                print(f"📊 Found {len(bookings)} bookings using ObjectId format")
            except Exception as e:
                print(f"⚠️ Could not try ObjectId format: {e}")
        
        # Extract all seat numbers from bookings
        occupied_seats = []
        for booking in bookings:
            if 'seat_numbers' in booking and isinstance(booking['seat_numbers'], list):
                occupied_seats.extend(booking['seat_numbers'])
            elif 'seat_number' in booking:
                occupied_seats.append(booking['seat_number'])
        
        print(f"🪑 Occupied seats: {occupied_seats}")
        
        return jsonify({
            'success': True,
            'occupiedSeats': occupied_seats
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting occupied seats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== ROUTE MANAGEMENT ====================

@ticketer_bp.route('/routes', methods=['GET'])
def get_routes():
    try:
        routes = list(mongo.db.routes.find({'is_active': True}))
        routes_data = [serialize_doc(route) for route in routes]
            
        return jsonify({
            'success': True,
            'routes': routes_data
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== QUICK BOOKING ====================

@ticketer_bp.route('/quick-booking', methods=['POST'])
@jwt_required()
def create_quick_booking():
    try:
        # Get current ticketer user ID
        current_ticketer_id = get_jwt_identity()
        
        data = request.get_json()
        
        # Validate booking data
        validation_errors = validate_booking_data(data)
        if validation_errors:
            return jsonify({
                'success': False, 
                'error': ', '.join(validation_errors)
            }), 400

        # Check if schedule exists
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(data['schedule_id'])})
        if not schedule:
            return jsonify({'success': False, 'error': 'Schedule not found'}), 404

        # Process seat numbers - ensure it's a list
        seat_numbers = data['seat_numbers']
        if not isinstance(seat_numbers, list):
            seat_numbers = [seat_numbers]

        # Check if seats are available
        for seat in seat_numbers:
            existing_booking = mongo.db.bookings.find_one({
                'schedule_id': data['schedule_id'],
                '$or': [
                    {'seat_numbers': seat},
                    {'seat_number': seat}
                ],
                'status': {'$in': ['confirmed', 'checked_in']}
            })
            
            if existing_booking:
                return jsonify({
                    'success': False, 
                    'error': f'Seat {seat} is already occupied'
                }), 400

        # Generate PNR
        pnr_number = f"ETB{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"

        # Calculate total amount
        num_seats = len(seat_numbers)
        base_fare = schedule.get('fare_birr', 0)
        total_amount = base_fare * num_seats

        # Add baggage fee if applicable
        baggage_fee = 0
        if data.get('has_baggage', False):
            baggage_weight = data.get('baggage_weight', 0)
            if baggage_weight <= 15:
                baggage_fee = 0
            elif baggage_weight <= 25:
                baggage_fee = 50
            elif baggage_weight <= 35:
                baggage_fee = 100
            else:
                baggage_fee = 150
            total_amount += baggage_fee

        # Try to find user_id by phone/email if not provided
        user_id = data.get('user_id')
        if not user_id:
            # Try to find existing customer by phone or email
            user = find_user_by_contact(
                data.get('passenger_phone'),
                data.get('passenger_email')
            )
            if user:
                user_id = user['_id']
                print(f"✅ Linked booking to existing customer: {user.get('name')} ({user_id})")
            else:
                print(f"ℹ️  No existing customer found for phone/email - booking will be unlinked")
        
        # Create booking document matching your data structure
        booking_data = {
            'pnr_number': pnr_number,
            'schedule_id': data['schedule_id'],
            'user_id': user_id,  # Now properly linked to customer if found
            'passenger_name': data['passenger_name'],
            'passenger_phone': data['passenger_phone'],
            'passenger_email': data.get('passenger_email'),
            'seat_numbers': seat_numbers,
            'seat_number': seat_numbers[0],  # For compatibility
            'num_seats': num_seats,
            'total_amount': total_amount,
            'base_fare': base_fare,
            'status': 'confirmed',
            'departure_city': schedule.get('origin_city'),
            'arrival_city': schedule.get('destination_city'),
            'travel_date': schedule.get('departure_date'),
            'departure_time': schedule.get('departure_time'),
            'arrival_time': schedule.get('arrival_time'),
            'payment_status': 'paid',
            'payment_method': data.get('payment_method', 'cash'),
            'bus_type': schedule.get('bus_type'),
            'bus_number': schedule.get('bus_number'),
            'has_baggage': data.get('has_baggage', False),
            'baggage_weight': data.get('baggage_weight', 0),
            'baggage_fee': baggage_fee,
            'bus_company': 'EthioBus',
            'checked_in': False,
            # NEW: Track who created this booking
            'created_by': current_ticketer_id,  # Use created_by to match dashboard stats query
            'booked_by': current_ticketer_id,   # Keep for compatibility
            'booking_source': 'counter',  # counter = ticketer, online = customer portal
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }

        # Insert booking
        result = mongo.db.bookings.insert_one(booking_data)
        booking_id = result.inserted_id

        # Create payment record
        payment_data = {
            'booking_id': str(booking_id),
            'user_id': data.get('user_id'),
            'amount': total_amount,
            'currency': 'ETB',
            'payment_method': data.get('payment_method', 'cash'),
            'status': 'success',
            'tx_ref': f"ethiobus-{int(datetime.now().timestamp())}{random.randint(100, 999)}",
            'booking_created': True,
            # NEW: Track who processed this payment
            'processed_by': current_ticketer_id,
            'booking_source': 'counter',
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        mongo.db.payments.insert_one(payment_data)

        # Update schedule booked seats count
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(data['schedule_id'])},
            {
                '$inc': {
                    'booked_seats': num_seats,
                    'available_seats': -num_seats
                }
            }
        )

        # Get enriched booking data for response
        enriched_booking = serialize_doc(booking_data)
        enriched_booking['_id'] = str(booking_id)

        return jsonify({
            'success': True,
            'message': 'Booking created successfully',
            'booking': enriched_booking,
            'pnr': pnr_number
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== CHECK-IN MANAGEMENT ====================

@ticketer_bp.route('/checkins/pending', methods=['GET'])
def get_pending_checkins():
    try:
        date_str = request.args.get('date', datetime.now().date().isoformat())
        
        # Get pending check-ins for the date
        pending_bookings = list(mongo.db.bookings.find({
            'travel_date': date_str,
            'status': 'confirmed'
        }).sort('departure_time', 1))

        # Enrich booking data with schedule information
        bookings_data = []
        for booking in pending_bookings:
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(booking['schedule_id'])})
            
            booking_data = serialize_doc(booking)
            if schedule:
                booking_data.update({
                    'bus_number': schedule.get('bus_number', 'Unknown'),
                    'bus_type': schedule.get('bus_type', 'standard'),
                    'departure_time': schedule.get('departure_time', ''),
                    'origin_city': schedule.get('origin_city', ''),
                    'destination_city': schedule.get('destination_city', ''),
                    'driver_name': schedule.get('driver_name', '')
                })
            
            bookings_data.append(booking_data)

        return jsonify({
            'success': True,
            'bookings': bookings_data
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/checkins/completed', methods=['GET'])
def get_checked_in_passengers():
    try:
        date_str = request.args.get('date', datetime.now().date().isoformat())
        
        # Get checked-in passengers for the date
        checked_in_bookings = list(mongo.db.bookings.find({
            'travel_date': date_str,
            'status': 'checked_in'
        }).sort('checked_in_at', -1))

        # Enrich booking data
        bookings_data = []
        for booking in checked_in_bookings:
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(booking['schedule_id'])})
            
            booking_data = serialize_doc(booking)
            if schedule:
                booking_data.update({
                    'bus_number': schedule.get('bus_number', 'Unknown'),
                    'bus_type': schedule.get('bus_type', 'standard'),
                    'departure_time': schedule.get('departure_time', ''),
                    'origin_city': schedule.get('origin_city', ''),
                    'destination_city': schedule.get('destination_city', ''),
                    'driver_name': schedule.get('driver_name', '')
                })
            
            bookings_data.append(booking_data)

        return jsonify({
            'success': True,
            'bookings': bookings_data
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/checkin/<string:booking_id>', methods=['POST'])
def checkin_passenger(booking_id):
    try:
        booking = mongo.db.bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'success': False, 'error': 'Booking not found'}), 404
        
        if booking.get('status') != 'confirmed':
            return jsonify({'success': False, 'error': 'Booking is not in confirmed status'}), 400
        
        # Update booking status to checked_in
        update_data = {
            'status': 'checked_in',
            'checked_in': True,
            'checked_in_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        # Add checked_in_by if user context is available
        if hasattr(request, 'user_id'):
            update_data['checked_in_by'] = request.user_id
        
        mongo.db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': update_data}
        )
        
        return jsonify({
            'success': True, 
            'message': 'Passenger checked in successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/checkin/bulk', methods=['POST'])
def bulk_checkin():
    try:
        data = request.get_json()
        booking_ids = data.get('booking_ids', [])
        
        if not booking_ids:
            return jsonify({'success': False, 'error': 'No booking IDs provided'}), 400
        
        # Convert string IDs to ObjectId
        object_ids = [ObjectId(bid) for bid in booking_ids]
        
        # Bulk update only confirmed bookings
        result = mongo.db.bookings.update_many(
            {
                '_id': {'$in': object_ids},
                'status': 'confirmed'
            },
            {
                '$set': {
                    'status': 'checked_in',
                    'checked_in': True,
                    'checked_in_at': datetime.now(),
                    'updated_at': datetime.now()
                }
            }
        )
        
        return jsonify({
            'success': True, 
            'message': f'{result.modified_count} passengers checked in successfully',
            'checked_in_count': result.modified_count
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/noshow/<string:booking_id>', methods=['POST'])
def mark_no_show(booking_id):
    try:
        booking = mongo.db.bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'success': False, 'error': 'Booking not found'}), 404
        
        # Update booking status to no_show
        mongo.db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {
                '$set': {
                    'status': 'no_show',
                    'updated_at': datetime.now()
                }
            }
        )
        
        return jsonify({
            'success': True, 
            'message': 'Marked as no-show successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== BOOKING LOOKUP ====================

@ticketer_bp.route('/booking/pnr/<string:pnr>', methods=['GET'])
def get_booking_by_pnr(pnr):
    try:
        booking = mongo.db.bookings.find_one({'pnr_number': pnr})
        if not booking:
            return jsonify({'success': False, 'error': 'Booking not found'}), 404

        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(booking['schedule_id'])})

        booking_data = serialize_doc(booking)
        
        # Add schedule information
        if schedule:
            booking_data['schedule'] = serialize_doc(schedule)

        return jsonify({
            'success': True,
            'booking': booking_data
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/booking/phone/<string:phone>', methods=['GET'])
def get_bookings_by_phone(phone):
    try:
        # Search by passenger_phone (for walk-in customers) or user phone
        bookings = list(mongo.db.bookings.find({
            '$or': [
                {'passenger_phone': phone},
                {'user.phone': phone},
                {'user.phone_number': phone}
            ]
        }).sort('created_at', -1).limit(20))
        
        bookings_data = []
        for booking in bookings:
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(booking['schedule_id'])})

            booking_data = serialize_doc(booking)
            
            if schedule:
                booking_data['schedule'] = serialize_doc(schedule)
            
            bookings_data.append(booking_data)

        return jsonify({
            'success': True,
            'bookings': bookings_data
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== CUSTOMER MANAGEMENT ====================

def normalize_phone(phone):
    """Normalize phone number for matching - remove country code and special characters"""
    if not phone:
        return None
    # Remove +, spaces, and hyphens
    normalized = phone.replace('+', '').replace(' ', '').replace('-', '')
    # Remove country code 251 if present
    if normalized.startswith('251'):
        normalized = '0' + normalized[3:]
    return normalized

def find_user_by_contact(phone, email):
    """Find user by phone or email, trying multiple phone formats"""
    if not phone and not email:
        return None
    
    match_conditions = []
    
    # Match by email
    if email:
        match_conditions.append({'email': email})
    
    # Match by phone (multiple formats)
    if phone:
        # Normalize to format without country code
        normalized_phone = normalize_phone(phone)
        if normalized_phone:
            match_conditions.append({'phone': normalized_phone})
        
        # Also try original format
        match_conditions.append({'phone': phone})
    
    if not match_conditions:
        return None
    
    # Find user
    user = mongo.db.users.find_one({
        '$or': match_conditions,
        'role': 'customer',
        'is_active': True
    })
    
    return user

@ticketer_bp.route('/customers', methods=['GET'])
def get_customers():
    try:
        # Get registered customers from users collection
        customers = list(mongo.db.users.find({
            'role': 'customer',
            'is_active': True
        }).sort('created_at', -1))

        customers_data = []
        for customer in customers:
            customer_data = serialize_doc(customer)
            customer_id = customer['_id']
            
            # PRIMARY: Match by user_id (this should be the main way after migration)
            # FALLBACK: Also match by phone/email for bookings not yet migrated
            match_conditions = [
                {'user_id': customer_id},  # ObjectId format (PRIMARY)
                {'user_id': str(customer_id)}  # String format (legacy)
            ]
            
            # Fallback matching for unmigrated bookings
            customer_phone = customer.get('phone')
            customer_email = customer.get('email')
            
            if customer_phone:
                # Normalize phone and try all Ethiopian formats
                normalized_phone = customer_phone.strip()
                match_conditions.append({'passenger_phone': normalized_phone})
                
                # Handle Ethiopian phone formats
                if normalized_phone.startswith('0'):
                    # 0900469816 -> +251900469816, 251900469816
                    match_conditions.append({'passenger_phone': '+251' + normalized_phone[1:]})
                    match_conditions.append({'passenger_phone': '251' + normalized_phone[1:]})
                elif normalized_phone.startswith('251'):
                    # 251900469816 -> +251900469816, 0900469816
                    match_conditions.append({'passenger_phone': '+' + normalized_phone})
                    match_conditions.append({'passenger_phone': '0' + normalized_phone[3:]})
                elif normalized_phone.startswith('+251'):
                    # +251900469816 -> 251900469816, 0900469816
                    match_conditions.append({'passenger_phone': normalized_phone[1:]})
                    match_conditions.append({'passenger_phone': '0' + normalized_phone[4:]})
            
            if customer_email:
                match_conditions.append({'passenger_email': customer_email})
            
            match_query = {'$or': match_conditions}
            
            # Find all matching bookings directly (simpler and more reliable than aggregation)
            all_bookings = list(mongo.db.bookings.find(match_query))
            
            # Debug logging
            if len(all_bookings) > 0:
                print(f"✅ Customer {customer.get('name')}: Found {len(all_bookings)} bookings")
            
            # Calculate stats from the found bookings
            total_bookings = len(all_bookings)
            last_booking = max([b.get('created_at') or b.get('booked_at') for b in all_bookings], default=None) if all_bookings else None
            total_spent = sum([b.get('total_amount', 0) for b in all_bookings if b.get('status') != 'cancelled'])
            
            # Calculate completed trips (past travel dates with confirmed/completed status)
            from datetime import datetime
            current_time = datetime.utcnow()
            completed_trips = 0
            for booking in all_bookings:
                if booking.get('status') in ['confirmed', 'completed', 'checked_in']:
                    travel_date = booking.get('travel_date') or booking.get('departure_date')
                    if travel_date:
                        try:
                            if isinstance(travel_date, str):
                                travel_date = datetime.fromisoformat(travel_date.replace('Z', '+00:00'))
                            if travel_date < current_time:
                                completed_trips += 1
                        except:
                            pass
            
            # Loyalty points calculation: (total_bookings * 100) + (completed_trips * 50)
            loyalty_points = (total_bookings * 100) + (completed_trips * 50)
            
            customer_data['booking_count'] = total_bookings
            customer_data['completed_trips'] = completed_trips
            customer_data['loyalty_points'] = loyalty_points
            customer_data['last_booking'] = last_booking
            customer_data['total_spent'] = total_spent
            
            customers_data.append(customer_data)

        return jsonify({
            'success': True,
            'customers': customers_data
        }), 200

    except Exception as e:
        print(f"❌ Error in get_customers: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/customer/<string:customer_id>/bookings', methods=['GET'])
@ticketer_bp.route('/customer/id/<string:customer_id>/bookings', methods=['GET'])
def get_customer_bookings(customer_id):
    try:
        # Get customer info
        customer = None
        try:
            customer = mongo.db.users.find_one({'_id': ObjectId(customer_id)})
        except:
            pass
        
        # PRIMARY: Match by user_id
        match_conditions = []
        
        try:
            if len(customer_id) == 24:
                match_conditions.append({'user_id': ObjectId(customer_id)})
                match_conditions.append({'user_id': customer_id})  # String format (legacy)
        except:
            pass
        
        # FALLBACK: Match by phone/email for unmigrated bookings
        if customer:
            customer_phone = customer.get('phone')
            customer_email = customer.get('email')
            
            if customer_phone:
                # Normalize phone and try all Ethiopian formats
                normalized_phone = customer_phone.strip()
                match_conditions.append({'passenger_phone': normalized_phone})
                
                # Handle Ethiopian phone formats
                if normalized_phone.startswith('0'):
                    # 0900469816 -> +251900469816, 251900469816
                    match_conditions.append({'passenger_phone': '+251' + normalized_phone[1:]})
                    match_conditions.append({'passenger_phone': '251' + normalized_phone[1:]})
                elif normalized_phone.startswith('251'):
                    # 251900469816 -> +251900469816, 0900469816
                    match_conditions.append({'passenger_phone': '+' + normalized_phone})
                    match_conditions.append({'passenger_phone': '0' + normalized_phone[3:]})
                elif normalized_phone.startswith('+251'):
                    # +251900469816 -> 251900469816, 0900469816
                    match_conditions.append({'passenger_phone': normalized_phone[1:]})
                    match_conditions.append({'passenger_phone': '0' + normalized_phone[4:]})
            
            if customer_email:
                match_conditions.append({'passenger_email': customer_email})
        
        match_query = {'$or': match_conditions} if match_conditions else {}
        
        # Fetch bookings
        bookings = list(mongo.db.bookings.find(match_query).sort('created_at', -1).limit(50))
        
        bookings_data = []
        for booking in bookings:
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(booking['schedule_id'])})

            booking_data = serialize_doc(booking)
            
            if schedule:
                booking_data['schedule'] = serialize_doc(schedule)
            
            bookings_data.append(booking_data)

        return jsonify({
            'success': True,
            'bookings': bookings_data
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== POINT OF SALE ====================



@ticketer_bp.route('/pos/cash-drawer', methods=['GET'])
def get_cash_drawer():
    try:
        today = datetime.now().date()
        
        # Get or create cash drawer record for today
        cash_drawer = mongo.db.cash_drawers.find_one({
            'date': today.isoformat()
        })
        
        if not cash_drawer:
            # No drawer exists - create a closed one
            cash_drawer = {
                'date': today.isoformat(),
                'opening_balance': 0,
                'current_balance': 0,
                'total_sales': 0,
                'total_cash': 0,
                'total_chapa': 0,
                'tickets_sold': 0,
                'status': 'closed',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            result = mongo.db.cash_drawers.insert_one(cash_drawer)
            cash_drawer['_id'] = result.inserted_id
        else:
            # Drawer exists - calculate current session sales if open
            if cash_drawer.get('status') == 'open':
                from flask_jwt_extended import get_jwt_identity
                
                opened_at = cash_drawer.get('opened_at', datetime.combine(today, datetime.min.time()))
                
                # Get current ticketer user ID
                try:
                    current_ticketer_id = get_jwt_identity()
                except:
                    current_ticketer_id = None
                
                # Build query for ticketer's counter sales only
                session_query = {
                    'created_at': {'$gte': opened_at},
                    'status': 'success',
                    'booking_source': 'counter'  # NEW: Only counter sales
                }
                
                # NEW: Filter by current ticketer if available
                if current_ticketer_id:
                    session_query['processed_by'] = current_ticketer_id
                
                # Get all payments made during this drawer session by this ticketer
                session_payments = list(mongo.db.payments.find(session_query))
                
                # Calculate totals
                total_sales = sum(p.get('amount', 0) for p in session_payments)
                total_cash = sum(p.get('amount', 0) for p in session_payments if p.get('payment_method') == 'cash')
                total_chapa = sum(p.get('amount', 0) for p in session_payments if p.get('payment_method') == 'chapa')
                tickets_sold = len(session_payments)
                
                current_balance = cash_drawer.get('opening_balance', 0) + total_cash
                
                # Update drawer with current session data
                mongo.db.cash_drawers.update_one(
                    {'_id': cash_drawer['_id']},
                    {
                        '$set': {
                            'current_balance': current_balance,
                            'total_sales': total_sales,
                            'total_cash': total_cash,
                            'total_chapa': total_chapa,
                            'tickets_sold': tickets_sold,
                            'updated_at': datetime.now()
                        }
                    }
                )
                
                cash_drawer['current_balance'] = current_balance
                cash_drawer['total_sales'] = total_sales
                cash_drawer['total_cash'] = total_cash
                cash_drawer['total_chapa'] = total_chapa
                cash_drawer['tickets_sold'] = tickets_sold

        cash_drawer_data = serialize_doc(cash_drawer)

        return jsonify({
            'success': True,
            'cashDrawer': cash_drawer_data
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/pos/sales-stats', methods=['GET'])
def get_sales_stats():
    try:
        from flask_jwt_extended import get_jwt_identity
        
        date_str = request.args.get('date', datetime.now().date().isoformat())
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Get current ticketer user ID
        try:
            current_ticketer_id = get_jwt_identity()
        except:
            current_ticketer_id = None
        
        # Build query for ticketer's counter sales only
        query = {
            'created_at': {
                '$gte': datetime.combine(target_date, datetime.min.time()),
                '$lt': datetime.combine(target_date, datetime.min.time()) + timedelta(days=1)
            },
            'status': 'success',
            'booking_source': 'counter'  # NEW: Only counter sales
        }
        
        # NEW: Filter by current ticketer if available
        if current_ticketer_id:
            query['processed_by'] = current_ticketer_id
        
        # Get payments for the target date
        payments = list(mongo.db.payments.find(query))

        total_sales = sum(payment.get('amount', 0) for payment in payments)
        transaction_count = len(payments)
        average_ticket = total_sales / transaction_count if transaction_count > 0 else 0

        # Calculate sales by payment method
        cash_sales = sum(p.get('amount', 0) for p in payments if p.get('payment_method') == 'cash')
        chapa_sales = sum(p.get('amount', 0) for p in payments if p.get('payment_method') == 'chapa')
        telebirr_sales = sum(p.get('amount', 0) for p in payments if p.get('payment_method') == 'telebirr')
        bank_sales = sum(p.get('amount', 0) for p in payments if p.get('payment_method') == 'bank')

        return jsonify({
            'success': True,
            'stats': {
                'totalSales': total_sales,
                'transactionCount': transaction_count,
                'averageTicket': round(average_ticket, 2),
                'cashSales': cash_sales,
                'chapaSales': chapa_sales,
                'telebirrSales': telebirr_sales,
                'bankSales': bank_sales
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== BOOKING MANAGEMENT ====================

@ticketer_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_bookings():
    try:
        # Get current ticketer from JWT
        current_user_id = get_jwt_identity()
        
        status = request.args.get('status', 'all')
        date_str = request.args.get('date')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        # Filter by ticketer who created the booking
        query = {'created_by': current_user_id}
        
        if status != 'all':
            query['status'] = status
        if date_str:
            query['travel_date'] = date_str
        
        print(f"📋 Fetching bookings for ticketer {current_user_id} with query: {query}")
            
        bookings = list(mongo.db.bookings.find(query).sort('created_at', -1).skip(skip).limit(limit))
        total = mongo.db.bookings.count_documents(query)
        
        print(f"📊 Found {total} bookings for this ticketer")
        
        bookings_data = []
        for booking in bookings:
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(booking['schedule_id'])})

            booking_data = serialize_doc(booking)
            
            if schedule:
                booking_data['schedule'] = serialize_doc(schedule)
            
            bookings_data.append(booking_data)
            
        return jsonify({
            'success': True,
            'bookings': bookings_data,
            'total': total,
            'page': page,
            'limit': limit,
            'totalPages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== PAYMENT PROCESSING ====================

CHAPA_SECRET_KEY = os.getenv('CHAPA_SECRET_KEY', 'CHASECK_TEST-61ABYtRCc61QcUHX8YSgF3JdvJJTaJ6T')
CHAPA_BASE_URL = os.getenv('CHAPA_BASE_URL', 'https://api.chapa.co/v1')

@ticketer_bp.route('/payments/methods', methods=['GET'])
def get_payment_methods():
    """Get available payment methods"""
    payment_methods = [
        {
            'id': 'cash',
            'name': 'Cash',
            'description': 'Pay with cash at the station',
            'icon': '💵',
            'enabled': True
        },
        {
            'id': 'chapa',
            'name': 'Chapa',
            'description': 'Secure online payment',
            'icon': '🔒',
            'enabled': True
        },
        {
            'id': 'telebirr',
            'name': 'Telebirr',
            'description': 'Mobile money payment',
            'icon': '📱',
            'enabled': True
        },
        {
            'id': 'bank',
            'name': 'Bank Transfer',
            'description': 'Direct bank transfer',
            'icon': '🏦',
            'enabled': True
        }
    ]
    
    return jsonify({
        'success': True,
        'payment_methods': payment_methods
    }), 200

@ticketer_bp.route('/payments/<string:payment_id>', methods=['GET'])
def get_payment_status(payment_id):
    """Get payment status by ID or transaction reference"""
    try:
        payment = mongo.db.payments.find_one({
            '$or': [
                {'_id': ObjectId(payment_id)},
                {'tx_ref': payment_id}
            ]
        })
        
        if not payment:
            return jsonify({'success': False, 'error': 'Payment not found'}), 404
        
        payment_data = serialize_doc(payment)
        
        # Get booking information if available
        if payment_data.get('booking_id'):
            booking = mongo.db.bookings.find_one({'_id': ObjectId(payment_data['booking_id'])})
            if booking:
                payment_data['booking'] = {
                    'pnr_number': booking.get('pnr_number'),
                    'passenger_name': booking.get('passenger_name'),
                    'route': f"{booking.get('departure_city')} → {booking.get('arrival_city')}",
                    'travel_date': booking.get('travel_date')
                }
        
        return jsonify({
            'success': True,
            'payment': payment_data
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== CHAPA PAYMENT INTEGRATION ====================

@ticketer_bp.route('/payments/chapa/initialize', methods=['POST'])
def initialize_chapa_payment():
    """Initialize Chapa payment"""
    try:
        data = request.get_json()
        
        # Generate transaction reference
        tx_ref = f"ethiobus-{int(datetime.now().timestamp())}{random.randint(100, 999)}"
        
        # Prepare Chapa payment request
        chapa_payload = {
            'amount': data.get('amount'),
            'currency': data.get('currency', 'ETB'),
            'email': data.get('passenger_email', 'customer@ethiobus.com'),
            'first_name': data.get('passenger_name', '').split()[0] if data.get('passenger_name') else 'Customer',
            'last_name': data.get('passenger_name', '').split()[-1] if data.get('passenger_name') and len(data.get('passenger_name', '').split()) > 1 else 'EthioBus',
            'phone_number': data.get('passenger_phone', ''),
            'tx_ref': tx_ref,
            'callback_url': data.get('return_url', f"{request.host_url}api/ticketer/payments/chapa/callback"),
            'return_url': data.get('return_url', f"{request.host_url}ticketer/booking-confirmation"),
            'customization': {
                'title': 'EthioBus Ticket Payment',
                'description': f"Payment for bus ticket"
            }
        }
        
        # Make request to Chapa API
        headers = {
            'Authorization': f'Bearer {CHAPA_SECRET_KEY}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f'{CHAPA_BASE_URL}/transaction/initialize',
            json=chapa_payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            chapa_response = response.json()
            
            # Store payment record
            payment_record = {
                'tx_ref': tx_ref,
                'amount': data.get('amount'),
                'currency': data.get('currency', 'ETB'),
                'payment_method': 'chapa',
                'status': 'pending',
                'chapa_response': chapa_response,
                'booking_data': data,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            mongo.db.payments.insert_one(payment_record)
            
            return jsonify({
                'success': True,
                'data': chapa_response.get('data', {}),
                'tx_ref': tx_ref
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to initialize Chapa payment',
                'details': response.text
            }), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/payments/chapa/verify/<string:tx_ref>', methods=['GET'])
def verify_chapa_payment(tx_ref):
    """Verify Chapa payment"""
    try:
        headers = {
            'Authorization': f'Bearer {CHAPA_SECRET_KEY}'
        }
        
        response = requests.get(
            f'{CHAPA_BASE_URL}/transaction/verify/{tx_ref}',
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            chapa_response = response.json()
            
            # Update payment record
            mongo.db.payments.update_one(
                {'tx_ref': tx_ref},
                {
                    '$set': {
                        'status': chapa_response.get('status', 'failed'),
                        'verification_response': chapa_response,
                        'updated_at': datetime.now()
                    }
                }
            )
            
            return jsonify({
                'success': True,
                'data': chapa_response
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to verify payment',
                'details': response.text
            }), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/payments/chapa/callback', methods=['POST'])
def chapa_payment_callback():
    """Handle Chapa payment callback"""
    try:
        data = request.get_json()
        tx_ref = data.get('tx_ref')
        
        if not tx_ref:
            return jsonify({'success': False, 'error': 'Missing transaction reference'}), 400
        
        # Verify the payment
        verify_response = verify_chapa_payment(tx_ref)
        
        return jsonify({
            'success': True,
            'message': 'Callback processed'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== ADDITIONAL ENDPOINTS ====================

@ticketer_bp.route('/pos/cash-drawer/open', methods=['POST'])
def open_cash_drawer():
    """Open cash drawer for the day"""
    try:
        data = request.get_json()
        today = datetime.now().date()
        
        # Check if drawer already open
        existing = mongo.db.cash_drawers.find_one({
            'date': today.isoformat()
        })
        
        if existing and existing.get('status') == 'open':
            return jsonify({
                'success': False,
                'error': 'Cash drawer already open for today'
            }), 400
        
        # Create or update cash drawer record
        cash_drawer = {
            'date': today.isoformat(),
            'opening_balance': data.get('opening_balance', 0),
            'current_balance': data.get('opening_balance', 0),
            'total_sales': 0,
            'total_cash': 0,
            'total_chapa': 0,
            'tickets_sold': 0,
            'status': 'open',
            'opened_at': datetime.now(),
            'opened_by': data.get('user_id', 'ticketer'),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        if existing:
            # Update existing drawer
            mongo.db.cash_drawers.update_one(
                {'_id': existing['_id']},
                {'$set': cash_drawer}
            )
            cash_drawer['_id'] = existing['_id']
        else:
            # Create new drawer
            result = mongo.db.cash_drawers.insert_one(cash_drawer)
            cash_drawer['_id'] = result.inserted_id
        
        return jsonify({
            'success': True,
            'cashDrawer': serialize_doc(cash_drawer),
            'message': 'Cash drawer opened successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/pos/cash-drawer/close', methods=['POST'])
def close_cash_drawer():
    """Close cash drawer for the day"""
    try:
        today = datetime.now().date()
        
        # Find open drawer
        cash_drawer = mongo.db.cash_drawers.find_one({
            'date': today.isoformat(),
            'status': 'open'
        })
        
        if not cash_drawer:
            return jsonify({
                'success': False,
                'error': 'No open cash drawer found for today'
            }), 404
        
        # Calculate final session totals
        from flask_jwt_extended import get_jwt_identity
        
        opened_at = cash_drawer.get('opened_at', datetime.combine(today, datetime.min.time()))
        
        # Get current ticketer user ID
        try:
            current_ticketer_id = get_jwt_identity()
        except:
            current_ticketer_id = None
        
        # Build query for ticketer's counter sales only
        session_query = {
            'created_at': {'$gte': opened_at},
            'status': 'success',
            'booking_source': 'counter'  # NEW: Only counter sales
        }
        
        # NEW: Filter by current ticketer if available
        if current_ticketer_id:
            session_query['processed_by'] = current_ticketer_id
        
        session_payments = list(mongo.db.payments.find(session_query))
        
        total_sales = sum(p.get('amount', 0) for p in session_payments)
        total_cash = sum(p.get('amount', 0) for p in session_payments if p.get('payment_method') == 'cash')
        total_chapa = sum(p.get('amount', 0) for p in session_payments if p.get('payment_method') == 'chapa')
        tickets_sold = len(session_payments)
        
        final_balance = cash_drawer.get('opening_balance', 0) + total_cash
        
        # Update drawer with final totals and close
        mongo.db.cash_drawers.update_one(
            {'_id': cash_drawer['_id']},
            {
                '$set': {
                    'status': 'closed',
                    'closed_at': datetime.now(),
                    'closing_balance': final_balance,
                    'current_balance': final_balance,
                    'total_sales': total_sales,
                    'total_cash': total_cash,
                    'total_chapa': total_chapa,
                    'tickets_sold': tickets_sold,
                    'updated_at': datetime.now()
                }
            }
        )
        
        # Get updated drawer
        updated_drawer = mongo.db.cash_drawers.find_one({'_id': cash_drawer['_id']})
        
        return jsonify({
            'success': True,
            'message': 'Cash drawer closed successfully',
            'cashDrawer': serialize_doc(updated_drawer)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/pos/transactions', methods=['GET'])
def get_transactions():
    """Get POS transactions - ONLY ticketer's counter sales"""
    try:
        from flask_jwt_extended import get_jwt_identity
        
        today = datetime.now().date()
        
        # Get current ticketer user ID
        try:
            current_ticketer_id = get_jwt_identity()
        except:
            current_ticketer_id = None
        
        # Check if cash drawer is open
        cash_drawer = mongo.db.cash_drawers.find_one({
            'date': today.isoformat()
        })
        
        if cash_drawer and cash_drawer.get('status') == 'open':
            # Drawer is open - show only transactions from this session
            opened_at = cash_drawer.get('opened_at', datetime.combine(today, datetime.min.time()))
            query = {
                'created_at': {'$gte': opened_at},
                'status': 'success',
                'booking_source': 'counter'  # NEW: Only counter sales
            }
        else:
            # Drawer is closed - show today's counter transactions
            query = {
                'created_at': {
                    '$gte': datetime.combine(today, datetime.min.time()),
                    '$lt': datetime.combine(today, datetime.min.time()) + timedelta(days=1)
                },
                'status': 'success',
                'booking_source': 'counter'  # NEW: Only counter sales
            }
        
        # NEW: Filter by current ticketer if available
        if current_ticketer_id:
            query['processed_by'] = current_ticketer_id
        
        # Apply payment method filter if provided
        payment_method = request.args.get('payment_method')
        if payment_method and payment_method != 'all':
            query['payment_method'] = payment_method
        
        # Get transactions
        transactions = list(mongo.db.payments.find(query).sort('created_at', -1))
        
        # Enrich transaction data with booking information
        transactions_data = []
        for transaction in transactions:
            transaction_data = serialize_doc(transaction)
            
            # Get booking details if booking_id exists
            if transaction.get('booking_id'):
                booking = mongo.db.bookings.find_one({'_id': ObjectId(transaction['booking_id'])})
                if booking:
                    transaction_data['customer_name'] = booking.get('passenger_name', '')
                    transaction_data['customer_phone'] = booking.get('passenger_phone', '')[:50]
            
            transactions_data.append(transaction_data)
        
        return jsonify({
            'success': True,
            'transactions': transactions_data,
            'total': len(transactions_data),
            'drawer_status': cash_drawer.get('status') if cash_drawer else 'closed'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
   
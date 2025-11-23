from flask import Blueprint, request, jsonify
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
def get_ticketer_dashboard_stats():
    try:
        today = datetime.now().date()
        today_str = today.isoformat()
        
        # Pending check-ins (confirmed bookings for today that haven't been checked in)
        pending_checkins = mongo.db.bookings.count_documents({
            'travel_date': today_str,
            'status': 'confirmed'
        })

        # Today's revenue from completed payments
        today_payments = list(mongo.db.payments.find({
            'created_at': {'$gte': datetime.combine(today, datetime.min.time())},
            'status': 'success'
        }))
        today_revenue = sum(payment.get('amount', 0) for payment in today_payments)

        # Today's bookings count
        today_bookings = mongo.db.bookings.count_documents({
            'travel_date': today_str,
            'status': {'$in': ['confirmed', 'checked_in', 'completed']}
        })

        # Active schedules for today (scheduled + boarding + departed + active)
        active_schedules = mongo.db.busschedules.count_documents({
            'departure_date': today_str,
            'status': {'$in': ['scheduled', 'boarding', 'departed', 'active']}
        })

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
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== SCHEDULE MANAGEMENT ====================

@ticketer_bp.route('/schedules', methods=['GET'])
def get_schedules():
    try:
        date_str = request.args.get('date')
        status = request.args.get('status')
        
        query = {}
        
        if date_str:
            query['departure_date'] = date_str
            
        if status and status != 'all':
            query['status'] = status
        else:
            # Default to active trips (scheduled + boarding + departed + active)
            query['status'] = {'$in': ['scheduled', 'boarding', 'departed', 'active']}
        
        schedules = list(mongo.db.busschedules.find(query).sort('departure_time', 1))
        
        schedules_data = []
        for schedule in schedules:
            schedule_data = serialize_doc(schedule)
            
            # Calculate actual booked seats from bookings
            booked_seats_count = mongo.db.bookings.count_documents({
                'schedule_id': str(schedule['_id']),
                'status': {'$in': ['confirmed', 'checked_in']}
            })
            
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
        
        return jsonify({
            'success': True,
            'schedules': schedules_data,
            'total': len(schedules_data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/schedules/<string:schedule_id>/occupied-seats', methods=['GET'])
def get_occupied_seats(schedule_id):
    try:
        # Get all bookings for this schedule
        bookings = list(mongo.db.bookings.find({
            'schedule_id': schedule_id,
            'status': {'$in': ['confirmed', 'checked_in']}
        }))
        
        # Extract all seat numbers from bookings
        occupied_seats = []
        for booking in bookings:
            if 'seat_numbers' in booking and isinstance(booking['seat_numbers'], list):
                occupied_seats.extend(booking['seat_numbers'])
            elif 'seat_number' in booking:
                occupied_seats.append(booking['seat_number'])
        
        return jsonify({
            'success': True,
            'occupiedSeats': occupied_seats
        }), 200
        
    except Exception as e:
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
def create_quick_booking():
    try:
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

        # Create booking document matching your data structure
        booking_data = {
            'pnr_number': pnr_number,
            'schedule_id': data['schedule_id'],
            'user_id': data.get('user_id'),  # Optional for walk-in customers
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
            
            # Get booking stats for this customer
            booking_stats = mongo.db.bookings.aggregate([
                {'$match': {'user_id': str(customer['_id'])}},
                {'$group': {
                    '_id': None,
                    'total_bookings': {'$sum': 1},
                    'total_spent': {'$sum': '$total_amount'},
                    'last_booking': {'$max': '$created_at'}
                }}
            ])
            
            stats = list(booking_stats)
            if stats:
                customer_data['booking_count'] = stats[0]['total_bookings']
                customer_data['total_spent'] = stats[0]['total_spent']
                customer_data['last_booking'] = stats[0]['last_booking']
            else:
                customer_data['booking_count'] = 0
                customer_data['total_spent'] = 0
                customer_data['last_booking'] = None
            
            customers_data.append(customer_data)

        return jsonify({
            'success': True,
            'customers': customers_data
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/customer/<string:customer_id>/bookings', methods=['GET'])
@ticketer_bp.route('/customer/id/<string:customer_id>/bookings', methods=['GET'])
def get_customer_bookings(customer_id):
    try:
        # Handle both user_id and passenger_phone lookups
        try:
            # Try as user_id first (ObjectId format)
            if len(customer_id) == 24:
                bookings = list(mongo.db.bookings.find({
                    'user_id': customer_id
                }).sort('created_at', -1).limit(50))
            else:
                # Fallback to passenger_phone
                bookings = list(mongo.db.bookings.find({
                    'passenger_phone': customer_id
                }).sort('created_at', -1).limit(50))
        except:
            # Fallback to passenger_phone
            bookings = list(mongo.db.bookings.find({
                'passenger_phone': customer_id
            }).sort('created_at', -1).limit(50))
        
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
        
        # Get today's cash payments
        cash_payments = list(mongo.db.payments.find({
            'created_at': {'$gte': datetime.combine(today, datetime.min.time())},
            'payment_method': 'cash',
            'status': 'success'
        }))
        
        cash_sales = sum(payment.get('amount', 0) for payment in cash_payments)

        # Get or create cash drawer record
        cash_drawer = mongo.db.cash_drawers.find_one({
            'date': today.isoformat()
        })
        
        if not cash_drawer:
            cash_drawer = {
                'date': today.isoformat(),
                'opening_balance': 0,
                'current_balance': cash_sales,
                'total_cash': cash_sales,
                'status': 'closed',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            result = mongo.db.cash_drawers.insert_one(cash_drawer)
            cash_drawer['_id'] = result.inserted_id
        else:
            # Update current balance but preserve status
            current_balance = cash_drawer.get('opening_balance', 0) + cash_sales
            mongo.db.cash_drawers.update_one(
                {'_id': cash_drawer['_id']},
                {
                    '$set': {
                        'current_balance': current_balance,
                        'total_cash': cash_sales,
                        'updated_at': datetime.now()
                    }
                }
            )
            cash_drawer['current_balance'] = current_balance
            cash_drawer['total_cash'] = cash_sales
            # Preserve the existing status from database

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
        date_str = request.args.get('date', datetime.now().date().isoformat())
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Get payments for the target date
        payments = list(mongo.db.payments.find({
            'created_at': {
                '$gte': datetime.combine(target_date, datetime.min.time()),
                '$lt': datetime.combine(target_date, datetime.min.time()) + timedelta(days=1)
            },
            'status': 'success'
        }))

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
def get_bookings():
    try:
        status = request.args.get('status', 'all')
        date_str = request.args.get('date')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        query = {}
        if status != 'all':
            query['status'] = status
        if date_str:
            query['travel_date'] = date_str
            
        bookings = list(mongo.db.bookings.find(query).sort('created_at', -1).skip(skip).limit(limit))
        total = mongo.db.bookings.count_documents(query)
        
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
            'date': today.isoformat(),
            'status': 'open'
        })
        
        if existing:
            return jsonify({
                'success': False,
                'error': 'Cash drawer already open for today'
            }), 400
        
        # Create new cash drawer record
        cash_drawer = {
            'date': today.isoformat(),
            'opening_balance': data.get('opening_balance', 0),
            'current_balance': data.get('opening_balance', 0),
            'total_cash': 0,
            'status': 'open',
            'opened_at': datetime.now(),
            'opened_by': data.get('user_id', 'ticketer'),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        result = mongo.db.cash_drawers.insert_one(cash_drawer)
        cash_drawer['_id'] = result.inserted_id
        
        return jsonify({
            'success': True,
            'cashDrawer': serialize_doc(cash_drawer)
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
        
        # Update drawer status
        mongo.db.cash_drawers.update_one(
            {'_id': cash_drawer['_id']},
            {
                '$set': {
                    'status': 'closed',
                    'closed_at': datetime.now(),
                    'updated_at': datetime.now()
                }
            }
        )
        
        return jsonify({
            'success': True,
            'message': 'Cash drawer closed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ticketer_bp.route('/pos/transactions', methods=['GET'])
def get_transactions():
    """Get POS transactions"""
    try:
        date_str = request.args.get('date', datetime.now().date().isoformat())
        payment_method = request.args.get('payment_method')
        
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        query = {
            'created_at': {
                '$gte': datetime.combine(target_date, datetime.min.time()),
                '$lt': datetime.combine(target_date, datetime.min.time()) + timedelta(days=1)
            },
            'status': 'success'
        }
        
        if payment_method:
            query['payment_method'] = payment_method
        
        transactions = list(mongo.db.payments.find(query).sort('created_at', -1))
        
        # Enrich with booking/customer information
        transactions_data = []
        for transaction in transactions:
            transaction_data = serialize_doc(transaction)
            
            # Get booking information if available
            if transaction.get('booking_id'):
                booking = mongo.db.bookings.find_one({'_id': ObjectId(transaction['booking_id'])})
                if booking:
                    transaction_data['customer_name'] = booking.get('passenger_name')
                    transaction_data['customer_phone'] = booking.get('passenger_phone')
            
            transactions_data.append(transaction_data)
        
        return jsonify({
            'success': True,
            'transactions': transactions_data,
            'total': len(transactions_data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
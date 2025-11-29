from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import random
import string
from app import mongo
from datetime import datetime, timedelta 

bookings_bp = Blueprint('bookings', __name__)

def get_db():
    """Get database instance"""
    return mongo.db

def generate_pnr():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def calculate_baggage_fee(weight_kg):
    """Calculate baggage fee based on weight"""
    if weight_kg <= 15:
        return 0  # Free allowance
    elif weight_kg <= 25:
        return 50  # Standard fee
    elif weight_kg <= 35:
        return 100  # Heavy baggage fee
    else:
        return 150  # Extra heavy baggage fee

def generate_baggage_tag(has_baggage, weight_kg):
    """Generate baggage tag only if passenger has baggage"""
    if not has_baggage or weight_kg == 0:
        return None
    return f"BT{''.join(random.choices(string.digits, k=6))}"

def is_valid_objectid(id_str):
    try:
        ObjectId(id_str)
        return True
    except:
        return False

def is_schedule_completed(schedule):
    """Check if schedule has already departed (past date/time)"""
    try:
        now = datetime.utcnow()
        
        # Get departure date and time
        departure_date = schedule.get('departure_date')
        departure_time = schedule.get('departureTime') or schedule.get('departure_time', '00:00')
        
        if not departure_date:
            return True  # Consider invalid schedule as completed
        
        # Parse departure datetime
        if isinstance(departure_date, datetime):
            departure_datetime = departure_date
        else:
            departure_date_str = str(departure_date)
            departure_datetime = datetime.strptime(f"{departure_date_str} {departure_time}", "%Y-%m-%d %H:%M")
        
        # Check if departure time has passed
        return departure_datetime < now
        
    except Exception as e:
        print(f"❌ Error checking schedule completion: {e}")
        return True  # Consider error cases as completed for safety

def is_bus_under_maintenance(schedule, bus_data=None):
    """Check if bus is under maintenance or inactive"""
    try:
        # Check bus status from schedule
        bus_status = schedule.get('bus_status')
        if bus_status and bus_status.lower() in ['maintenance', 'inactive', 'under_maintenance']:
            return True
        
        # Check bus data if provided
        if bus_data:
            bus_status = bus_data.get('status', 'active')
            if bus_status.lower() in ['maintenance', 'inactive', 'under_maintenance']:
                return True
            
            # Check isActive field
            if bus_data.get('isActive') is False:
                return True
        
        # Check schedule-specific maintenance status
        schedule_status = schedule.get('status', 'active')
        if schedule_status.lower() in ['maintenance', 'inactive', 'cancelled']:
            return True
            
        return False
        
    except Exception as e:
        print(f"❌ Error checking bus maintenance: {e}")
        return False  # Assume not under maintenance on error

def get_occupied_seats_for_schedule(schedule_id):
    """Get all occupied seats for a schedule"""
    try:
        db = get_db()
        
        if is_valid_objectid(schedule_id):
            query = {'schedule_id': ObjectId(schedule_id)}
        else:
            query = {'schedule_id': schedule_id}
        
        bookings_cursor = db.bookings.find({
            **query,
            'status': {'$in': ['confirmed', 'checked_in', 'pending']}
        })
        
        occupied_seats = []
        for booking in bookings_cursor:
            if 'seat_numbers' in booking:
                occupied_seats.extend(booking.get('seat_numbers', []))
        
        return list(set(occupied_seats))
    except Exception as e:
        print(f"Error getting occupied seats: {e}")
        return []

def filter_valid_schedules(schedules):
    """Filter out completed schedules and buses under maintenance"""
    try:
        db = get_db()
        valid_schedules = []
        
        for schedule in schedules:
            # Check if schedule has departed
            if is_schedule_completed(schedule):
                print(f"⏰ Schedule {schedule.get('_id')} filtered out: Already departed")
                continue
            
            # Check bus maintenance status
            bus_id = schedule.get('busId')
            bus_data = None
            
            if bus_id:
                bus_data = db.buses.find_one({'_id': ObjectId(bus_id)})
            
            if is_bus_under_maintenance(schedule, bus_data):
                print(f"🔧 Schedule {schedule.get('_id')} filtered out: Bus under maintenance")
                continue
            
            valid_schedules.append(schedule)
        
        print(f"✅ Filtered {len(valid_schedules)} valid schedules from {len(schedules)} total")
        return valid_schedules
        
    except Exception as e:
        print(f"❌ Error filtering schedules: {e}")
        return schedules  # Return original list on error

# Health and utility routes
@bookings_bp.route('/health', methods=['GET'])
def bookings_health():
    """Health check for bookings service"""
    try:
        db = get_db()
        db.command('ping')
        total_bookings = db.bookings.count_documents({})
        
        return jsonify({
            'status': 'healthy',
            'service': 'Bookings Service',
            'database': 'connected',
            'total_bookings': total_bookings,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'service': 'Bookings Service', 
            'database': 'disconnected',
            'error': str(e)
        }), 500

@bookings_bp.route('/check', methods=['GET'])  
def bookings_check():
    return jsonify({"status": "check_ok", "service": "Bookings"})

@bookings_bp.route('/baggage/policy', methods=['GET'])
def get_baggage_policy():
    """Get baggage policy and fee structure"""
    baggage_policy = {
        'free_allowance': 15,
        'fee_structure': [
            {'weight_range': '0-15 kg', 'fee': 0, 'description': 'Free allowance'},
            {'weight_range': '16-25 kg', 'fee': 50, 'description': 'Standard baggage'},
            {'weight_range': '26-35 kg', 'fee': 100, 'description': 'Heavy baggage'},
            {'weight_range': '36+ kg', 'fee': 150, 'description': 'Extra heavy baggage'}
        ],
        'max_weight': 40,
        'notes': [
            'Baggage fee is per passenger, not per bag',
            'Passengers are responsible for their baggage',
            'Fragile items should be properly packed'
        ]
    }
    return jsonify(baggage_policy), 200

@bookings_bp.route('/baggage/calculate-fee', methods=['POST'])
def calculate_baggage_fee_endpoint():
    """Calculate baggage fee based on weight"""
    try:
        data = request.get_json()
        weight_kg = data.get('weight_kg', 0)
        
        if weight_kg < 0:
            return jsonify({'error': 'Weight cannot be negative'}), 400
        
        fee = calculate_baggage_fee(weight_kg)
        
        return jsonify({
            'weight_kg': weight_kg,
            'fee': fee,
            'free_allowance': 15
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bookings_bp.route('/occupied-seats/<schedule_id>', methods=['GET'])
def get_occupied_seats(schedule_id):
    """Get all occupied seats for a specific schedule"""
    try:
        db = get_db()
        print(f"🪑 Fetching occupied seats for schedule: {schedule_id}")
        
        # First check if schedule exists and is valid
        if is_valid_objectid(schedule_id):
            schedule = db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        else:
            schedule = db.busschedules.find_one({'schedule_id': schedule_id})
        
        if not schedule:
            return jsonify({
                'success': False,
                'error': 'Schedule not found',
                'occupiedSeats': []
            }), 404
        
        # Check if schedule has departed
        if is_schedule_completed(schedule):
            return jsonify({
                'success': False,
                'error': 'Schedule has already departed',
                'occupiedSeats': []
            }), 400
        
        # Check if bus is under maintenance
        bus_id = schedule.get('busId')
        bus_data = None
        if bus_id:
            bus_data = db.buses.find_one({'_id': ObjectId(bus_id)})
        
        if is_bus_under_maintenance(schedule, bus_data):
            return jsonify({
                'success': False,
                'error': 'Bus is under maintenance',
                'occupiedSeats': []
            }), 400
        
        # Get occupied seats
        if is_valid_objectid(schedule_id):
            query = {'schedule_id': ObjectId(schedule_id)}
        else:
            query = {'schedule_id': schedule_id}
        
        bookings_cursor = db.bookings.find({
            **query,
            'status': {'$in': ['confirmed', 'checked_in', 'pending', 'completed']}
        })
        
        occupied_seats = []
        booking_count = 0
        
        for booking in bookings_cursor:
            booking_count += 1
            if 'seat_numbers' in booking and booking['seat_numbers']:
                seat_list = booking['seat_numbers']
                occupied_seats.extend(seat_list)
        
        occupied_seats = list(set(occupied_seats))
        print(f"✅ Found {len(occupied_seats)} occupied seats from {booking_count} bookings")
        
        return jsonify({
            'success': True,
            'occupiedSeats': occupied_seats,
            'scheduleId': schedule_id,
            'totalOccupied': len(occupied_seats),
            'bookingCount': booking_count,
            'scheduleStatus': 'active',
            'busStatus': 'active'
        })
        
    except Exception as e:
        print(f"❌ Error in get_occupied_seats: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'occupiedSeats': []
        }), 500

# Enhanced schedule validation endpoint
@bookings_bp.route('/schedule/<schedule_id>/validate', methods=['GET'])
def validate_schedule(schedule_id):
    """Validate if a schedule is available for booking"""
    try:
        db = get_db()
        
        # Get schedule
        if is_valid_objectid(schedule_id):
            schedule = db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        else:
            schedule = db.busschedules.find_one({'schedule_id': schedule_id})
        
        if not schedule:
            return jsonify({
                'valid': False,
                'error': 'Schedule not found',
                'reason': 'not_found'
            }), 404
        
        # Check if schedule has departed
        if is_schedule_completed(schedule):
            return jsonify({
                'valid': False,
                'error': 'Schedule has already departed',
                'reason': 'completed',
                'departure_date': schedule.get('departure_date'),
                'departure_time': schedule.get('departureTime')
            }), 400
        
        # Check bus maintenance status
        bus_id = schedule.get('busId')
        bus_data = None
        if bus_id:
            bus_data = db.buses.find_one({'_id': ObjectId(bus_id)})
        
        if is_bus_under_maintenance(schedule, bus_data):
            bus_status = bus_data.get('status', 'maintenance') if bus_data else schedule.get('bus_status', 'maintenance')
            return jsonify({
                'valid': False,
                'error': 'Bus is under maintenance',
                'reason': 'maintenance',
                'bus_status': bus_status,
                'bus_name': bus_data.get('name') if bus_data else 'Unknown'
            }), 400
        
        # Get route information
        route_id = schedule.get('routeId')
        route = None
        if route_id:
            route = db.routes.find_one({'_id': ObjectId(route_id)})
        
        return jsonify({
            'valid': True,
            'schedule_id': str(schedule['_id']),
            'departure_city': route.get('originCity') if route else 'Unknown',
            'arrival_city': route.get('destinationCity') if route else 'Unknown',
            'departure_date': schedule.get('departure_date'),
            'departure_time': schedule.get('departureTime'),
            'bus_status': 'active',
            'schedule_status': 'active'
        }), 200
        
    except Exception as e:
        print(f"❌ Error validating schedule: {e}")
        return jsonify({
            'valid': False,
            'error': str(e),
            'reason': 'validation_error'
        }), 500

# Main booking routes
@bookings_bp.route('/', methods=['POST'])
@jwt_required()
def create_booking():
    """Create a new booking with proper status handling"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        db = get_db()
        
        print(f"🎫 Creating booking for user: {current_user_id}")
        
        # Validate required fields
        required_fields = ['schedule_id', 'passenger_name', 'passenger_phone', 'seat_numbers', 'base_fare']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Get schedule details and validate
        schedule = db.busschedules.find_one({'_id': ObjectId(data['schedule_id'])})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Validate schedule availability
        if is_schedule_completed(schedule):
            return jsonify({'error': 'This schedule has already departed'}), 400
        
        # Check bus maintenance status - support both field names
        bus_id = schedule.get('bus_id') or schedule.get('busId')
        bus_data = None
        if bus_id:
            try:
                bus_data = db.buses.find_one({'_id': ObjectId(bus_id)})
            except:
                bus_data = db.buses.find_one({'_id': bus_id})
        
        if is_bus_under_maintenance(schedule, bus_data):
            bus_status = bus_data.get('status', 'maintenance') if bus_data else schedule.get('bus_status', 'maintenance')
            return jsonify({
                'error': f'Bus is under maintenance (Status: {bus_status})',
                'bus_status': bus_status
            }), 400
        
        # Get route details - support both field names
        route_id = schedule.get('route_id') or schedule.get('routeId')
        if not route_id:
            return jsonify({'error': 'Schedule has no routeId'}), 400
        
        try:
            route = db.routes.find_one({'_id': ObjectId(route_id)})
        except:
            route = db.routes.find_one({'_id': route_id})
            
        if not route:
            return jsonify({'error': 'Route not found'}), 404
        
        # Check seat availability
        occupied_seats = get_occupied_seats_for_schedule(data['schedule_id'])
        requested_seats = data['seat_numbers']
        
        for seat in requested_seats:
            if seat in occupied_seats:
                return jsonify({'error': f'Seat {seat} is already occupied'}), 400
        
        # Handle baggage
        has_baggage = data.get('has_baggage', False)
        baggage_weight = data.get('baggage_weight', 0)
        baggage_fee = calculate_baggage_fee(baggage_weight) if has_baggage and baggage_weight > 0 else 0
        
        # Calculate total amount
        base_fare = data['base_fare']
        total_amount = base_fare + baggage_fee
        
        # Generate PNR
        pnr = generate_pnr()
        while db.bookings.find_one({'pnr_number': pnr}):
            pnr = generate_pnr()
        
        # Generate baggage tag
        baggage_tag = generate_baggage_tag(has_baggage, baggage_weight)
        current_time = datetime.utcnow()
        
        # Get bus information - already retrieved above
        bus = bus_data
        
        # Get route and schedule information - support both field names
        departure_city = (schedule.get('origin_city') or route.get('originCity') or 
                         schedule.get('departure_city') or 'Unknown Departure')
        arrival_city = (schedule.get('destination_city') or route.get('destinationCity') or 
                       schedule.get('arrival_city') or 'Unknown Arrival')
        
        # Get travel date - support both formats
        travel_date_obj = schedule.get('departure_date') or schedule.get('departure_date')
        if isinstance(travel_date_obj, datetime):
            travel_date = travel_date_obj.strftime('%Y-%m-%d')
        else:
            travel_date = str(travel_date_obj) if travel_date_obj else ''
        
        departure_time = schedule.get('departure_time') or schedule.get('departureTime', '')
        arrival_time = schedule.get('arrival_time') or schedule.get('arrivalTime', '')
        
        # FIXED: Set proper status values
        booking_status = 'confirmed'  # Booking status - confirmed when paid
        payment_status = 'paid'       # Payment status 
        
        print(f"🎯 STATUS SETTINGS: booking='{booking_status}', payment='{payment_status}'")
        
        # Create booking object
        booking = {
            'pnr_number': pnr,
            'schedule_id': data['schedule_id'],
            'user_id': current_user_id,
            'passenger_name': data['passenger_name'],
            'passenger_phone': data['passenger_phone'],
            'passenger_email': data.get('passenger_email'),
            
            # Baggage Information
            'has_baggage': has_baggage,
            'baggage_weight': baggage_weight,
            'baggage_fee': baggage_fee,
            'base_fare': base_fare,
            'total_amount': total_amount,
            
            # Route Information
            'departure_city': departure_city,
            'arrival_city': arrival_city,
            'travel_date': travel_date,
            'departure_time': departure_time,
            'arrival_time': arrival_time,
            
            # Booking Details - FIXED STATUS
            'seat_numbers': requested_seats,
            'status': booking_status,  # This is now 'pending'
            'baggage_tag': baggage_tag,
            'payment_method': data.get('payment_method', 'telebirr'),
            'payment_status': payment_status,  # This is 'paid'
            
            # Bus Information - support both field names
            'bus_company': 'EthioBus',
            'bus_type': schedule.get('bus_type') or schedule.get('busType', ''),
            'bus_number': schedule.get('bus_number') or schedule.get('busNumber', ''),
            'plate_number': schedule.get('plate_number', ''),
            'bus_name': bus.get('name') if bus else '',
            'bus_status': bus.get('status') if bus else 'active',
            
            # NEW: Mark as online booking (customer portal)
            'booking_source': 'online',  # online = customer portal, counter = ticketer
            
            # Timestamps
            'created_at': current_time,
            'updated_at': current_time
        }
        
        print(f"📝 Booking object status: {booking['status']}")
        
        # Insert booking
        result = db.bookings.insert_one(booking)
        booking_id = str(result.inserted_id)
        
        # Update schedule booked seats count
        num_seats = len(requested_seats)
        schedule_id_obj = ObjectId(data['schedule_id'])
        print(f"🔄 Updating schedule {schedule_id_obj} with {num_seats} seats...")
        
        update_result = db.busschedules.update_one(
            {'_id': schedule_id_obj},
            {
                '$inc': {
                    'booked_seats': num_seats,
                    'available_seats': -num_seats
                }
            }
        )
        
        if update_result.modified_count > 0:
            print(f"✅ Schedule updated successfully! Modified: {update_result.modified_count}")
        else:
            print(f"⚠️  Schedule NOT updated! Matched: {update_result.matched_count}, Modified: {update_result.modified_count}")
        
        print(f"✅ Booking created successfully. ID: {booking_id}, Status: {booking_status}, Seats: {num_seats}")
        
        return jsonify({
            'message': 'Booking created successfully',
            'booking_id': booking_id,
            'pnr_number': pnr,
            'baggage_tag': baggage_tag,
            'baggage_fee': baggage_fee,
            'total_amount': total_amount,
            'status': booking_status,  # Return 'pending' status
            'payment_status': payment_status,  # Return 'paid' status
            'route': f"{departure_city} → {arrival_city}",
            'travel_date': travel_date,
            'departure_time': departure_time,
            'bus_status': 'active',
            'schedule_status': 'active'
        }), 201
        
    except Exception as e:
        print(f"❌ Booking creation failed: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Booking creation failed: {str(e)}'}), 500

# ... (rest of the routes remain the same as in your original code, but with enhanced error handling)

@bookings_bp.route('/user', methods=['GET'])
@jwt_required()
def get_user_bookings():
    """Get all bookings for the current user"""
    try:
        from app.utils.data_normalizer import normalize_booking
        
        user_id = get_jwt_identity()
        db = get_db()
        
        print(f"📋 Fetching bookings for user: {user_id}")
        
        bookings_cursor = db.bookings.find({'user_id': user_id}).sort('created_at', -1)
        bookings = list(bookings_cursor)
        print(f"✅ Found {len(bookings)} bookings for user")
        
        formatted_bookings = []
        for booking in bookings:
            try:
                # Use normalizer
                normalized = normalize_booking(booking)
                
                # Format created_at
                if 'created_at' in booking and isinstance(booking['created_at'], datetime):
                    normalized['created_at'] = booking['created_at'].isoformat()
                
                formatted_bookings.append(normalized)
                
            except Exception as e:
                print(f"⚠️ Error formatting booking: {e}")
                continue
        
        return jsonify(formatted_bookings), 200
        
    except Exception as e:
        print(f"❌ Error in get_user_bookings: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Enhanced schedule search endpoint
@bookings_bp.route('/schedules/search', methods=['POST'])
def search_schedules():
    """Search for schedules with maintenance and date filtering"""
    try:
        from app.utils.data_normalizer import normalize_schedule
        
        data = request.get_json()
        db = get_db()
        
        origin_city = data.get('originCity') or data.get('origin_city') or data.get('source')
        destination_city = data.get('destinationCity') or data.get('destination_city') or data.get('destination')
        date = data.get('date')
        
        if not all([origin_city, destination_city, date]):
            return jsonify({'error': 'originCity, destinationCity, and date are required'}), 400
        
        print(f"🔍 Searching schedules: {origin_city} → {destination_city} on {date}")
        
        # Find route first
        route = db.routes.find_one({
            'originCity': origin_city,
            'destinationCity': destination_city
        })
        
        if not route:
            return jsonify({'schedules': [], 'message': 'No routes found'}), 200
        
        # Find schedules for this route on the specified date
        # Support both field name formats
        schedules_cursor = db.busschedules.find({
            '$or': [
                {'route_id': str(route['_id']), 'departure_date': date},
                {'routeId': route['_id'], 'departure_date': date}
            ]
        })
        
        schedules = list(schedules_cursor)
        print(f"📅 Found {len(schedules)} schedules for route")
        
        # Filter out completed schedules and maintenance buses
        valid_schedules = filter_valid_schedules(schedules)
        
        # Format response using normalizer
        formatted_schedules = []
        for schedule in valid_schedules:
            bus_data = None
            bus_id = schedule.get('bus_id') or schedule.get('busId')
            if bus_id:
                try:
                    bus_data = db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    bus_data = db.buses.find_one({'_id': bus_id})
            
            # Normalize the schedule data
            normalized = normalize_schedule(schedule)
            
            # Add bus details
            normalized['bus'] = {
                'name': bus_data.get('name') if bus_data else 'Premium Coach',
                'type': normalized['bus_type'],
                'capacity': bus_data.get('capacity', 45) if bus_data else 45,
                'plate_number': normalized['plate_number'],
                'status': bus_data.get('status', 'active') if bus_data else 'active'
            }
            
            # Add legacy field names for compatibility
            normalized['price'] = normalized['fare_birr']
            normalized['departureCity'] = normalized['origin_city']
            normalized['arrivalCity'] = normalized['destination_city']
            normalized['busType'] = normalized['bus_type']
            normalized['busNumber'] = normalized['bus_number']
            normalized['departure_date'] = normalized['departure_date']
            normalized['departureTime'] = normalized['departure_time']
            normalized['arrivalTime'] = normalized['arrival_time']
            normalized['availableSeats'] = normalized['available_seats']
            
            formatted_schedules.append(normalized)
        
        return jsonify({
            'schedules': formatted_schedules,
            'total': len(formatted_schedules),
            'filtered_out': len(schedules) - len(formatted_schedules),
            'route': f"{origin_city} → {destination_city}"
        }), 200
        
    except Exception as e:
        print(f"❌ Error searching schedules: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ... (rest of the routes remain similar to your original code with the same structure)

@bookings_bp.route('/<booking_id>/checkin', methods=['PUT'])
@jwt_required()
def checkin_booking(booking_id):
    """Check-in for a booking"""
    try:
        user_id = get_jwt_identity()
        
        booking = mongo.db.bookings.find_one({
            '_id': ObjectId(booking_id),
            'user_id': ObjectId(user_id)
        })
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Check if booking can be checked in
        current_status = booking.get('status')
        travel_date = booking.get('travel_date')
        departure_time = booking.get('departure_time')
        
        if current_status not in ['confirmed', 'pending']:
            return jsonify({'error': 'Booking cannot be checked in'}), 400
        
        # Check check-in timing
        now = datetime.utcnow()
        travel_datetime = datetime.strptime(f"{travel_date} {departure_time}", "%Y-%m-%d %H:%M")
        
        checkin_start = travel_datetime - timedelta(hours=24)
        checkin_end = travel_datetime - timedelta(hours=1)
        
        if now < checkin_start:
            return jsonify({'error': 'Check-in opens 24 hours before departure'}), 400
        
        if now > checkin_end:
            return jsonify({'error': 'Check-in closed. Please check in at the station.'}), 400
        
        # Update booking status
        result = mongo.db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {
                '$set': {
                    'status': 'checked_in',
                    'checked_in_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to update booking'}), 500
        
        updated_booking = mongo.db.bookings.find_one({'_id': ObjectId(booking_id)})
        
        return jsonify({
            'success': True,
            'message': 'Check-in successful',
            'booking': {
                'id': str(updated_booking['_id']),
                'status': updated_booking['status'],
                'checked_in_at': updated_booking['checked_in_at'],
                'pnr_number': updated_booking['pnr_number']
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Check-in error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bookings_bp.route('/pnr/<pnr_number>', methods=['GET'])
@jwt_required()
def get_booking_by_pnr(pnr_number):
    """Get booking by PNR number"""
    try:
        db = get_db()
        current_user = get_jwt_identity()
        
        booking = db.bookings.find_one({'pnr_number': pnr_number.upper()})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
            
        # Authorization check
        booking_user_id = str(booking.get('user_id'))
        current_user_id = str(current_user)
        
        if booking_user_id != current_user_id:
            user = db.users.find_one({'_id': ObjectId(current_user)})
            if not user or user.get('role') != 'admin':
                return jsonify({'error': 'Access denied'}), 403
        
        # Format response
        formatted_booking = {
            '_id': str(booking['_id']),
            'pnr_number': booking.get('pnr_number', ''),
            'schedule_id': str(booking.get('schedule_id', '')),
            'user_id': booking_user_id,
            'passenger_name': booking.get('passenger_name', ''),
            'passenger_phone': booking.get('passenger_phone', ''),
            'passenger_email': booking.get('passenger_email', ''),
            'departure_city': booking.get('departure_city', ''),
            'arrival_city': booking.get('arrival_city', ''),
            'travel_date': booking.get('travel_date', ''),
            'departure_time': booking.get('departure_time', ''),
            'arrival_time': booking.get('arrival_time', ''),
            'seat_numbers': booking.get('seat_numbers', []),
            'total_amount': booking.get('total_amount', 0),
            'base_fare': booking.get('base_fare', 0),
            'status': booking.get('status', 'pending'),
            'payment_status': booking.get('payment_status', 'paid'),
            'payment_method': booking.get('payment_method', 'telebirr'),
            'has_baggage': booking.get('has_baggage', False),
            'baggage_weight': booking.get('baggage_weight', 0),
            'baggage_fee': booking.get('baggage_fee', 0),
            'baggage_tag': booking.get('baggage_tag'),
            'bus_type': booking.get('bus_type', ''),
            'bus_number': booking.get('bus_number', ''),
            'bus_name': booking.get('bus_name', ''),
            'bus_company': booking.get('bus_company', '')
        }
        
        if 'created_at' in booking and isinstance(booking['created_at'], datetime):
            formatted_booking['created_at'] = booking['created_at'].isoformat()
        else:
            formatted_booking['created_at'] = ''
            
        return jsonify(formatted_booking), 200
        
    except Exception as e:
        print(f"❌ Error in get_booking_by_pnr: {e}")
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/<booking_id>', methods=['GET'])
@jwt_required()
def get_booking(booking_id):
    """Get a specific booking by ID"""
    try:
        from app.utils.travel_calculator import calculate_estimated_arrival, format_duration
        
        db = get_db()
        current_user = get_jwt_identity()
        
        if is_valid_objectid(booking_id):
            booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        else:
            booking = db.bookings.find_one({'pnr_number': booking_id.upper()})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
            
        # Authorization check
        booking_user_id = str(booking.get('user_id'))
        current_user_id = str(current_user)
        
        if booking_user_id != current_user_id:
            user = db.users.find_one({'_id': ObjectId(current_user)})
            if not user or user.get('role') != 'admin':
                return jsonify({'error': 'Access denied'}), 403
        
        # Get route information and tracking data for distance calculation
        route_info = None
        distance_km = None
        tracking_info = None
        progress_percentage = 0
        schedule_id = booking.get('schedule_id')
        
        if schedule_id:
            try:
                schedule = db.busschedules.find_one({'_id': ObjectId(schedule_id)})
                if schedule:
                    # Get route information
                    route_id = schedule.get('routeId')
                    if route_id:
                        route = db.routes.find_one({'_id': ObjectId(route_id)})
                        if route:
                            distance_km = route.get('distance_km')
                            route_info = {
                                'distance_km': distance_km,
                                'route_name': route.get('name'),
                                'estimated_duration_hours': route.get('estimated_duration_hours')
                            }
                    
                    # Get tracking information
                    checked_stops = schedule.get('checked_stops', [])
                    total_stops = db.busstops.count_documents({'route_id': route_id}) if route_id else 0
                    
                    if total_stops > 0:
                        progress_percentage = (len(checked_stops) / total_stops) * 100
                    
                    # Get latest location check-in
                    latest_location = db.bus_locations.find_one(
                        {'schedule_id': str(schedule_id), 'location_type': 'bus_stop'},
                        sort=[('timestamp', -1)]
                    )
                    
                    tracking_info = {
                        'status': schedule.get('status', 'scheduled'),
                        'current_location': schedule.get('current_location', 'Not started'),
                        'progress_percentage': round(progress_percentage, 2),
                        'checked_stops_count': len(checked_stops),
                        'total_stops': total_stops,
                        'is_started': len(checked_stops) > 0,
                        'is_completed': progress_percentage >= 100,
                        'latest_checkin': {
                            'stop_name': latest_location.get('bus_stop_name'),
                            'timestamp': latest_location.get('timestamp').isoformat() if latest_location and latest_location.get('timestamp') else None
                        } if latest_location else None
                    }
            except Exception as e:
                print(f"⚠️ Could not fetch route/tracking info: {e}")
        
        # Calculate estimated arrival if we have departure time and distance
        # Use dynamic calculation if journey has started
        estimated_arrival_info = None
        if booking.get('departure_time') and distance_km:
            estimated_arrival_info = calculate_estimated_arrival(
                booking.get('departure_time'),
                distance_km,
                progress_percentage=progress_percentage
            )
        
        # Format response
        formatted_booking = {
            '_id': str(booking['_id']),
            'pnr_number': booking.get('pnr_number', ''),
            'schedule_id': str(booking.get('schedule_id', '')),
            'user_id': booking_user_id,
            'passenger_name': booking.get('passenger_name', ''),
            'passenger_phone': booking.get('passenger_phone', ''),
            'passenger_email': booking.get('passenger_email', ''),
            'departure_city': booking.get('departure_city', ''),
            'arrival_city': booking.get('arrival_city', ''),
            'travel_date': booking.get('travel_date', ''),
            'departure_time': booking.get('departure_time', ''),
            'arrival_time': booking.get('arrival_time', ''),
            'seat_numbers': booking.get('seat_numbers', []),
            'total_amount': booking.get('total_amount', 0),
            'base_fare': booking.get('base_fare', 0),
            'status': booking.get('status', 'pending'),
            'payment_status': booking.get('payment_status', 'paid'),
            'payment_method': booking.get('payment_method', 'telebirr'),
            'has_baggage': booking.get('has_baggage', False),
            'baggage_weight': booking.get('baggage_weight', 0),
            'baggage_fee': booking.get('baggage_fee', 0),
            'baggage_tag': booking.get('baggage_tag'),
            'bus_type': booking.get('bus_type', ''),
            'bus_number': booking.get('bus_number', ''),
            'bus_name': booking.get('bus_name', ''),
            'bus_company': booking.get('bus_company', '')
        }
        
        # Add route, tracking, and estimated arrival information
        if route_info:
            formatted_booking['route_info'] = route_info
        
        if tracking_info:
            formatted_booking['tracking'] = tracking_info
        
        if estimated_arrival_info:
            formatted_booking['estimated_arrival'] = estimated_arrival_info
            # Also add formatted duration for easy display
            formatted_booking['formatted_duration'] = format_duration(
                estimated_arrival_info['travel_duration_hours'],
                estimated_arrival_info['travel_duration_minutes']
            )
            # Add formatted remaining time if journey started
            if estimated_arrival_info.get('remaining_hours') is not None:
                formatted_booking['formatted_remaining_time'] = format_duration(
                    estimated_arrival_info['remaining_hours'],
                    estimated_arrival_info['remaining_minutes']
                )
        
        if 'created_at' in booking and isinstance(booking['created_at'], datetime):
            formatted_booking['created_at'] = booking['created_at'].isoformat()
        else:
            formatted_booking['created_at'] = ''
            
        return jsonify(formatted_booking), 200
        
    except Exception as e:
        print(f"❌ Error in get_booking: {e}")
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/<booking_id>/cancel-request', methods=['POST'])
@jwt_required()
def request_cancellation(booking_id):
    """Customer requests cancellation (must be 2+ days before departure)"""
    try:
        db = get_db()
        current_user = get_jwt_identity()
        current_time = datetime.utcnow()
        data = request.get_json() or {}
        
        booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
            
        # Authorization check
        booking_user_id = str(booking.get('user_id'))
        current_user_id = str(current_user)
            
        if booking_user_id != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
            
        # Check if booking can be cancelled
        if booking.get('status') in ['cancelled', 'checked_in', 'completed']:
            return jsonify({'error': f'Booking is already {booking.get("status")}'}), 400
        
        # Check if cancellation request already exists
        if booking.get('cancellation_requested'):
            return jsonify({'error': 'Cancellation request already submitted'}), 400
        
        # Check if departure is at least 2 days away
        travel_date = booking.get('travel_date')
        departure_time = booking.get('departure_time', '00:00')
        
        if travel_date:
            try:
                departure_datetime = datetime.strptime(f"{travel_date} {departure_time}", "%Y-%m-%d %H:%M")
                time_until_departure = departure_datetime - current_time
                
                if time_until_departure.total_seconds() < (1 * 24 * 3600):  # Less than 2 days
                    return jsonify({
                        'error': 'Cancellation requests must be made at least 2 days before departure',
                        'departure_date': travel_date,
                        'hours_until_departure': time_until_departure.total_seconds() / 3600
                    }), 400
            except Exception as e:
                print(f"⚠️ Error parsing travel date: {e}")
        
        # Create cancellation request
        cancellation_reason = data.get('reason', 'No reason provided')
        
        result = db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'cancellation_requested': True,
                'cancellation_request_date': current_time,
                'cancellation_reason': cancellation_reason,
                'cancellation_status': 'pending',
                'updated_at': current_time
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to submit cancellation request'}), 400
            
        return jsonify({
            'success': True,
            'message': 'Cancellation request submitted successfully. An operator will review your request.',
            'cancellation_status': 'pending',
            'pnr_number': booking.get('pnr_number')
        }), 200
        
    except Exception as e:
        print(f"❌ Error requesting cancellation: {e}")
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/<booking_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_booking(booking_id):
    """Operator cancels booking and processes refund"""
    try:
        db = get_db()
        current_user = get_jwt_identity()
        current_time = datetime.utcnow()
        data = request.get_json() or {}
        
        # Get current user role
        user = db.users.find_one({'_id': ObjectId(current_user)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_role = user.get('role', 'customer')
        
        booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
            
        # Authorization check - only operators and admins can cancel
        if user_role not in ['operator', 'admin']:
            return jsonify({'error': 'Only operators can cancel bookings'}), 403
            
        # Check if booking can be cancelled
        if booking.get('status') in ['cancelled', 'completed']:
            return jsonify({'error': f'Booking is already {booking.get("status")}'}), 400
        
        # Process refund - 60% refund policy
        total_amount = booking.get('total_amount', 0)
        refund_percentage = 0.60  # 60% refund
        refund_amount = round(total_amount * refund_percentage, 2)
        cancellation_fee = round(total_amount - refund_amount, 2)
        
        refund_method = data.get('refund_method', 'original_payment_method')
        operator_notes = data.get('notes', '')
        
        print(f"💰 Refund calculation:")
        print(f"   - Total Amount: ETB {total_amount}")
        print(f"   - Refund (60%): ETB {refund_amount}")
        print(f"   - Cancellation Fee (40%): ETB {cancellation_fee}")
        
        # Update booking status
        result = db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'status': 'cancelled',
                'cancellation_approved': True,
                'cancellation_approved_by': current_user,
                'cancellation_approved_at': current_time,
                'cancellation_status': 'approved',
                'refund_amount': refund_amount,
                'refund_percentage': refund_percentage * 100,  # Store as percentage
                'cancellation_fee': cancellation_fee,
                'refund_method': refund_method,
                'refund_status': 'processed',
                'refund_processed_at': current_time,
                'operator_notes': operator_notes,
                'updated_at': current_time
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to cancel booking'}), 400
        
        # Update schedule seat counts - restore the cancelled seats
        num_seats = len(booking.get('seat_numbers', []))
        schedule_id = booking.get('schedule_id')
        if schedule_id and num_seats > 0:
            db.busschedules.update_one(
                {'_id': ObjectId(schedule_id)},
                {
                    '$inc': {
                        'booked_seats': -num_seats,
                        'available_seats': num_seats
                    }
                }
            )
            print(f"🪑 Restored {num_seats} seats to schedule")
        
        print(f"✅ Booking cancelled: {booking.get('pnr_number')}")
        print(f"   - Refund Amount: ETB {refund_amount}")
            
        return jsonify({
            'success': True,
            'message': 'Booking cancelled and 60% refund processed successfully',
            'total_amount': total_amount,
            'refund_amount': refund_amount,
            'refund_percentage': 60,
            'cancellation_fee': cancellation_fee,
            'refund_method': refund_method,
            'pnr_number': booking.get('pnr_number')
        }), 200
        
    except Exception as e:
        print(f"❌ Error cancelling booking: {e}")
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/cancellation-requests', methods=['GET'])
@jwt_required()
def get_cancellation_requests():
    """Get all cancellation requests with filtering (for operators)"""
    try:
        db = get_db()
        current_user = get_jwt_identity()
        
        # Get current user role
        user = db.users.find_one({'_id': ObjectId(current_user)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_role = user.get('role', 'customer')
        
        # Only operators and admins can view cancellation requests
        if user_role not in ['operator', 'admin']:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get filter parameters
        status_filter = request.args.get('status', 'all')  # all, pending, approved, rejected
        timeframe = request.args.get('timeframe', 'all')  # all, today, week, month
        
        # Build query
        query = {'cancellation_requested': True}
        
        # Filter by status
        if status_filter != 'all':
            query['cancellation_status'] = status_filter
        
        # Filter by timeframe
        if timeframe != 'all':
            from datetime import datetime, timedelta
            now = datetime.utcnow()
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            if timeframe == 'today':
                start_date = today
                end_date = today + timedelta(days=1)
            elif timeframe == 'week':
                start_date = today - timedelta(days=today.weekday())
                end_date = start_date + timedelta(days=7)
            elif timeframe == 'month':
                start_date = today.replace(day=1)
                next_month = start_date.replace(day=28) + timedelta(days=4)
                end_date = next_month.replace(day=1)
            
            query['cancellation_request_date'] = {
                '$gte': start_date,
                '$lt': end_date
            }
        
        print(f"📋 Cancellation requests query: {query}")
        
        # Get all bookings with cancellation requests
        bookings_cursor = db.bookings.find(query).sort('cancellation_request_date', -1)
        
        bookings = list(bookings_cursor)
        
        formatted_requests = []
        for booking in bookings:
            try:
                # Calculate days until departure
                travel_date = booking.get('travel_date')
                departure_time = booking.get('departure_time', '00:00')
                days_until_departure = None
                
                if travel_date:
                    try:
                        departure_datetime = datetime.strptime(f"{travel_date} {departure_time}", "%Y-%m-%d %H:%M")
                        time_diff = departure_datetime - datetime.utcnow()
                        days_until_departure = time_diff.total_seconds() / (24 * 3600)
                    except:
                        pass
                
                formatted_request = {
                    '_id': str(booking['_id']),
                    'pnr_number': booking.get('pnr_number', ''),
                    'passenger_name': booking.get('passenger_name', ''),
                    'passenger_phone': booking.get('passenger_phone', ''),
                    'passenger_email': booking.get('passenger_email', ''),
                    'departure_city': booking.get('departure_city', ''),
                    'arrival_city': booking.get('arrival_city', ''),
                    'travel_date': travel_date,
                    'departure_time': departure_time,
                    'seat_numbers': booking.get('seat_numbers', []),
                    'total_amount': booking.get('total_amount', 0),
                    'payment_method': booking.get('payment_method', ''),
                    'cancellation_reason': booking.get('cancellation_reason', ''),
                    'cancellation_request_date': booking.get('cancellation_request_date').isoformat() if booking.get('cancellation_request_date') else None,
                    'cancellation_status': booking.get('cancellation_status', 'pending'),
                    'cancellation_approved_at': booking.get('cancellation_approved_at').isoformat() if booking.get('cancellation_approved_at') else None,
                    'cancellation_rejected_at': booking.get('cancellation_rejected_at').isoformat() if booking.get('cancellation_rejected_at') else None,
                    'rejection_reason': booking.get('cancellation_rejection_reason', ''),
                    'refund_amount': booking.get('refund_amount', 0),
                    'refund_method': booking.get('refund_method', ''),
                    'days_until_departure': round(days_until_departure, 1) if days_until_departure else None,
                    'status': booking.get('status', 'pending')
                }
                
                formatted_requests.append(formatted_request)
                
            except Exception as e:
                print(f"⚠️ Error formatting cancellation request: {e}")
                continue
        
        return jsonify({
            'success': True,
            'requests': formatted_requests,
            'total': len(formatted_requests)
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting cancellation requests: {e}")
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/<booking_id>/reject-cancellation', methods=['PUT'])
@jwt_required()
def reject_cancellation(booking_id):
    """Operator rejects cancellation request"""
    try:
        db = get_db()
        current_user = get_jwt_identity()
        current_time = datetime.utcnow()
        data = request.get_json() or {}
        
        # Get current user role
        user = db.users.find_one({'_id': ObjectId(current_user)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_role = user.get('role', 'customer')
        
        # Only operators and admins can reject cancellation requests
        if user_role not in ['operator', 'admin']:
            return jsonify({'error': 'Access denied'}), 403
        
        booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if not booking.get('cancellation_requested'):
            return jsonify({'error': 'No cancellation request found'}), 400
        
        rejection_reason = data.get('reason', 'No reason provided')
        
        # Update booking
        result = db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'cancellation_requested': False,
                'cancellation_status': 'rejected',
                'cancellation_rejected_by': current_user,
                'cancellation_rejected_at': current_time,
                'cancellation_rejection_reason': rejection_reason,
                'updated_at': current_time
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to reject cancellation request'}), 400
            
        return jsonify({
            'success': True,
            'message': 'Cancellation request rejected',
            'pnr_number': booking.get('pnr_number')
        }), 200
        
    except Exception as e:
        print(f"❌ Error rejecting cancellation: {e}")
        return jsonify({'error': str(e)}), 500

# Debug routes
@bookings_bp.route('/debug-schedule/<schedule_id>', methods=['GET'])
def debug_schedule(schedule_id):
    """Debug endpoint to see schedule and route data"""
    try:
        db = get_db()
        
        schedule = db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
            
        route_id = schedule.get('routeId')
        route = db.routes.find_one({'_id': ObjectId(route_id)}) if route_id else None
        
        schedule_fields = {}
        route_fields = {}
        
        if schedule:
            for key in ['departure_date', 'departureTime', 'arrivalTime', 'busType', 'busNumber']:
                schedule_fields[key] = schedule.get(key)
                
        if route:
            for key in ['originCity', 'destinationCity']:
                route_fields[key] = route.get(key)
        
        return jsonify({
            'schedule_id': schedule_id,
            'schedule': schedule_fields,
            'route': route_fields,
            'all_schedule_fields': list(schedule.keys()) if schedule else [],
            'all_route_fields': list(route.keys()) if route else []
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/debug/user-bookings', methods=['GET'])
@jwt_required()
def debug_user_bookings():
    """Debug endpoint to check user's bookings"""
    try:
        db = get_db()
        current_user = get_jwt_identity()
        
        user_bookings = list(db.bookings.find({'user_id': current_user}))
        
        response = {
            'user_id': current_user,
            'total_bookings': len(user_bookings),
            'booking_ids': [str(b['_id']) for b in user_bookings],
            'booking_details': [
                {
                    'id': str(b['_id']),
                    'pnr': b.get('pnr_number'),
                    'passenger': b.get('passenger_name'),
                    'route': f"{b.get('departure_city')} → {b.get('arrival_city')}",
                    'status': b.get('status'),
                    'payment_status': b.get('payment_status')
                }
                for b in user_bookings
            ]
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

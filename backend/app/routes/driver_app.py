from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
from app import mongo

driver_app_bp = Blueprint('driver_app', __name__)

def get_current_driver():
    """Get current driver from JWT token"""
    try:
        current_user_id = get_jwt_identity()
        print(f"🔑 JWT Identity: {current_user_id}")
        driver = mongo.db.users.find_one({'_id': ObjectId(current_user_id), 'role': 'driver'})
        if driver:
            print(f"✅ Found driver: {driver.get('full_name')} (ID: {driver['_id']})")
        else:
            print(f"❌ No driver found with ID: {current_user_id}")
        return driver
    except Exception as e:
        print(f"❌ Error getting current driver: {e}")
        return None

# ==================== DEBUG ====================
@driver_app_bp.route('/debug/info', methods=['GET'])
@jwt_required()
def debug_driver_info():
    """Debug endpoint to check driver info and trips"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        driver_id = str(driver['_id'])
        
        # Get all trips for this driver
        all_trips = list(mongo.db.busschedules.find({'driver_id': driver_id}))
        
        # Also check if there are trips with this driver's ID in different formats
        trips_by_object_id = list(mongo.db.busschedules.find({'driver_id': driver['_id']}))
        
        return jsonify({
            'driver': {
                'id': driver_id,
                'name': driver.get('full_name') or driver.get('name'),
                'email': driver.get('email'),
                'role': driver.get('role')
            },
            'trips_found_by_string_id': len(all_trips),
            'trips_found_by_object_id': len(trips_by_object_id),
            'sample_trips': [
                {
                    '_id': str(t['_id']),
                    'driver_id': t.get('driver_id'),
                    'status': t.get('status'),
                    'departureDate': str(t.get('departureDate')),
                    'origin': t.get('originCity'),
                    'destination': t.get('destinationCity')
                }
                for t in all_trips[:3]
            ]
        }), 200
        
    except Exception as e:
        print(f"❌ Debug error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== DASHBOARD ====================
@driver_app_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_driver_stats():
    """Get driver dashboard statistics"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        driver_id = str(driver['_id'])
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get today's trips
        today_trips = list(mongo.db.busschedules.find({
            'driver_id': driver_id,
            'departureDate': {'$gte': today, '$lt': today + timedelta(days=1)}
        }))
        
        # Get upcoming trips (next 7 days)
        upcoming_trips = list(mongo.db.busschedules.find({
            'driver_id': driver_id,
            'departureDate': {'$gte': today, '$lt': today + timedelta(days=7)}
        }).sort('departureDate', 1))
        
        # Get active trip (currently in progress)
        active_trip = mongo.db.busschedules.find_one({
            'driver_id': driver_id,
            'status': 'departed',
            'departureDate': {'$lte': datetime.utcnow()}
        })
        
        # Calculate total passengers for today
        total_passengers_today = 0
        checked_in_today = 0
        
        for trip in today_trips:
            bookings = list(mongo.db.bookings.find({
                'schedule_id': str(trip['_id']),
                'status': {'$in': ['confirmed', 'checked_in']}
            }))
            total_passengers_today += len(bookings)
            checked_in_today += len([b for b in bookings if b.get('status') == 'checked_in'])
        
        # Get monthly stats
        month_start = today.replace(day=1)
        monthly_trips = mongo.db.busschedules.count_documents({
            'driver_id': driver_id,
            'departureDate': {'$gte': month_start},
            'status': {'$in': ['completed', 'departed']}
        })
        
        stats = {
            'today_trips': len(today_trips),
            'upcoming_trips': len(upcoming_trips),
            'active_trip': {
                '_id': str(active_trip['_id']),
                'route': active_trip.get('route_name'),
                'departure_time': active_trip.get('departureTime'),
                'status': active_trip.get('status')
            } if active_trip else None,
            'total_passengers_today': total_passengers_today,
            'checked_in_today': checked_in_today,
            'monthly_trips': monthly_trips,
            'driver_info': {
                'name': driver.get('full_name'),
                'license_number': driver.get('license_number'),
                'experience_years': driver.get('experience_years', 0)
            }
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== TRIPS ====================
@driver_app_bp.route('/trips', methods=['GET'])
@jwt_required()
def get_driver_trips():
    """Get all driver trips with filtering"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        driver_id = str(driver['_id'])
        status = request.args.get('status', 'all')
        
        # Build query
        query = {'driver_id': driver_id}
        
        if status != 'all':
            if ',' in status:
                # Multiple statuses
                statuses = status.split(',')
                query['status'] = {'$in': statuses}
            else:
                query['status'] = status
        
        # Get trips
        trips = list(mongo.db.busschedules.find(query).sort('departureDate', -1))
        
        # Serialize trips
        from app.routes.operator import serialize_document
        serialized_trips = []
        for trip in trips:
            trip_data = serialize_document(trip)
            
            # Add passenger count
            passenger_count = mongo.db.bookings.count_documents({
                'schedule_id': str(trip['_id']),
                'status': {'$in': ['confirmed', 'checked_in', 'completed']},
                'payment_status': 'paid'
            })
            trip_data['passenger_count'] = passenger_count
            
            serialized_trips.append(trip_data)
        
        return jsonify({
            'success': True,
            'trips': serialized_trips,
            'total': len(serialized_trips)
        }), 200
        
    except Exception as e:
        print(f"❌ Get driver trips error: {e}")
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/trips/active', methods=['GET'])
@jwt_required()
def get_active_trip():
    """Get driver's currently active trip"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        driver_id = str(driver['_id'])
        
        print(f"🔍 Looking for active trip for driver: {driver_id}")
        
        # DEBUG: Check if test schedule exists
        test_schedule = mongo.db.busschedules.find_one({'_id': ObjectId('691e10717be2deb203bcab48')})
        if test_schedule:
            print(f"🧪 Test schedule exists: driver_id={test_schedule.get('driver_id')}, status={test_schedule.get('status')}, date={test_schedule.get('departureDate')}")
        
        # First, try to find any trip assigned to this driver
        all_driver_trips = list(mongo.db.busschedules.find({'driver_id': driver_id}))
        print(f"📊 Total trips for driver: {len(all_driver_trips)}")
        
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        if all_driver_trips:
            for trip in all_driver_trips:
                dep_date = trip.get('departureDate')
                # Handle both string and datetime formats
                if isinstance(dep_date, str):
                    try:
                        from dateutil import parser
                        dep_date_dt = parser.parse(dep_date)
                    except:
                        dep_date_dt = None
                else:
                    dep_date_dt = dep_date
                
                is_today = today_start <= dep_date_dt < today_end if dep_date_dt else False
                print(f"  - Trip {trip.get('_id')}: status={trip.get('status')}, date={dep_date} (type: {type(dep_date).__name__}), is_today={is_today}")
        
        # Strategy 1: Find currently in-progress trip (already started) - must be today or earlier
        
        active_trip = mongo.db.busschedules.find_one({
            'driver_id': driver_id,
            'status': {'$in': ['boarding', 'departed', 'active', 'in_progress']},
            'departureDate': {'$lte': now}  # Only trips from today or earlier
        })
        
        # Strategy 2: Find today's trip that's within 2 hours of departure
        if not active_trip:
            today_end = today_start + timedelta(days=1)
            
            print(f"⏰ Current time: {now}")
            print(f"📅 Looking for trips today between {today_start} and {today_end}")
            
            # Get all trips for this driver with today's status
            # We'll filter by date manually since departureDate might be string or datetime
            query_filter = {
                'driver_id': driver_id,
                'status': {'$in': ['scheduled', 'boarding', 'departed', 'active', 'in_progress']}
            }
            todays_trips = list(mongo.db.busschedules.find(query_filter))
            
            print(f"📋 Found {len(todays_trips)} trips with valid status")
            print(f"🔍 Query filter: {query_filter}")
            
            # Filter to only today's trips (handle both string and datetime)
            filtered_trips = []
            for trip in todays_trips:
                dep_date = trip.get('departureDate')
                dep_date_original = dep_date
                
                print(f"  🔍 Checking trip {trip.get('_id')}: departureDate={dep_date} (type: {type(dep_date).__name__})")
                
                # Convert string to datetime if needed
                if isinstance(dep_date, str):
                    try:
                        from dateutil import parser
                        dep_date = parser.parse(dep_date)
                        print(f"     ✅ Parsed string to datetime: {dep_date}")
                    except Exception as e:
                        print(f"     ❌ Failed to parse: {e}")
                        continue
                
                # Check if it's today
                if dep_date:
                    is_today = today_start <= dep_date < today_end
                    print(f"     📅 Is today? {is_today} (comparing {dep_date} with {today_start} to {today_end})")
                    if is_today:
                        filtered_trips.append(trip)
                        print(f"     ✅ Added to filtered trips")
            
            todays_trips = filtered_trips
            
            print(f"📋 Found {len(todays_trips)} trips for today")
            
            # Filter trips that are within 2 hours before departure
            for trip in todays_trips:
                try:
                    # Try to get departure datetime from departure_time field (ISO format)
                    if trip.get('departure_time'):
                        if isinstance(trip['departure_time'], str):
                            # Parse ISO string
                            from dateutil import parser
                            departure_datetime = parser.parse(trip['departure_time'])
                            # Make timezone-naive for comparison
                            if departure_datetime.tzinfo is not None:
                                departure_datetime = departure_datetime.replace(tzinfo=None)
                        else:
                            # Already a datetime object
                            departure_datetime = trip['departure_time']
                            if hasattr(departure_datetime, 'tzinfo') and departure_datetime.tzinfo is not None:
                                departure_datetime = departure_datetime.replace(tzinfo=None)
                    else:
                        # Fallback: parse departureTime string
                        departure_time_str = trip.get('departureTime', '00:00')
                        time_parts = departure_time_str.split(':')
                        departure_hour = int(time_parts[0])
                        departure_minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                        
                        # Create departure datetime for today
                        departure_datetime = today_start.replace(
                            hour=departure_hour, 
                            minute=departure_minute
                        )
                    
                    print(f"  - Trip {trip.get('_id')}: departure = {departure_datetime}")
                    
                    # Calculate time difference
                    time_until_departure = (departure_datetime - now).total_seconds() / 3600  # in hours
                    
                    print(f"    ⏱️  Time until departure: {time_until_departure:.2f} hours")
                    
                    # Show trip if:
                    # - Status is scheduled and departure is within next 2 hours
                    # - OR status is scheduled and already departed (negative time) - driver can still start it
                    trip_status = trip.get('status', 'scheduled')
                    
                    if trip_status == 'scheduled':
                        # For scheduled trips, show if within reasonable window (departed up to 24 hours ago or departing in next 2 hours)
                        if -24 <= time_until_departure <= 2:
                            print(f"    ✅ This trip is active (scheduled, within time window)")
                            active_trip = trip
                            break
                        else:
                            print(f"    ⏭️  Trip not in active window yet")
                    else:
                        # For trips with other statuses (boarding, departed, etc.), always show them
                        print(f"    ✅ This trip is active (status: {trip_status})")
                        active_trip = trip
                        break
                        
                except Exception as time_error:
                    print(f"    ⚠️  Error parsing time: {time_error}")
                    import traceback
                    traceback.print_exc()
                    continue
        
        if not active_trip:
            print("❌ No trips found for this driver at all")
            return jsonify({
                'success': True,
                'trip': None,
                'schedule': None,
                'message': 'No active trip found'
            }), 200
        
        print(f"✅ Found trip: {active_trip.get('_id')} with status: {active_trip.get('status')}")
        
        # Serialize trip
        from app.routes.operator import serialize_document
        trip_data = serialize_document(active_trip)
        
        # Get route information
        route_id = active_trip.get('routeId') or active_trip.get('route_id')
        if route_id:
            try:
                route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                if route:
                    trip_data['origin'] = route.get('originCity')
                    trip_data['destination'] = route.get('destinationCity')
                    trip_data['departure_city'] = route.get('originCity')
                    trip_data['arrival_city'] = route.get('destinationCity')
            except Exception as route_error:
                print(f"⚠️ Error fetching route: {route_error}")
        
        # Get bus information
        bus_id = active_trip.get('busId') or active_trip.get('bus_id')
        if bus_id:
            try:
                bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                if bus:
                    trip_data['bus_plate_number'] = bus.get('plate_number') or bus.get('bus_number')
                    trip_data['bus'] = {
                        'plate_number': bus.get('plate_number') or bus.get('bus_number'),
                        'name': bus.get('bus_name'),
                        'type': bus.get('type')
                    }
            except Exception as bus_error:
                print(f"⚠️ Error fetching bus: {bus_error}")
        
        # Add passenger count
        passenger_count = mongo.db.bookings.count_documents({
            'schedule_id': str(active_trip['_id']),
            'status': {'$in': ['confirmed', 'checked_in', 'completed']},
            'payment_status': 'paid'
        })
        trip_data['passenger_count'] = passenger_count
        
        # Add departure time
        if not trip_data.get('departure_time'):
            trip_data['departure_time'] = active_trip.get('departureTime') or 'N/A'
        
        print(f"📦 Returning trip data: {trip_data.get('_id')}")
        
        return jsonify({
            'success': True,
            'trip': trip_data,
            'schedule': trip_data  # For compatibility
        }), 200
        
    except Exception as e:
        print(f"❌ Get active trip error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/trips/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_trips():
    """Get driver's upcoming trips"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        driver_id = str(driver['_id'])
        now = datetime.utcnow()
        
        # Get trips from now to next 30 days
        trips = list(mongo.db.busschedules.find({
            'driver_id': driver_id,
            'departureDate': {'$gte': now, '$lt': now + timedelta(days=30)},
            'status': {'$in': ['scheduled', 'delayed']}
        }).sort('departureDate', 1))
        
        enriched_trips = []
        for trip in trips:
            # Safely get route
            route = None
            route_id = trip.get('routeId') or trip.get('route_id')
            if route_id:
                try:
                    route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                except:
                    route = mongo.db.routes.find_one({'_id': route_id})
            
            # Safely get bus
            bus = None
            bus_id = trip.get('busId') or trip.get('bus_id')
            if bus_id:
                try:
                    bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    bus = mongo.db.buses.find_one({'_id': bus_id})
            
            # Count passengers
            total_bookings = mongo.db.bookings.count_documents({
                'schedule_id': str(trip['_id']),
                'status': {'$in': ['confirmed', 'checked_in']}
            })
            
            enriched_trips.append({
                '_id': str(trip['_id']),
                'departure_date': trip.get('departureDate') or trip.get('departure_date'),
                'departure_time': trip.get('departureTime') or trip.get('departure_time'),
                'arrival_time': trip.get('arrivalTime') or trip.get('arrival_time'),
                'status': trip.get('status'),
                'origin': trip.get('origin_city') or (route.get('originCity') if route else 'N/A'),
                'destination': trip.get('destination_city') or (route.get('destinationCity') if route else 'N/A'),
                'route': {
                    'origin': route.get('originCity'),
                    'destination': route.get('destinationCity'),
                    'distance': route.get('distanceKm'),
                    'duration': route.get('estimatedDurationHours')
                } if route else None,
                'bus': {
                    'number': bus.get('bus_number') if bus else trip.get('bus_number'),
                    'name': bus.get('bus_name') if bus else None,
                    'type': bus.get('type') if bus else trip.get('bus_type'),
                    'plate_number': bus.get('plate_number') if bus else trip.get('plate_number'),
                    'total_seats': bus.get('capacity') if bus else trip.get('total_seats', 45)
                } if bus or trip.get('bus_number') else None,
                'passengers': {
                    'total': total_bookings,
                    'capacity': trip.get('total_seats', 45)
                }
            })
        
        return jsonify({'trips': enriched_trips}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/trips/<trip_id>', methods=['GET'])
@jwt_required()
def get_trip_details(trip_id):
    """Get detailed information about a specific trip"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        trip = mongo.db.busschedules.find_one({'_id': ObjectId(trip_id)})
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
        
        # Verify this trip belongs to the driver
        if trip.get('driver_id') != str(driver['_id']):
            return jsonify({'error': 'Unauthorized access to this trip'}), 403
        
        # Get route and bus details
        route = mongo.db.routes.find_one({'_id': ObjectId(trip['routeId'])})
        bus = mongo.db.buses.find_one({'_id': ObjectId(trip['busId'])})
        
        # Get all bookings for this trip
        bookings = list(mongo.db.bookings.find({
            'schedule_id': trip_id,
            'status': {'$in': ['confirmed', 'checked_in', 'no_show']}
        }))
        
        passengers = []
        for booking in bookings:
            user = mongo.db.users.find_one({'_id': ObjectId(booking['user_id'])})
            passengers.append({
                '_id': str(booking['_id']),
                'booking_reference': booking.get('booking_reference'),
                'passenger_name': booking.get('passenger_name'),
                'passenger_phone': booking.get('passenger_phone'),
                'seat_number': booking.get('seat_number'),
                'status': booking.get('status'),
                'checked_in_at': booking.get('checked_in_at'),
                'baggage_count': booking.get('baggage_count', 0),
                'special_needs': booking.get('special_needs')
            })
        
        trip_details = {
            '_id': str(trip['_id']),
            'departure_date': trip.get('departureDate'),
            'departure_time': trip.get('departureTime'),
            'arrival_time': trip.get('arrivalTime'),
            'status': trip.get('status'),
            'route': {
                '_id': str(route['_id']),
                'origin': route.get('originCity'),
                'destination': route.get('destinationCity'),
                'distance': route.get('distanceKm'),
                'duration': route.get('estimatedDurationHours'),
                'stops': route.get('stops', [])
            } if route else None,
            'bus': {
                '_id': str(bus['_id']),
                'number': bus.get('bus_number'),
                'name': bus.get('bus_name'),
                'type': bus.get('type'),
                'total_seats': bus.get('total_seats'),
                'plate_number': bus.get('plate_number')
            } if bus else None,
            'passengers': passengers,
            'stats': {
                'total_passengers': len(passengers),
                'checked_in': len([p for p in passengers if p['status'] == 'checked_in']),
                'pending': len([p for p in passengers if p['status'] == 'confirmed']),
                'no_show': len([p for p in passengers if p['status'] == 'no_show'])
            }
        }
        
        return jsonify(trip_details), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/trips/<trip_id>/passengers', methods=['GET'])
@jwt_required()
def get_trip_passengers(trip_id):
    """Get passenger list for a trip"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        trip = mongo.db.busschedules.find_one({'_id': ObjectId(trip_id)})
        if not trip or trip.get('driver_id') != str(driver['_id']):
            return jsonify({'error': 'Trip not found or unauthorized'}), 404
        
        bookings = list(mongo.db.bookings.find({
            'schedule_id': trip_id,
            'status': {'$in': ['confirmed', 'checked_in', 'no_show']}
        }).sort('seat_number', 1))
        
        passengers = []
        for booking in bookings:
            passengers.append({
                '_id': str(booking['_id']),
                'booking_reference': booking.get('booking_reference'),
                'passenger_name': booking.get('passenger_name'),
                'passenger_phone': booking.get('passenger_phone'),
                'passenger_email': booking.get('passenger_email'),
                'seat_number': booking.get('seat_number'),
                'status': booking.get('status'),
                'checked_in_at': booking.get('checked_in_at'),
                'baggage_count': booking.get('baggage_count', 0),
                'special_needs': booking.get('special_needs'),
                'emergency_contact': booking.get('emergency_contact')
            })
        
        return jsonify({'passengers': passengers}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== CHECK-IN ====================
@driver_app_bp.route('/trips/<trip_id>/checkin', methods=['POST'])
@jwt_required()
def checkin_passenger(trip_id):
    """Check in a passenger for a trip"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        data = request.get_json()
        booking_id = data.get('booking_id')
        
        if not booking_id:
            return jsonify({'error': 'Booking ID is required'}), 400
        
        # Verify trip belongs to driver
        trip = mongo.db.busschedules.find_one({'_id': ObjectId(trip_id)})
        if not trip or trip.get('driver_id') != str(driver['_id']):
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get booking
        booking = mongo.db.bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking.get('status') == 'checked_in':
            return jsonify({'error': 'Passenger already checked in'}), 400
        
        # Update booking status
        mongo.db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'status': 'checked_in',
                'checked_in_at': datetime.utcnow(),
                'checked_in_by': str(driver['_id'])
            }}
        )
        
        return jsonify({
            'message': 'Passenger checked in successfully',
            'booking_id': booking_id,
            'checked_in_at': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/trips/<trip_id>/no-show', methods=['POST'])
@jwt_required()
def mark_no_show(trip_id):
    """Mark a passenger as no-show"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        data = request.get_json()
        booking_id = data.get('booking_id')
        
        if not booking_id:
            return jsonify({'error': 'Booking ID is required'}), 400
        
        # Verify trip belongs to driver
        trip = mongo.db.busschedules.find_one({'_id': ObjectId(trip_id)})
        if not trip or trip.get('driver_id') != str(driver['_id']):
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update booking status
        result = mongo.db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'status': 'no_show',
                'no_show_marked_at': datetime.utcnow(),
                'no_show_marked_by': str(driver['_id'])
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Booking not found'}), 404
        
        return jsonify({'message': 'Passenger marked as no-show'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== TRIP STATUS ====================
@driver_app_bp.route('/trips/<trip_id>/status', methods=['PUT'])
@jwt_required()
def update_trip_status(trip_id):
    """Update trip status (start trip, complete trip, etc.)"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400
        
        valid_statuses = ['scheduled', 'departed', 'arrived', 'completed', 'cancelled', 'delayed']
        if new_status not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
        
        # Verify trip belongs to driver
        trip = mongo.db.busschedules.find_one({'_id': ObjectId(trip_id)})
        if not trip or trip.get('driver_id') != str(driver['_id']):
            return jsonify({'error': 'Unauthorized'}), 403
        
        update_data = {
            'status': new_status,
            'status_updated_at': datetime.utcnow(),
            'status_updated_by': str(driver['_id'])
        }
        
        # Add specific timestamps based on status
        if new_status == 'departed':
            update_data['actual_departure_time'] = datetime.utcnow()
        elif new_status == 'arrived' or new_status == 'completed':
            update_data['actual_arrival_time'] = datetime.utcnow()
        
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(trip_id)},
            {'$set': update_data}
        )
        
        return jsonify({
            'message': f'Trip status updated to {new_status}',
            'trip_id': trip_id,
            'new_status': new_status
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/trips/<trip_id>/start', methods=['POST'])
@jwt_required()
def start_trip(trip_id):
    """Start a trip - Driver can start journey up to 3 hours before departure time"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        trip = mongo.db.busschedules.find_one({'_id': ObjectId(trip_id)})
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
            
        if trip.get('driver_id') != str(driver['_id']):
            return jsonify({'error': 'You are not assigned to this trip'}), 403
        
        # Check if trip is already started or completed
        current_status = trip.get('status', 'scheduled')
        if current_status in ['departed', 'active', 'completed']:
            return jsonify({
                'error': f'Trip already {current_status}',
                'status': current_status
            }), 400
        
        # Validate time window - can start up to 3 hours before departure
        departure_date = trip.get('departureDate') or trip.get('departure_date')
        departure_time = trip.get('departure_time', '00:00')
        
        if departure_date:
            # Parse departure datetime
            if isinstance(departure_date, str):
                departure_datetime = datetime.strptime(f"{departure_date} {departure_time}", '%Y-%m-%d %H:%M')
            else:
                # It's already a datetime object
                time_parts = departure_time.split(':')
                departure_datetime = departure_date.replace(
                    hour=int(time_parts[0]), 
                    minute=int(time_parts[1]),
                    second=0,
                    microsecond=0
                )
            
            now = datetime.utcnow()
            time_until_departure = (departure_datetime - now).total_seconds() / 3600  # hours
            
            # Can start 3 hours before departure
            if time_until_departure > 3:
                hours_remaining = int(time_until_departure)
                minutes_remaining = int((time_until_departure - hours_remaining) * 60)
                return jsonify({
                    'error': f'Cannot start journey yet. You can start up to 3 hours before departure.',
                    'time_until_allowed': f'{hours_remaining}h {minutes_remaining}m',
                    'departure_time': departure_datetime.isoformat(),
                    'can_start_at': (departure_datetime - timedelta(hours=3)).isoformat()
                }), 400
        
        # Start the journey
        result = mongo.db.busschedules.update_one(
            {'_id': ObjectId(trip_id)},
            {'$set': {
                'status': 'departed',  # This will show as "On Route" in operator dashboard
                'actual_departure_time': datetime.utcnow(),
                'started_by': str(driver['_id']),
                'journey_started_at': datetime.utcnow()
            }}
        )
        
        print(f"🚀 Trip {trip_id} started by driver {driver.get('name')}")
        print(f"   - Status changed to 'departed' (On Route)")
        print(f"   - Modified count: {result.modified_count}")
        
        return jsonify({
            'success': True,
            'message': 'Journey started successfully! 🚀',
            'status': 'departed',
            'actual_departure_time': datetime.utcnow().isoformat(),
            'modified': result.modified_count
        }), 200
        
    except Exception as e:
        print(f"❌ Start trip error: {e}")
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/trips/<trip_id>/can-start', methods=['GET'])
@jwt_required()
def can_start_trip(trip_id):
    """Check if driver can start the journey (within 3 hours of departure)"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        trip = mongo.db.busschedules.find_one({'_id': ObjectId(trip_id)})
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
            
        if trip.get('driver_id') != str(driver['_id']):
            return jsonify({'error': 'Unauthorized'}), 403
        
        current_status = trip.get('status', 'scheduled')
        
        # Already started or completed
        if current_status in ['departed', 'active', 'completed']:
            return jsonify({
                'can_start': False,
                'reason': f'Trip already {current_status}',
                'current_status': current_status
            }), 200
        
        # Check time window
        departure_date = trip.get('departureDate') or trip.get('departure_date')
        departure_time = trip.get('departure_time', '00:00')
        
        if departure_date:
            if isinstance(departure_date, str):
                departure_datetime = datetime.strptime(f"{departure_date} {departure_time}", '%Y-%m-%d %H:%M')
            else:
                time_parts = departure_time.split(':')
                departure_datetime = departure_date.replace(
                    hour=int(time_parts[0]), 
                    minute=int(time_parts[1]),
                    second=0,
                    microsecond=0
                )
            
            now = datetime.utcnow()
            time_until_departure = (departure_datetime - now).total_seconds() / 3600
            
            can_start = time_until_departure <= 3
            
            return jsonify({
                'can_start': can_start,
                'current_status': current_status,
                'time_until_departure_hours': round(time_until_departure, 2),
                'departure_time': departure_datetime.isoformat(),
                'can_start_at': (departure_datetime - timedelta(hours=3)).isoformat() if not can_start else None,
                'message': 'You can start the journey now' if can_start else f'You can start in {int(time_until_departure - 3)} hours'
            }), 200
        
        # No departure time set, allow start
        return jsonify({
            'can_start': True,
            'current_status': current_status,
            'message': 'You can start the journey'
        }), 200
        
    except Exception as e:
        print(f"❌ Can start trip check error: {e}")
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/trips/<trip_id>/complete', methods=['POST'])
@jwt_required()
def complete_trip(trip_id):
    """Complete a trip"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        trip = mongo.db.busschedules.find_one({'_id': ObjectId(trip_id)})
        if not trip or trip.get('driver_id') != str(driver['_id']):
            return jsonify({'error': 'Unauthorized'}), 403
        
        result = mongo.db.busschedules.update_one(
            {'_id': ObjectId(trip_id)},
            {'$set': {
                'status': 'completed',
                'actual_arrival_time': datetime.utcnow(),
                'completed_by': str(driver['_id'])
            }}
        )
        
        print(f"✅ Trip {trip_id} completed - modified count: {result.modified_count}")
        
        # Mark all confirmed bookings as completed
        mongo.db.bookings.update_many(
            {'schedule_id': trip_id, 'status': 'checked_in'},
            {'$set': {'status': 'completed'}}
        )
        
        return jsonify({'message': 'Trip completed successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== SCHEDULES ====================
@driver_app_bp.route('/schedules', methods=['GET'])
@jwt_required()
def get_driver_schedules():
    """Get driver's schedule for a date range"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = datetime.utcnow()
        else:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        if not end_date:
            end_date = start_date + timedelta(days=30)
        else:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Query with both field name formats
        schedules = list(mongo.db.busschedules.find({
            'driver_id': str(driver['_id']),
            '$or': [
                {'departureDate': {'$gte': start_date, '$lte': end_date}},
                {'departure_date': {'$gte': start_date.strftime('%Y-%m-%d'), '$lte': end_date.strftime('%Y-%m-%d')}}
            ]
        }).sort([('departure_date', 1), ('departureDate', 1)]))
        
        enriched_schedules = []
        for schedule in schedules:
            # Get route
            route_id = schedule.get('routeId') or schedule.get('route_id')
            route = None
            if route_id:
                try:
                    route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                except:
                    route = mongo.db.routes.find_one({'_id': route_id})
            
            # Get bus
            bus_id = schedule.get('busId') or schedule.get('bus_id')
            bus = None
            if bus_id:
                try:
                    bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    bus = mongo.db.buses.find_one({'_id': bus_id})
            
            # Get booked seats count
            booked_seats = mongo.db.bookings.count_documents({
                'schedule_id': str(schedule['_id']),
                'status': {'$in': ['confirmed', 'checked_in']}
            })
            
            enriched_schedules.append({
                '_id': str(schedule['_id']),
                'departure_date': schedule.get('departure_date') or schedule.get('departureDate'),
                'departure_time': schedule.get('departure_time') or schedule.get('departureTime'),
                'arrival_time': schedule.get('arrival_time') or schedule.get('arrivalTime'),
                'status': schedule.get('status', 'scheduled'),
                'booked_seats': booked_seats,
                'total_seats': schedule.get('total_seats') or schedule.get('totalSeats') or (bus.get('capacity') if bus else 45),
                'route': {
                    'origin': route.get('originCity') if route else None,
                    'destination': route.get('destinationCity') if route else None,
                    'originCity': route.get('originCity') if route else None,
                    'destinationCity': route.get('destinationCity') if route else None
                } if route else None,
                'bus': {
                    'plate_number': bus.get('plate_number') if bus else schedule.get('plate_number'),
                    'bus_number': bus.get('bus_number') if bus else None,
                    'capacity': bus.get('capacity') if bus else None
                } if bus else {'plate_number': schedule.get('plate_number')}
            })
        
        return jsonify({'schedules': enriched_schedules}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== PROFILE ====================
@driver_app_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_driver_profile():
    """Get driver profile"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        profile = {
            '_id': str(driver['_id']),
            'full_name': driver.get('full_name'),
            'email': driver.get('email'),
            'phone': driver.get('phone'),
            'license_number': driver.get('license_number'),
            'license_expiry': driver.get('license_expiry'),
            'experience_years': driver.get('experience_years', 0),
            'date_of_birth': driver.get('date_of_birth'),
            'address': driver.get('address'),
            'emergency_contact': driver.get('emergency_contact'),
            'profile_picture': driver.get('profile_picture'),
            'documents': driver.get('documents', []),
            'created_at': driver.get('created_at')
        }
        
        return jsonify(profile), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@driver_app_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_driver_profile():
    """Update driver profile"""
    try:
        driver = get_current_driver()
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        data = request.get_json()
        
        # Fields that can be updated
        allowed_fields = ['phone', 'address', 'emergency_contact', 'profile_picture']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        update_data['updated_at'] = datetime.utcnow()
        
        mongo.db.users.update_one(
            {'_id': driver['_id']},
            {'$set': update_data}
        )
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

"""
Bus Tracking Routes
Handles real-time bus location tracking and bus stop check-ins
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
import logging

from app import mongo
from app.routes.operator import serialize_document

tracking_bp = Blueprint('tracking', __name__)
logger = logging.getLogger(__name__)

# ==================== BUS STOPS MANAGEMENT ====================

@tracking_bp.route('/bus-stops', methods=['GET'])
def get_bus_stops():
    """Get all bus stops for a route"""
    try:
        route_id = request.args.get('route_id')
        schedule_id = request.args.get('schedule_id')
        
        query = {}
        if route_id:
            query['route_id'] = route_id
        
        bus_stops = list(mongo.db.busstops.find(query).sort('stop_order', 1))
        
        # If schedule_id provided, mark which stops are checked
        checked_stops = []
        if schedule_id:
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
            if schedule:
                checked_stops = schedule.get('checked_stops', [])
        
        # Enrich stops with check-in status
        enriched_stops = []
        for stop in bus_stops:
            stop_data = serialize_document(stop)
            stop_data['is_checked'] = any(
                cs.get('stop_id') == str(stop['_id']) 
                for cs in checked_stops
            )
            
            # Find check-in time if checked
            for cs in checked_stops:
                if cs.get('stop_id') == str(stop['_id']):
                    stop_data['checked_at'] = cs.get('checked_at').isoformat() if isinstance(cs.get('checked_at'), datetime) else None
                    break
            
            enriched_stops.append(stop_data)
        
        return jsonify({
            'success': True,
            'bus_stops': enriched_stops,
            'total': len(enriched_stops),
            'checked_count': len(checked_stops)
        }), 200
        
    except Exception as e:
        logger.error(f"Get bus stops error: {e}")
        return jsonify({'error': str(e)}), 500

@tracking_bp.route('/driver/my-route-stops', methods=['GET'])
@jwt_required()
def get_my_route_stops():
    """Get route stops for driver's current assignment"""
    try:
        current_user = get_jwt_identity()
        
        # Verify user is a driver
        user = mongo.db.users.find_one({'_id': ObjectId(current_user)})
        if not user or user.get('role') != 'driver':
            return jsonify({'error': 'Driver access required'}), 403
        
        schedule_id = request.args.get('schedule_id')
        if not schedule_id:
            return jsonify({'error': 'Schedule ID is required'}), 400
        
        # Get schedule
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Verify driver is assigned to this schedule
        if schedule.get('driver_id') != current_user:
            return jsonify({'error': 'You are not assigned to this schedule'}), 403
        
        # Get route to fetch stops - handle multiple field name variations
        route_id = schedule.get('route_id') or schedule.get('routeId') or schedule.get('route')
        route = None
        
        logger.info(f"🔍 DEBUG - Schedule fields: {list(schedule.keys())}")
        logger.info(f"🔍 DEBUG - Looking for route with ID: {route_id} (type: {type(route_id)})")
        
        if route_id:
            try:
                # Try to find route by ObjectId
                route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                if route:
                    logger.info(f"✅ Found route by ObjectId: {route.get('name')}")
            except Exception as e:
                logger.info(f"⚠️ Could not find route by ObjectId: {e}")
                # If that fails, try as string
                try:
                    route = mongo.db.routes.find_one({'_id': route_id})
                    if route:
                        logger.info(f"✅ Found route by string ID: {route.get('name')}")
                except Exception as e2:
                    logger.info(f"⚠️ Could not find route by string ID: {e2}")
        
        # If no route_id in schedule, try to find route by matching origin and destination
        if not route and schedule.get('origin_city') and schedule.get('destination_city'):
            logger.info(f"🔍 DEBUG - Trying to find route by cities: {schedule.get('origin_city')} -> {schedule.get('destination_city')}")
            route = mongo.db.routes.find_one({
                'origin_city': schedule.get('origin_city'),
                'destination_city': schedule.get('destination_city')
            })
            if route:
                logger.info(f"✅ Found route by city match: {route.get('name')}")
                route_id = str(route['_id'])
        
        if not route:
            logger.warning(f"❌ Route not found for schedule {schedule_id}. Route ID was: {route_id}")
            logger.warning(f"   Schedule origin: {schedule.get('origin_city')}, destination: {schedule.get('destination_city')}")
        
        # Get stops from route document (stored as array in route)
        intermediate_stops = route.get('stops', []) if route else []
        
        # ONLY use intermediate stops for check-in tracking
        # Origin and destination are not checkable stops - they are the start/end points
        bus_stops = intermediate_stops if intermediate_stops else []
        
        # Log for debugging
        logger.info(f"🔍 DEBUG - Schedule ID: {schedule_id}")
        logger.info(f"🔍 DEBUG - Route ID from schedule: {route_id}")
        logger.info(f"🔍 DEBUG - Route found: {route is not None}")
        if route:
            logger.info(f"🔍 DEBUG - Route _id: {route.get('_id')}")
            logger.info(f"🔍 DEBUG - Route name: {route.get('name')}")
            logger.info(f"🔍 DEBUG - Route origin: {route.get('origin_city')}")
            logger.info(f"🔍 DEBUG - Route destination: {route.get('destination_city')}")
            logger.info(f"🔍 DEBUG - Route stops field: {route.get('stops', [])}")
            logger.info(f"🔍 DEBUG - Route stops type: {type(route.get('stops', []))}")
        else:
            logger.warning(f"❌ No route found - cannot fetch stops")
        logger.info(f"🔍 DEBUG - Total intermediate stops: {len(bus_stops)}")
        logger.info(f"🔍 DEBUG - Stops list: {bus_stops}")
        
        # Get checked stops from schedule
        checked_stops = schedule.get('checked_stops', [])
        
        # Enrich stops with check-in status
        enriched_stops = []
        for index, stop in enumerate(bus_stops):
            # Handle both string stops (simple city names) and object stops (detailed info)
            if isinstance(stop, str):
                # Simple string stop (just city name)
                stop_id = f"stop_{index}"
                stop_name = stop
                stop_order = index + 1
                location = stop
                estimated_arrival = (index + 1) * 60  # Estimate 60 minutes between stops
            else:
                # Object stop with detailed information
                stop_id = stop.get('_id') or stop.get('id') or f"stop_{index}"
                stop_name = stop.get('name') or stop.get('stop_name') or f"Stop {index + 1}"
                stop_order = stop.get('order') or stop.get('stop_order') or (index + 1)
                location = stop.get('location', stop_name)
                estimated_arrival = stop.get('estimated_arrival_minutes', (index + 1) * 60)
            
            stop_data = {
                '_id': str(stop_id),
                'stop_name': stop_name,
                'stop_order': stop_order,
                'location': location,
                'estimated_arrival_minutes': estimated_arrival,
                # Add distance information if available
                'distance_from_origin': stop.get('distance_from_origin', 0) if isinstance(stop, dict) else 0,
                'distance_to_destination': stop.get('distance_to_destination', 0) if isinstance(stop, dict) else 0
            }
            
            # Check if this stop is checked
            is_checked = any(
                cs.get('stop_id') == str(stop_id) or 
                cs.get('stop_name') == stop_name or
                cs.get('stop_order') == stop_order
                for cs in checked_stops
            )
            stop_data['is_checked'] = is_checked
            
            # Find check-in details
            for cs in checked_stops:
                if (cs.get('stop_id') == str(stop_id) or 
                    cs.get('stop_name') == stop_name or
                    cs.get('stop_order') == stop_order):
                    stop_data['checked_at'] = cs.get('checked_at').isoformat() if isinstance(cs.get('checked_at'), datetime) else None
                    break
            
            # Determine if this is the next stop to check
            if not is_checked:
                # Check if all previous stops are checked
                all_previous_checked = all(
                    any(
                        cs.get('stop_order') == prev_order
                        for cs in checked_stops
                    )
                    for prev_order in range(1, stop_order)
                )
                stop_data['is_next'] = all_previous_checked
            else:
                stop_data['is_next'] = False
            
            enriched_stops.append(stop_data)
        
        return jsonify({
            'success': True,
            'schedule_id': schedule_id,
            'route_name': f"{schedule.get('departure_city', 'Unknown')} to {schedule.get('arrival_city', 'Unknown')}",
            'bus_stops': enriched_stops,
            'stops': enriched_stops,  # Also include as 'stops' for compatibility
            'total_stops': len(enriched_stops),
            'checked_stops': len(checked_stops),
            'progress_percentage': round((len(checked_stops) / len(enriched_stops) * 100)) if enriched_stops else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Get my route stops error: {e}")
        return jsonify({'error': str(e)}), 500

@tracking_bp.route('/bus-stops', methods=['POST'])
@jwt_required()
def create_bus_stop():
    """Create a new bus stop"""
    try:
        current_user = get_jwt_identity()
        
        # Check if user is operator/admin
        user = mongo.db.users.find_one({'_id': ObjectId(current_user)})
        if not user or user.get('role') not in ['operator', 'admin']:
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        
        bus_stop = {
            'route_id': data.get('route_id'),
            'stop_name': data.get('stop_name'),
            'stop_order': data.get('stop_order', 1),
            'estimated_arrival_minutes': data.get('estimated_arrival_minutes', 0),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'is_major_stop': data.get('is_major_stop', False),
            'created_at': datetime.utcnow(),
            'created_by': current_user
        }
        
        result = mongo.db.busstops.insert_one(bus_stop)
        bus_stop['_id'] = result.inserted_id
        
        return jsonify({
            'success': True,
            'message': 'Bus stop created successfully',
            'bus_stop': serialize_document(bus_stop)
        }), 201
        
    except Exception as e:
        logger.error(f"Create bus stop error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== BUS LOCATION TRACKING ====================

@tracking_bp.route('/bus-location', methods=['POST'])
@jwt_required()
def update_bus_location():
    """Driver checks in at bus stop - REAL TRACKING"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a driver
        user = mongo.db.users.find_one({'_id': ObjectId(current_user)})
        if not user or user.get('role') != 'driver':
            return jsonify({'error': 'Driver access required'}), 403
        
        schedule_id = data.get('schedule_id')
        bus_stop_id = data.get('bus_stop_id')
        
        if not schedule_id or not bus_stop_id:
            return jsonify({'error': 'Schedule ID and Bus Stop ID are required'}), 400
        
        # Get schedule details first
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Verify driver is assigned to this schedule
        schedule_driver_id = schedule.get('driver_id')
        print(f"🔍 Check-in verification: schedule_driver_id={schedule_driver_id} (type: {type(schedule_driver_id)}), current_user={current_user} (type: {type(current_user)})")
        
        if str(schedule_driver_id) != str(current_user):
            return jsonify({'error': f'You are not assigned to this schedule'}), 403
        
        # Get bus stop details - handle both database stops and route-based stops
        bus_stop = None
        stop_name = None
        stop_order = None
        
        # First try to find in busstops collection
        try:
            bus_stop = mongo.db.busstops.find_one({'_id': ObjectId(bus_stop_id)})
        except:
            try:
                bus_stop = mongo.db.busstops.find_one({'_id': bus_stop_id})
            except:
                pass
        
        if bus_stop:
            # Found in busstops collection
            stop_name = bus_stop.get('stop_name')
            stop_order = bus_stop.get('stop_order')
        else:
            # Not in busstops collection, get from route stops
            route_id = schedule.get('route_id') or schedule.get('routeId')
            route = None
            if route_id:
                try:
                    route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                except:
                    route = mongo.db.routes.find_one({'_id': route_id})
            
            # If no route_id, try to find by cities
            if not route and schedule.get('origin_city') and schedule.get('destination_city'):
                logger.info(f"🔍 Check-in DEBUG - Trying to find route by cities: {schedule.get('origin_city')} -> {schedule.get('destination_city')}")
                route = mongo.db.routes.find_one({
                    'origin_city': schedule.get('origin_city'),
                    'destination_city': schedule.get('destination_city')
                })
                if route:
                    logger.info(f"✅ Check-in DEBUG - Found route by city match: {route.get('name')}")
                    route_id = str(route['_id'])
            
            logger.info(f"🔍 Check-in DEBUG - Route ID: {route_id}, Route found: {route is not None}")
            
            if route:
                intermediate_stops = route.get('stops', [])
                logger.info(f"🔍 Check-in DEBUG - Intermediate stops: {intermediate_stops}")
                
                # ONLY use intermediate stops - origin and destination are not checkable stops
                complete_stops = intermediate_stops
                
                # Extract stop info from bus_stop_id (format: stop_0, stop_1, etc.)
                if bus_stop_id.startswith('stop_'):
                    stop_index = int(bus_stop_id.split('_')[1])
                    logger.info(f"🔍 Check-in DEBUG - Stop index: {stop_index}, Total stops: {len(complete_stops)}")
                    
                    if stop_index < len(complete_stops):
                        stop_data = complete_stops[stop_index]
                        if isinstance(stop_data, str):
                            stop_name = stop_data
                            stop_order = stop_index + 1
                        else:
                            stop_name = stop_data.get('name') or stop_data.get('stop_name')
                            stop_order = stop_data.get('order') or stop_data.get('stop_order') or (stop_index + 1)
                        
                        logger.info(f"✅ Check-in DEBUG - Found stop: {stop_name}, order: {stop_order}")
        
        if not stop_name:
            logger.error(f"❌ Check-in ERROR - Bus stop not found: {bus_stop_id}")
            return jsonify({'error': f'Bus stop not found: {bus_stop_id}'}), 404
        
        # Calculate distance information
        distance_from_origin = 0
        distance_to_destination = 0
        total_route_distance = 0
        
        # Get route to calculate distances
        route_id = schedule.get('route_id') or schedule.get('routeId')
        if route_id:
            try:
                route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
            except:
                route = mongo.db.routes.find_one({'_id': route_id})
            
            if route:
                total_route_distance = route.get('distance_km', 0)
                stops = route.get('stops', [])
                
                # Find the current stop in the route stops
                for stop in stops:
                    if isinstance(stop, dict):
                        if stop.get('name') == stop_name or stop.get('order') == stop_order:
                            distance_from_origin = stop.get('distance_from_origin', 0)
                            distance_to_destination = stop.get('distance_to_destination', 0)
                            break
        
        # Create check-in record with distance information
        checkin_data = {
            'schedule_id': schedule_id,
            'driver_id': current_user,
            'driver_name': user.get('full_name', 'Unknown Driver'),
            'location_type': 'bus_stop',
            'bus_stop_id': bus_stop_id,
            'bus_stop_name': stop_name,
            'stop_order': stop_order,
            'arrival_time': datetime.utcnow(),
            'passengers_boarded': data.get('passengers_boarded', 0),
            'passengers_alighted': data.get('passengers_alighted', 0),
            'notes': data.get('notes', ''),
            'status': 'checked_in',
            'timestamp': datetime.utcnow(),
            # Distance tracking
            'distance_from_origin_km': distance_from_origin,
            'distance_to_destination_km': distance_to_destination,
            'total_route_distance_km': total_route_distance,
            'progress_percentage': round((distance_from_origin / total_route_distance * 100), 2) if total_route_distance > 0 else 0
        }
        
        # Determine if this is the final stop
        route_id = schedule.get('routeId')
        total_stops = 0
        
        # Get total stops count - check both busstops collection and route stops
        total_stops = mongo.db.busstops.count_documents({'route_id': route_id})
        if total_stops == 0:
            # No stops in busstops collection, check route
            route = None
            if route_id:
                try:
                    route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                except:
                    route = mongo.db.routes.find_one({'_id': route_id})
            if route:
                # Total stops = origin + intermediate stops + destination
                intermediate_stops = len(route.get('stops', []))
                total_stops = intermediate_stops + 2  # +2 for origin and destination
        
        # Check if this is the final stop (destination)
        is_final_stop = stop_order == total_stops if total_stops > 0 else False
        
        print(f"🔍 Stop check: stop_order={stop_order}, total_stops={total_stops}, is_final={is_final_stop}")
        
        if is_final_stop:
            checkin_data['status'] = 'arrived'
        
        # Insert check-in record
        result = mongo.db.bus_locations.insert_one(checkin_data)
        checkin_data['_id'] = result.inserted_id
        
        # Update schedule with latest location
        schedule_update = {
            'current_location': stop_name,
            'last_location_update': datetime.utcnow(),
            'tracking_status': 'arrived' if is_final_stop else 'in_transit'
        }
        
        # If this is the final stop, mark schedule as completed
        if is_final_stop:
            schedule_update['status'] = 'completed'
            schedule_update['actual_arrival_time'] = datetime.utcnow()
            print(f"🎉 SCHEDULE COMPLETED! Marking schedule {schedule_id} as completed")
        
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(schedule_id)},
            {'$set': schedule_update}
        )
        
        if is_final_stop:
            print(f"✅ Schedule status updated to 'completed' in database")
        
        # Mark the stop as checked in the schedule
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(schedule_id)},
            {
                '$addToSet': {
                    'checked_stops': {
                        'stop_id': bus_stop_id,
                        'stop_name': stop_name,
                        'stop_order': stop_order,
                        'checked_at': datetime.utcnow()
                    }
                }
            }
        )
        
        print(f"✅ Driver checked in at stop: {stop_name}")
        print(f"   - Schedule: {schedule_id}")
        print(f"   - Stop Order: {stop_order}/{total_stops}")
        print(f"   - Final Stop: {is_final_stop}")
        if is_final_stop:
            print(f"   - 🎉 Journey completed! Schedule marked as 'completed'")
        
        return jsonify({
            'success': True,
            'message': f'Checked in at {stop_name}' + (' - Journey Complete! 🎉' if is_final_stop else ''),
            'checkin': serialize_document(checkin_data),
            'is_final_stop': is_final_stop,
            'schedule_completed': is_final_stop,
            'next_stop_order': stop_order + 1 if not is_final_stop else None,
            'total_stops': total_stops,
            # Distance information
            'distance_traveled_km': distance_from_origin,
            'distance_remaining_km': distance_to_destination,
            'total_distance_km': total_route_distance,
            'progress_percentage': round((distance_from_origin / total_route_distance * 100), 2) if total_route_distance > 0 else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Check-in error: {e}")
        return jsonify({'error': str(e)}), 500

@tracking_bp.route('/bus-location/<schedule_id>', methods=['GET'])
@jwt_required()
def get_bus_location(schedule_id):
    """Get current bus location and tracking history"""
    try:
        # Get latest location
        latest_location = mongo.db.bus_locations.find_one(
            {'schedule_id': schedule_id},
            sort=[('timestamp', -1)]
        )
        
        # Get location history (last 10 updates)
        location_history = list(mongo.db.bus_locations.find(
            {'schedule_id': schedule_id}
        ).sort('timestamp', -1).limit(10))
        
        # Get schedule details
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        
        return jsonify({
            'success': True,
            'schedule': serialize_document(schedule) if schedule else None,
            'current_location': serialize_document(latest_location) if latest_location else None,
            'location_history': [serialize_document(loc) for loc in location_history],
            'total_updates': len(location_history)
        }), 200
        
    except Exception as e:
        logger.error(f"Get bus location error: {e}")
        return jsonify({'error': str(e)}), 500

@tracking_bp.route('/active-buses', methods=['GET'])
@jwt_required()
def get_active_buses():
    """Get all active buses with their current locations based on stop check-ins (Operator view)"""
    try:
        current_user = get_jwt_identity()
        
        # Check if user is operator/admin
        user = mongo.db.users.find_one({'_id': ObjectId(current_user)})
        if not user or user.get('role') not in ['operator', 'admin']:
            return jsonify({'error': 'Operator access required'}), 403
        
        # Get active schedules (today and upcoming)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_str = today.strftime('%Y-%m-%d')
        
        # Query for both string and datetime formats, show all upcoming schedules
        active_schedules = list(mongo.db.busschedules.find({
            '$or': [
                # String format (most common)
                {
                    'departure_date': {'$gte': today_str},
                    'status': {'$in': ['scheduled', 'boarding', 'active', 'departed']}
                },
                # Datetime format (legacy)
                {
                    'departure_date': {'$gte': today},
                    'status': {'$in': ['scheduled', 'boarding', 'active', 'departed']}
                }
            ]
        }).sort('departure_date', 1))
        
        print(f"🚌 Found {len(active_schedules)} active/upcoming schedules")
        
        # Enrich with tracking data based on checked stops
        buses_with_tracking = []
        for schedule in active_schedules:
            schedule_id = str(schedule['_id'])
            route_id = schedule.get('routeId')
            
            # Get total stops for this route
            total_stops = mongo.db.busstops.count_documents({'route_id': route_id})
            
            # Get checked stops from schedule
            checked_stops = schedule.get('checked_stops', [])
            checked_count = len(checked_stops)
            
            # Get latest check-in
            latest_checkin = mongo.db.bus_locations.find_one(
                {'schedule_id': schedule_id, 'location_type': 'bus_stop'},
                sort=[('timestamp', -1)]
            )
            
            bus_data = serialize_document(schedule)
            
            # Ensure route name is set
            if not bus_data.get('route_name'):
                origin = bus_data.get('origin_city') or bus_data.get('departure_city') or 'Unknown'
                destination = bus_data.get('destination_city') or bus_data.get('arrival_city') or 'Unknown'
                bus_data['route_name'] = f"{origin} - {destination}"
            
            # Ensure origin and destination are set
            if not bus_data.get('origin_city'):
                bus_data['origin_city'] = bus_data.get('departure_city', 'Unknown')
            if not bus_data.get('destination_city'):
                bus_data['destination_city'] = bus_data.get('arrival_city', 'Unknown')
            
            # Ensure bus number is set
            if not bus_data.get('bus_number'):
                bus_data['bus_number'] = bus_data.get('vehicle_number') or bus_data.get('bus_no') or 'N/A'
            
            # Fetch driver information - handle both direct driver_name and driver_id reference
            # First check if driver_name is already in schedule (direct storage)
            if schedule.get('driver_name'):
                bus_data['driver_name'] = schedule.get('driver_name')
                bus_data['driver_phone'] = schedule.get('driver_phone') or None
            else:
                # Otherwise, try to fetch from users collection using driver_id
                driver_id = schedule.get('driver_id')
                if driver_id:
                    try:
                        driver = mongo.db.users.find_one({'_id': ObjectId(driver_id)})
                        if driver:
                            bus_data['driver_name'] = driver.get('full_name') or driver.get('name') or 'Unknown Driver'
                            bus_data['driver_phone'] = driver.get('phone') or driver.get('phone_number') or None
                        else:
                            bus_data['driver_name'] = 'Not assigned'
                            bus_data['driver_phone'] = None
                    except Exception as e:
                        logger.error(f"Error fetching driver info: {e}")
                        bus_data['driver_name'] = 'Not assigned'
                        bus_data['driver_phone'] = None
                else:
                    bus_data['driver_name'] = 'Not assigned'
                    bus_data['driver_phone'] = None
            
            # Ensure departure time is set
            if not bus_data.get('departure_time'):
                bus_data['departure_time'] = 'N/A'
            
            # Tracking information based on checked stops
            bus_data['total_stops'] = total_stops
            bus_data['checked_stops_count'] = checked_count
            bus_data['progress_percentage'] = round((checked_count / total_stops * 100)) if total_stops > 0 else 0
            bus_data['latest_checkin'] = serialize_document(latest_checkin) if latest_checkin else None
            bus_data['is_tracking'] = checked_count > 0
            
            # Current location based on latest check-in
            if latest_checkin:
                bus_data['current_location'] = latest_checkin.get('bus_stop_name', 'Unknown')
                bus_data['current_stop_order'] = latest_checkin.get('stop_order', 0)
                
                # Calculate time since last check-in
                time_since_checkin = (datetime.utcnow() - latest_checkin.get('timestamp', datetime.utcnow())).total_seconds() / 60
                bus_data['minutes_since_checkin'] = round(time_since_checkin)
                bus_data['is_delayed'] = time_since_checkin > 60  # No check-in in 60 minutes
            else:
                bus_data['current_location'] = 'Not started' if schedule.get('status') == 'scheduled' else 'No check-ins yet'
                bus_data['current_stop_order'] = 0
                bus_data['minutes_since_checkin'] = None
                bus_data['is_delayed'] = False
            
            # Journey status - respect schedule status first, then use check-ins
            schedule_status = schedule.get('status', 'scheduled')
            
            if schedule_status == 'completed':
                # If schedule is marked completed, always show as completed
                bus_data['journey_status'] = 'completed'
            elif schedule_status == 'cancelled':
                bus_data['journey_status'] = 'cancelled'
            elif checked_count == 0:
                # No check-ins yet
                if schedule_status in ['active', 'departed', 'boarding']:
                    bus_data['journey_status'] = 'in_progress'  # Started but no check-ins
                else:
                    bus_data['journey_status'] = 'not_started'
            elif checked_count == total_stops:
                # All stops checked
                bus_data['journey_status'] = 'completed'
            else:
                # Some stops checked
                bus_data['journey_status'] = 'in_progress'
            
            buses_with_tracking.append(bus_data)
        
        return jsonify({
            'success': True,
            'active_buses': buses_with_tracking,
            'total': len(buses_with_tracking),
            'tracking_count': len([b for b in buses_with_tracking if b.get('is_tracking')]),
            'in_progress': len([b for b in buses_with_tracking if b.get('journey_status') == 'in_progress']),
            'completed': len([b for b in buses_with_tracking if b.get('journey_status') == 'completed']),
            'not_started': len([b for b in buses_with_tracking if b.get('journey_status') == 'not_started']),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get active buses error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== TRACKING SIMULATOR ====================

@tracking_bp.route('/simulator/generate-location', methods=['POST'])
@jwt_required()
def simulate_bus_location():
    """Simulate bus location updates for testing (Operator/Admin only)"""
    try:
        current_user = get_jwt_identity()
        
        # Check if user is operator/admin
        user = mongo.db.users.find_one({'_id': ObjectId(current_user)})
        if not user or user.get('role') not in ['operator', 'admin']:
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        schedule_id = data.get('schedule_id')
        
        # Get schedule
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Simulate location data
        import random
        
        simulation_type = data.get('type', 'random')  # random, bus_stop, gps
        
        if simulation_type == 'bus_stop':
            # Simulate bus stop check-in
            bus_stops = ['Departure Terminal', 'Highway Rest Stop', 'Midway Station', 'City Center', 'Arrival Terminal']
            location_data = {
                'schedule_id': schedule_id,
                'driver_id': schedule.get('driver_id', 'simulator'),
                'driver_name': schedule.get('driver_name', 'Simulator Driver'),
                'location_type': 'bus_stop',
                'bus_stop_name': random.choice(bus_stops),
                'arrival_time': datetime.utcnow(),
                'passengers_boarded': random.randint(0, 5),
                'passengers_alighted': random.randint(0, 3),
                'status': 'at_stop',
                'timestamp': datetime.utcnow(),
                'notes': 'Simulated check-in'
            }
        else:
            # Simulate GPS location
            # Random coordinates around Ethiopia (Addis Ababa area)
            base_lat = 9.0320
            base_lon = 38.7469
            location_data = {
                'schedule_id': schedule_id,
                'driver_id': schedule.get('driver_id', 'simulator'),
                'driver_name': schedule.get('driver_name', 'Simulator Driver'),
                'location_type': 'gps',
                'latitude': base_lat + random.uniform(-0.5, 0.5),
                'longitude': base_lon + random.uniform(-0.5, 0.5),
                'speed': random.randint(40, 80),
                'heading': random.randint(0, 360),
                'status': 'in_transit',
                'timestamp': datetime.utcnow()
            }
        
        # Insert simulated location
        result = mongo.db.bus_locations.insert_one(location_data)
        location_data['_id'] = result.inserted_id
        
        # Update schedule
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(schedule_id)},
            {
                '$set': {
                    'current_location': location_data.get('bus_stop_name') or 'In Transit',
                    'last_location_update': datetime.utcnow(),
                    'tracking_status': location_data.get('status')
                }
            }
        )
        
        print(f"🎮 Simulated location for schedule {schedule_id}")
        print(f"   - Type: {simulation_type}")
        
        return jsonify({
            'success': True,
            'message': 'Location simulated successfully',
            'location': serialize_document(location_data)
        }), 200
        
    except Exception as e:
        logger.error(f"Simulate location error: {e}")
        return jsonify({'error': str(e)}), 500

@tracking_bp.route('/simulator/auto-track/<schedule_id>', methods=['POST'])
@jwt_required()
def auto_track_bus(schedule_id):
    """Start automatic tracking simulation for a bus"""
    try:
        current_user = get_jwt_identity()
        
        # Check if user is operator/admin
        user = mongo.db.users.find_one({'_id': ObjectId(current_user)})
        if not user or user.get('role') not in ['operator', 'admin']:
            return jsonify({'error': 'Operator access required'}), 403
        
        # Get schedule
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Generate multiple location updates to simulate journey
        import random
        
        bus_stops = [
            'Departure Terminal',
            'Highway Entrance',
            'Rest Stop 1',
            'Midway Station',
            'Rest Stop 2',
            'City Outskirts',
            'Arrival Terminal'
        ]
        
        locations_created = []
        
        for i, stop in enumerate(bus_stops):
            # Simulate arrival at bus stop
            location_data = {
                'schedule_id': schedule_id,
                'driver_id': schedule.get('driver_id', 'simulator'),
                'driver_name': schedule.get('driver_name', 'Simulator Driver'),
                'location_type': 'bus_stop',
                'bus_stop_name': stop,
                'bus_stop_id': f'stop_{i+1}',
                'arrival_time': datetime.utcnow() - timedelta(minutes=(len(bus_stops) - i) * 30),
                'passengers_boarded': random.randint(0, 5) if i < len(bus_stops) - 1 else 0,
                'passengers_alighted': random.randint(0, 3) if i > 0 else 0,
                'status': 'at_stop' if i < len(bus_stops) - 1 else 'arrived',
                'timestamp': datetime.utcnow() - timedelta(minutes=(len(bus_stops) - i) * 30),
                'notes': f'Simulated stop {i+1}/{len(bus_stops)}'
            }
            
            result = mongo.db.bus_locations.insert_one(location_data)
            location_data['_id'] = result.inserted_id
            locations_created.append(serialize_document(location_data))
        
        # Update schedule with final location
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(schedule_id)},
            {
                '$set': {
                    'current_location': bus_stops[-1],
                    'last_location_update': datetime.utcnow(),
                    'tracking_status': 'arrived'
                }
            }
        )
        
        print(f"🎮 Auto-tracked schedule {schedule_id} with {len(locations_created)} stops")
        
        return jsonify({
            'success': True,
            'message': f'Generated {len(locations_created)} location updates',
            'locations': locations_created,
            'total_stops': len(bus_stops)
        }), 200
        
    except Exception as e:
        logger.error(f"Auto track error: {e}")
        return jsonify({'error': str(e)}), 500


# ==================== ADMIN: CREATE DEFAULT BUS STOPS ====================

@tracking_bp.route('/admin/create-default-stops/<route_id>', methods=['POST'])
@jwt_required()
def create_default_stops_for_route(route_id):
    """Create default bus stops for a route (Admin/Operator only)"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') not in ['admin', 'operator']:
            return jsonify({'error': 'Admin/Operator access required'}), 403
        
        # Get route details
        route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
        if not route:
            return jsonify({'error': 'Route not found'}), 404
        
        origin = route.get('origin_city', 'Origin')
        destination = route.get('destination_city', 'Destination')
        
        # Check if stops already exist
        existing_stops = mongo.db.busstops.count_documents({'route_id': route_id})
        if existing_stops > 0:
            return jsonify({
                'success': False,
                'message': f'Route already has {existing_stops} stops configured'
            }), 400
        
        # Create default stops
        default_stops = [
            {
                'route_id': route_id,
                'stop_name': f'{origin} - Departure Terminal',
                'stop_order': 1,
                'estimated_arrival_minutes': 0,
                'is_major_stop': True,
                'created_at': datetime.utcnow(),
                'created_by': current_user_id
            },
            {
                'route_id': route_id,
                'stop_name': f'{origin} - City Exit',
                'stop_order': 2,
                'estimated_arrival_minutes': 15,
                'is_major_stop': False,
                'created_at': datetime.utcnow(),
                'created_by': current_user_id
            },
            {
                'route_id': route_id,
                'stop_name': 'Highway Rest Stop',
                'stop_order': 3,
                'estimated_arrival_minutes': 120,
                'is_major_stop': True,
                'created_at': datetime.utcnow(),
                'created_by': current_user_id
            },
            {
                'route_id': route_id,
                'stop_name': f'{destination} - City Entrance',
                'stop_order': 4,
                'estimated_arrival_minutes': 240,
                'is_major_stop': False,
                'created_at': datetime.utcnow(),
                'created_by': current_user_id
            },
            {
                'route_id': route_id,
                'stop_name': f'{destination} - Arrival Terminal',
                'stop_order': 5,
                'estimated_arrival_minutes': 270,
                'is_major_stop': True,
                'created_at': datetime.utcnow(),
                'created_by': current_user_id
            }
        ]
        
        result = mongo.db.busstops.insert_many(default_stops)
        
        print(f"✅ Created {len(result.inserted_ids)} default stops for route {route_id}")
        print(f"   Route: {origin} → {destination}")
        
        return jsonify({
            'success': True,
            'message': f'Created {len(result.inserted_ids)} default stops',
            'stops_created': len(result.inserted_ids),
            'route': f'{origin} → {destination}'
        }), 201
        
    except Exception as e:
        logger.error(f"Create default stops error: {e}")
        return jsonify({'error': str(e)}), 500

@tracking_bp.route('/admin/routes-without-stops', methods=['GET'])
@jwt_required()
def get_routes_without_stops():
    """Get all routes that don't have bus stops configured"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') not in ['admin', 'operator']:
            return jsonify({'error': 'Admin/Operator access required'}), 403
        
        # Get all routes
        all_routes = list(mongo.db.routes.find({}))
        
        routes_without_stops = []
        for route in all_routes:
            route_id = str(route['_id'])
            stop_count = mongo.db.busstops.count_documents({'route_id': route_id})
            
            if stop_count == 0:
                routes_without_stops.append({
                    '_id': route_id,
                    'origin': route.get('origin_city'),
                    'destination': route.get('destination_city'),
                    'distance': route.get('distance_km'),
                    'duration': route.get('estimated_duration_hours')
                })
        
        return jsonify({
            'success': True,
            'routes': routes_without_stops,
            'total': len(routes_without_stops)
        }), 200
        
    except Exception as e:
        logger.error(f"Get routes without stops error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== QUICK SETUP FOR ROUTES ====================

@tracking_bp.route('/setup/create-default-stops/<schedule_id>', methods=['POST'])
@jwt_required()
def create_default_stops_for_schedule(schedule_id):
    """Create default bus stops for a schedule based on its route"""
    try:
        current_user = get_jwt_identity()
        
        # Check if user is operator/admin
        user = mongo.db.users.find_one({'_id': ObjectId(current_user)})
        if not user or user.get('role') not in ['operator', 'admin', 'driver']:
            return jsonify({'error': 'Operator access required'}), 403
        
        # Get schedule
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        origin = schedule.get('origin_city') or schedule.get('departure_city') or 'Origin'
        destination = schedule.get('destination_city') or schedule.get('arrival_city') or 'Destination'
        route_id = schedule.get('routeId') or schedule_id
        
        # Check if stops already exist
        existing_stops = mongo.db.busstops.count_documents({'route_id': route_id})
        if existing_stops > 0:
            return jsonify({
                'success': False,
                'message': f'Route already has {existing_stops} stops configured'
            }), 400
        
        # Create default stops (departure, midpoint, arrival)
        default_stops = [
            {
                'route_id': route_id,
                'stop_name': f'{origin} Terminal',
                'stop_order': 1,
                'estimated_arrival_minutes': 0,
                'is_major_stop': True,
                'created_at': datetime.utcnow(),
                'created_by': current_user
            },
            {
                'route_id': route_id,
                'stop_name': f'Midway Rest Stop',
                'stop_order': 2,
                'estimated_arrival_minutes': 180,  # 3 hours
                'is_major_stop': False,
                'created_at': datetime.utcnow(),
                'created_by': current_user
            },
            {
                'route_id': route_id,
                'stop_name': f'{destination} Terminal',
                'stop_order': 3,
                'estimated_arrival_minutes': 360,  # 6 hours
                'is_major_stop': True,
                'created_at': datetime.utcnow(),
                'created_by': current_user
            }
        ]
        
        # Insert stops
        result = mongo.db.busstops.insert_many(default_stops)
        
        print(f"✅ Created {len(default_stops)} default stops for route {route_id}")
        print(f"   - {origin} → {destination}")
        
        return jsonify({
            'success': True,
            'message': f'Created {len(default_stops)} default stops',
            'stops': [serialize_document(stop) for stop in default_stops],
            'route_id': route_id
        }), 201
        
    except Exception as e:
        logger.error(f"Create default stops error: {e}")
        return jsonify({'error': str(e)}), 500


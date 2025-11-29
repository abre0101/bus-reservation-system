from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
from app import mongo

routes_bp = Blueprint('routes', __name__)

def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
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
            # Add time if not present
            if departure_time and ':' in departure_time:
                try:
                    hours, minutes = map(int, departure_time.split(':'))
                    departure_datetime = departure_datetime.replace(hour=hours, minute=minutes, second=0, microsecond=0)
                except:
                    pass
        else:
            departure_date_str = str(departure_date)
            try:
                departure_datetime = datetime.strptime(f"{departure_date_str} {departure_time}", "%Y-%m-%d %H:%M")
            except:
                # Fallback: try without time
                departure_datetime = datetime.strptime(departure_date_str, "%Y-%m-%d")
        
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

def filter_valid_schedules(schedules):
    """Filter out completed schedules and buses under maintenance"""
    try:
        db = mongo.db
        valid_schedules = []
        filtered_count = 0
        
        for schedule in schedules:
            # Check if schedule has departed
            if is_schedule_completed(schedule):
                print(f"⏰ Schedule {schedule.get('_id')} filtered out: Already departed")
                filtered_count += 1
                continue
            
            # Check bus maintenance status
            bus_id = schedule.get('busId')
            bus_data = None
            
            if bus_id:
                try:
                    bus_data = db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    # If bus_id is not a valid ObjectId, try as string
                    bus_data = db.buses.find_one({'bus_number': bus_id})
            
            if is_bus_under_maintenance(schedule, bus_data):
                print(f"🔧 Schedule {schedule.get('_id')} filtered out: Bus under maintenance")
                filtered_count += 1
                continue
            
            valid_schedules.append(schedule)
        
        print(f"✅ Filtered {len(valid_schedules)} valid schedules from {len(schedules)} total (filtered out: {filtered_count})")
        return valid_schedules
        
    except Exception as e:
        print(f"❌ Error filtering schedules: {e}")
        return schedules  # Return original list on error

@routes_bp.route('/', methods=['GET'])
def get_routes():
    """Get all active routes with schedule counts"""
    try:
        # Get optional query parameters
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        query = {}
        if not include_inactive:
            query['is_active'] = True
        
        routes_cursor = mongo.db.routes.find(query)
        routes = list(routes_cursor)
        
        # Enrich routes with schedule counts and availability info
        enriched_routes = []
        for route in routes:
            route['_id'] = str(route['_id'])
            
            # Get active schedules count for this route
            schedule_count = mongo.db.busschedules.count_documents({
                'routeId': route['_id'],
                'status': 'scheduled'
            })
            
            # Get valid (non-completed, non-maintenance) schedules
            schedules = list(mongo.db.busschedules.find({
                'routeId': route['_id'],
                'status': 'scheduled'
            }))
            
            valid_schedules = filter_valid_schedules(schedules)
            
            route['schedule_count'] = schedule_count
            route['available_schedules'] = len(valid_schedules)
            route['has_available_schedules'] = len(valid_schedules) > 0
            
            enriched_routes.append(route)
        
        return jsonify({
            'routes': enriched_routes,
            'total': len(enriched_routes),
            'filters': {
                'include_inactive': include_inactive
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/', methods=['POST'])
@jwt_required()
def create_route():
    """Create a new route (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields - support both camelCase and snake_case
        origin_city = data.get('origin_city') or data.get('originCity')
        destination_city = data.get('destination_city') or data.get('destinationCity')
        distance_km = data.get('distance_km') or data.get('distanceKm')
        estimated_duration_hours = data.get('estimated_duration_hours') or data.get('estimatedDurationHours')
        
        if not all([data.get('name'), origin_city, destination_city, distance_km, estimated_duration_hours]):
            return jsonify({'error': 'name, origin_city, destination_city, distance_km, and estimated_duration_hours are required'}), 400
        
        # Check if route already exists
        existing_route = mongo.db.routes.find_one({
            'origin_city': origin_city,
            'destination_city': destination_city
        })
        
        if existing_route:
            return jsonify({'error': 'Route already exists'}), 400
        
        route = {
            'name': data['name'],
            'origin_city': origin_city,
            'destination_city': destination_city,
            'distance_km': distance_km,
            'estimated_duration_hours': estimated_duration_hours,
            'stops': data.get('stops', []),
            'description': data.get('description', ''),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = mongo.db.routes.insert_one(route)
        
        return jsonify({
            'message': 'Route created successfully',
            'route_id': str(result.inserted_id),
            'route_name': route['name']
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<route_id>', methods=['GET'])
def get_route(route_id):
    """Get specific route details with enhanced information"""
    try:
        route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
        
        if not route:
            return jsonify({'error': 'Route not found'}), 404
        
        route['_id'] = str(route['_id'])
        
        # Get schedules for this route
        schedules = list(mongo.db.busschedules.find({
            'routeId': route_id,
            'status': 'scheduled'
        }))
        
        # Filter valid schedules
        valid_schedules = filter_valid_schedules(schedules)
        
        # Add schedule information to route
        route['schedule_info'] = {
            'total_schedules': len(schedules),
            'available_schedules': len(valid_schedules),
            'next_available': None
        }
        
        # Find next available schedule
        if valid_schedules:
            # Sort by departure date
            valid_schedules.sort(key=lambda x: x.get('departure_date', ''))
            next_schedule = valid_schedules[0]
            route['schedule_info']['next_available'] = {
                'date': next_schedule.get('departure_date'),
                'time': next_schedule.get('departureTime')
            }
        
        return jsonify(route), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<route_id>', methods=['PUT'])
@jwt_required()
def update_route(route_id):
    """Update route details (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Remove fields that shouldn't be updated
        update_data = {k: v for k, v in data.items() if k not in ['_id', 'createdAt']}
        update_data['updatedAt'] = datetime.utcnow()
        
        result = mongo.db.routes.update_one(
            {'_id': ObjectId(route_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Route not found'}), 404
        
        return jsonify({'message': 'Route updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<route_id>/deactivate', methods=['PUT'])
@jwt_required()
def deactivate_route(route_id):
    """Deactivate route and cancel future schedules (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Deactivate the route
        result = mongo.db.routes.update_one(
            {'_id': ObjectId(route_id)},
            {'$set': {
                'is_active': False,
                'updatedAt': datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Route not found'}), 404
        
        # Cancel future schedules for this route
        future_schedules = mongo.db.busschedules.find({
            'routeId': route_id,
            'departure_date': {'$gte': datetime.utcnow().strftime('%Y-%m-%d')},
            'status': 'scheduled'
        })
        
        cancelled_count = 0
        for schedule in future_schedules:
            mongo.db.busschedules.update_one(
                {'_id': schedule['_id']},
                {'$set': {
                    'status': 'cancelled',
                    'cancellation_reason': 'Route deactivated',
                    'updatedAt': datetime.utcnow()
                }}
            )
            cancelled_count += 1
        
        return jsonify({
            'message': 'Route deactivated successfully',
            'cancelled_schedules': cancelled_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<route_id>/activate', methods=['PUT'])
@jwt_required()
def activate_route(route_id):
    """Activate route (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        result = mongo.db.routes.update_one(
            {'_id': ObjectId(route_id)},
            {'$set': {
                'is_active': True,
                'updatedAt': datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Route not found'}), 404
        
        return jsonify({'message': 'Route activated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/cities', methods=['GET'])
def get_cities():
    """Get all available cities from routes with counts"""
    try:
        source_cities = mongo.db.routes.distinct('origin_city', {'is_active': True})
        destination_cities = mongo.db.routes.distinct('destination_city', {'is_active': True})
        
        # Combine and remove duplicates
        all_cities = list(set(source_cities + destination_cities))
        all_cities.sort()
        
        # Get city statistics
        cities_with_stats = []
        for city in all_cities:
            # Count routes where this city is origin
            origin_count = mongo.db.routes.count_documents({
                'origin_city': city,
                'is_active': True
            })
            
            # Count routes where this city is destination
            destination_count = mongo.db.routes.count_documents({
                'destination_city': city,
                'is_active': True
            })
            
            cities_with_stats.append({
                'name': city,
                'origin_routes': origin_count,
                'destination_routes': destination_count,
                'total_routes': origin_count + destination_count
            })
        
        return jsonify({
            'cities': cities_with_stats,
            'total': len(cities_with_stats)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/search', methods=['GET'])
def search_routes():
    """Search routes by origin and destination with availability check"""
    try:
        origin = request.args.get('origin')
        destination = request.args.get('destination')
        check_availability = request.args.get('check_availability', 'true').lower() == 'true'
        
        if not origin or not destination:
            return jsonify({'error': 'Origin and destination are required'}), 400
        
        routes = list(mongo.db.routes.find({
            'origin_city': origin,
            'destination_city': destination,
            'is_active': True
        }))
        
        enriched_routes = []
        for route in routes:
            route['_id'] = str(route['_id'])
            
            # Check availability if requested
            if check_availability:
                schedules = list(mongo.db.busschedules.find({
                    'routeId': route['_id'],
                    'status': 'scheduled'
                }))
                
                valid_schedules = filter_valid_schedules(schedules)
                route['has_available_schedules'] = len(valid_schedules) > 0
                route['available_schedule_count'] = len(valid_schedules)
                
                # Add next available schedule info
                if valid_schedules:
                    valid_schedules.sort(key=lambda x: x.get('departure_date', ''))
                    next_schedule = valid_schedules[0]
                    route['next_available'] = {
                        'date': next_schedule.get('departure_date'),
                        'time': next_schedule.get('departureTime'),
                        'fare': next_schedule.get('fareBirr')
                    }
            
            enriched_routes.append(route)
        
        return jsonify({
            'routes': enriched_routes,
            'total': len(enriched_routes),
            'search': {
                'origin': origin,
                'destination': destination
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<route_id>/schedules', methods=['GET'])
def get_route_schedules(route_id):
    """Get all schedules for a specific route with filtering options"""
    try:
        # Get query parameters
        include_completed = request.args.get('include_completed', 'false').lower() == 'true'
        include_maintenance = request.args.get('include_maintenance', 'false').lower() == 'true'
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query = {'routeId': route_id, 'status': 'scheduled'}
        
        # Add date range filter
        if date_from:
            query['departure_date'] = {'$gte': date_from}
        if date_to:
            if 'departure_date' in query:
                query['departure_date']['$lte'] = date_to
            else:
                query['departure_date'] = {'$lte': date_to}
        
        schedules_cursor = mongo.db.busschedules.find(query).sort('departure_date', 1)
        schedules = list(schedules_cursor)
        
        # Apply filtering if not including all
        if not include_completed or not include_maintenance:
            filtered_schedules = []
            for schedule in schedules:
                # Check if we should include completed schedules
                if not include_completed and is_schedule_completed(schedule):
                    continue
                
                # Check if we should include maintenance schedules
                if not include_maintenance:
                    bus_id = schedule.get('busId')
                    bus_data = None
                    if bus_id:
                        try:
                            bus_data = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                        except:
                            bus_data = mongo.db.buses.find_one({'bus_number': bus_id})
                    
                    if is_bus_under_maintenance(schedule, bus_data):
                        continue
                
                filtered_schedules.append(schedule)
            
            schedules = filtered_schedules
        
        # Enrich with bus information
        enriched_schedules = []
        for schedule in schedules:
            bus = None
            bus_id = schedule.get('busId')
            if bus_id:
                try:
                    bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    bus = mongo.db.buses.find_one({'bus_number': bus_id})
            
            # Get booking count
            booking_count = mongo.db.bookings.count_documents({
                'schedule_id': str(schedule['_id']),
                'status': {'$in': ['confirmed', 'checked_in', 'pending']}
            })
            
            enriched_schedule = {
                '_id': str(schedule['_id']),
                'departure_time': schedule.get('departureTime'),
                'arrival_time': schedule.get('arrivalTime'),
                'departure_date': schedule.get('departure_date'),
                'available_seats': schedule.get('availableSeats'),
                'fare': schedule.get('fareBirr'),
                'status': schedule.get('status'),
                'booking_count': booking_count,
                'bus': {
                    'number': bus.get('bus_number') if bus else 'Unknown',
                    'name': bus.get('bus_name') if bus else 'Unknown',
                    'type': bus.get('type') if bus else 'Unknown',
                    'status': bus.get('status', 'active') if bus else 'active',
                    'isActive': bus.get('isActive', True) if bus else True
                } if bus else None,
                'driver_name': schedule.get('driver_name'),
                'is_completed': is_schedule_completed(schedule),
                'is_under_maintenance': is_bus_under_maintenance(schedule, bus),
                'is_available': not is_schedule_completed(schedule) and not is_bus_under_maintenance(schedule, bus)
            }
            enriched_schedules.append(enriched_schedule)
        
        # Get route information
        route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
        
        return jsonify({
            'schedules': enriched_schedules,
            'total': len(enriched_schedules),
            'route': {
                '_id': str(route['_id']) if route else route_id,
                'name': route.get('name') if route else 'Unknown',
                'origin_city': route.get('origin_city') if route else 'Unknown',
                'destination_city': route.get('destination_city') if route else 'Unknown'
            } if route else None,
            'filters': {
                'include_completed': include_completed,
                'include_maintenance': include_maintenance,
                'date_from': date_from,
                'date_to': date_to
            },
            'stats': {
                'available': len([s for s in enriched_schedules if s.get('is_available', True)]),
                'completed': len([s for s in enriched_schedules if s.get('is_completed', False)]),
                'maintenance': len([s for s in enriched_schedules if s.get('is_under_maintenance', False)])
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<route_id>/availability', methods=['GET'])
def get_route_availability(route_id):
    """Get route availability information"""
    try:
        # Get upcoming schedules
        schedules = list(mongo.db.busschedules.find({
            'routeId': route_id,
            'status': 'scheduled',
            'departure_date': {'$gte': datetime.utcnow().strftime('%Y-%m-%d')}
        }).sort('departure_date', 1))
        
        # Filter valid schedules
        valid_schedules = filter_valid_schedules(schedules)
        
        # Get route information
        route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
        
        return jsonify({
            'route_id': route_id,
            'route_name': route.get('name') if route else 'Unknown',
            'is_active': route.get('is_active', True) if route else True,
            'availability': {
                'total_schedules': len(schedules),
                'available_schedules': len(valid_schedules),
                'availability_percentage': round((len(valid_schedules) / len(schedules)) * 100, 2) if schedules else 0,
                'next_available_date': valid_schedules[0].get('departure_date') if valid_schedules else None,
                'has_available_schedules': len(valid_schedules) > 0
            },
            'schedule_dates': list(set([
                s.get('departure_date').strftime('%Y-%m-%d') if isinstance(s.get('departure_date'), datetime) 
                else str(s.get('departure_date')) 
                for s in valid_schedules
            ])) if valid_schedules else []
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/stats', methods=['GET'])
def get_route_stats():
    """Get route statistics"""
    try:
        total_routes = mongo.db.routes.count_documents({})
        active_routes = mongo.db.routes.count_documents({'is_active': True})
        
        # Get routes with available schedules
        routes_with_schedules = 0
        all_routes = mongo.db.routes.find({'is_active': True})
        
        for route in all_routes:
            schedules = list(mongo.db.busschedules.find({
                'routeId': str(route['_id']),
                'status': 'scheduled'
            }))
            
            valid_schedules = filter_valid_schedules(schedules)
            if valid_schedules:
                routes_with_schedules += 1
        
        return jsonify({
            'total_routes': total_routes,
            'active_routes': active_routes,
            'routes_with_available_schedules': routes_with_schedules,
            'availability_rate': round((routes_with_schedules / active_routes) * 100, 2) if active_routes > 0 else 0,
            'last_updated': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
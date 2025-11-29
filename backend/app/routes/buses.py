from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from app import mongo

buses_bp = Blueprint('buses', __name__)

def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
    except:
        return False

def is_bus_under_maintenance(bus_data):
    """Check if bus is under maintenance or inactive"""
    try:
        bus_status = bus_data.get('status', 'active')
        if bus_status.lower() in ['maintenance', 'inactive', 'under_maintenance']:
            return True
        
        # Check isActive field
        if bus_data.get('isActive') is False:
            return True
            
        return False
        
    except Exception as e:
        print(f"❌ Error checking bus maintenance: {e}")
        return False

@buses_bp.route('/', methods=['GET'])
def get_buses():
    """Get all buses with optional status filter"""
    try:
        status_filter = request.args.get('status', 'active')
        include_maintenance = request.args.get('include_maintenance', 'false').lower() == 'true'
        
        query = {}
        if not include_maintenance:
            query['status'] = status_filter
        
        buses_cursor = mongo.db.buses.find(query)
        buses = list(buses_cursor)
        
        # Add maintenance status to response
        for bus in buses:
            bus['_id'] = str(bus['_id'])
            bus['is_under_maintenance'] = is_bus_under_maintenance(bus)
        
        return jsonify({
            'buses': buses,
            'total': len(buses),
            'filters': {
                'status': status_filter,
                'include_maintenance': include_maintenance
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/active', methods=['GET'])
def get_active_buses():
    """Get all active buses (not under maintenance)"""
    try:
        # Find buses that are active and not under maintenance
        buses_cursor = mongo.db.buses.find({
            '$or': [
                {'status': 'active'},
                {'status': {'$exists': False}}  # Include buses without status field
            ]
        })
        
        buses = list(buses_cursor)
        
        # Filter out buses that are actually under maintenance
        active_buses = []
        for bus in buses:
            if not is_bus_under_maintenance(bus):
                bus['_id'] = str(bus['_id'])
                active_buses.append(bus)
        
        return jsonify({
            'buses': active_buses,
            'total': len(active_buses),
            'message': f'Found {len(active_buses)} active buses'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/maintenance', methods=['GET'])
def get_maintenance_buses():
    """Get all buses under maintenance"""
    try:
        # Find buses with maintenance status
        maintenance_buses_cursor = mongo.db.buses.find({
            'status': {'$in': ['maintenance', 'inactive', 'under_maintenance']}
        })
        
        maintenance_buses = list(maintenance_buses_cursor)
        
        # Also find buses that are inactive based on isActive field
        inactive_buses_cursor = mongo.db.buses.find({'isActive': False})
        inactive_buses = list(inactive_buses_cursor)
        
        # Combine and remove duplicates
        all_maintenance_buses = maintenance_buses + [bus for bus in inactive_buses if bus not in maintenance_buses]
        
        for bus in all_maintenance_buses:
            bus['_id'] = str(bus['_id'])
            bus['is_under_maintenance'] = True
        
        return jsonify({
            'buses': all_maintenance_buses,
            'total': len(all_maintenance_buses),
            'message': f'Found {len(all_maintenance_buses)} buses under maintenance'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/', methods=['POST'])
@jwt_required()
def create_bus():
    """Create a new bus (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['bus_number', 'plate_number', 'bus_name', 'type', 'capacity']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if bus number already exists
        existing_bus = mongo.db.buses.find_one({'bus_number': data['bus_number']})
        if existing_bus:
            return jsonify({'error': 'Bus number already exists'}), 400
        
        # Check if plate number already exists
        existing_plate = mongo.db.buses.find_one({'plate_number': data['plate_number']})
        if existing_plate:
            return jsonify({'error': 'Plate number already exists'}), 400
        
        bus = {
            'bus_number': data['bus_number'],
            'plate_number': data['plate_number'],
            'bus_name': data['bus_name'],
            'type': data['type'],
            'capacity': data['capacity'],
            'amenities': data.get('amenities', []),
            'status': data.get('status', 'active'),
            'isActive': data.get('isActive', True),
            'maintenance_notes': data.get('maintenance_notes', ''),
            'estimated_ready_time': data.get('estimated_ready_time'),
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        result = mongo.db.buses.insert_one(bus)
        
        return jsonify({
            'message': 'Bus created successfully',
            'bus_id': str(result.inserted_id),
            'is_under_maintenance': is_bus_under_maintenance(bus)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<bus_id>', methods=['GET'])
def get_bus(bus_id):
    """Get specific bus details with maintenance status"""
    try:
        bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
        
        if not bus:
            return jsonify({'error': 'Bus not found'}), 404
        
        # Add maintenance status
        bus['_id'] = str(bus['_id'])
        bus['is_under_maintenance'] = is_bus_under_maintenance(bus)
        
        # Get upcoming schedules for this bus
        upcoming_schedules = list(mongo.db.busschedules.find({
            'busId': bus_id,
            'departure_date': {'$gte': datetime.utcnow().strftime('%Y-%m-%d')}
        }).sort('departure_date', 1).limit(5))
        
        # Format schedules
        formatted_schedules = []
        for schedule in upcoming_schedules:
            route = mongo.db.routes.find_one({'_id': ObjectId(schedule['routeId'])})
            formatted_schedule = {
                'schedule_id': str(schedule['_id']),
                'departure_date': schedule.get('departure_date'),
                'departure_time': schedule.get('departure_time'),
                'route': f"{route.get('origin_city', 'Unknown')} → {route.get('destination_city', 'Unknown')}" if route else 'Unknown Route',
                'status': schedule.get('status', 'active')
            }
            formatted_schedules.append(formatted_schedule)
        
        bus['upcoming_schedules'] = formatted_schedules
        
        return jsonify(bus), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<bus_id>', methods=['PUT'])
@jwt_required()
def update_bus(bus_id):
    """Update bus details (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Remove fields that shouldn't be updated
        update_data = {k: v for k, v in data.items() if k not in ['_id', 'createdAt']}
        update_data['updatedAt'] = datetime.utcnow()
        
        result = mongo.db.buses.update_one(
            {'_id': ObjectId(bus_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Bus not found'}), 404
        
        # Get updated bus
        updated_bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
        
        return jsonify({
            'message': 'Bus updated successfully',
            'bus_id': bus_id,
            'is_under_maintenance': is_bus_under_maintenance(updated_bus),
            'status': updated_bus.get('status', 'active')
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<bus_id>/maintenance', methods=['PUT'])
@jwt_required()
def set_bus_maintenance(bus_id):
    """Set bus to maintenance status with details (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        maintenance_notes = data.get('maintenance_notes', '')
        estimated_ready_time = data.get('estimated_ready_time')
        
        update_data = {
            'status': 'maintenance',
            'isActive': False,
            'maintenance_notes': maintenance_notes,
            'estimated_ready_time': estimated_ready_time,
            'updatedAt': datetime.utcnow()
        }
        
        result = mongo.db.buses.update_one(
            {'_id': ObjectId(bus_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Bus not found'}), 404
        
        # Cancel or update upcoming schedules for this bus
        upcoming_schedules = mongo.db.busschedules.find({
            'busId': bus_id,
            'departure_date': {'$gte': datetime.utcnow().strftime('%Y-%m-%d')},
            'status': 'active'
        })
        
        cancelled_count = 0
        for schedule in upcoming_schedules:
            # Update schedule status
            mongo.db.busschedules.update_one(
                {'_id': schedule['_id']},
                {'$set': {
                    'status': 'cancelled',
                    'cancellation_reason': 'Bus under maintenance',
                    'updatedAt': datetime.utcnow()
                }}
            )
            cancelled_count += 1
        
        return jsonify({
            'message': 'Bus set to maintenance mode',
            'cancelled_schedules': cancelled_count,
            'maintenance_notes': maintenance_notes,
            'estimated_ready_time': estimated_ready_time
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<bus_id>/activate', methods=['PUT'])
@jwt_required()
def activate_bus(bus_id):
    """Activate bus and make it available for scheduling (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        update_data = {
            'status': 'active',
            'isActive': True,
            'maintenance_notes': '',
            'estimated_ready_time': None,
            'updatedAt': datetime.utcnow()
        }
        
        result = mongo.db.buses.update_one(
            {'_id': ObjectId(bus_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Bus not found'}), 404
        
        return jsonify({
            'message': 'Bus activated successfully',
            'bus_id': bus_id,
            'status': 'active'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<bus_id>/status', methods=['GET'])
def get_bus_status(bus_id):
    """Get bus status and availability for booking"""
    try:
        bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
        
        if not bus:
            return jsonify({'error': 'Bus not found'}), 404
        
        is_maintenance = is_bus_under_maintenance(bus)
        
        response = {
            'bus_id': bus_id,
            'bus_number': bus.get('bus_number'),
            'bus_name': bus.get('bus_name'),
            'status': bus.get('status', 'active'),
            'is_under_maintenance': is_maintenance,
            'is_available': not is_maintenance,
            'maintenance_notes': bus.get('maintenance_notes', ''),
            'estimated_ready_time': bus.get('estimated_ready_time'),
            'last_updated': bus.get('updatedAt', bus.get('createdAt'))
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/types', methods=['GET'])
def get_bus_types():
    """Get available bus types"""
    bus_types = [
        {
            'value': 'standard', 
            'label': 'Standard Bus', 
            'description': 'Basic comfort with AC',
            'amenities': ['AC', 'Reclining Seats', 'Reading Lights']
        },
        {
            'value': 'premium', 
            'label': 'Premium Bus', 
            'description': 'Enhanced comfort with WiFi and refreshments',
            'amenities': ['AC', 'WiFi', 'Refreshments', 'Reclining Seats', 'Charging Ports']
        },
        {
            'value': 'luxury', 
            'label': 'Luxury Bus', 
            'description': 'Premium comfort with all amenities',
            'amenities': ['AC', 'WiFi', 'Meals', 'Entertainment', 'Luxury Seats', 'Charging Ports']
        }
    ]
    
    return jsonify(bus_types), 200

@buses_bp.route('/<bus_id>/schedules', methods=['GET'])
def get_bus_schedules(bus_id):
    """Get all schedules for a specific bus with filtering options"""
    try:
        # Get query parameters
        status_filter = request.args.get('status', 'all')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query = {'busId': bus_id}
        
        # Add status filter
        if status_filter != 'all':
            query['status'] = status_filter
        
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
        
        # Enrich with route information and booking counts
        enriched_schedules = []
        for schedule in schedules:
            route = mongo.db.routes.find_one({'_id': ObjectId(schedule['routeId'])})
            
            # Get booking count for this schedule
            booking_count = mongo.db.bookings.count_documents({
                'schedule_id': str(schedule['_id']),
                'status': {'$in': ['confirmed', 'checked_in', 'pending']}
            })
            
            enriched_schedule = {
                '_id': str(schedule['_id']),
                'departure_time': schedule.get('departure_time'),
                'arrival_time': schedule.get('arrival_time'),
                'departure_date': schedule.get('departure_date'),
                'available_seats': schedule.get('available_seats'),
                'fare': schedule.get('fare_birr'),
                'status': schedule.get('status', 'active'),
                'booking_count': booking_count,
                'route': {
                    'origin': route.get('origin_city') if route else 'Unknown',
                    'destination': route.get('destination_city') if route else 'Unknown',
                    'route_id': str(route['_id']) if route else None
                } if route else None
            }
            enriched_schedules.append(enriched_schedule)
        
        return jsonify({
            'schedules': enriched_schedules,
            'total': len(enriched_schedules),
            'bus_id': bus_id,
            'filters': {
                'status': status_filter,
                'date_from': date_from,
                'date_to': date_to
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_bus_stats():
    """Get bus statistics (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        total_buses = mongo.db.buses.count_documents({})
        active_buses = mongo.db.buses.count_documents({
            '$or': [
                {'status': 'active'},
                {'status': {'$exists': False}}
            ]
        })
        maintenance_buses = mongo.db.buses.count_documents({
            'status': {'$in': ['maintenance', 'inactive', 'under_maintenance']}
        })
        
        # Get bus type distribution
        bus_types = mongo.db.buses.aggregate([
            {'$group': {'_id': '$type', 'count': {'$sum': 1}}}
        ])
        
        type_distribution = {bus_type['_id']: bus_type['count'] for bus_type in bus_types}
        
        return jsonify({
            'total_buses': total_buses,
            'active_buses': active_buses,
            'maintenance_buses': maintenance_buses,
            'availability_rate': round((active_buses / total_buses) * 100, 2) if total_buses > 0 else 0,
            'type_distribution': type_distribution,
            'last_updated': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<bus_id>/health', methods=['GET'])
@jwt_required()
def get_bus_health(bus_id):
    """Get bus health and operational status (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
        
        if not bus:
            return jsonify({'error': 'Bus not found'}), 404
        
        # Get recent schedules performance
        recent_schedules = list(mongo.db.busschedules.find({
            'busId': bus_id,
            'departure_date': {'$gte': (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')}
        }))
        
        total_schedules = len(recent_schedules)
        completed_schedules = len([s for s in recent_schedules if s.get('status') == 'completed'])
        cancelled_schedules = len([s for s in recent_schedules if s.get('status') == 'cancelled'])
        
        # Calculate reliability score
        reliability_score = round((completed_schedules / total_schedules) * 100, 2) if total_schedules > 0 else 0
        
        return jsonify({
            'bus_id': bus_id,
            'bus_number': bus.get('bus_number'),
            'operational_status': bus.get('status', 'active'),
            'is_under_maintenance': is_bus_under_maintenance(bus),
            'reliability_score': reliability_score,
            'recent_performance': {
                'total_schedules': total_schedules,
                'completed_schedules': completed_schedules,
                'cancelled_schedules': cancelled_schedules,
                'completion_rate': reliability_score
            },
            'maintenance_info': {
                'notes': bus.get('maintenance_notes', ''),
                'estimated_ready_time': bus.get('estimated_ready_time'),
                'last_updated': bus.get('updatedAt')
            },
            'health_status': 'healthy' if reliability_score > 80 and not is_bus_under_maintenance(bus) else 'needs_attention'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
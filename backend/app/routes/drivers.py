from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
from app import mongo

drivers_bp = Blueprint('drivers', __name__)

def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
    except:
        return False

@drivers_bp.route('/assignments', methods=['GET'])
@jwt_required()
def get_driver_assignments():
    """Get all driver assignments"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        assignments = list(mongo.db.driver_assignments.find({}))
        
        # Enrich with driver and route details
        enriched_assignments = []
        for assignment in assignments:
            driver = mongo.db.users.find_one({'_id': ObjectId(assignment['driver_id'])})
            route = mongo.db.routes.find_one({'_id': ObjectId(assignment['route_id'])})
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(assignment['schedule_id'])})
            
            enriched_assignments.append({
                '_id': str(assignment['_id']),
                'driver': {
                    '_id': str(driver['_id']),
                    'name': driver.get('full_name'),
                    'license_number': driver.get('license_number')
                } if driver else None,
                'route': {
                    '_id': str(route['_id']),
                    'name': f"{route.get('originCity')} to {route.get('destinationCity')}"
                } if route else None,
                'schedule': {
                    '_id': str(schedule['_id']),
                    'departure_time': schedule.get('departureTime'),
                    'departure_date': schedule.get('departureDate')
                } if schedule else None,
                'assigned_date': assignment.get('assigned_date'),
                'status': assignment.get('status', 'active')
            })
        
        return jsonify({'assignments': enriched_assignments}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@drivers_bp.route('/assign', methods=['POST'])
@jwt_required()
def assign_driver_to_route():
    """Assign a driver to a route/schedule"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        driver_id = data.get('driver_id')
        schedule_id = data.get('schedule_id')
        
        if not driver_id or not schedule_id:
            return jsonify({'error': 'Driver ID and Schedule ID are required'}), 400
        
        # Check if driver exists and is actually a driver
        driver = mongo.db.users.find_one({'_id': ObjectId(driver_id)})
        if not driver or driver.get('role') != 'driver':
            return jsonify({'error': 'Invalid driver ID or user is not a driver'}), 400
        
        # Check if schedule exists
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Check if driver is already assigned to this schedule
        existing_assignment = mongo.db.driver_assignments.find_one({
            'driver_id': driver_id,
            'schedule_id': schedule_id,
            'status': 'active'
        })
        
        if existing_assignment:
            return jsonify({'error': 'Driver is already assigned to this schedule'}), 400
        
        # Create assignment
        assignment = {
            'driver_id': driver_id,
            'schedule_id': schedule_id,
            'route_id': schedule['routeId'],
            'bus_id': schedule['busId'],
            'assigned_date': datetime.utcnow(),
            'assigned_by': get_jwt_identity(),
            'status': 'active'
        }
        
        result = mongo.db.driver_assignments.insert_one(assignment)
        
        # Also update the schedule with driver information
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(schedule_id)},
            {'$set': {
                'driver_id': driver_id,
                'driver_name': driver.get('full_name'),
                'assignment_status': 'assigned'
            }}
        )
        
        return jsonify({
            'message': 'Driver assigned successfully',
            'assignment_id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@drivers_bp.route('/my-assignments', methods=['GET'])
@jwt_required()
def get_my_assignments():
    """Get assignments for the current driver"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user is a driver
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user or user.get('role') != 'driver':
            return jsonify({'error': 'Access denied. Driver role required.'}), 403
        
        assignments = list(mongo.db.driver_assignments.find({
            'driver_id': current_user_id,
            'status': 'active'
        }))
        
        # Enrich with schedule and route details
        enriched_assignments = []
        for assignment in assignments:
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(assignment['schedule_id'])})
            route = mongo.db.routes.find_one({'_id': ObjectId(assignment['route_id'])})
            bus = mongo.db.buses.find_one({'_id': ObjectId(assignment['bus_id'])})
            
            if schedule and route:
                enriched_assignments.append({
                    '_id': str(assignment['_id']),
                    'schedule': {
                        '_id': str(schedule['_id']),
                        'departure_time': schedule.get('departureTime'),
                        'arrival_time': schedule.get('arrivalTime'),
                        'departure_date': schedule.get('departureDate'),
                        'available_seats': schedule.get('availableSeats')
                    },
                    'route': {
                        '_id': str(route['_id']),
                        'origin': route.get('originCity'),
                        'destination': route.get('destinationCity'),
                        'distance': route.get('distanceKm'),
                        'duration': route.get('estimatedDurationHours')
                    },
                    'bus': {
                        '_id': str(bus['_id']),
                        'number': bus.get('bus_number'),
                        'name': bus.get('bus_name'),
                        'type': bus.get('type')
                    } if bus else None,
                    'assigned_date': assignment.get('assigned_date')
                })
        
        return jsonify({'assignments': enriched_assignments}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@drivers_bp.route('/available', methods=['GET'])
@jwt_required()
def get_available_drivers():
    """Get drivers available for assignment (not assigned to overlapping schedules)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        date = request.args.get('date')
        schedule_id = request.args.get('schedule_id')
        
        if not date:
            return jsonify({'error': 'Date parameter is required'}), 400
        
        target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        
        # Get all drivers
        drivers = list(mongo.db.users.find({'role': 'driver', 'is_active': True}))
        
        # Get drivers already assigned on this date
        assigned_drivers = list(mongo.db.driver_assignments.aggregate([
            {
                '$lookup': {
                    'from': 'busschedules',
                    'localField': 'schedule_id',
                    'foreignField': '_id',
                    'as': 'schedule'
                }
            },
            {
                '$unwind': '$schedule'
            },
            {
                '$match': {
                    'schedule.departureDate': {
                        '$gte': target_date.replace(hour=0, minute=0, second=0, microsecond=0),
                        '$lt': target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                    },
                    'status': 'active'
                }
            }
        ]))
        
        assigned_driver_ids = [assignment['driver_id'] for assignment in assigned_drivers]
        
        # Filter available drivers
        available_drivers = []
        for driver in drivers:
            if str(driver['_id']) not in assigned_driver_ids:
                available_drivers.append({
                    '_id': str(driver['_id']),
                    'name': driver.get('full_name'),
                    'license_number': driver.get('license_number'),
                    'experience_years': driver.get('experience_years', 0),
                    'phone': driver.get('phone')
                })
        
        return jsonify({'available_drivers': available_drivers}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@drivers_bp.route('/assignment/<assignment_id>', methods=['DELETE'])
@jwt_required()
def remove_assignment(assignment_id):
    """Remove a driver assignment"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        assignment = mongo.db.driver_assignments.find_one({'_id': ObjectId(assignment_id)})
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Update assignment status
        mongo.db.driver_assignments.update_one(
            {'_id': ObjectId(assignment_id)},
            {'$set': {'status': 'cancelled'}}
        )
        
        # Remove driver from schedule
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(assignment['schedule_id'])},
            {'$set': {
                'driver_id': None,
                'driver_name': None,
                'assignment_status': 'unassigned'
            }}
        )
        
        return jsonify({'message': 'Assignment removed successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
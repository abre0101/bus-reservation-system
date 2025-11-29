from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson import ObjectId
from app import mongo
import logging

tariff_bp = Blueprint('tariff', __name__)
logger = logging.getLogger(__name__)

# Utility Functions
def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
    except Exception as e:
        logger.error(f"Admin check error: {e}")
        return False

def serialize_document(doc):
    """Serialize MongoDB document for JSON response"""
    if not doc:
        return None
    
    if isinstance(doc, list):
        return [serialize_document(item) for item in doc]
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    return serialized

# ==================== ADMIN ENDPOINTS ====================

@tariff_bp.route('/rates', methods=['GET'])
@jwt_required()
def get_tariff_rates():
    """Get all tariff rates (Admin: all, Others: active only)"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Admin can see all rates, others only see active rates
        if user.get('role') == 'admin':
            rates = list(mongo.db.tariff_rates.find().sort('bus_type', 1))
        else:
            rates = list(mongo.db.tariff_rates.find({'is_active': True}).sort('bus_type', 1))
        
        return jsonify({
            'success': True,
            'rates': serialize_document(rates),
            'total': len(rates)
        }), 200
        
    except Exception as e:
        logger.error(f"Get tariff rates error: {e}")
        return jsonify({'error': f'Failed to fetch tariff rates: {str(e)}'}), 500

@tariff_bp.route('/rates/current', methods=['GET'])
def get_current_rates():
    """Get current active tariff rates (Public endpoint)"""
    try:
        # Get all active rates
        rates = list(mongo.db.tariff_rates.find({'is_active': True}).sort('bus_type', 1))
        
        # Format for easy lookup
        rate_map = {}
        for rate in rates:
            rate_map[rate['bus_type']] = {
                'rate_per_km': rate['rate_per_km'],
                'minimum_fare': rate['minimum_fare'],
                'effective_from': rate.get('effective_from', ''),
                'last_updated': rate.get('updated_at', '')
            }
        
        return jsonify({
            'success': True,
            'rates': rate_map,
            'raw_rates': serialize_document(rates)
        }), 200
        
    except Exception as e:
        logger.error(f"Get current rates error: {e}")
        return jsonify({'error': f'Failed to fetch current rates: {str(e)}'}), 500

@tariff_bp.route('/rates', methods=['POST'])
@jwt_required()
def create_tariff_rate():
    """Create new tariff rate (Admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['bus_type', 'rate_per_km', 'minimum_fare']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate values
        if data['rate_per_km'] <= 0:
            return jsonify({'error': 'Rate per km must be positive'}), 400
        
        if data['minimum_fare'] < 0:
            return jsonify({'error': 'Minimum fare cannot be negative'}), 400
        
        # Check if rate already exists for this bus type
        existing = mongo.db.tariff_rates.find_one({
            'bus_type': data['bus_type'],
            'is_active': True
        })
        
        if existing:
            return jsonify({
                'error': f'Active tariff rate already exists for {data["bus_type"]}. Please update or deactivate the existing rate first.'
            }), 409
        
        # Create tariff rate
        current_user_id = get_jwt_identity()
        rate_data = {
            'bus_type': data['bus_type'],
            'rate_per_km': float(data['rate_per_km']),
            'minimum_fare': float(data['minimum_fare']),
            'effective_from': data.get('effective_from', datetime.now().strftime('%Y-%m-%d')),
            'effective_until': data.get('effective_until'),
            'is_active': True,
            'created_by': current_user_id,
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'notes': data.get('notes', '')
        }
        
        result = mongo.db.tariff_rates.insert_one(rate_data)
        rate_data['_id'] = str(result.inserted_id)
        
        logger.info(f"Tariff rate created: {data['bus_type']} - {data['rate_per_km']} ETB/km by user {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Tariff rate created successfully',
            'rate': serialize_document(rate_data)
        }), 201
        
    except Exception as e:
        logger.error(f"Create tariff rate error: {e}")
        return jsonify({'error': f'Failed to create tariff rate: {str(e)}'}), 500

@tariff_bp.route('/rates/<rate_id>', methods=['PUT'])
@jwt_required()
def update_tariff_rate(rate_id):
    """Update tariff rate (Admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Find existing rate
        rate = mongo.db.tariff_rates.find_one({'_id': ObjectId(rate_id)})
        if not rate:
            return jsonify({'error': 'Tariff rate not found'}), 404
        
        # Prepare update data
        update_data = {
            'updated_at': datetime.now()
        }
        
        # Update allowed fields
        if 'rate_per_km' in data:
            if data['rate_per_km'] <= 0:
                return jsonify({'error': 'Rate per km must be positive'}), 400
            update_data['rate_per_km'] = float(data['rate_per_km'])
        
        if 'minimum_fare' in data:
            if data['minimum_fare'] < 0:
                return jsonify({'error': 'Minimum fare cannot be negative'}), 400
            update_data['minimum_fare'] = float(data['minimum_fare'])
        
        if 'effective_from' in data:
            update_data['effective_from'] = data['effective_from']
        
        if 'effective_until' in data:
            update_data['effective_until'] = data['effective_until']
        
        if 'is_active' in data:
            update_data['is_active'] = bool(data['is_active'])
        
        if 'notes' in data:
            update_data['notes'] = data['notes']
        
        # Update rate
        result = mongo.db.tariff_rates.update_one(
            {'_id': ObjectId(rate_id)},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made'}), 400
        
        # Get updated rate
        updated_rate = mongo.db.tariff_rates.find_one({'_id': ObjectId(rate_id)})
        
        current_user_id = get_jwt_identity()
        logger.info(f"Tariff rate updated: {rate['bus_type']} by user {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Tariff rate updated successfully',
            'rate': serialize_document(updated_rate)
        }), 200
        
    except Exception as e:
        logger.error(f"Update tariff rate error: {e}")
        return jsonify({'error': f'Failed to update tariff rate: {str(e)}'}), 500

@tariff_bp.route('/rates/<rate_id>', methods=['DELETE'])
@jwt_required()
def delete_tariff_rate(rate_id):
    """Deactivate tariff rate (Admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Find rate
        rate = mongo.db.tariff_rates.find_one({'_id': ObjectId(rate_id)})
        if not rate:
            return jsonify({'error': 'Tariff rate not found'}), 404
        
        # Deactivate instead of delete
        result = mongo.db.tariff_rates.update_one(
            {'_id': ObjectId(rate_id)},
            {
                '$set': {
                    'is_active': False,
                    'updated_at': datetime.now()
                }
            }
        )
        
        current_user_id = get_jwt_identity()
        logger.info(f"Tariff rate deactivated: {rate['bus_type']} by user {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Tariff rate deactivated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Delete tariff rate error: {e}")
        return jsonify({'error': f'Failed to deactivate tariff rate: {str(e)}'}), 500

@tariff_bp.route('/rates/history', methods=['GET'])
@jwt_required()
def get_tariff_history():
    """Get tariff rate change history (Admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        bus_type = request.args.get('bus_type')
        
        query = {}
        if bus_type:
            query['bus_type'] = bus_type
        
        # Get all rates (active and inactive) sorted by date
        rates = list(mongo.db.tariff_rates.find(query).sort('created_at', -1))
        
        return jsonify({
            'success': True,
            'history': serialize_document(rates),
            'total': len(rates)
        }), 200
        
    except Exception as e:
        logger.error(f"Get tariff history error: {e}")
        return jsonify({'error': f'Failed to fetch tariff history: {str(e)}'}), 500

# ==================== CALCULATION ENDPOINT ====================

@tariff_bp.route('/calculate', methods=['POST'])
def calculate_fare():
    """Calculate fare based on distance and bus type (Public endpoint)"""
    try:
        data = request.get_json()
        
        distance = data.get('distance', 0)
        bus_type = data.get('bus_type', 'Standard')
        
        if distance <= 0:
            return jsonify({'error': 'Distance must be positive'}), 400
        
        # Get current rate for bus type
        rate = mongo.db.tariff_rates.find_one({
            'bus_type': bus_type,
            'is_active': True
        })
        
        if not rate:
            return jsonify({'error': f'No active tariff rate found for {bus_type}'}), 404
        
        # Calculate fare
        calculated_fare = distance * rate['rate_per_km']
        final_fare = max(calculated_fare, rate['minimum_fare'])
        
        return jsonify({
            'success': True,
            'calculation': {
                'distance': distance,
                'bus_type': bus_type,
                'rate_per_km': rate['rate_per_km'],
                'minimum_fare': rate['minimum_fare'],
                'calculated_fare': round(calculated_fare, 2),
                'final_fare': round(final_fare, 2),
                'formula': f"{distance} km × {rate['rate_per_km']} ETB/km = {round(final_fare, 2)} ETB"
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Calculate fare error: {e}")
        return jsonify({'error': f'Failed to calculate fare: {str(e)}'}), 500

# ==================== INITIALIZATION ====================

@tariff_bp.route('/rates/initialize', methods=['POST'])
@jwt_required()
def initialize_default_rates():
    """Initialize default tariff rates (Admin only, one-time setup)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Check if rates already exist
        existing_count = mongo.db.tariff_rates.count_documents({'is_active': True})
        if existing_count > 0:
            return jsonify({
                'error': f'{existing_count} active tariff rates already exist. Use update endpoint to modify them.'
            }), 409
        
        current_user_id = get_jwt_identity()
        current_date = datetime.now()
        
        # Default rates based on Ethiopian bus transport
        default_rates = [
            {
                'bus_type': 'Standard',
                'rate_per_km': 2.5,
                'minimum_fare': 50,
                'notes': 'Basic bus service - Government approved rate'
            },
            {
                'bus_type': 'Luxury',
                'rate_per_km': 3.5,
                'minimum_fare': 75,
                'notes': 'Enhanced comfort - Government approved rate'
            },
            {
                'bus_type': 'Premium',
                'rate_per_km': 4.0,
                'minimum_fare': 100,
                'notes': 'Premium service - Government approved rate'
            },
            {
                'bus_type': 'VIP',
                'rate_per_km': 4.5,
                'minimum_fare': 125,
                'notes': 'VIP experience - Government approved rate'
            },
            {
                'bus_type': 'Sleeper',
                'rate_per_km': 5.0,
                'minimum_fare': 150,
                'notes': 'Overnight sleeper buses - Government approved rate'
            }
        ]
        
        # Insert all rates
        for rate in default_rates:
            rate.update({
                'effective_from': current_date.strftime('%Y-%m-%d'),
                'effective_until': None,
                'is_active': True,
                'created_by': current_user_id,
                'created_at': current_date,
                'updated_at': current_date
            })
        
        result = mongo.db.tariff_rates.insert_many(default_rates)
        
        logger.info(f"Default tariff rates initialized by user {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': f'{len(result.inserted_ids)} default tariff rates created successfully',
            'rates': serialize_document(default_rates)
        }), 201
        
    except Exception as e:
        logger.error(f"Initialize rates error: {e}")
        return jsonify({'error': f'Failed to initialize rates: {str(e)}'}), 500

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
from app import mongo
import bcrypt

users_bp = Blueprint('users', __name__)


def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one(
            {'_id': ObjectId(current_user_id)}, 
            {'role': 1, 'is_active': 1}
        )
        return user and user.get('role') == 'admin' and user.get('is_active', True)
    except Exception as e:
        print(f"❌ Error in is_admin check: {e}")
        return False
    
def get_current_user():
    """Get current user details"""
    try:
        current_user_id = get_jwt_identity()
        return mongo.db.users.find_one(
            {'_id': ObjectId(current_user_id)},
            {'password': 0}
        )
    except Exception as e:
        print(f"❌ Error getting current user: {e}")
        return None

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_current_user_profile():
    """Get current user's own profile"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Convert ObjectId and handle datetime
        current_user['_id'] = str(current_user['_id'])
        if 'created_at' in current_user and isinstance(current_user['created_at'], datetime):
            current_user['created_at'] = current_user['created_at'].isoformat()
        if 'updated_at' in current_user and isinstance(current_user['updated_at'], datetime):
            current_user['updated_at'] = current_user['updated_at'].isoformat()
        
        return jsonify(current_user), 200
        
    except Exception as e:
        print(f"❌ Error in get_current_user_profile: {e}")
        return jsonify({'error': 'Failed to fetch user profile'}), 500

@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_current_user_profile():
    """Update current user's own profile"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Define allowed fields that users can update themselves
        allowed_fields = ['name', 'email', 'phone', 'address', 'date_of_birth']
        
        # Filter only allowed fields
        update_data = {}
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Validate required fields
        if 'email' in update_data and not update_data['email']:
            return jsonify({'error': 'Email is required'}), 400
        
        if 'name' in update_data and not update_data['name']:
            return jsonify({'error': 'Name is required'}), 400
        
        # Check if email is already taken by another user
        if 'email' in update_data:
            existing_user = mongo.db.users.find_one({
                'email': update_data['email'],
                '_id': {'$ne': ObjectId(current_user_id)}
            })
            if existing_user:
                return jsonify({'error': 'Email already taken'}), 400
        
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        # Update the user
        result = mongo.db.users.update_one(
            {'_id': ObjectId(current_user_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        # Return updated user data
        updated_user = mongo.db.users.find_one(
            {'_id': ObjectId(current_user_id)},
            {'password': 0}
        )
        
        # Convert ObjectId and handle datetime
        updated_user['_id'] = str(updated_user['_id'])
        if 'created_at' in updated_user and isinstance(updated_user['created_at'], datetime):
            updated_user['created_at'] = updated_user['created_at'].isoformat()
        if 'updated_at' in updated_user and isinstance(updated_user['updated_at'], datetime):
            updated_user['updated_at'] = updated_user['updated_at'].isoformat()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': updated_user
        }), 200
        
    except Exception as e:
        print(f"❌ Error in update_current_user_profile: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500

def hash_password(password):
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    """Verify a password against its hash using bcrypt"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception as e:
        print(f"❌ Error verifying password: {e}")
        return False

@users_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change current user's password"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'current_password' not in data or 'new_password' not in data:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Validate new password strength
        new_password = data['new_password']
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        # Get user with password
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify current password
        if not verify_password(data['current_password'], user['password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Check if new password is different from current password
        if verify_password(new_password, user['password']):
            return jsonify({'error': 'New password must be different from current password'}), 400
        
        # Hash new password and update
        hashed_new_password = hash_password(new_password)
        
        result = mongo.db.users.update_one(
            {'_id': ObjectId(current_user_id)},
            {'$set': {
                'password': hashed_new_password,
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Failed to update password'}), 500
        
        return jsonify({'message': 'Password updated successfully'}), 200
        
    except Exception as e:
        print(f"❌ Error in change_password: {e}")
        return jsonify({'error': 'Failed to change password'}), 500

@users_bp.route('/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update user (admin only or own profile)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Check if user is updating their own profile
        if user_id == current_user_id:
            # Users can only update their own profile with specific fields
            allowed_fields = ['name', 'email', 'phone', 'address', 'date_of_birth']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            # Validate required fields
            if 'email' in update_data and not update_data['email']:
                return jsonify({'error': 'Email is required'}), 400
            
            if 'name' in update_data and not update_data['name']:
                return jsonify({'error': 'Name is required'}), 400
            
            # Check if email is already taken by another user
            if 'email' in update_data:
                existing_user = mongo.db.users.find_one({
                    'email': update_data['email'],
                    '_id': {'$ne': ObjectId(current_user_id)}
                })
                if existing_user:
                    return jsonify({'error': 'Email already taken'}), 400
        else:
            # Admin updating another user - check permissions
            current_user = get_current_user()
            if not current_user or current_user.get('role') != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            
            # Admin can update more fields
            restricted_fields = ['_id', 'password', 'created_at']
            update_data = {k: v for k, v in data.items() if k not in restricted_fields}
        
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        # Return updated user data
        updated_user = mongo.db.users.find_one(
            {'_id': ObjectId(user_id)},
            {'password': 0}
        )
        
        # Convert ObjectId and handle datetime
        updated_user['_id'] = str(updated_user['_id'])
        if 'created_at' in updated_user and isinstance(updated_user['created_at'], datetime):
            updated_user['created_at'] = updated_user['created_at'].isoformat()
        if 'updated_at' in updated_user and isinstance(updated_user['updated_at'], datetime):
            updated_user['updated_at'] = updated_user['updated_at'].isoformat()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': updated_user
        }), 200
        
    except Exception as e:
        print(f"❌ Error in update_user: {e}")
        return jsonify({'error': 'Failed to update user'}), 500


@users_bp.route('/drivers', methods=['GET'])
@jwt_required()
def get_drivers():
    """Get all drivers (admin only) - IMPROVED VERSION"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get query parameters
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        
        drivers = list(mongo.db.users.find(
            {
                'role': 'driver',
                'is_active': is_active
            }, 
            {'password': 0}
        ).sort('created_at', -1))
        
        for driver in drivers:
            driver['_id'] = str(driver['_id'])
            # Handle datetime serialization
            if 'created_at' in driver and isinstance(driver['created_at'], datetime):
                driver['created_at'] = driver['created_at'].isoformat()
        
        return jsonify({
            'drivers': drivers,
            'total': len(drivers)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_drivers: {e}")
        return jsonify({'error': 'Failed to fetch drivers'}), 500

@users_bp.route('/<user_id>/deactivate', methods=['PUT'])
@jwt_required()
def deactivate_user(user_id):
    """Deactivate a user (admin only) - IMPROVED VERSION"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Prevent deactivating yourself
        current_user_id = get_jwt_identity()
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 400
        
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'is_active': False,
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'message': 'User deactivated successfully'}), 200
        
    except Exception as e:
        print(f"❌ Error in deactivate_user: {e}")
        return jsonify({'error': 'Failed to deactivate user'}), 500

@users_bp.route('/<user_id>/activate', methods=['PUT'])
@jwt_required()
def activate_user(user_id):
    """Activate a user (admin only) - IMPROVED VERSION"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'is_active': True,
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'message': 'User activated successfully'}), 200
        
    except Exception as e:
        print(f"❌ Error in activate_user: {e}")
        return jsonify({'error': 'Failed to activate user'}), 500

@users_bp.route('/<user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    """Update user role (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data or 'role' not in data:
            return jsonify({'error': 'Role is required'}), 400
        
        new_role = data['role']
        valid_roles = ['admin', 'driver', 'customer', 'operator']
        
        if new_role not in valid_roles:
            return jsonify({'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'}), 400
        
        # Prevent changing your own role
        current_user_id = get_jwt_identity()
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot change your own role'}), 400
        
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'role': new_role,
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'message': f'User role updated to {new_role}'}), 200
        
    except Exception as e:
        print(f"❌ Error in update_user_role: {e}")
        return jsonify({'error': 'Failed to update user role'}), 500

@users_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """Get user statistics (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        total_users = mongo.db.users.count_documents({})
        active_users = mongo.db.users.count_documents({'is_active': True})
        drivers_count = mongo.db.users.count_documents({'role': 'driver', 'is_active': True})
        admins_count = mongo.db.users.count_documents({'role': 'admin', 'is_active': True})
        
        # Recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_registrations = mongo.db.users.count_documents({
            'created_at': {'$gte': thirty_days_ago}
        })
        
        return jsonify({
            'total_users': total_users,
            'active_users': active_users,
            'drivers_count': drivers_count,
            'admins_count': admins_count,
            'recent_registrations': recent_registrations,
            'inactive_users': total_users - active_users
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_user_stats: {e}")
        return jsonify({'error': 'Failed to fetch user statistics'}), 500
# Add to users.py after existing routes

@users_bp.route('/ticketers', methods=['GET'])
@jwt_required()
def get_ticketers():
    """Get all ticketers (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get query parameters
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        station = request.args.get('station')
        
        query = {
            'role': 'ticketer',
            'is_active': is_active
        }
        
        if station:
            query['station'] = station
        
        ticketers = list(mongo.db.users.find(
            query, 
            {'password': 0}
        ).sort('created_at', -1))
        
        for ticketer in ticketers:
            ticketer['_id'] = str(ticketer['_id'])
            if 'created_at' in ticketer and isinstance(ticketer['created_at'], datetime):
                ticketer['created_at'] = ticketer['created_at'].isoformat()
        
        return jsonify({
            'ticketers': ticketers,
            'total': len(ticketers)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_ticketers: {e}")
        return jsonify({'error': 'Failed to fetch ticketers'}), 500

@users_bp.route('/stations', methods=['GET'])
def get_stations():
    """Get all available stations"""
    try:
        stations = mongo.db.users.distinct('station', {'role': 'ticketer'})
        stations = [station for station in stations if station]  # Remove None values
        
        return jsonify({
            'stations': stations,
            'total': len(stations)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_stations: {e}")
        return jsonify({'error': 'Failed to fetch stations'}), 500
    
@users_bp.route('/health', methods=['GET'])
def users_health():
    """Health check for users service"""
    try:
        # Test database connection
        mongo.db.command('ping')
        users_count = mongo.db.users.count_documents({})
        
        return jsonify({
            'status': 'healthy',
            'service': 'Users Service',
            'database': 'connected',
            'total_users': users_count,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'service': 'Users Service',
            'error': str(e)
        }), 500
    
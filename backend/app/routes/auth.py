from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import mongo, bcrypt
from bson import ObjectId
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        print(f"📝 Registration attempt for: {data.get('email')}")

        # Validate required fields
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400

        # Check if user already exists
        existing_user = mongo.db.users.find_one({'email': data['email']})
        if existing_user:
            return jsonify({'message': 'User with this email already exists'}), 400

        # Hash password
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')

        # Create user document with ALL required fields
        user = {
            'name': data['name'],
            'email': data['email'],
            'password': hashed_password,
            'phone': data.get('phone', ''),
            'birthday': data.get('birthday', ''),  # Add birthday field for loyalty rewards
            'role': 'customer',  # Force customer role for public registration
            'is_active': True,   # Ensure this field is included
            'loyalty_points': 0,  # Initialize loyalty points
            'loyalty_tier': 'member',  # Start at member tier
            'total_bookings': 0,  # Initialize booking count
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        # Insert user
        result = mongo.db.users.insert_one(user)
        user_id = str(result.inserted_id)

        # Create access token
        access_token = create_access_token(
            identity=user_id,
            additional_claims={
                'email': user['email'],
                'role': user['role']
            }
        )

        print(f"✅ Customer registered successfully: {user['email']}")

        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user_id,
                'name': user['name'],
                'email': user['email'],
                'phone': user['phone'],
                'role': user['role'],
                'is_active': user['is_active'],  # Include in response
                'loyalty_points': user['loyalty_points'],
                'loyalty_tier': user['loyalty_tier'],
                'total_bookings': user['total_bookings'],
                'created_at': user['created_at'].isoformat()
            }
        }), 201

    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
        return jsonify({'message': 'Registration failed', 'error': str(e)}), 500


        
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        print(f"🔐 Login attempt for: {data.get('email')}")
        print(f"📊 Request data: {data}")

        # Validate required fields
        if not data.get('email') or not data.get('password'):
            print("❌ Missing email or password")
            return jsonify({'message': 'Email and password are required'}), 400

        # Find user
        user = mongo.db.users.find_one({'email': data['email']})
        print(f"🔍 User found: {user is not None}")
        
        if not user:
            print(f"❌ No user found with email: {data['email']}")
            return jsonify({'message': 'Invalid email or password'}), 401

        # Check password
        password_valid = bcrypt.check_password_hash(user['password'], data['password'])
        print(f"🔐 Password valid: {password_valid}")
        
        if not password_valid:
            print("❌ Invalid password")
            return jsonify({'message': 'Invalid email or password'}), 401

        # Create access token
        access_token = create_access_token(
            identity=str(user['_id']),
            additional_claims={
                'email': user['email'],
                'role': user['role']
            }
        )

        print(f"✅ User logged in successfully: {user['email']}")

        # Build user response with loyalty data for customers
        user_response = {
            'id': str(user['_id']),
            'name': user['name'],
            'email': user['email'],
            'phone': user.get('phone', ''),
            'date_of_birth': user.get('birthday', ''),  # Map birthday to date_of_birth for frontend
            'address': user.get('address', ''),
            'role': user['role'],
            'is_active': user.get('is_active', True), 
            'created_at': user['created_at'].isoformat() if user.get('created_at') else None,
            'updated_at': user.get('updated_at').isoformat() if user.get('updated_at') else None
        }
        
        # Add loyalty points for customers
        if user['role'] == 'customer':
            user_response['loyalty_points'] = user.get('loyalty_points', 0)
            user_response['loyalty_tier'] = user.get('loyalty_tier', 'member')
            user_response['total_bookings'] = user.get('total_bookings', 0)
            user_response['free_trips_remaining'] = user.get('free_trips_remaining', 0)
            user_response['free_trips_used'] = user.get('free_trips_used', 0)
            user_response['tier_year_start'] = user.get('tier_year_start').isoformat() if user.get('tier_year_start') else None

        return jsonify({
            'access_token': access_token,
            'user': user_response
        }), 200

    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return jsonify({'message': 'Login failed', 'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_id = get_jwt_identity()
        
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Build user response
        user_response = {
            'id': str(user['_id']),
            'name': user['name'],
            'email': user['email'],
            'phone': user.get('phone', ''),
            'date_of_birth': user.get('birthday', ''),  # Map birthday to date_of_birth for frontend
            'address': user.get('address', ''),
            'role': user['role'],
            'is_active': user.get('is_active', True),
            'created_at': user['created_at'].isoformat() if user.get('created_at') else None,
            'updated_at': user['updated_at'].isoformat() if user.get('updated_at') else None
        }
        
        # Add loyalty data for customers
        if user['role'] == 'customer':
            user_response['loyalty_points'] = user.get('loyalty_points', 0)
            user_response['loyalty_tier'] = user.get('loyalty_tier', 'member')
            user_response['total_bookings'] = user.get('total_bookings', 0)
            user_response['free_trips_remaining'] = user.get('free_trips_remaining', 0)
            user_response['free_trips_used'] = user.get('free_trips_used', 0)
            user_response['tier_year_start'] = user.get('tier_year_start').isoformat() if user.get('tier_year_start') else None

        return jsonify(user_response), 200

    except Exception as e:
        print(f"❌ Get current user error: {str(e)}")
        return jsonify({'message': 'Failed to get user data', 'error': str(e)}), 500


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile information"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"📝 Profile update request for user: {current_user_id}")
        print(f"📊 Update data: {data}")
        
        # Get user
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Build update document
        update_fields = {
            'updated_at': datetime.utcnow()
        }
        
        # Update allowed fields
        if 'name' in data:
            update_fields['name'] = data['name']
        if 'email' in data:
            # Check if email is already taken by another user
            existing_user = mongo.db.users.find_one({
                'email': data['email'],
                '_id': {'$ne': ObjectId(current_user_id)}
            })
            if existing_user:
                return jsonify({'error': 'Email already in use'}), 400
            update_fields['email'] = data['email']
        if 'phone' in data:
            update_fields['phone'] = data['phone']
        if 'address' in data:
            update_fields['address'] = data['address']
        if 'date_of_birth' in data:
            # Map date_of_birth to birthday in database
            update_fields['birthday'] = data['date_of_birth']
        
        # Update user
        mongo.db.users.update_one(
            {'_id': ObjectId(current_user_id)},
            {'$set': update_fields}
        )
        
        # Get updated user
        updated_user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        # Build response
        user_response = {
            'id': str(updated_user['_id']),
            'name': updated_user['name'],
            'email': updated_user['email'],
            'phone': updated_user.get('phone', ''),
            'date_of_birth': updated_user.get('birthday', ''),  # Map birthday to date_of_birth
            'address': updated_user.get('address', ''),
            'role': updated_user['role'],
            'is_active': updated_user.get('is_active', True),
            'created_at': updated_user['created_at'].isoformat() if updated_user.get('created_at') else None,
            'updated_at': updated_user['updated_at'].isoformat() if updated_user.get('updated_at') else None
        }
        
        # Add loyalty data for customers
        if updated_user['role'] == 'customer':
            user_response['loyalty_points'] = updated_user.get('loyalty_points', 0)
            user_response['loyalty_tier'] = updated_user.get('loyalty_tier', 'member')
            user_response['total_bookings'] = updated_user.get('total_bookings', 0)
            user_response['free_trips_remaining'] = updated_user.get('free_trips_remaining', 0)
            user_response['free_trips_used'] = updated_user.get('free_trips_used', 0)
            user_response['tier_year_start'] = updated_user.get('tier_year_start').isoformat() if updated_user.get('tier_year_start') else None
        
        print(f"✅ Profile updated successfully for user: {current_user_id}")
        
        return jsonify(user_response), 200
        
    except Exception as e:
        print(f"❌ Error updating profile: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"🔐 Password change request for user: {current_user_id}")
        
        # Validate required fields
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        # Get user
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify current password
        if not bcrypt.check_password_hash(user['password'], current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Hash new password
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        
        # Update password
        mongo.db.users.update_one(
            {'_id': ObjectId(current_user_id)},
            {
                '$set': {
                    'password': hashed_password,
                    'updated_at': datetime.utcnow()
                }
            }
        )
        
        print(f"✅ Password changed successfully for user: {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        print(f"❌ Error changing password: {str(e)}")
        return jsonify({'error': 'Failed to change password'}), 500

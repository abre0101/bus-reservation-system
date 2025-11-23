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
            'role': 'customer',  # Force customer role for public registration
            'is_active': True,   # Ensure this field is included
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

        return jsonify({
            'access_token': access_token,
            'user': {
                'id': str(user['_id']),
                'name': user['name'],
                'email': user['email'],
                'phone': user.get('phone', ''),
                'role': user['role'],
                'is_active': user.get('is_active', True), 
                'created_at': user['created_at'].isoformat() if user.get('created_at') else None
            }
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

        return jsonify({
            'id': str(user['_id']),
            'name': user['name'],
            'email': user['email'],
            'phone': user.get('phone', ''),
            'role': user['role'],
            'created_at': user['created_at'].isoformat() if user.get('created_at') else None
        }), 200

    except Exception as e:
        print(f"❌ Get current user error: {str(e)}")
        return jsonify({'message': 'Failed to get user data', 'error': str(e)}), 500
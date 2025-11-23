from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from app import mongo

settings_bp = Blueprint('settings', __name__)

def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
    except:
        return False

# Default settings structure
DEFAULT_SETTINGS = {
    'refund_policy': {
        'enabled': True,
        'refund_percentage_24h': 90,  # 90% refund if cancelled 24h before
        'refund_percentage_12h': 60,  # 60% refund if cancelled 12h before
        'refund_percentage_6h': 30,   # 30% refund if cancelled 6h before
        'refund_percentage_2h': 0,    # No refund if cancelled less than 2h before
        'processing_fee': 50,         # Processing fee in ETB
        'refund_processing_days': 7   # Days to process refund
    },
    'cancellation_policy': {
        'enabled': True,
        'allow_cancellation': True,
        'cancellation_deadline_hours': 2,  # Must cancel at least 2 hours before
        'auto_cancel_unpaid_minutes': 30,  # Auto-cancel unpaid bookings after 30 min
        'cancellation_reasons_required': True
    },
    'baggage_policy': {
        'enabled': True,
        'free_baggage_weight_kg': 20,
        'extra_baggage_fee_per_kg': 10,  # ETB per kg
        'max_baggage_weight_kg': 50,
        'hand_luggage_weight_kg': 7,
        'oversized_baggage_fee': 100
    },
    'checkin_policy': {
        'enabled': True,
        'checkin_opens_hours': 24,     # Check-in opens 24h before departure
        'checkin_closes_minutes': 30,  # Check-in closes 30 min before departure
        'require_checkin': True,
        'allow_online_checkin': True,
        'send_checkin_reminder': True,
        'reminder_hours_before': 12
    },
    'booking_limits': {
        'enabled': True,
        'max_bookings_per_user_per_day': 5,
        'max_seats_per_booking': 6,
        'min_booking_advance_hours': 1,  # Must book at least 1 hour in advance
        'max_booking_advance_days': 90   # Can book up to 90 days in advance
    },
    'payment_policy': {
        'enabled': True,
        'payment_timeout_minutes': 30,
        'accepted_methods': ['cash', 'chapa'],
        'require_payment_confirmation': True,
        'partial_payment_allowed': False
    },
    'general_settings': {
        'company_name': 'EthioBus',
        'support_email': 'support@ethiobus.com',
        'support_phone': '+251-911-234567',
        'currency': 'ETB',
        'timezone': 'Africa/Addis_Ababa',
        'language': 'en'
    }
}

@settings_bp.route('/health', methods=['GET'])
def settings_health():
    """Health check for settings service"""
    try:
        settings_count = mongo.db.settings.count_documents({})
        return jsonify({
            'status': 'healthy',
            'service': 'Settings Service',
            'settings_count': settings_count,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'service': 'Settings Service',
            'error': str(e)
        }), 500

@settings_bp.route('/', methods=['GET', 'OPTIONS'], strict_slashes=False)
@jwt_required(optional=True)
def get_settings():
    """Get all system settings"""
    try:
        # Handle OPTIONS request for CORS preflight
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
            
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get settings from database
        settings = mongo.db.settings.find_one({'type': 'system_settings'})
        
        if not settings:
            # Initialize with default settings if not exists
            settings = {
                'type': 'system_settings',
                **DEFAULT_SETTINGS,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            mongo.db.settings.insert_one(settings)
        
        # Convert ObjectId to string
        settings['_id'] = str(settings['_id'])
        
        return jsonify(settings), 200
        
    except Exception as e:
        print(f"❌ Error getting settings: {e}")
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@jwt_required(optional=True)
def update_settings():
    """Update system settings"""
    try:
        # Handle OPTIONS request for CORS preflight
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
            
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get current settings
        current_settings = mongo.db.settings.find_one({'type': 'system_settings'})
        
        if not current_settings:
            # Create new settings
            settings = {
                'type': 'system_settings',
                **DEFAULT_SETTINGS,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            mongo.db.settings.insert_one(settings)
            current_settings = settings
        
        # Update settings
        update_data = {}
        
        # Update each policy section
        if 'refund_policy' in data:
            update_data['refund_policy'] = {**current_settings.get('refund_policy', {}), **data['refund_policy']}
        
        if 'cancellation_policy' in data:
            update_data['cancellation_policy'] = {**current_settings.get('cancellation_policy', {}), **data['cancellation_policy']}
        
        if 'baggage_policy' in data:
            update_data['baggage_policy'] = {**current_settings.get('baggage_policy', {}), **data['baggage_policy']}
        
        if 'checkin_policy' in data:
            update_data['checkin_policy'] = {**current_settings.get('checkin_policy', {}), **data['checkin_policy']}
        
        if 'booking_limits' in data:
            update_data['booking_limits'] = {**current_settings.get('booking_limits', {}), **data['booking_limits']}
        
        if 'payment_policy' in data:
            update_data['payment_policy'] = {**current_settings.get('payment_policy', {}), **data['payment_policy']}
        
        if 'general_settings' in data:
            update_data['general_settings'] = {**current_settings.get('general_settings', {}), **data['general_settings']}
        
        update_data['updated_at'] = datetime.utcnow()
        update_data['updated_by'] = get_jwt_identity()
        
        # Update in database
        result = mongo.db.settings.update_one(
            {'type': 'system_settings'},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Settings not found'}), 404
        
        # Get updated settings
        updated_settings = mongo.db.settings.find_one({'type': 'system_settings'})
        updated_settings['_id'] = str(updated_settings['_id'])
        
        return jsonify({
            'message': 'Settings updated successfully',
            'settings': updated_settings
        }), 200
        
    except Exception as e:
        print(f"❌ Error updating settings: {e}")
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/reset', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def reset_settings():
    """Reset settings to default values"""
    try:
        # Handle OPTIONS request for CORS preflight
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
            
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Delete existing settings
        mongo.db.settings.delete_many({'type': 'system_settings'})
        
        # Create new settings with defaults
        settings = {
            'type': 'system_settings',
            **DEFAULT_SETTINGS,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'reset_by': get_jwt_identity()
        }
        
        mongo.db.settings.insert_one(settings)
        settings['_id'] = str(settings['_id'])
        
        return jsonify({
            'message': 'Settings reset to default values',
            'settings': settings
        }), 200
        
    except Exception as e:
        print(f"❌ Error resetting settings: {e}")
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/policy/<policy_name>', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_policy(policy_name):
    """Get specific policy settings"""
    try:
        # Handle OPTIONS request for CORS preflight
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
            
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        settings = mongo.db.settings.find_one({'type': 'system_settings'})
        
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        policy_map = {
            'refund': 'refund_policy',
            'cancellation': 'cancellation_policy',
            'baggage': 'baggage_policy',
            'checkin': 'checkin_policy',
            'booking': 'booking_limits',
            'payment': 'payment_policy',
            'general': 'general_settings'
        }
        
        policy_key = policy_map.get(policy_name)
        if not policy_key:
            return jsonify({'error': 'Invalid policy name'}), 400
        
        policy = settings.get(policy_key, {})
        
        return jsonify({
            'policy_name': policy_name,
            'policy': policy
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting policy: {e}")
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/validate-booking', methods=['POST'])
def validate_booking_limits():
    """Validate if a booking request meets the policy requirements"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        num_seats = data.get('num_seats', 1)
        departure_datetime = data.get('departure_datetime')
        
        # Get settings
        settings = mongo.db.settings.find_one({'type': 'system_settings'})
        if not settings:
            settings = DEFAULT_SETTINGS
        
        booking_limits = settings.get('booking_limits', DEFAULT_SETTINGS['booking_limits'])
        
        errors = []
        
        # Check if booking limits are enabled
        if not booking_limits.get('enabled', True):
            return jsonify({'valid': True, 'errors': []}), 200
        
        # Check max seats per booking
        max_seats = booking_limits.get('max_seats_per_booking', 6)
        if num_seats > max_seats:
            errors.append(f'Maximum {max_seats} seats allowed per booking')
        
        # Check bookings per day for user
        if user_id:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start.replace(hour=23, minute=59, second=59)
            
            user_bookings_today = mongo.db.bookings.count_documents({
                'user_id': user_id,
                'created_at': {'$gte': today_start, '$lte': today_end},
                'status': {'$in': ['confirmed', 'pending', 'checked_in']}
            })
            
            max_bookings = booking_limits.get('max_bookings_per_user_per_day', 5)
            if user_bookings_today >= max_bookings:
                errors.append(f'Maximum {max_bookings} bookings per day reached')
        
        # Check advance booking time
        if departure_datetime:
            departure_dt = datetime.fromisoformat(departure_datetime.replace('Z', '+00:00'))
            now = datetime.utcnow()
            hours_until_departure = (departure_dt - now).total_seconds() / 3600
            
            min_advance = booking_limits.get('min_booking_advance_hours', 1)
            if hours_until_departure < min_advance:
                errors.append(f'Must book at least {min_advance} hours in advance')
            
            max_advance_days = booking_limits.get('max_booking_advance_days', 90)
            if hours_until_departure > (max_advance_days * 24):
                errors.append(f'Cannot book more than {max_advance_days} days in advance')
        
        return jsonify({
            'valid': len(errors) == 0,
            'errors': errors
        }), 200
        
    except Exception as e:
        print(f"❌ Error validating booking: {e}")
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/calculate-refund', methods=['POST'])
def calculate_refund():
    """Calculate refund amount based on cancellation time"""
    try:
        data = request.get_json()
        booking_amount = data.get('booking_amount', 0)
        departure_datetime = data.get('departure_datetime')
        
        if not departure_datetime:
            return jsonify({'error': 'Departure datetime required'}), 400
        
        # Get settings
        settings = mongo.db.settings.find_one({'type': 'system_settings'})
        if not settings:
            settings = DEFAULT_SETTINGS
        
        refund_policy = settings.get('refund_policy', DEFAULT_SETTINGS['refund_policy'])
        
        if not refund_policy.get('enabled', True):
            return jsonify({
                'refund_amount': 0,
                'refund_percentage': 0,
                'processing_fee': 0,
                'message': 'Refunds are currently disabled'
            }), 200
        
        # Calculate hours until departure
        departure_dt = datetime.fromisoformat(departure_datetime.replace('Z', '+00:00'))
        now = datetime.utcnow()
        hours_until_departure = (departure_dt - now).total_seconds() / 3600
        
        # Determine refund percentage
        if hours_until_departure >= 24:
            refund_percentage = refund_policy.get('refund_percentage_24h', 90)
        elif hours_until_departure >= 12:
            refund_percentage = refund_policy.get('refund_percentage_12h', 60)
        elif hours_until_departure >= 6:
            refund_percentage = refund_policy.get('refund_percentage_6h', 30)
        elif hours_until_departure >= 2:
            refund_percentage = refund_policy.get('refund_percentage_2h', 0)
        else:
            refund_percentage = 0
        
        # Calculate refund amount
        processing_fee = refund_policy.get('processing_fee', 50)
        refund_amount = (booking_amount * refund_percentage / 100) - processing_fee
        refund_amount = max(0, refund_amount)  # Ensure non-negative
        
        return jsonify({
            'refund_amount': round(refund_amount, 2),
            'refund_percentage': refund_percentage,
            'processing_fee': processing_fee,
            'hours_until_departure': round(hours_until_departure, 2),
            'processing_days': refund_policy.get('refund_processing_days', 7)
        }), 200
        
    except Exception as e:
        print(f"❌ Error calculating refund: {e}")
        return jsonify({'error': str(e)}), 500

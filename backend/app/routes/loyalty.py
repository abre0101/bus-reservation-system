"""
Loyalty System API Routes
Handles loyalty points, tier benefits, and rewards
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import mongo
from app.utils.loyalty import (
    get_loyalty_tier,
    get_tier_benefits,
    calculate_loyalty_points,
    calculate_discount_amount,
    can_use_free_trip,
    reset_annual_benefits,
    can_claim_birthday_bonus,
    generate_referral_code,
    calculate_referral_bonus,
    get_tier_progress,
    clear_policy_cache
)

def serialize_doc(doc):
    """Helper to serialize MongoDB documents"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                result[key] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, (dict, list)):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc

loyalty_bp = Blueprint('loyalty', __name__, url_prefix='/api/loyalty')

@loyalty_bp.route('/benefits', methods=['GET'])
@jwt_required()
def get_user_benefits():
    """Get current user's loyalty tier and benefits"""
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Calculate current loyalty points
        loyalty_points = user.get('loyalty_points', 0)
        tier = get_loyalty_tier(loyalty_points)
        benefits = get_tier_benefits(tier)
        
        # Check if annual reset is needed
        reset_data = reset_annual_benefits(user)
        if reset_data:
            mongo.db.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': reset_data}
            )
            user.update(reset_data)
        
        # Get tier progress
        progress = get_tier_progress(loyalty_points)
        
        return jsonify({
            'success': True,
            'loyalty_points': loyalty_points,
            'tier': tier,
            'benefits': benefits,
            'free_trips_remaining': user.get('free_trips_remaining', benefits['free_trips_per_year']),
            'free_trips_used': user.get('free_trips_used', 0),
            'tier_year_start': user.get('tier_year_start'),
            'progress': progress,
            'referral_code': user.get('referral_code'),
            'total_referrals': user.get('total_referrals', 0)
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting benefits: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/apply-discount', methods=['POST'])
@jwt_required()
def apply_tier_discount():
    """Calculate tier discount for a booking"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"💰 Apply discount request from user: {user_id}")
        print(f"📦 Request data: {data}")
        
        base_price = data.get('base_price')
        if not base_price:
            print("❌ No base_price provided")
            return jsonify({'error': 'Base price is required'}), 400
        
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            print(f"❌ User not found: {user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        loyalty_points = user.get('loyalty_points', 0)
        tier = get_loyalty_tier(loyalty_points)
        benefits = get_tier_benefits(tier)
        
        print(f"👤 User: {user.get('name')}")
        print(f"⭐ Loyalty points: {loyalty_points}")
        print(f"🏆 Tier: {tier}")
        print(f"💎 Discount percentage: {benefits['discount_percentage']}%")
        
        discount_amount = calculate_discount_amount(base_price, tier)
        final_price = base_price - discount_amount
        
        print(f"💵 Base price: {base_price} ETB")
        print(f"💰 Discount amount: {discount_amount} ETB")
        print(f"✅ Final price: {final_price} ETB")
        
        response_data = {
            'success': True,
            'tier': tier,
            'discount_percentage': benefits['discount_percentage'],
            'base_price': base_price,
            'discount_amount': discount_amount,
            'final_price': final_price
        }
        
        print(f"📤 Sending response: {response_data}")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Error applying discount: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/check-free-trip', methods=['POST'])
@jwt_required()
def check_free_trip_eligibility():
    """Check if user can use a free trip"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        booking_amount = data.get('booking_amount')
        if not booking_amount:
            return jsonify({'error': 'Booking amount is required'}), 400
        
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if annual reset is needed
        reset_data = reset_annual_benefits(user)
        if reset_data:
            mongo.db.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': reset_data}
            )
            user.update(reset_data)
        
        result = can_use_free_trip(user, booking_amount)
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except Exception as e:
        print(f"❌ Error checking free trip: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/redeem-free-trip', methods=['POST'])
@jwt_required()
def redeem_free_trip():
    """Redeem a free trip for a booking"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        booking_id = data.get('booking_id')
        if not booking_id:
            return jsonify({'error': 'Booking ID is required'}), 400
        
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        booking = mongo.db.bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Check eligibility
        result = can_use_free_trip(user, booking.get('total_amount', 0))
        if not result['can_use']:
            return jsonify({'error': result['reason']}), 400
        
        # Update booking
        mongo.db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'is_free_trip': True,
                'free_trip_redeemed_at': datetime.utcnow(),
                'original_amount': booking.get('total_amount'),
                'total_amount': 0,
                'payment_status': 'paid'
            }}
        )
        
        # Update user's free trips
        free_trips_used = user.get('free_trips_used', 0) + 1
        free_trips_remaining = user.get('free_trips_remaining', 0) - 1
        
        mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'free_trips_used': free_trips_used,
                'free_trips_remaining': free_trips_remaining
            }}
        )
        
        return jsonify({
            'success': True,
            'message': 'Free trip redeemed successfully',
            'free_trips_remaining': free_trips_remaining
        }), 200
        
    except Exception as e:
        print(f"❌ Error redeeming free trip: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/claim-birthday-bonus', methods=['POST'])
@jwt_required()
def claim_birthday_bonus():
    """Claim birthday bonus points"""
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        result = can_claim_birthday_bonus(user)
        if not result['can_claim']:
            return jsonify({'error': result['reason']}), 400
        
        bonus_points = result['bonus_points']
        current_points = user.get('loyalty_points', 0)
        new_points = current_points + bonus_points
        new_tier = get_loyalty_tier(new_points)
        
        # Update user
        mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'loyalty_points': new_points,
                'loyalty_tier': new_tier,
                'birthday_bonus_claimed_year': datetime.utcnow().year
            }}
        )
        
        return jsonify({
            'success': True,
            'message': f'Birthday bonus claimed! +{bonus_points} points',
            'bonus_points': bonus_points,
            'new_total_points': new_points,
            'new_tier': new_tier
        }), 200
        
    except Exception as e:
        print(f"❌ Error claiming birthday bonus: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/generate-referral-code', methods=['POST'])
@jwt_required()
def create_referral_code():
    """Generate referral code for user"""
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if user already has a referral code
        existing_code = user.get('referral_code')
        if existing_code:
            return jsonify({
                'success': True,
                'referral_code': existing_code,
                'message': 'Referral code already exists'
            }), 200
        
        # Generate new code
        referral_code = generate_referral_code(user.get('name', 'User'), str(user_id))
        
        # Update user
        mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'referral_code': referral_code,
                'total_referrals': 0
            }}
        )
        
        return jsonify({
            'success': True,
            'referral_code': referral_code,
            'message': 'Referral code generated successfully'
        }), 200
        
    except Exception as e:
        print(f"❌ Error generating referral code: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/apply-referral', methods=['POST'])
@jwt_required()
def apply_referral_code():
    """Apply referral code for new user"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        referral_code = data.get('referral_code')
        if not referral_code:
            return jsonify({'error': 'Referral code is required'}), 400
        
        # Find user with referral code
        referrer = mongo.db.users.find_one({'referral_code': referral_code.upper()})
        if not referrer:
            return jsonify({'error': 'Invalid referral code'}), 404
        
        # Check if current user already used a referral
        current_user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if current_user.get('referred_by'):
            return jsonify({'error': 'You have already used a referral code'}), 400
        
        # Calculate bonus points
        referrer_tier = get_loyalty_tier(referrer.get('loyalty_points', 0))
        bonus_points = calculate_referral_bonus(referrer_tier)
        
        if bonus_points == 0:
            return jsonify({'error': 'Referrer tier does not offer referral bonus'}), 400
        
        # Update referrer
        referrer_new_points = referrer.get('loyalty_points', 0) + bonus_points
        referrer_new_tier = get_loyalty_tier(referrer_new_points)
        
        mongo.db.users.update_one(
            {'_id': referrer['_id']},
            {
                '$set': {
                    'loyalty_points': referrer_new_points,
                    'loyalty_tier': referrer_new_tier
                },
                '$inc': {'total_referrals': 1}
            }
        )
        
        # Update current user (referee gets 50 bonus points)
        referee_bonus = 50
        current_user_points = current_user.get('loyalty_points', 0) + referee_bonus
        current_user_tier = get_loyalty_tier(current_user_points)
        
        mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'referred_by': referrer['_id'],
                'loyalty_points': current_user_points,
                'loyalty_tier': current_user_tier
            }}
        )
        
        return jsonify({
            'success': True,
            'message': f'Referral applied! You received {referee_bonus} points',
            'your_bonus': referee_bonus,
            'referrer_bonus': bonus_points,
            'new_points': current_user_points,
            'new_tier': current_user_tier
        }), 200
        
    except Exception as e:
        print(f"❌ Error applying referral: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/history', methods=['GET'])
@jwt_required()
def get_loyalty_history():
    """Get user's loyalty points history"""
    try:
        user_id = get_jwt_identity()
        
        # Get user's bookings (completed trips earn points)
        bookings = list(mongo.db.bookings.find({
            'user_id': ObjectId(user_id),
            'status': {'$in': ['confirmed', 'completed', 'checked_in']}
        }).sort('created_at', -1).limit(50))
        
        history = []
        for booking in bookings:
            history.append({
                'date': booking.get('created_at'),
                'type': 'booking',
                'description': f"Booking: {booking.get('departure_city')} → {booking.get('arrival_city')}",
                'points_earned': 100,  # Base booking points
                'booking_id': str(booking['_id'])
            })
        
        return jsonify({
            'success': True,
            'history': [serialize_doc(h) for h in history]
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting loyalty history: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Admin endpoints
@loyalty_bp.route('/admin/stats', methods=['GET'])
@jwt_required()
def get_admin_loyalty_stats():
    """Get loyalty program statistics for admin"""
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        # Check if user is admin
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get all customers
        customers = list(mongo.db.users.find({'role': 'customer'}))
        
        # Calculate statistics
        total_customers = len(customers)
        total_points = sum(c.get('loyalty_points', 0) for c in customers)
        free_trips_used = sum(c.get('free_trips_used', 0) for c in customers)
        total_referrals = sum(c.get('total_referrals', 0) for c in customers)
        
        # Tier distribution
        tier_distribution = {
            'member': 0,
            'bronze': 0,
            'silver': 0,
            'gold': 0,
            'platinum': 0
        }
        
        for customer in customers:
            tier = customer.get('loyalty_tier', 'member')
            if tier in tier_distribution:
                tier_distribution[tier] += 1
        
        return jsonify({
            'success': True,
            'total_customers': total_customers,
            'total_points': total_points,
            'free_trips_used': free_trips_used,
            'total_referrals': total_referrals,
            'tier_distribution': tier_distribution,
            'average_points': total_points // total_customers if total_customers > 0 else 0
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting admin stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/admin/customers', methods=['GET'])
@jwt_required()
def get_admin_loyalty_customers():
    """Get all customers with loyalty data for admin"""
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        # Check if user is admin
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get filter parameters
        tier_filter = request.args.get('tier')
        
        # Build query
        query = {'role': 'customer'}
        if tier_filter and tier_filter != 'all':
            query['loyalty_tier'] = tier_filter
        
        # Get customers
        customers = list(mongo.db.users.find(query).sort('loyalty_points', -1))
        
        # Serialize and return
        return jsonify({
            'success': True,
            'customers': [serialize_doc(c) for c in customers]
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting admin customers: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/admin/customer/<customer_id>/adjust-points', methods=['POST'])
@jwt_required()
def adjust_customer_points():
    """Manually adjust customer loyalty points (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        # Check if user is admin
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        customer_id = request.view_args['customer_id']
        data = request.get_json()
        
        points_adjustment = data.get('points_adjustment')
        reason = data.get('reason', 'Manual adjustment by admin')
        
        if points_adjustment is None:
            return jsonify({'error': 'Points adjustment is required'}), 400
        
        # Get customer
        customer = mongo.db.users.find_one({'_id': ObjectId(customer_id)})
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Calculate new points
        current_points = customer.get('loyalty_points', 0)
        new_points = max(0, current_points + points_adjustment)  # Don't allow negative points
        new_tier = get_loyalty_tier(new_points)
        
        # Update customer
        mongo.db.users.update_one(
            {'_id': ObjectId(customer_id)},
            {'$set': {
                'loyalty_points': new_points,
                'loyalty_tier': new_tier
            }}
        )
        
        # Log the adjustment
        mongo.db.loyalty_adjustments.insert_one({
            'customer_id': ObjectId(customer_id),
            'admin_id': ObjectId(user_id),
            'points_adjustment': points_adjustment,
            'previous_points': current_points,
            'new_points': new_points,
            'reason': reason,
            'created_at': datetime.utcnow()
        })
        
        return jsonify({
            'success': True,
            'message': 'Points adjusted successfully',
            'previous_points': current_points,
            'new_points': new_points,
            'new_tier': new_tier
        }), 200
        
    except Exception as e:
        print(f"❌ Error adjusting points: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/admin/policy', methods=['GET'])
@jwt_required()
def get_loyalty_policy():
    """Get loyalty program policy (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        # Check if user is admin
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check if policy exists in database
        stored_policy_doc = mongo.db.loyalty_policy.find_one({'_id': 'current_policy'})
        
        if stored_policy_doc and 'policy' in stored_policy_doc:
            # Return stored policy
            return jsonify({
                'success': True,
                'policy': stored_policy_doc['policy']
            }), 200
        
        # If no policy exists, create default policy
        tiers = ['member', 'bronze', 'silver', 'gold']
        policy = {}
        
        for tier in tiers:
            benefits = get_tier_benefits(tier)
            # Get tier threshold
            if tier == 'member':
                threshold = 0
            elif tier == 'bronze':
                threshold = 500
            elif tier == 'silver':
                threshold = 2000
            elif tier == 'gold':
                threshold = 5000
            
            policy[tier] = {
                'threshold': threshold,
                'discount': benefits['discount_percentage'],
                'freeTrips': benefits['free_trips_per_year'],
                'maxValue': benefits['free_trip_max_value'],
                'priorityBoarding': benefits['priority_boarding'],
                'freeSeatSelection': benefits['free_seat_selection'],
                'extraBaggage': benefits['extra_baggage_kg'],
                'birthdayBonus': benefits['birthday_bonus_points'],
                'referralBonus': benefits['referral_bonus_points'],
                'dedicatedSupport': benefits['dedicated_support']
            }
        
        # Store default policy in database
        mongo.db.loyalty_policy.insert_one({
            '_id': 'current_policy',
            'policy': policy,
            'updated_by': ObjectId(user_id),
            'updated_at': datetime.utcnow(),
            'created_at': datetime.utcnow()
        })
        
        print(f"✅ Default loyalty policy initialized in database")
        
        return jsonify({
            'success': True,
            'policy': policy
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting policy: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/admin/policy', methods=['PUT'])
@jwt_required()
def update_loyalty_policy():
    """Update loyalty program policy (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        # Check if user is admin
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        policy = data.get('policy')
        
        if not policy:
            return jsonify({'error': 'Policy data is required'}), 400
        
        # Store policy in database
        mongo.db.loyalty_policy.update_one(
            {'_id': 'current_policy'},
            {'$set': {
                'policy': policy,
                'updated_by': ObjectId(user_id),
                'updated_at': datetime.utcnow()
            }},
            upsert=True
        )
        
        # Clear the policy cache so new policy takes effect immediately
        clear_policy_cache()
        
        print(f"✅ Loyalty policy updated and cache cleared")
        
        return jsonify({
            'success': True,
            'message': 'Loyalty policy updated successfully'
        }), 200
        
    except Exception as e:
        print(f"❌ Error updating policy: {str(e)}")
        return jsonify({'error': str(e)}), 500

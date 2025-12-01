"""
Loyalty System Utilities
Handles tier calculations, benefits, and rewards
"""

from datetime import datetime, timedelta
from typing import Dict, Any

# Cache for policy to avoid repeated database calls
_policy_cache = None
_policy_cache_time = None
CACHE_DURATION = 300  # 5 minutes in seconds

def get_stored_policy():
    """Get policy from database with caching"""
    global _policy_cache, _policy_cache_time
    
    # Check if cache is valid
    if _policy_cache and _policy_cache_time:
        if (datetime.utcnow() - _policy_cache_time).total_seconds() < CACHE_DURATION:
            return _policy_cache
    
    # Import here to avoid circular dependency
    from app import mongo
    
    # Fetch from database
    stored_policy = mongo.db.loyalty_policy.find_one({'_id': 'current_policy'})
    
    if stored_policy and 'policy' in stored_policy:
        _policy_cache = stored_policy['policy']
        _policy_cache_time = datetime.utcnow()
        return _policy_cache
    
    return None

def clear_policy_cache():
    """Clear the policy cache (call this after updating policy)"""
    global _policy_cache, _policy_cache_time
    _policy_cache = None
    _policy_cache_time = None

def get_loyalty_tier(points: int) -> str:
    """Determine loyalty tier based on points"""
    # Try to get thresholds from stored policy
    stored_policy = get_stored_policy()
    
    if stored_policy:
        # Use stored thresholds
        if points >= stored_policy.get('gold', {}).get('threshold', 5000):
            return 'gold'
        elif points >= stored_policy.get('silver', {}).get('threshold', 2000):
            return 'silver'
        elif points >= stored_policy.get('bronze', {}).get('threshold', 500):
            return 'bronze'
        else:
            return 'member'
    
    # Fallback to default thresholds
    if points >= 5000:
        return 'gold'
    elif points >= 2000:
        return 'silver'
    elif points >= 500:
        return 'bronze'
    else:
        return 'member'

def get_tier_benefits(tier: str) -> Dict[str, Any]:
    """Get benefits for a specific tier"""
    # Default benefits (fallback)
    default_benefits = {
        'member': {
            'name': 'Member',
            'icon': '👤',
            'discount_percentage': 0,
            'free_trips_per_year': 0,
            'free_trip_max_value': 0,
            'priority_boarding': False,
            'free_seat_selection': False,
            'extra_baggage_kg': 0,
            'birthday_bonus_points': 0,
            'referral_bonus_points': 0,
            'dedicated_support': False,
            'color': 'blue'
        },
        'bronze': {
            'name': 'Bronze',
            'icon': '🥉',
            'discount_percentage': 5,
            'free_trips_per_year': 1,
            'free_trip_max_value': 600,
            'priority_boarding': False,
            'free_seat_selection': False,
            'extra_baggage_kg': 0,
            'birthday_bonus_points': 100,
            'referral_bonus_points': 0,
            'dedicated_support': False,
            'color': 'orange'
        },
        'silver': {
            'name': 'Silver',
            'icon': '🥈',
            'discount_percentage': 10,
            'free_trips_per_year': 3,
            'free_trip_max_value': 900,
            'priority_boarding': True,
            'free_seat_selection': False,
            'extra_baggage_kg': 0,
            'birthday_bonus_points': 200,
            'referral_bonus_points': 150,
            'dedicated_support': False,
            'color': 'gray'
        },
        'gold': {
            'name': 'Gold',
            'icon': '🥇',
            'discount_percentage': 15,
            'free_trips_per_year': 5,
            'free_trip_max_value': 1200,
            'priority_boarding': True,
            'free_seat_selection': True,
            'extra_baggage_kg': 5,
            'birthday_bonus_points': 500,
            'referral_bonus_points': 300,
            'dedicated_support': True,
            'color': 'yellow'
        }
    }
    
    # Try to get stored policy
    stored_policy = get_stored_policy()
    
    if stored_policy and tier in stored_policy:
        tier_policy = stored_policy[tier]
        # Merge stored policy with default structure
        benefits = default_benefits.get(tier, default_benefits['member']).copy()
        
        # Map frontend field names to backend field names
        if 'discount' in tier_policy:
            benefits['discount_percentage'] = tier_policy['discount']
        if 'freeTrips' in tier_policy:
            benefits['free_trips_per_year'] = tier_policy['freeTrips']
        if 'maxValue' in tier_policy:
            benefits['free_trip_max_value'] = tier_policy['maxValue']
        if 'priorityBoarding' in tier_policy:
            benefits['priority_boarding'] = tier_policy['priorityBoarding']
        if 'freeSeatSelection' in tier_policy:
            benefits['free_seat_selection'] = tier_policy['freeSeatSelection']
        if 'extraBaggage' in tier_policy:
            benefits['extra_baggage_kg'] = tier_policy['extraBaggage']
        if 'birthdayBonus' in tier_policy:
            benefits['birthday_bonus_points'] = tier_policy['birthdayBonus']
        if 'referralBonus' in tier_policy:
            benefits['referral_bonus_points'] = tier_policy['referralBonus']
        if 'dedicatedSupport' in tier_policy:
            benefits['dedicated_support'] = tier_policy['dedicatedSupport']
        
        return benefits
    
    # Return default benefits
    return default_benefits.get(tier, default_benefits['member'])

def calculate_loyalty_points(total_bookings: int, completed_trips: int) -> int:
    """Calculate loyalty points based on bookings and completed trips"""
    return (total_bookings * 100) + (completed_trips * 50)

def calculate_discount_amount(base_price: float, tier: str) -> float:
    """Calculate discount amount based on tier"""
    benefits = get_tier_benefits(tier)
    discount_percentage = benefits['discount_percentage']
    return base_price * (discount_percentage / 100)

def can_use_free_trip(user_data: Dict[str, Any], booking_amount: float) -> Dict[str, Any]:
    """Check if user can use a free trip"""
    tier = user_data.get('loyalty_tier', 'member')
    benefits = get_tier_benefits(tier)
    
    # Check if tier allows free trips
    if benefits['free_trips_per_year'] == 0:
        return {
            'can_use': False,
            'reason': 'Your tier does not include free trips'
        }
    
    # Check remaining free trips
    free_trips_remaining = user_data.get('free_trips_remaining', 0)
    if free_trips_remaining <= 0:
        return {
            'can_use': False,
            'reason': 'No free trips remaining this year'
        }
    
    # Check if booking amount exceeds max value
    max_value = benefits['free_trip_max_value']
    if booking_amount > max_value:
        return {
            'can_use': False,
            'reason': f'Booking amount exceeds free trip maximum of {max_value} ETB',
            'max_value': max_value,
            'excess_amount': booking_amount - max_value
        }
    
    return {
        'can_use': True,
        'remaining_trips': free_trips_remaining,
        'max_value': max_value
    }

def reset_annual_benefits(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Reset annual benefits if year has passed"""
    tier_year_start = user_data.get('tier_year_start')
    
    if not tier_year_start:
        # First time setup
        return {
            'tier_year_start': datetime.utcnow(),
            'free_trips_used': 0,
            'free_trips_remaining': get_tier_benefits(user_data.get('loyalty_tier', 'member'))['free_trips_per_year']
        }
    
    # Check if a year has passed
    if isinstance(tier_year_start, str):
        tier_year_start = datetime.fromisoformat(tier_year_start.replace('Z', '+00:00'))
    
    one_year_later = tier_year_start + timedelta(days=365)
    current_time = datetime.utcnow()
    
    if current_time >= one_year_later:
        # Reset annual benefits
        tier = user_data.get('loyalty_tier', 'member')
        benefits = get_tier_benefits(tier)
        
        return {
            'tier_year_start': current_time,
            'free_trips_used': 0,
            'free_trips_remaining': benefits['free_trips_per_year']
        }
    
    return {}

def can_claim_birthday_bonus(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Check if user can claim birthday bonus"""
    birthday = user_data.get('birthday')
    if not birthday:
        return {
            'can_claim': False,
            'reason': 'Birthday not set in profile'
        }
    
    # Parse birthday
    if isinstance(birthday, str):
        birthday = datetime.fromisoformat(birthday.replace('Z', '+00:00'))
    
    current_year = datetime.utcnow().year
    last_claimed_year = user_data.get('birthday_bonus_claimed_year', 0)
    
    # Check if already claimed this year
    if last_claimed_year >= current_year:
        return {
            'can_claim': False,
            'reason': 'Birthday bonus already claimed this year'
        }
    
    # Check if it's birthday month (allow claiming during birthday month)
    current_month = datetime.utcnow().month
    birthday_month = birthday.month
    
    if current_month != birthday_month:
        return {
            'can_claim': False,
            'reason': f'Birthday bonus available in month {birthday_month}'
        }
    
    tier = user_data.get('loyalty_tier', 'member')
    benefits = get_tier_benefits(tier)
    bonus_points = benefits['birthday_bonus_points']
    
    if bonus_points == 0:
        return {
            'can_claim': False,
            'reason': 'Your tier does not include birthday bonus'
        }
    
    return {
        'can_claim': True,
        'bonus_points': bonus_points,
        'tier': tier
    }

def generate_referral_code(user_name: str, user_id: str) -> str:
    """Generate a unique referral code for user"""
    # Create code from name and ID
    name_part = ''.join(filter(str.isalnum, user_name.upper()))[:6]
    id_part = str(user_id)[-4:]
    return f"{name_part}{id_part}"

def calculate_referral_bonus(referrer_tier: str) -> int:
    """Calculate referral bonus points based on referrer's tier"""
    benefits = get_tier_benefits(referrer_tier)
    return benefits['referral_bonus_points']

def get_tier_progress(current_points: int) -> Dict[str, Any]:
    """Get progress towards next tier"""
    current_tier = get_loyalty_tier(current_points)
    
    # Try to get thresholds from stored policy
    stored_policy = get_stored_policy()
    
    if stored_policy:
        bronze_threshold = stored_policy.get('bronze', {}).get('threshold', 500)
        silver_threshold = stored_policy.get('silver', {}).get('threshold', 2000)
        gold_threshold = stored_policy.get('gold', {}).get('threshold', 5000)
    else:
        # Default thresholds
        bronze_threshold = 500
        silver_threshold = 2000
        gold_threshold = 5000
    
    tier_thresholds = {
        'member': {'next': 'bronze', 'threshold': bronze_threshold},
        'bronze': {'next': 'silver', 'threshold': silver_threshold},
        'silver': {'next': 'gold', 'threshold': gold_threshold},
        'gold': {'next': None, 'threshold': None}
    }
    
    tier_info = tier_thresholds.get(current_tier, tier_thresholds['member'])
    
    if tier_info['next'] is None:
        return {
            'current_tier': current_tier,
            'next_tier': None,
            'points_to_next': 0,
            'progress_percentage': 100,
            'message': 'You have reached the highest tier!'
        }
    
    points_to_next = tier_info['threshold'] - current_points
    
    # Calculate progress percentage
    if current_tier == 'member':
        progress = (current_points / bronze_threshold) * 100 if bronze_threshold > 0 else 0
    elif current_tier == 'bronze':
        progress = ((current_points - bronze_threshold) / (silver_threshold - bronze_threshold)) * 100 if (silver_threshold - bronze_threshold) > 0 else 0
    elif current_tier == 'silver':
        progress = ((current_points - silver_threshold) / (gold_threshold - silver_threshold)) * 100 if (gold_threshold - silver_threshold) > 0 else 0
    else:
        progress = 100
    
    return {
        'current_tier': current_tier,
        'current_points': current_points,
        'next_tier': tier_info['next'],
        'next_tier_threshold': tier_info['threshold'],
        'points_to_next': points_to_next,
        'progress_percentage': min(progress, 100)
    }

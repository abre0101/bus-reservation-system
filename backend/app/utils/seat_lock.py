"""
Seat Locking Utility
Handles temporary seat reservations with automatic expiration
"""
from datetime import datetime, timedelta
from bson import ObjectId
from app import mongo

# Lock duration in minutes
LOCK_DURATION_MINUTES = 10

def lock_seats(schedule_id, seat_numbers, user_id):
    """
    Lock seats for a user temporarily
    Returns: (success, message, locked_seats)
    """
    try:
        db = mongo.db
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=LOCK_DURATION_MINUTES)
        
        # First, clean up expired locks for this schedule
        cleanup_expired_locks(schedule_id)
        
        # Check if any seats are already locked or booked
        locked_seats = []
        unavailable_seats = []
        
        for seat_number in seat_numbers:
            # Check if seat is already booked
            existing_booking = db.bookings.find_one({
                'schedule_id': schedule_id,
                'seat_numbers': seat_number,
                'status': {'$in': ['confirmed', 'checked_in', 'completed']}
            })
            
            if existing_booking:
                unavailable_seats.append(seat_number)
                continue
            
            # Check if seat is locked by another user
            existing_lock = db.seat_locks.find_one({
                'schedule_id': schedule_id,
                'seat_number': seat_number,
                'user_id': {'$ne': user_id},
                'expires_at': {'$gt': now},
                'status': 'locked'
            })
            
            if existing_lock:
                unavailable_seats.append(seat_number)
                continue
            
            # Lock the seat
            db.seat_locks.update_one(
                {
                    'schedule_id': schedule_id,
                    'seat_number': seat_number,
                    'user_id': user_id
                },
                {
                    '$set': {
                        'schedule_id': schedule_id,
                        'seat_number': seat_number,
                        'user_id': user_id,
                        'locked_at': now,
                        'expires_at': expires_at,
                        'status': 'locked'
                    }
                },
                upsert=True
            )
            locked_seats.append(seat_number)
        
        if unavailable_seats:
            return False, f"Seats {', '.join(map(str, unavailable_seats))} are no longer available", locked_seats
        
        return True, f"Seats locked successfully until {expires_at.strftime('%H:%M:%S')}", locked_seats
        
    except Exception as e:
        print(f"❌ Error locking seats: {e}")
        return False, str(e), []

def unlock_seats(schedule_id, seat_numbers, user_id):
    """
    Unlock seats for a user (when they cancel or go back)
    """
    try:
        db = mongo.db
        result = db.seat_locks.delete_many({
            'schedule_id': schedule_id,
            'seat_number': {'$in': seat_numbers},
            'user_id': user_id
        })
        return True, f"Unlocked {result.deleted_count} seats"
    except Exception as e:
        print(f"❌ Error unlocking seats: {e}")
        return False, str(e)

def confirm_seat_locks(schedule_id, seat_numbers, user_id):
    """
    Mark seat locks as confirmed (when booking is completed)
    """
    try:
        db = mongo.db
        result = db.seat_locks.update_many(
            {
                'schedule_id': schedule_id,
                'seat_number': {'$in': seat_numbers},
                'user_id': user_id,
                'status': 'locked'
            },
            {
                '$set': {
                    'status': 'confirmed',
                    'confirmed_at': datetime.utcnow()
                }
            }
        )
        return True, f"Confirmed {result.modified_count} seat locks"
    except Exception as e:
        print(f"❌ Error confirming seat locks: {e}")
        return False, str(e)

def cleanup_expired_locks(schedule_id=None):
    """
    Remove expired seat locks
    """
    try:
        db = mongo.db
        now = datetime.utcnow()
        
        query = {
            'expires_at': {'$lt': now},
            'status': 'locked'
        }
        
        if schedule_id:
            query['schedule_id'] = schedule_id
        
        result = db.seat_locks.delete_many(query)
        
        if result.deleted_count > 0:
            print(f"🧹 Cleaned up {result.deleted_count} expired seat locks")
        
        return result.deleted_count
    except Exception as e:
        print(f"❌ Error cleaning up expired locks: {e}")
        return 0

def get_locked_seats(schedule_id):
    """
    Get all currently locked seats for a schedule
    Returns list of seat numbers
    """
    try:
        db = mongo.db
        now = datetime.utcnow()
        
        # Clean up expired locks first
        cleanup_expired_locks(schedule_id)
        
        # Get active locks
        locks = db.seat_locks.find({
            'schedule_id': schedule_id,
            'expires_at': {'$gt': now},
            'status': 'locked'
        })
        
        locked_seats = [lock['seat_number'] for lock in locks]
        return locked_seats
    except Exception as e:
        print(f"❌ Error getting locked seats: {e}")
        return []

def get_user_locked_seats(schedule_id, user_id):
    """
    Get seats locked by a specific user
    """
    try:
        db = mongo.db
        now = datetime.utcnow()
        
        locks = db.seat_locks.find({
            'schedule_id': schedule_id,
            'user_id': user_id,
            'expires_at': {'$gt': now},
            'status': 'locked'
        })
        
        return [lock['seat_number'] for lock in locks]
    except Exception as e:
        print(f"❌ Error getting user locked seats: {e}")
        return []

def extend_lock(schedule_id, seat_numbers, user_id, additional_minutes=5):
    """
    Extend the lock duration for seats
    """
    try:
        db = mongo.db
        now = datetime.utcnow()
        new_expires_at = now + timedelta(minutes=additional_minutes)
        
        result = db.seat_locks.update_many(
            {
                'schedule_id': schedule_id,
                'seat_number': {'$in': seat_numbers},
                'user_id': user_id,
                'status': 'locked'
            },
            {
                '$set': {
                    'expires_at': new_expires_at
                }
            }
        )
        
        return True, f"Extended lock for {result.modified_count} seats"
    except Exception as e:
        print(f"❌ Error extending lock: {e}")
        return False, str(e)

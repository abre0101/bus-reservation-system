"""
Test script for seat locking functionality
Run this to verify the implementation works correctly
"""
from app import create_app, mongo
from app.utils.seat_lock import (
    lock_seats, 
    unlock_seats, 
    get_locked_seats,
    cleanup_expired_locks,
    confirm_seat_locks
)
from datetime import datetime, timedelta

def test_seat_locking():
    """Test seat locking functionality"""
    app = create_app()
    
    with app.app_context():
        print("🧪 Testing Seat Locking Implementation\n")
        print("=" * 60)
        
        # Test data
        schedule_id = "test_schedule_123"
        user_a = "user_a_123"
        user_b = "user_b_456"
        seats = [5, 6, 7]
        
        # Clean up any existing test locks
        mongo.db.seat_locks.delete_many({'schedule_id': schedule_id})
        print("✅ Cleaned up existing test locks\n")
        
        # Test 1: Lock seats for User A
        print("Test 1: Lock seats for User A")
        print("-" * 60)
        success, message, locked = lock_seats(schedule_id, seats, user_a)
        print(f"Result: {message}")
        print(f"Locked seats: {locked}")
        assert success, "Failed to lock seats for User A"
        assert len(locked) == 3, "Should lock 3 seats"
        print("✅ PASSED\n")
        
        # Test 2: Try to lock same seats for User B (should fail)
        print("Test 2: Try to lock same seats for User B (should fail)")
        print("-" * 60)
        success, message, locked = lock_seats(schedule_id, seats, user_b)
        print(f"Result: {message}")
        print(f"Locked seats: {locked}")
        assert not success, "Should not lock seats already locked by User A"
        print("✅ PASSED\n")
        
        # Test 3: Get locked seats
        print("Test 3: Get locked seats for schedule")
        print("-" * 60)
        locked_seats = get_locked_seats(schedule_id)
        print(f"Locked seats: {locked_seats}")
        assert len(locked_seats) == 3, "Should have 3 locked seats"
        assert all(seat in locked_seats for seat in seats), "All seats should be locked"
        print("✅ PASSED\n")
        
        # Test 4: Unlock seats for User A
        print("Test 4: Unlock seats for User A")
        print("-" * 60)
        success, message = unlock_seats(schedule_id, [5], user_a)
        print(f"Result: {message}")
        assert success, "Should unlock seat 5"
        locked_seats = get_locked_seats(schedule_id)
        print(f"Remaining locked seats: {locked_seats}")
        assert 5 not in locked_seats, "Seat 5 should be unlocked"
        assert len(locked_seats) == 2, "Should have 2 locked seats remaining"
        print("✅ PASSED\n")
        
        # Test 5: Confirm seat locks (booking completed)
        print("Test 5: Confirm seat locks (booking completed)")
        print("-" * 60)
        success, message = confirm_seat_locks(schedule_id, [6, 7], user_a)
        print(f"Result: {message}")
        assert success, "Should confirm seat locks"
        
        # Check confirmed locks in database
        confirmed = mongo.db.seat_locks.count_documents({
            'schedule_id': schedule_id,
            'status': 'confirmed'
        })
        print(f"Confirmed locks: {confirmed}")
        assert confirmed == 2, "Should have 2 confirmed locks"
        print("✅ PASSED\n")
        
        # Test 6: Test expiration
        print("Test 6: Test lock expiration")
        print("-" * 60)
        
        # Create an expired lock
        expired_time = datetime.utcnow() - timedelta(minutes=15)
        mongo.db.seat_locks.insert_one({
            'schedule_id': schedule_id,
            'seat_number': 10,
            'user_id': user_a,
            'locked_at': expired_time,
            'expires_at': expired_time + timedelta(minutes=10),
            'status': 'locked'
        })
        print("Created expired lock for seat 10")
        
        # Run cleanup
        deleted = cleanup_expired_locks(schedule_id)
        print(f"Cleaned up {deleted} expired locks")
        assert deleted >= 1, "Should clean up at least 1 expired lock"
        
        # Verify seat 10 is no longer locked
        locked_seats = get_locked_seats(schedule_id)
        assert 10 not in locked_seats, "Seat 10 should not be locked after cleanup"
        print("✅ PASSED\n")
        
        # Test 7: Lock seats for User B (should work now for seat 5)
        print("Test 7: Lock seat 5 for User B (should work now)")
        print("-" * 60)
        success, message, locked = lock_seats(schedule_id, [5], user_b)
        print(f"Result: {message}")
        print(f"Locked seats: {locked}")
        assert success, "Should lock seat 5 for User B"
        assert 5 in locked, "Seat 5 should be locked"
        print("✅ PASSED\n")
        
        # Clean up test data
        print("Cleaning up test data...")
        mongo.db.seat_locks.delete_many({'schedule_id': schedule_id})
        print("✅ Test data cleaned up\n")
        
        print("=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print("=" * 60)
        print("\n✅ Seat locking implementation is working correctly!")
        print("✅ Ready for production use!")

if __name__ == '__main__':
    try:
        test_seat_locking()
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

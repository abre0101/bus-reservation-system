"""
Background task to clean up expired seat locks
Run this periodically (e.g., every minute) to ensure expired locks are removed
"""
import time
from datetime import datetime
from app import create_app, mongo
from app.utils.seat_lock import cleanup_expired_locks

def run_cleanup_task(interval_seconds=60):
    """
    Run cleanup task in a loop
    interval_seconds: How often to run cleanup (default: 60 seconds)
    """
    app = create_app()
    
    with app.app_context():
        print("🧹 Starting seat lock cleanup task...")
        print(f"⏰ Running every {interval_seconds} seconds")
        
        while True:
            try:
                # Clean up expired locks
                deleted_count = cleanup_expired_locks()
                
                if deleted_count > 0:
                    print(f"🧹 [{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}] Cleaned up {deleted_count} expired locks")
                
                # Wait for next interval
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("\n⏹️ Cleanup task stopped by user")
                break
            except Exception as e:
                print(f"❌ Error in cleanup task: {e}")
                time.sleep(interval_seconds)

if __name__ == '__main__':
    # Run cleanup every 60 seconds
    run_cleanup_task(60)

from app import create_app, socketio
import os
import sys
import threading
import time
from datetime import datetime

# Force unbuffered output for better logging in production
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

app = create_app()

def cleanup_task():
    """Background thread to clean up expired seat locks"""
    from app.utils.seat_lock import cleanup_expired_locks
    
    print("🧹 Cleanup task started in background thread")
    
    while True:
        try:
            with app.app_context():
                deleted_count = cleanup_expired_locks()
                if deleted_count > 0:
                    print(f"🧹 [{datetime.utcnow().strftime('%H:%M:%S')}] Cleaned {deleted_count} expired locks")
            time.sleep(60)  # Run every 60 seconds
        except Exception as e:
            print(f"❌ Cleanup error: {e}")
            time.sleep(60)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print("🚀 Starting EthioBus Server with WebSocket Support...")
    print(f"📍 Database: ethiobusdb")
    print(f"🌐 Port: {port}")
    print(f"🔧 Debug: {debug}")
    print(f"🔌 WebSocket: Enabled")
    print("=" * 50)
    
    # Start cleanup task in background thread
    cleanup_thread = threading.Thread(target=cleanup_task, daemon=True)
    cleanup_thread.start()
    
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
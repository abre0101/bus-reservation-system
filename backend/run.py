from app import create_app, socketio
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print("🚀 Starting EthioBus Server with WebSocket Support...")
    print(f"📍 Database: ethiobusdb")
    print(f"🌐 Port: {port}")
    print(f"🔧 Debug: {debug}")
    print(f"🔌 WebSocket: Enabled")
    print("=" * 50)
    
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
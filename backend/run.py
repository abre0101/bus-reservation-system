from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print("🚀 Starting EthioBus Server...")
    print(f"📍 Database: ethiobusdb")
    print(f"🌐 Port: {port}")
    print(f"🔧 Debug: {debug}")
    print("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        use_reloader=False  
    )
@"
# Root level run.py - imports and runs the backend application
import os
import sys

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    # Import and run your existing backend
    from backend.run import app
    
    if __name__ == '__main__':
        port = int(os.environ.get('PORT', 5000))
        debug = os.environ.get('DEBUG', 'False').lower() == 'true'
        
        print('🚀 Starting EthioBus Server from Root...')
        print(f'📍 Database: ethiobusdb')
        print(f'🌐 Port: {port}')
        print(f'🔧 Debug: {debug}')
        print('=' * 50)
        
        app.run(
            host='0.0.0.0',
            port=port,
            debug=debug,
            use_reloader=False  
        )
        
except ImportError as e:
    print(f'❌ Error: {e}')
    print('💡 Make sure you are in the project root and backend is properly set up')
    print('💡 Try running from backend directory: cd backend && python run.py')
"@ | Out-File -FilePath run.py -Encoding utf8
from flask import Flask, jsonify
from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize extensions
mongo = PyMongo()
bcrypt = Bcrypt()
jwt = JWTManager()
socketio = SocketIO()

def create_app():
    """Create and configure the Flask application"""
    
    # Initialize Flask app
    app = Flask(__name__)
    
    # =========================================================================
    # CONFIGURATION SETUP
    # =========================================================================
    
    # Security Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'ethiobus-production-secret-key-2024')
    
    # Database Configuration
    app.config['MONGO_URI'] = os.getenv('MONGO_URI', 'mongodb://localhost:27017/ethiobusdb')
    
    # JWT Configuration
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'ethiobus-jwt-secret-key-2024')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    
    # Chapa Payment Configuration
    app.config['CHAPA_SECRET_KEY'] = os.getenv('CHAPA_SECRET_KEY')
    app.config['CHAPA_PUBLIC_KEY'] = os.getenv('CHAPA_PUBLIC_KEY')
    app.config['CHAPA_BASE_URL'] = os.getenv('CHAPA_BASE_URL', 'https://api.chapa.co/v1')
    
    # =========================================================================
    # CORS CONFIGURATION - SINGLE SOURCE OF TRUTH
    # =========================================================================
    
    # Get allowed origins from environment variable or use defaults
    cors_origins = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else []
    
    # Default origins for development
    default_origins = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ]
    
    # Combine and filter empty strings
    all_origins = [origin.strip() for origin in (cors_origins + default_origins) if origin.strip()]
    
    CORS(app, 
         origins=all_origins,
         supports_credentials=True,
         allow_headers=[
             "Content-Type", 
             "Authorization", 
             "X-Requested-With",
             "Accept",
             "Origin",
             "Access-Control-Request-Method",
             "Access-Control-Request-Headers"
         ],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         expose_headers=["Content-Range", "X-Content-Range"],
         max_age=3600
    )
    
    # =========================================================================
    # EXTENSIONS INITIALIZATION
    # =========================================================================
    
    try:
        print(f"🔌 Connecting to MongoDB...")
        print(f"📍 MONGO_URI: {app.config['MONGO_URI'][:50]}...")  # Print first 50 chars only
        
        mongo.init_app(app)
        bcrypt.init_app(app)
        jwt.init_app(app)
        
        # Test MongoDB connection
        try:
            mongo.cx.admin.command('ping')
            print("✅ MongoDB connected successfully!")
        except Exception as db_error:
            print(f"⚠️ MongoDB connection warning: {db_error}")
        
        # Initialize SocketIO with CORS support
        socketio.init_app(app, 
                         cors_allowed_origins=all_origins,
                         async_mode='threading',
                         logger=True,
                         engineio_logger=True)
        
        print("✅ Extensions initialized successfully (including SocketIO)")
    except Exception as e:
        print(f"❌ Failed to initialize extensions: {e}")
        raise
    
    # =========================================================================
    # BLUEPRINT REGISTRATION
    # =========================================================================
    
    def register_blueprints():
        """Register all application blueprints with error handling"""
        blueprints = [
            ('auth_bp', 'auth', '/auth'),
            ('users_bp', 'users', '/users'),
            ('buses_bp', 'buses', '/buses'),
            ('routes_bp', 'routes', '/routes'),
            ('schedules_bp', 'schedules', '/schedules'),
            ('bookings_bp', 'bookings', '/bookings'),
            ('payments_bp', 'payments', '/payments'),
            ('operator_bp', 'operator', '/operator'),
            ('admin_bp', 'admin', '/admin'),
            ('dashboard_bp', 'dashboard', '/dashboard'),
            ('home_bp', 'home', '/home'),
            ('drivers_bp', 'drivers', '/drivers'),
            ('driver_app_bp', 'driver_app', '/driver'),  # NEW: Driver app endpoints
            ('ticket_bp', 'tickets', '/tickets'),
            ('ticketer_bp', 'ticketer', '/api/ticketer'),
            ('tracking_bp', 'tracking', '/tracking'),  # NEW: Bus tracking
            ('settings_bp', 'settings', '/settings'),  # NEW: System settings
            ('tariff_bp', 'tariff', '/tariff'),  # NEW: Tariff management
            ('emergency_bp', 'emergency_cancel', '/admin'),  # NEW: Emergency cancellation
            ('loyalty_bp', 'loyalty', '/api/loyalty')  # NEW: Loyalty system
        ]
        
        registered_count = 0
        
        for bp_name, module_name, url_prefix in blueprints:
            try:
                # Dynamic import of blueprints
                module = __import__(f'app.routes.{module_name}', fromlist=[bp_name])
                blueprint = getattr(module, bp_name)
                
                app.register_blueprint(blueprint, url_prefix=url_prefix)
                registered_count += 1
                print(f"   ✅ {bp_name} registered at {url_prefix}")
                
            except ImportError as e:
                print(f"   ❌ Failed to import {bp_name}: {e}")
            except AttributeError as e:
                print(f"   ❌ Blueprint {bp_name} not found in module: {e}")
            except Exception as e:
                print(f"   ❌ Error registering {bp_name}: {e}")
        
        return registered_count
    
    print("📋 Registering blueprints...")
    registered_count = register_blueprints()
    print(f"✅ {registered_count} blueprints registered successfully")
    
    # =========================================================================
    # ERROR HANDLERS
    # =========================================================================
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Resource not found',
            'message': 'The requested resource was not found on this server',
            'status_code': 404
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'error': 'Method not allowed',
            'message': 'The HTTP method is not supported for this endpoint',
            'status_code': 405
        }), 405
    
    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            'error': 'Internal server error',
            'message': 'An internal server error occurred',
            'status_code': 500
        }), 500
    
    # =========================================================================
    # APPLICATION ROUTES
    # =========================================================================
    
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        """Serve uploaded files"""
        from flask import send_from_directory
        upload_dir = os.path.join(os.getcwd(), 'uploads')
        return send_from_directory(upload_dir, filename)
    
    @app.route('/')
    def health_check():
        """Comprehensive health check endpoint"""
        db_status = 'disconnected'
        db_name = 'unknown'
        collections_count = 0
        db_error_msg = None
        
        try:
            if mongo.cx:
                # Ping database to verify connection
                mongo.cx.admin.command('ping')
                db_status = 'connected'
                db_name = mongo.db.name
                collections_count = len(mongo.db.list_collection_names())
        except Exception as db_error:
            print(f"⚠️ Database connection check failed: {db_error}")
            db_status = 'error'
            db_error_msg = str(db_error)
        
        response = {
            'status': 'healthy' if db_status == 'connected' else 'degraded',
            'service': 'EthioBus API',
            'version': '1.0.0',
            'timestamp': datetime.utcnow().isoformat(),
            'database': {
                'status': db_status,
                'name': db_name,
                'collections_count': collections_count
            },
            'features': {
                'authentication': True,
                'payments': bool(app.config.get('CHAPA_SECRET_KEY')),
                'admin_panel': True,
                'booking_system': True,
                'ticketer_system': True
            },
            'endpoints_available': registered_count
        }
        
        if db_error_msg:
            response['database']['error'] = db_error_msg
        
        return jsonify(response), 200
    
    @app.route('/debug/config')
    def debug_config():
        """Debug endpoint to check configuration (remove in production)"""
        mongo_uri = app.config.get('MONGO_URI', 'NOT SET')
        # Mask password in URI
        if '@' in mongo_uri:
            parts = mongo_uri.split('@')
            if '://' in parts[0]:
                protocol_user = parts[0].split('://')
                if ':' in protocol_user[1]:
                    user = protocol_user[1].split(':')[0]
                    masked = f"{protocol_user[0]}://{user}:****@{parts[1]}"
                else:
                    masked = mongo_uri
            else:
                masked = mongo_uri
        else:
            masked = mongo_uri
        
        return jsonify({
            'mongo_uri_set': bool(os.getenv('MONGO_URI')),
            'mongo_uri_masked': masked,
            'mongo_cx_exists': mongo.cx is not None,
            'cors_origins': all_origins,
            'environment_vars': {
                'SECRET_KEY': 'SET' if os.getenv('SECRET_KEY') else 'NOT SET',
                'JWT_SECRET_KEY': 'SET' if os.getenv('JWT_SECRET_KEY') else 'NOT SET',
                'CHAPA_SECRET_KEY': 'SET' if os.getenv('CHAPA_SECRET_KEY') else 'NOT SET',
            }
        }), 200
    
    # =========================================================================
    # JWT CONFIGURATION
    # =========================================================================
    
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        return str(user) if user else None
    
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        from bson import ObjectId
        identity = jwt_data["sub"]
        return mongo.db.users.find_one({"_id": ObjectId(identity)})
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({
            "error": "Token has expired",
            "message": "Please log in again"
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "error": "Invalid token",
            "message": "Token verification failed"
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "Authorization required",
            "message": "Request does not contain an access token"
        }), 401
    
    # =========================================================================
    # SOCKET.IO EVENT HANDLERS
    # =========================================================================
    
    # Import socket events after app is configured
    with app.app_context():
        try:
            from app import socket_events
            print("✅ Socket.IO event handlers loaded")
        except Exception as e:
            print(f"⚠️ Failed to load socket events: {e}")
    
    print(f"✅ EthioBus Flask application configured successfully!")
    print(f"📍 Environment: {os.getenv('FLASK_ENV', 'production')}")
    print(f"🐛 Debug Mode: {app.debug}")
    
    return app
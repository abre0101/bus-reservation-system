from flask import Blueprint, jsonify
from datetime import datetime

home_bp = Blueprint('home', __name__)

# Cache for frequently accessed data (simple in-memory cache)
_home_cache = {
    'routes': None,
    'cities': None,
    'stats': None,
    'last_updated': None
}

def get_cache_timeout():
    """Return cache timeout in seconds (5 minutes)"""
    return 300

def is_cache_valid():
    """Check if cache is still valid"""
    if not _home_cache['last_updated']:
        return False
    cache_age = (datetime.utcnow() - _home_cache['last_updated']).total_seconds()
    return cache_age < get_cache_timeout()

@home_bp.route('/routes', methods=['GET'])
def get_popular_routes():
    """Get popular Ethiopian bus routes with caching"""
    try:
        # Check cache first
        if _home_cache['routes'] and is_cache_valid():
            print("✅ Serving routes from cache")
            return jsonify(_home_cache['routes'])
        
        from app import mongo
        db = mongo.db
        
        # Get active routes with Ethiopian cities, ordered by popularity or distance
        routes = list(db.routes.find({'is_active': True})
                     .sort([('estimatedDurationHours', 1)])  # Sort by shortest duration
                     .limit(8))
        
        formatted_routes = []
        
        for route in routes:
            base_fare = route.get('baseFareBirr', 200)
            formatted_routes.append({
                'route_id': str(route.get('_id', '')),
                'departure_city': route.get('originCity', 'Unknown'),
                'destination_city': route.get('destinationCity', 'Unknown'),
                'min_price': base_fare,
                'max_price': base_fare + 100,
                'duration': f"{route.get('estimatedDurationHours', 5)} hours",
                'distance_km': route.get('distanceKm', 0),
                'trips_count': get_trips_count_for_route(str(route.get('_id'))),
                'popular': True,
                'image_url': get_route_image(route.get('originCity'), route.get('destinationCity'))
            })
        
        # Update cache
        _home_cache['routes'] = formatted_routes
        _home_cache['last_updated'] = datetime.utcnow()
        
        print(f"✅ Found {len(formatted_routes)} routes from database")
        return jsonify(formatted_routes)
        
    except Exception as e:
        print(f"❌ Error fetching routes from DB, using fallback: {e}")
        # Fallback Ethiopian routes - always available
        ethiopian_routes = get_fallback_routes()
        return jsonify(ethiopian_routes)

def get_trips_count_for_route(route_id):
    """Get actual trips count for a route from schedules"""
    try:
        from app import mongo
        db = mongo.db
        count = db.busschedules.count_documents({
            'routeId': route_id,
            'status': 'scheduled',
            'departureDate': {'$gte': datetime.utcnow()}
        })
        return max(count, 4)  # Minimum 4 trips for display
    except:
        return 12  # Default fallback

def get_route_image(origin_city, destination_city):
    """Get appropriate image for route"""
    route_images = {
        'Addis Ababa': {
            'Bahir Dar': 'https://images.unsplash.com/photo-1588666309999-ef3b59d75d51?w=400',
            'Hawassa': 'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?w=400',
            'Dire Dawa': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
            'Mekele': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400'
        }
    }
    return route_images.get(origin_city, {}).get(destination_city, 
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400')

def get_fallback_routes():
    """Fallback routes data"""
    return [
        {
            "route_id": "addis_bahir_dar", 
            "departure_city": "Addis Ababa", 
            "destination_city": "Bahir Dar",
            "min_price": 450, 
            "max_price": 550,
            "duration": "9-10 hours", 
            "distance_km": 578,
            "trips_count": 8,
            "popular": True,
            "image_url": "https://images.unsplash.com/photo-1588666309999-ef3b59d75d51?w=400"
        },
        {
            "route_id": "addis_hawassa",
            "departure_city": "Addis Ababa", 
            "destination_city": "Hawassa",
            "min_price": 250, 
            "max_price": 350,
            "duration": "4-5 hours", 
            "distance_km": 275,
            "trips_count": 12,
            "popular": True,
            "image_url": "https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?w=400"
        },
        {
            "route_id": "addis_dire_dawa",
            "departure_city": "Addis Ababa", 
            "destination_city": "Dire Dawa", 
            "min_price": 400, 
            "max_price": 500,
            "duration": "8-9 hours", 
            "distance_km": 515,
            "trips_count": 6,
            "popular": True,
            "image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400"
        },
        {
            "route_id": "addis_mekele",
            "departure_city": "Addis Ababa", 
            "destination_city": "Mekele",
            "min_price": 600, 
            "max_price": 700,
            "duration": "12-13 hours", 
            "distance_km": 783,
            "trips_count": 4,
            "popular": True,
            "image_url": "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"
        }
    ]

@home_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get company statistics with Ethiopian context"""
    try:
        # Check cache first
        if _home_cache['stats'] and is_cache_valid():
            print("✅ Serving stats from cache")
            return jsonify(_home_cache['stats'])
        
        from app import mongo
        db = mongo.db
        
        users_count = db.users.count_documents({})
        routes_count = db.routes.count_documents({'is_active': True})
        bookings_count = db.bookings.count_documents({})
        
        # Get recent bookings (last 30 days) for more accurate traveler count
        thirty_days_ago = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        recent_bookings = db.bookings.count_documents({
            'created_at': {'$gte': thirty_days_ago}
        })
        
        stats_data = {
            "travelers": bookings_count * 2,  # Approximate traveler count
            "monthly_travelers": recent_bookings * 2,
            "destinations": routes_count,
            "satisfaction_rate": 98,
            "operating_years": 15,
            "on_time_rate": 95,
            "buses_available": count_active_buses()
        }
        
        # Update cache
        _home_cache['stats'] = stats_data
        _home_cache['last_updated'] = datetime.utcnow()
        
        return jsonify(stats_data)
        
    except Exception as e:
        print(f"❌ Error fetching stats from DB, using fallback: {e}")
        return jsonify({
            "travelers": 50000,
            "monthly_travelers": 4500,
            "destinations": 25,
            "satisfaction_rate": 98,
            "operating_years": 15,
            "on_time_rate": 95,
            "buses_available": 45
        })

def count_active_buses():
    """Count active buses in the system"""
    try:
        from app import mongo
        db = mongo.db
        return db.buses.count_documents({'status': 'active'})
    except:
        return 45  # Fallback count

@home_bp.route('/cities', methods=['GET'])
def get_cities():
    """Get Ethiopian cities served with caching"""
    try:
        # Check cache first
        if _home_cache['cities'] and is_cache_valid():
            print("✅ Serving cities from cache")
            return jsonify(_home_cache['cities'])
        
        from app import mongo
        db = mongo.db
        
        # Get unique cities from both origin and destination
        origin_cities = db.routes.distinct('originCity', {'is_active': True})
        destination_cities = db.routes.distinct('destinationCity', {'is_active': True})
        
        # Combine and remove duplicates
        all_cities = list(set(origin_cities + destination_cities))
        all_cities.sort()  # Sort alphabetically
        
        # Update cache
        _home_cache['cities'] = all_cities
        _home_cache['last_updated'] = datetime.utcnow()
        
        print(f"✅ Found {len(all_cities)} cities from database")
        return jsonify(all_cities)
        
    except Exception as e:
        print(f"❌ Error fetching cities from DB, using fallback: {e}")
        ethiopian_cities = get_fallback_cities()
        return jsonify(ethiopian_cities)

def get_fallback_cities():
    """Fallback cities data"""
    return [
        'Addis Ababa', 'Bahir Dar', 'Hawassa', 'Dire Dawa', 
        'Mekele', 'Gondar', 'Adama', 'Jimma', 'Harar', 
        'Arba Minch', 'Dessie', 'Jijiga', 'Shashamane', 
        'Debre Markos', 'Asosa', 'Gambela', 'Semera'
    ]

@home_bp.route('/features', methods=['GET'])
def get_features():
    """Get service features with Ethiopian context"""
    features = [
        {
            "icon": "🛣️",
            "title": "Nationwide Coverage",
            "description": "Travel to all major Ethiopian cities and towns with reliable service",
            "color": "blue"
        },
        {
            "icon": "💰", 
            "title": "Affordable Fares",
            "description": "Competitive prices in Ethiopian Birr with no hidden fees",
            "color": "green"
        },
        {
            "icon": "🛌",
            "title": "Comfortable Buses",
            "description": "Modern buses with AC, WiFi, charging ports and comfortable seating",
            "color": "purple"
        },
        {
            "icon": "🔒",
            "title": "Secure Payments",
            "description": "Pay with Telebirr, CBE Birr, or cash with complete security",
            "color": "red"
        },
        {
            "icon": "⏰",
            "title": "Multiple Departures", 
            "description": "Flexible schedules with multiple daily departures",
            "color": "orange"
        },
        {
            "icon": "🎫",
            "title": "Easy Booking",
            "description": "Book online, via phone, or at our station offices",
            "color": "teal"
        },
        {
            "icon": "📱",
            "title": "Mobile App",
            "description": "Book tickets and manage your trips on the go",
            "color": "indigo"
        },
        {
            "icon": "🌟",
            "title": "Verified Drivers",
            "description": "All our drivers are professionally trained and verified",
            "color": "yellow"
        }
    ]
    
    return jsonify(features)

@home_bp.route('/testimonials', methods=['GET'])
def get_testimonials():
    """Get customer testimonials"""
    testimonials = [
        {
            "name": "Alemu Bekele",
            "city": "Addis Ababa",
            "rating": 5,
            "comment": "Excellent service! The buses are always on time and very comfortable. Highly recommended!",
            "avatar": "👨🏾"
        },
        {
            "name": "Sara Mohammed",
            "city": "Dire Dawa", 
            "rating": 5,
            "comment": "I travel frequently to Addis Ababa and EthioBus has never disappointed me. Great service!",
            "avatar": "👩🏾"
        },
        {
            "name": "Daniel Tadesse",
            "city": "Hawassa",
            "rating": 4,
            "comment": "Affordable prices and comfortable journey. The online booking system is very convenient.",
            "avatar": "👨🏾"
        }
    ]
    
    return jsonify(testimonials)

@home_bp.route('/clear-cache', methods=['POST'])
def clear_cache():
    """Clear home page cache (for admin use)"""
    global _home_cache
    _home_cache = {
        'routes': None,
        'cities': None, 
        'stats': None,
        'last_updated': None
    }
    return jsonify({"message": "Home cache cleared successfully"})

@home_bp.route('/health', methods=['GET'])
def home_health():
    """Health check for home service"""
    return jsonify({
        "status": "healthy",
        "service": "Home Service",
        "timestamp": datetime.utcnow().isoformat(),
        "cache_status": "valid" if is_cache_valid() else "expired"
    })
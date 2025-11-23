from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson import ObjectId
from app import mongo
import random 

dashboard_bp = Blueprint('dashboard', __name__)

def get_user_bookings(user_id):
    """Helper function to get user bookings using ObjectId"""
    try:
        return list(mongo.db.bookings.find({'user_id': ObjectId(user_id)}))
    except Exception as e:
        print(f"❌ Error getting user bookings: {e}")
        return []

@dashboard_bp.route('/', methods=['GET'])
@jwt_required()
def get_dashboard_overview():
    """Get complete dashboard overview data"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user info for greeting
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        user_name = user.get('full_name', 'Customer')
        
        # Get routes count
        total_routes = mongo.db.routes.count_documents({'is_active': True})
        
        # Get buses count
        total_buses = mongo.db.buses.count_documents({'status': 'active'})
        
        # Get user's bookings
        user_bookings = get_user_bookings(current_user_id)
        
        # Get today's bookings count
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        today_bookings = len([b for b in user_bookings if b.get('created_at') and b.get('created_at') >= today_start])
        
        # Get total bookings for user
        total_bookings = len(user_bookings)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_routes': total_routes,
                'total_buses': total_buses,
                'total_bookings': total_bookings,
                'today_bookings': today_bookings
            },
            'greetingMessage': f"Welcome to Ethio Bus Reservation, {user_name}!",
            'user': {
                'name': user_name,
                'email': user.get('email', ''),
                'member_since': user.get('created_at', datetime.utcnow()).strftime('%Y-%m-%d') if isinstance(user.get('created_at'), datetime) else '2024-01-01'
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_dashboard_overview: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch dashboard overview'
        }), 500

@dashboard_bp.route('/test-bookings', methods=['GET'])
def test_bookings():
    """Test route to check all bookings and their user_id format"""
    try:
        # Get all bookings to see the actual data
        all_bookings = list(mongo.db.bookings.find())
        
        results = []
        for booking in all_bookings:
            results.append({
                'booking_id': str(booking['_id']),
                'user_id': str(booking.get('user_id', 'MISSING')),
                'user_id_type': type(booking.get('user_id')).__name__,
                'pnr_number': booking.get('pnr_number', ''),
                'status': booking.get('status', ''),
                'total_amount': booking.get('total_amount', 0)
            })
        
        return jsonify({
            'total_bookings': len(results),
            'bookings': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/debug/user-bookings', methods=['GET'])
@jwt_required()
def debug_user_bookings():
    """Debug route to check user bookings data"""
    try:
        current_user_id = get_jwt_identity()
        
        print(f"🔍 DEBUG: Looking for bookings for user_id: {current_user_id}")
        print(f"🔍 DEBUG: User ID type: {type(current_user_id)}")
        
        # Check if user exists
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        print(f"🔍 DEBUG: User found: {user is not None}")
        
        if user:
            print(f"🔍 DEBUG: User email: {user.get('email')}")
            print(f"🔍 DEBUG: User name: {user.get('full_name')}")
        
        # Check bookings with ObjectId format
        bookings_count = mongo.db.bookings.count_documents({'user_id': ObjectId(current_user_id)})
        
        print(f"🔍 DEBUG: Bookings count with ObjectId user_id: {bookings_count}")
        
        # Get actual bookings
        user_bookings = get_user_bookings(current_user_id)
        print(f"🔍 DEBUG: Actual bookings found: {len(user_bookings)}")
        
        return jsonify({
            'current_user_id': current_user_id,
            'bookings_count': bookings_count,
            'user_found': user is not None,
            'actual_bookings': len(user_bookings)
        }), 200
        
    except Exception as e:
        print(f"❌ Debug error: {e}")
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/routes', methods=['GET'])
def get_popular_routes():
    """Get popular Ethiopian routes"""
    try:
        # Get routes with actual schedule count for better popularity calculation
        popular_routes = list(mongo.db.routes.find({'is_active': True}).limit(10))
        
        routes_data = []
        for route in popular_routes:
            # Calculate actual popularity based on schedule count
            schedule_count = mongo.db.busschedules.count_documents({
                'routeId': str(route['_id']),
                'status': 'scheduled',
                'departureDate': {'$gte': datetime.utcnow()}
            })
            
            # Calculate popularity score (0-100)
            popularity_score = min(100, schedule_count * 10 + random.randint(10, 30))
            
            route_data = {
                '_id': str(route['_id']),
                'originCity': route.get('originCity', 'Unknown'),
                'destinationCity': route.get('destinationCity', 'Unknown'),
                'distanceKm': route.get('distanceKm', 0),
                'estimatedDurationHours': route.get('estimatedDurationHours', 0),
                'baseFareBirr': route.get('baseFareBirr', 0),
                'routeType': 'standard',
                'popularity': popularity_score,
                'scheduleCount': schedule_count,
                'image_url': get_route_image(route.get('originCity'))
            }
            routes_data.append(route_data)
        
        # Sort by popularity
        routes_data.sort(key=lambda x: x['popularity'], reverse=True)
        
        return jsonify({
            'success': True,
            'popularRoutes': routes_data,
            'total': len(routes_data)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_popular_routes: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch routes data',
            'popularRoutes': []
        }), 500

def get_route_image(city):
    """Get city image for route display"""
    city_images = {
        'Addis Ababa': 'https://images.unsplash.com/photo-1588666309999-ef3b59d75d51?w=300',
        'Bahir Dar': 'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?w=300',
        'Hawassa': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300',
        'Dire Dawa': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=300',
        'Mekele': 'https://images.unsplash.com/photo-1589330273594-69d35f1aa346?w=300'
    }
    return city_images.get(city, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300')

@dashboard_bp.route('/schedules/today', methods=['GET'])
@jwt_required()
def today_schedule():
    """Get today's schedules"""
    try:
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        print(f"📅 Fetching today's schedules: {today_start} to {today_end}")
        
        schedules = list(mongo.db.busschedules.aggregate([
            {
                '$match': {
                    'departureDate': {
                        '$gte': today_start,
                        '$lt': today_end
                    },
                    'status': 'scheduled'
                }
            },
            {
                '$lookup': {
                    'from': 'buses',
                    'localField': 'busId',
                    'foreignField': '_id',
                    'as': 'bus'
                }
            },
            {
                '$lookup': {
                    'from': 'routes',
                    'localField': 'routeId',
                    'foreignField': '_id',
                    'as': 'route'
                }
            },
            {
                '$unwind': {
                    'path': '$bus',
                    'preserveNullAndEmptyArrays': True
                }
            },
            {
                '$unwind': {
                    'path': '$route', 
                    'preserveNullAndEmptyArrays': True
                }
            },
            {
                '$project': {
                    '_id': {'$toString': '$_id'},
                    'busNumber': '$bus.bus_number',
                    'busName': '$bus.bus_name',
                    'route': {
                        '$cond': {
                            'if': '$route',
                            'then': {'$concat': ['$route.originCity', ' - ', '$route.destinationCity']},
                            'else': 'Unknown Route'
                        }
                    },
                    'departureTime': 1,
                    'arrivalTime': 1,
                    'availableSeats': 1,
                    'fareBirr': 1,
                    'status': 1,
                    'departureDate': 1
                }
            },
            {
                '$sort': {'departureTime': 1}
            }
        ]))
        
        print(f"✅ Found {len(schedules)} schedules for today")
        
        # Format dates for JSON serialization
        for schedule in schedules:
            if 'departureDate' in schedule and isinstance(schedule['departureDate'], datetime):
                schedule['departureDate'] = schedule['departureDate'].isoformat()
        
        return jsonify({
            'success': True,
            'schedules': schedules,
            'total': len(schedules),
            'date': today.isoformat()
        }), 200
        
    except Exception as e:
        print(f"❌ Error in today_schedule: {e}")
        return jsonify({
            'success': False,
            'schedules': [],
            'error': str(e)
        }), 500

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get user dashboard statistics - FIXED to properly count upcoming trips"""
    try:
        current_user_id = get_jwt_identity()
        
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        print(f"📊 Fetching dashboard stats for user: {current_user_id}")
        
        # Get user's bookings using ObjectId
        user_bookings = get_user_bookings(current_user_id)
        
        print(f"📊 Found {len(user_bookings)} bookings for user")
        
        # Calculate stats
        total_bookings = len(user_bookings)
        total_spent = sum(booking.get('total_amount', 0) for booking in user_bookings)
        
        # Count upcoming trips by checking each booking's schedule
        upcoming_trips = 0
        completed_trips = 0
        current_time = datetime.utcnow()
        
        for booking in user_bookings:
            # Only count confirmed or pending bookings
            if booking.get('status') not in ['confirmed', 'pending']:
                continue
                
            schedule_id = booking.get('schedule_id')
            if not schedule_id:
                continue
                
            try:
                schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
                if schedule and schedule.get('departureDate'):
                    travel_date = schedule['departureDate']
                    
                    # Parse date if it's a string
                    if isinstance(travel_date, str):
                        if 'T' in travel_date:
                            travel_date = datetime.fromisoformat(travel_date.replace('Z', '+00:00'))
                        else:
                            travel_date = datetime.strptime(travel_date, '%Y-%m-%d')
                    
                    # Check if it's a future trip
                    if travel_date > current_time:
                        upcoming_trips += 1
                        print(f"✅ Counting as upcoming: {booking.get('_id')} - {travel_date}")
                    else:
                        completed_trips += 1
                        
            except Exception as date_error:
                print(f"⚠️ Error parsing travel date for booking {booking.get('_id')}: {date_error}")
                continue
        
        # Loyalty points calculation
        loyalty_points = (total_bookings * 100) + (completed_trips * 50)
        
        # Monthly spending
        one_month_ago = current_time - timedelta(days=30)
        monthly_spent = sum(
            booking.get('total_amount', 0) 
            for booking in user_bookings 
            if booking.get('created_at', current_time) >= one_month_ago
        )
        
        stats_data = {
            'totalBookings': total_bookings,
            'upcomingTrips': upcoming_trips,  # This should now be correct
            'completedTrips': completed_trips,
            'loyaltyPoints': loyalty_points,
            'loyaltyTier': get_loyalty_tier(loyalty_points),
            'totalSpent': total_spent,
            'monthlySpent': monthly_spent,
            'currency': 'ETB',
            'memberSince': user.get('created_at', current_time).strftime('%Y-%m-%d') if isinstance(user.get('created_at'), datetime) else '2024-01-01'
        }
        
        print(f"✅ FINAL Dashboard stats: {stats_data}")
        print(f"✅ Upcoming trips count: {upcoming_trips}")
        
        return jsonify(stats_data), 200
        
    except Exception as e:
        print(f"❌ Error in get_dashboard_stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch dashboard statistics'}), 500

def get_loyalty_tier(points):
    """Determine user loyalty tier based on points"""
    if points >= 5000:
        return 'gold'
    elif points >= 2000:
        return 'silver'
    elif points >= 500:
        return 'bronze'
    else:
        return 'member'

@dashboard_bp.route('/recent-bookings', methods=['GET'])
@jwt_required()
def get_recent_bookings():
    """Get user's recent bookings with schedule information - FIXED with bus data"""
    try:
        current_user_id = get_jwt_identity()
        limit = int(request.args.get('limit', 5))
        
        print(f"📋 Fetching recent bookings for user: {current_user_id}, limit: {limit}")
        
        # Get user's bookings using ObjectId
        user_bookings = get_user_bookings(current_user_id)
        
        # Get user info for passenger name fallback
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        # Sort by created_at and limit
        recent_bookings = sorted(user_bookings, key=lambda x: x.get('created_at', datetime.min), reverse=True)[:limit]
        
        print(f"📋 Found {len(recent_bookings)} recent bookings")
        
        bookings_data = []
        for booking in recent_bookings:
            # Get schedule information to fill missing route data
            schedule_info = {}
            bus_info = {}
            schedule_id = booking.get('schedule_id')
            
            if schedule_id:
                schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
                if schedule:
                    # Look up route information
                    route_id = schedule.get('routeId')
                    if route_id:
                        route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                        if route:
                            schedule_info = {
                                'departure_city': route.get('originCity', ''),
                                'arrival_city': route.get('destinationCity', ''),
                                'travel_date': schedule.get('departureDate'),
                                'departure_time': schedule.get('departureTime', ''),
                                'bus_type': schedule.get('busType', 'Standard')
                            }
                    
                    # 🔥 FIX: Get bus information from buses collection
                    bus_id = schedule.get('busId')
                    if bus_id:
                        bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                        if bus:
                            bus_info = {
                                'bus_number': bus.get('bus_number', 'N/A'),
                                'bus_name': bus.get('bus_name', 'N/A'),
                                'bus_type': bus.get('bus_type', 'Standard')
                            }
                            print(f"✅ Found bus info: {bus_info}")
                        else:
                            print(f"❌ Bus not found for id: {bus_id}")
                    else:
                        print(f"❌ No bus_id in schedule")
            
            # Format dates for JSON serialization
            created_at = booking.get('created_at')
            if isinstance(created_at, datetime):
                created_at = created_at.isoformat()
            else:
                created_at = ''
                
            travel_date = schedule_info.get('travel_date') or booking.get('travel_date')
            if isinstance(travel_date, datetime):
                travel_date = travel_date.isoformat()
            
            booking_data = {
                '_id': str(booking['_id']),
                'id': str(booking['_id']),
                'pnr_number': booking.get('pnr_number', ''),
                'departure_city': schedule_info.get('departure_city') or booking.get('departure_city', 'Unknown'),
                'arrival_city': schedule_info.get('arrival_city') or booking.get('arrival_city', 'Unknown'),
                'travel_date': travel_date,
                'departure_date': travel_date,
                'departure_time': schedule_info.get('departure_time') or booking.get('departure_time', ''),
                'seat_numbers': booking.get('seat_numbers', []),
                'total_amount': booking.get('total_amount', 0),
                'status': booking.get('status', 'pending'),
                'payment_status': booking.get('payment_status', 'pending'),
                'created_at': created_at,
                'booked_at': created_at,
                'currency': 'ETB',
                'bus_type': bus_info.get('bus_type') or schedule_info.get('bus_type') or booking.get('bus_type', 'Standard'),
                # 🔥 FIX: Add bus number and name
                'bus_number': bus_info.get('bus_number', schedule.get('busNumber', 'N/A') if schedule else 'N/A'),
                'bus_name': bus_info.get('bus_name', 'N/A'),
                # 🔥 ADD: Passenger name with proper fallback
                'passenger_name': booking.get('passenger_name') or (user.get('full_name') if user else 'Passenger')
            }
            
            print(f"✅ Booking {booking_data['pnr_number']} - Bus: {booking_data['bus_number']} - Passenger: {booking_data['passenger_name']}")
            bookings_data.append(booking_data)
        
        return jsonify({
            'success': True,
            'bookings': bookings_data,
            'total': len(bookings_data)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_recent_bookings: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch recent bookings',
            'bookings': []
        }), 500
        
   

@dashboard_bp.route('/upcoming-trips', methods=['GET'])
@jwt_required()
def get_upcoming_trips():
    """Get user's upcoming confirmed trips with schedule information - FIXED with bus data"""
    try:
        current_user_id = get_jwt_identity()
        current_time = datetime.utcnow()
        
        print(f"🔍 UPCOMING TRIPS - User ID: {current_user_id}")
        
        # Get user's bookings using ObjectId
        user_bookings = get_user_bookings(current_user_id)
        print(f"🔍 UPCOMING TRIPS - Total user bookings: {len(user_bookings)}")
        
        # Include both confirmed AND pending bookings for upcoming trips
        upcoming_bookings = [b for b in user_bookings if b.get('status') in ['confirmed', 'pending']]
        print(f"🔍 UPCOMING TRIPS - Upcoming bookings (confirmed+pending): {len(upcoming_bookings)}")
        
        trips_data = []
        for booking in upcoming_bookings:
            print(f"🔍 Processing booking: {booking.get('_id')} - Status: {booking.get('status')}")
            
            # Get schedule information
            schedule_id = booking.get('schedule_id')
            if not schedule_id:
                print(f"❌ No schedule_id for booking {booking.get('_id')}")
                continue
                
            schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
            if not schedule:
                print(f"❌ Schedule not found for id: {schedule_id}")
                continue
            
            # Check if this is an upcoming trip
            travel_date = schedule.get('departureDate')
            if not travel_date:
                print(f"❌ No travel_date in schedule")
                continue
            
            try:
                if isinstance(travel_date, str):
                    if 'T' in travel_date:
                        travel_date = datetime.fromisoformat(travel_date.replace('Z', '+00:00'))
                    else:
                        travel_date = datetime.strptime(travel_date, '%Y-%m-%d')
                
                print(f"🔍 Travel date: {travel_date} | Current time: {current_time}")
                print(f"🔍 Is future? {travel_date > current_time}")
                
                # Only include future trips
                if travel_date <= current_time:
                    print(f"❌ Trip is in the past, skipping")
                    continue
                    
            except Exception as date_error:
                print(f"❌ Error parsing travel date: {date_error}")
                continue
            
            # Get route information
            route_info = {}
            route_id = schedule.get('routeId')
            if route_id:
                route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                if route:
                    route_info = {
                        'departure_city': route.get('originCity', 'Unknown'),
                        'arrival_city': route.get('destinationCity', 'Unknown')
                    }
            
            # 🔥 FIX: Get bus information properly
            bus_info = {}
            bus_id = schedule.get('busId')
            if bus_id:
                bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                if bus:
                    bus_info = {
                        'bus_number': bus.get('bus_number', 'N/A'),
                        'bus_name': bus.get('bus_name', 'N/A'),
                        'bus_type': bus.get('bus_type', 'Standard')
                    }
                    print(f"✅ Found bus info: {bus_info}")
                else:
                    print(f"❌ Bus not found for id: {bus_id}")
            else:
                print(f"❌ No bus_id in schedule")
            
            # Format travel date
            if isinstance(travel_date, datetime):
                travel_date_iso = travel_date.isoformat()
            else:
                travel_date_iso = travel_date
            
            trip_data = {
                '_id': str(booking['_id']),
                'id': str(booking['_id']),
                'pnr_number': booking.get('pnr_number', ''),
                'departure_city': route_info.get('departure_city') or booking.get('departure_city', 'Unknown'),
                'arrival_city': route_info.get('arrival_city') or booking.get('arrival_city', 'Unknown'),
                'travel_date': travel_date_iso,
                'departure_date': travel_date_iso,
                'departure_time': schedule.get('departureTime', ''),
                'seat_numbers': booking.get('seat_numbers', []),
                'bus_type': bus_info.get('bus_type') or schedule.get('busType', 'Standard'),
                'status': booking.get('status', 'confirmed'),
                'total_amount': booking.get('total_amount', 0),
                'bus_company': booking.get('bus_company', ''),
                'arrival_time': schedule.get('arrivalTime', ''),
                # 🔥 FIX: Proper bus number from bus collection
                'bus_number': bus_info.get('bus_number', schedule.get('busNumber', 'N/A')),
                'bus_name': bus_info.get('bus_name', 'N/A')
            }
            
            print(f"✅ Added upcoming trip: {trip_data['departure_city']} → {trip_data['arrival_city']} | Bus: {trip_data['bus_number']}")
            trips_data.append(trip_data)
        
        # Sort by travel date
        trips_data.sort(key=lambda x: x.get('travel_date', ''))
        
        print(f"✅ UPCOMING TRIPS - Final result: {len(trips_data)} trips")
        
        return jsonify({
            'success': True,
            'upcoming_trips': trips_data,
            'total': len(trips_data)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_upcoming_trips: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'upcoming_trips': [],
            'error': str(e)
        }), 500
    
@dashboard_bp.route('/bookings/user', methods=['GET'])
@jwt_required()
def get_user_bookings_for_dashboard():
    """Get all bookings for dashboard services with schedule information - FIXED"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user's bookings using ObjectId
        user_bookings = get_user_bookings(current_user_id)
        
        bookings_data = []
        for booking in user_bookings:
            # Get schedule information to fill missing route data
            schedule_info = {}
            schedule_id = booking.get('schedule_id')
            if schedule_id:
                schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
                if schedule:
                    # Look up route information
                    route_id = schedule.get('routeId')
                    if route_id:
                        route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
                        if route:
                            schedule_info = {
                                'departure_city': route.get('originCity', ''),
                                'arrival_city': route.get('destinationCity', ''),
                                'travel_date': schedule.get('departureDate'),
                                'departure_time': schedule.get('departureTime', ''),
                                'bus_type': schedule.get('busType', 'Standard')
                            }
            
            # Format dates properly
            created_at = booking.get('created_at')
            if isinstance(created_at, datetime):
                created_at = created_at.isoformat()
                
            travel_date = schedule_info.get('travel_date') or booking.get('travel_date')
            if isinstance(travel_date, datetime):
                travel_date = travel_date.isoformat()
            
            # Create frontend-compatible booking object
            booking_data = {
                '_id': str(booking['_id']),
                'id': str(booking['_id']),
                'pnr_number': booking.get('pnr_number', ''),
                'departure_city': schedule_info.get('departure_city') or booking.get('departure_city', 'Unknown'),
                'arrival_city': schedule_info.get('arrival_city') or booking.get('arrival_city', 'Unknown'),
                'travel_date': travel_date,
                'departure_date': travel_date,
                'departure_time': schedule_info.get('departure_time') or booking.get('departure_time', ''),
                'seat_numbers': booking.get('seat_numbers', []),
                'total_amount': booking.get('total_amount', 0),
                'status': booking.get('status', 'pending'),
                'booked_at': created_at,
                'bus_type': schedule_info.get('bus_type') or booking.get('bus_type', 'Standard')
            }
            bookings_data.append(booking_data)
        
        return jsonify(bookings_data), 200
        
    except Exception as e:
        print(f"❌ Error in get_user_bookings_for_dashboard: {e}")
        return jsonify([]), 500

@dashboard_bp.route('/health', methods=['GET'])
def dashboard_health():
    """Health check for dashboard service"""
    try:
        # Test database connection
        mongo.db.command('ping')
        
        return jsonify({
            'status': 'healthy', 
            'service': 'dashboard',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'service': 'dashboard',
            'error': str(e),
            'database': 'disconnected'
        }), 500
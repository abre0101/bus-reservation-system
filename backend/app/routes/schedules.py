from flask import Blueprint, request, jsonify, make_response
from bson import ObjectId
from datetime import datetime, timedelta
from app import mongo

schedules_bp = Blueprint('schedules', __name__)

# CORS headers function
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    return response

def is_schedule_completed(schedule):
    """Check if schedule has already departed - LESS AGGRESSIVE"""
    try:
        now = datetime.utcnow()
        
        # Get departure date and time
        departure_date = schedule.get('departureDate')
        departure_time = schedule.get('departureTime') or schedule.get('departure_time', '00:00')
        
        if not departure_date:
            print(f"❌ No departure date for schedule {schedule.get('_id')}")
            return False  # Don't filter out schedules without dates
        
        # Parse departure datetime - handle various formats
        departure_datetime = None
        
        if isinstance(departure_date, datetime):
            departure_datetime = departure_date
        elif 'GMT' in str(departure_date):
            # Handle "Tue, 18 Nov 2025 00:00:00 GMT" format
            departure_datetime = datetime.strptime(str(departure_date), '%a, %d %b %Y %H:%M:%S GMT')
        elif 'T' in str(departure_date):
            # Handle "2025-11-19T00:00:00.000+00:00" format
            departure_datetime = datetime.fromisoformat(str(departure_date).replace('Z', '+00:00'))
        else:
            # Try to parse as simple date string
            try:
                departure_datetime = datetime.strptime(str(departure_date).split(' ')[0], '%Y-%m-%d')
            except:
                print(f"❌ Could not parse date: {departure_date}")
                return False  # Don't filter out on date parsing errors
        
        # Add time if available
        if departure_time and ':' in departure_time:
            try:
                hours, minutes = map(int, departure_time.split(':'))
                departure_datetime = departure_datetime.replace(hour=hours, minute=minutes, second=0, microsecond=0)
            except:
                pass  # Keep the date without time
        
        if not departure_datetime:
            print(f"❌ Could not create datetime for schedule {schedule.get('_id')}")
            return False
        
        # Check if departure time has passed
        is_completed = departure_datetime < now
        
        if is_completed:
            print(f"⏰ Schedule {schedule.get('_id')} marked as completed: {departure_datetime} < {now}")
        else:
            print(f"✅ Schedule {schedule.get('_id')} is still available: {departure_datetime} >= {now}")
        
        return is_completed
        
    except Exception as e:
        print(f"❌ Error checking schedule completion for {schedule.get('_id')}: {e}")
        return False  # Don't filter out on errors

def is_bus_under_maintenance(schedule, bus_data=None):
    """Check if bus is under maintenance or inactive"""
    try:
        # Check bus status from schedule
        bus_status = schedule.get('bus_status')
        if bus_status and bus_status.lower() in ['maintenance', 'inactive', 'under_maintenance']:
            return True
        
        # Check bus data if provided
        if bus_data:
            bus_status = bus_data.get('status', 'active')
            if bus_status.lower() in ['maintenance', 'inactive', 'under_maintenance']:
                return True
            
            # Check isActive field
            if bus_data.get('isActive') is False:
                return True
        
        # Check schedule-specific maintenance status
        schedule_status = schedule.get('status', 'active')
        if schedule_status.lower() in ['maintenance', 'inactive', 'cancelled']:
            return True
            
        return False
        
    except Exception as e:
        print(f"❌ Error checking bus maintenance: {e}")
        return False  # Assume not under maintenance on error

def filter_valid_schedules(schedules):
    """Filter out completed schedules and buses under maintenance - LESS RESTRICTIVE"""
    try:
        db = mongo.db
        valid_schedules = []
        filtered_count = 0
        
        for schedule in schedules:
            # Check if schedule has departed - be more lenient
            if is_schedule_completed(schedule):
                print(f"⏰ Schedule {schedule.get('_id')} filtered out: Already departed")
                filtered_count += 1
                continue
            
            # Check bus maintenance status - be more lenient
            bus_id = schedule.get('busId')
            bus_data = None
            
            if bus_id:
                try:
                    bus_data = db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    # If bus_id is not a valid ObjectId, try as string
                    bus_data = db.buses.find_one({'bus_number': bus_id})
            
            if is_bus_under_maintenance(schedule, bus_data):
                print(f"🔧 Schedule {schedule.get('_id')} filtered out: Bus under maintenance")
                filtered_count += 1
                continue
            
            valid_schedules.append(schedule)
        
        print(f"✅ Filtered {len(valid_schedules)} valid schedules from {len(schedules)} total (filtered out: {filtered_count})")
        return valid_schedules
        
    except Exception as e:
        print(f"❌ Error filtering schedules: {e}")
        return schedules  # Return original list on errorr

# Health check route
@schedules_bp.route('/health', methods=['GET'])
def schedules_health():
    """Health check for schedules service"""
    try:
        total_schedules = mongo.db.busschedules.count_documents({})
        active_schedules = mongo.db.busschedules.count_documents({"status": "scheduled"})
        total_routes = mongo.db.routes.count_documents({})
        
        response = jsonify({
            "status": "healthy",
            "service": "Schedules Service",
            "total_schedules": total_schedules,
            "active_schedules": active_schedules,
            "total_routes": total_routes,
            "timestamp": datetime.utcnow().isoformat()
        })
        return add_cors_headers(response), 200
    except Exception as e:
        response = jsonify({
            "status": "unhealthy",
            "service": "Schedules Service",
            "error": str(e)
        })
        return add_cors_headers(response), 500

# Get all available cities
@schedules_bp.route('/cities', methods=['GET'])
def get_available_cities():
    """Get all unique cities from routes"""
    try:
        # Get unique cities from both origin and destination
        origin_cities = list(mongo.db.routes.distinct('originCity'))
        destination_cities = list(mongo.db.routes.distinct('destinationCity'))
        
        # Combine and remove duplicates
        all_cities = origin_cities + destination_cities
        unique_cities = list(set(all_cities))
        
        # Remove any None or empty values and sort
        unique_cities = [city for city in unique_cities if city]
        unique_cities.sort()
        
        response = jsonify({
            "success": True,
            "cities": unique_cities,
            "total": len(unique_cities)
        })
        return add_cors_headers(response)
    except Exception as e:
        response = jsonify({
            "success": False,
            "error": str(e)
        })
        return add_cors_headers(response), 500

@schedules_bp.route('/dates', methods=['GET'])
def get_available_dates():
    """Get available dates for a specific route - FIXED VERSION"""
    try:
        origin_city = request.args.get('originCity')
        destination_city = request.args.get('destinationCity')
        
        print(f"🔍=== DATES ENDPOINT CALLED ===")
        print(f"📅 Searching dates for '{origin_city}' → '{destination_city}'")
        
        if not origin_city or not destination_city:
            response = jsonify({
                "success": True,
                "dates": [],
                "message": "Please provide both origin and destination cities"
            })
            return add_cors_headers(response)
        
        # FIXED: Use snake_case field names that match the database
        schedules_query = {
            'origin_city': origin_city,
            'destination_city': destination_city,
            'status': 'scheduled',
            'available_seats': {'$gt': 0}
        }
        
        print(f"🔍 Direct schedules query: {schedules_query}")
        
        schedules = list(mongo.db.busschedules.find(schedules_query))
        print(f"📊 Direct schedules found: {len(schedules)}")
        
        for schedule in schedules:
            print(f"   Schedule: {schedule['_id']}, Date: {schedule.get('departureDate')}, Seats: {schedule.get('availableSeats')}")
        
        # Filter out completed schedules and maintenance buses
        valid_schedules = filter_valid_schedules(schedules)
        print(f"✅ Valid schedules after filtering: {len(valid_schedules)}")
        
        # Extract unique dates from valid schedules
        dates = set()
        for schedule in valid_schedules:
            # Check both datetime and string date fields
            departure_date = schedule.get('departureDate') or schedule.get('departure_date')
            if departure_date:
                try:
                    # Handle different date formats
                    if isinstance(departure_date, datetime):
                        date_str = departure_date.strftime('%Y-%m-%d')
                    elif 'GMT' in str(departure_date):
                        # Handle "Tue, 18 Nov 2025 00:00:00 GMT" format
                        date_obj = datetime.strptime(str(departure_date), '%a, %d %b %Y %H:%M:%S GMT')
                        date_str = date_obj.strftime('%Y-%m-%d')
                    elif 'T' in str(departure_date):
                        # Handle "2025-11-19T00:00:00.000+00:00" format
                        date_str = str(departure_date).split('T')[0]
                    else:
                        # Try to parse as ISO format
                        date_str = str(departure_date).split(' ')[0]
                    
                    dates.add(date_str)
                    print(f"📅 Added date: {date_str} from {departure_date}")
                    
                except Exception as date_error:
                    print(f"❌ Date parsing error for {departure_date}: {date_error}")
                    continue
        
        sorted_dates = sorted(list(dates))
        print(f"📅 Final dates list: {sorted_dates}")
        
        response = jsonify({
            "success": True,
            "dates": sorted_dates,
            "total": len(sorted_dates),
            "route": {
                "originCity": origin_city,
                "destinationCity": destination_city
            },
            "debug_info": {
                "schedules_found": len(schedules),
                "valid_schedules": len(valid_schedules),
                "dates_extracted": len(dates)
            }
        })
        return add_cors_headers(response)
        
    except Exception as e:
        print(f"❌ ERROR in get_available_dates: {str(e)}")
        import traceback
        print(f"🔍 Stack trace: {traceback.format_exc()}")
        response = jsonify({
            "success": False,
            "error": str(e)
        })
        return add_cors_headers(response), 500

# Handle OPTIONS requests for CORS preflight
@schedules_bp.route('/', methods=['OPTIONS'])
@schedules_bp.route('', methods=['OPTIONS'])  # Handle both with and without trailing slash
def handle_options():
    response = make_response()
    return add_cors_headers(response)

# Enhanced schedules search endpoint with maintenance and date filtering
@schedules_bp.route('/', methods=['GET'])
@schedules_bp.route('', methods=['GET'])  # Handle both with and without trailing slash
def get_schedules():
    """Get schedules with filtering for maintenance and past dates"""
    try:
        origin_city = request.args.get('originCity')
        destination_city = request.args.get('destinationCity')
        travel_date = request.args.get('date')
        include_completed = request.args.get('include_completed', 'false').lower() == 'true'
        include_maintenance = request.args.get('include_maintenance', 'false').lower() == 'true'
        
        print(f"🔍 Search request: {origin_city} -> {destination_city} on {travel_date}")
        print(f"🔧 Filters - include_completed: {include_completed}, include_maintenance: {include_maintenance}")
        
        # Build pipeline for aggregation
        pipeline = []
        
        # FIXED: Match schedules directly by city fields (snake_case)
        pipeline.append({
            '$match': {
                'origin_city': origin_city,
                'destination_city': destination_city
            }
        })
        
        # Lookup route information (for additional route details)
        pipeline.append({
            '$lookup': {
                'from': 'routes',
                'let': {'schedule_route_id': '$route_id'},
                'pipeline': [
                    {
                        '$match': {
                            '$expr': {
                                '$or': [
                                    {'$eq': ['$_id', '$$schedule_route_id']},
                                    {'$eq': [{'$toString': '$_id'}, '$$schedule_route_id']}
                                ]
                            }
                        }
                    }
                ],
                'as': 'route_info'
            }
        })
        
        # Unwind the route_info array (preserve null if route not found)
        pipeline.append({
            '$unwind': {
                'path': '$route_info',
                'preserveNullAndEmptyArrays': True
            }
        })
        
        # Lookup bus information
        pipeline.append({
            '$lookup': {
                'from': 'buses',
                'let': {'schedule_bus_id': '$bus_id'},
                'pipeline': [
                    {
                        '$match': {
                            '$expr': {
                                '$or': [
                                    {'$eq': ['$_id', '$$schedule_bus_id']},
                                    {'$eq': [{'$toString': '$_id'}, '$$schedule_bus_id']},
                                    {'$eq': ['$bus_number', '$$schedule_bus_id']}
                                ]
                            }
                        }
                    }
                ],
                'as': 'bus_info'
            }
        })
        
        # Unwind the bus_info array (preserve null for buses not found)
        pipeline.append({
            '$unwind': {
                'path': '$bus_info',
                'preserveNullAndEmptyArrays': True
            }
        })
        
        # Match stage for filtering (using snake_case field names)
        match_stage = {
            'status': 'scheduled',
            'available_seats': {'$gt': 0}
        }
        
        # Date filtering
        if travel_date:
            try:
                search_date = datetime.strptime(travel_date, '%Y-%m-%d')
                start_date = search_date.replace(hour=0, minute=0, second=0, microsecond=0)
                end_date = start_date + timedelta(days=1)
                
                # Match against both string and datetime formats
                match_stage['$or'] = [
                    {'departureDate': {'$gte': start_date, '$lt': end_date}},
                    {'departure_date': travel_date}
                ]
            except ValueError as e:
                response = jsonify({
                    "success": False,
                    "error": f"Invalid date format. Use YYYY-MM-DD: {str(e)}"
                })
                return add_cors_headers(response), 400
        
        pipeline.append({'$match': match_stage})
        
        # Project with proper ObjectId conversion and field mapping
        pipeline.append({
            '$project': {
                '_id': {'$toString': '$_id'},
                'routeId': {'$toString': '$route_id'},
                'busId': {'$toString': '$bus_id'},
                'busType': '$bus_type',
                'busNumber': '$bus_number',
                'departureTime': '$departure_time',
                'arrivalTime': '$arrival_time',
                'departureDate': '$departureDate',
                'departure_date': '$departure_date',
                'availableSeats': '$available_seats',
                'fareBirr': '$fare_birr',
                'status': 1,
                'amenities': 1,
                'boardingPoints': '$boarding_points',
                'droppingPoints': '$dropping_points',
                'driver_name': 1,
                
                # City fields - use schedule's own fields first, fallback to route
                'departure_city': {'$ifNull': ['$origin_city', '$route_info.originCity']},
                'arrival_city': {'$ifNull': ['$destination_city', '$route_info.destinationCity']},
                'originCity': {'$ifNull': ['$origin_city', '$route_info.originCity']},
                'destinationCity': {'$ifNull': ['$destination_city', '$route_info.destinationCity']},
                
                # Route information
                'distanceKm': '$route_info.distanceKm',
                'estimatedDurationHours': '$route_info.estimatedDurationHours',
                'stops': '$route_info.stops',
                
                # Bus information
                'bus_name': '$bus_info.bus_name',
                'bus_number': '$bus_info.bus_number',
                'bus_status': '$bus_info.status',
                'bus_isActive': '$bus_info.isActive',
                'bus_capacity': '$bus_info.capacity',
                'bus_amenities': '$bus_info.amenities'
            }
        })
        
        # Execute aggregation
        schedules_cursor = mongo.db.busschedules.aggregate(pipeline)
        schedules = list(schedules_cursor)
        print(f"📊 Found {len(schedules)} schedules before filtering")
        
        # Apply maintenance and date filtering
        if not include_completed or not include_maintenance:
            filtered_schedules = []
            for schedule in schedules:
                # Check if we should include completed schedules
                if not include_completed and is_schedule_completed(schedule):
                    continue
                
                # Check if we should include maintenance schedules
                if not include_maintenance:
                    bus_data = {
                        'status': schedule.get('bus_status'),
                        'isActive': schedule.get('bus_isActive', True)
                    } if schedule.get('bus_status') or schedule.get('bus_isActive') is not None else None
                    
                    if is_bus_under_maintenance(schedule, bus_data):
                        continue
                
                filtered_schedules.append(schedule)
            
            schedules = filtered_schedules
            print(f"✅ After filtering: {len(schedules)} schedules")
        
        # Format schedules for response
        formatted_schedules = []
        for schedule in schedules:
            try:
                # Ensure fare field exists
                if 'fareBirr' in schedule:
                    schedule['price'] = schedule['fareBirr']
                
                # Convert datetime to string if present
                if 'departureDate' in schedule and isinstance(schedule['departureDate'], datetime):
                    schedule['departureDate'] = schedule['departureDate'].strftime('%Y-%m-%d')
                
                # Add bus information
                bus_data = {
                    '_id': schedule.get('busId'),
                    'number': schedule.get('bus_number', schedule.get('busNumber', '')),
                    'name': schedule.get('bus_name', ''),
                    'type': schedule.get('busType', 'standard'),
                    'capacity': schedule.get('bus_capacity', 45),
                    'status': schedule.get('bus_status', 'active'),
                    'isActive': schedule.get('bus_isActive', True),
                    'amenities': schedule.get('bus_amenities', [])
                }
                
                schedule['bus'] = bus_data
                
                # Add status flags for frontend
                schedule['is_completed'] = is_schedule_completed(schedule)
                schedule['is_under_maintenance'] = is_bus_under_maintenance(schedule, bus_data)
                schedule['is_available'] = not schedule['is_completed'] and not schedule['is_under_maintenance']
                
                formatted_schedules.append(schedule)
            except Exception as e:
                print(f"⚠️ Error formatting schedule: {e}")
                continue
        
        response = jsonify({
            "success": True,
            "schedules": formatted_schedules,
            "total": len(formatted_schedules),
            "search": {
                "originCity": origin_city,
                "destinationCity": destination_city,
                "date": travel_date
            },
            "filters": {
                "include_completed": include_completed,
                "include_maintenance": include_maintenance
            },
            "stats": {
                "available": len([s for s in formatted_schedules if s.get('is_available', True)]),
                "completed": len([s for s in formatted_schedules if s.get('is_completed', False)]),
                "maintenance": len([s for s in formatted_schedules if s.get('is_under_maintenance', False)])
            }
        })
        return add_cors_headers(response)
        
    except Exception as e:
        print(f"❌ ERROR in get_schedules: {str(e)}")
        response = jsonify({
            "success": False,
            "error": str(e),
            "schedules": []
        })
        return add_cors_headers(response), 500

# Enhanced schedule validation endpoint
@schedules_bp.route('/<schedule_id>/validate', methods=['GET'])
def validate_schedule(schedule_id):
    """Validate if a schedule is available for booking"""
    try:
        # Try to convert to ObjectId if it looks like one
        if len(schedule_id) == 24 and all(c in '0123456789abcdef' for c in schedule_id.lower()):
            schedule = mongo.db.busschedules.find_one({"_id": ObjectId(schedule_id)})
        else:
            schedule = mongo.db.busschedules.find_one({"busNumber": schedule_id})
        
        if not schedule:
            response = jsonify({
                "success": False,
                "valid": False,
                "error": "Schedule not found"
            })
            return add_cors_headers(response), 404
        
        # Get bus information
        bus_data = None
        bus_id = schedule.get('busId')
        if bus_id:
            try:
                bus_data = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
            except:
                bus_data = mongo.db.buses.find_one({'bus_number': bus_id})
        
        # Check if schedule has departed
        if is_schedule_completed(schedule):
            response = jsonify({
                "success": True,
                "valid": False,
                "error": "Schedule has already departed",
                "reason": "completed",
                "departure_date": schedule.get('departureDate'),
                "departure_time": schedule.get('departureTime')
            })
            return add_cors_headers(response)
        
        # Check bus maintenance status
        if is_bus_under_maintenance(schedule, bus_data):
            bus_status = bus_data.get('status', 'maintenance') if bus_data else schedule.get('bus_status', 'maintenance')
            response = jsonify({
                "success": True,
                "valid": False,
                "error": "Bus is under maintenance",
                "reason": "maintenance",
                "bus_status": bus_status,
                "bus_name": bus_data.get('name') if bus_data else 'Unknown'
            })
            return add_cors_headers(response)
        
        # Get route information
        route = None
        route_id = schedule.get('routeId')
        if route_id:
            try:
                route = mongo.db.routes.find_one({'_id': ObjectId(route_id)})
            except:
                pass
        
        response = jsonify({
            "success": True,
            "valid": True,
            "schedule_id": str(schedule['_id']),
            "departure_city": route.get('originCity') if route else 'Unknown',
            "arrival_city": route.get('destinationCity') if route else 'Unknown',
            "departure_date": schedule.get('departureDate'),
            "departure_time": schedule.get('departureTime'),
            "bus_status": 'active',
            "schedule_status": 'active'
        })
        return add_cors_headers(response)
        
    except Exception as e:
        print(f"❌ Error validating schedule: {e}")
        response = jsonify({
            "success": False,
            "valid": False,
            "error": str(e)
        })
        return add_cors_headers(response), 500

# Get schedule by ID
@schedules_bp.route('/<schedule_id>', methods=['GET'])
def get_schedule_by_id(schedule_id):
    """Get a specific schedule by ID with maintenance status"""
    try:
        # Try to convert to ObjectId if it looks like one
        if len(schedule_id) == 24 and all(c in '0123456789abcdef' for c in schedule_id.lower()):
            schedule = mongo.db.busschedules.find_one({"_id": ObjectId(schedule_id)})
        else:
            schedule = mongo.db.busschedules.find_one({"busNumber": schedule_id})
        
        if not schedule:
            response = jsonify({"error": "Schedule not found"})
            return add_cors_headers(response), 404
        
        # Get bus information
        bus_data = None
        bus_id = schedule.get('busId')
        if bus_id:
            try:
                bus_data = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
            except:
                bus_data = mongo.db.buses.find_one({'bus_number': bus_id})
        
        # Convert for JSON
        schedule['_id'] = str(schedule['_id'])
        if 'departureDate' in schedule and isinstance(schedule['departureDate'], datetime):
            schedule['departureDate'] = schedule['departureDate'].strftime('%Y-%m-%d')
        
        # Add bus information
        if bus_data:
            schedule['bus'] = {
                '_id': str(bus_data['_id']),
                'number': bus_data.get('bus_number', ''),
                'name': bus_data.get('bus_name', ''),
                'type': bus_data.get('type', 'standard'),
                'status': bus_data.get('status', 'active'),
                'isActive': bus_data.get('isActive', True),
                'capacity': bus_data.get('capacity', 45)
            }
        
        # Add status flags
        schedule['is_completed'] = is_schedule_completed(schedule)
        schedule['is_under_maintenance'] = is_bus_under_maintenance(schedule, bus_data)
        schedule['is_available'] = not schedule['is_completed'] and not schedule['is_under_maintenance']
        
        response = jsonify({
            "success": True, 
            "schedule": schedule
        })
        return add_cors_headers(response)
        
    except Exception as e:
        response = jsonify({
            "success": False,
            "error": str(e)
        })
        return add_cors_headers(response), 500

# Test endpoint with enhanced filtering
@schedules_bp.route('/test', methods=['GET'])
def test_schedules():
    """Test endpoint to verify data flow and filtering"""
    try:
        # Count documents
        schedule_count = mongo.db.busschedules.count_documents({})
        route_count = mongo.db.routes.count_documents({})
        
        # Get one schedule and its route
        schedule = mongo.db.busschedules.find_one({})
        route = None
        bus_data = None
        
        if schedule:
            if schedule.get('routeId'):
                try:
                    route = mongo.db.routes.find_one({"_id": ObjectId(schedule['routeId'])})
                except:
                    route = None
            
            if schedule.get('busId'):
                try:
                    bus_data = mongo.db.buses.find_one({'_id': ObjectId(schedule['busId'])})
                except:
                    bus_data = mongo.db.buses.find_one({'bus_number': schedule.get('busId')})
        
        # Test filtering
        test_schedules = list(mongo.db.busschedules.find().limit(5))
        filtered_schedules = filter_valid_schedules(test_schedules)
        
        response = jsonify({
            "success": True,
            "schedule_count": schedule_count,
            "route_count": route_count,
            "sample_schedule": {
                "_id": str(schedule['_id']) if schedule else None,
                "routeId": schedule.get('routeId') if schedule else None,
                "busNumber": schedule.get('busNumber') if schedule else None,
                "departureDate": schedule.get('departureDate').strftime('%Y-%m-%d') if schedule and schedule.get('departureDate') else None,
                "is_completed": is_schedule_completed(schedule) if schedule else None,
                "is_under_maintenance": is_bus_under_maintenance(schedule, bus_data) if schedule else None
            },
            "sample_route": {
                "_id": str(route['_id']) if route else None,
                "originCity": route.get('originCity') if route else None,
                "destinationCity": route.get('destinationCity') if route else None
            } if route else None,
            "filtering_test": {
                "total_schedules": len(test_schedules),
                "valid_schedules": len(filtered_schedules),
                "filtered_out": len(test_schedules) - len(filtered_schedules)
            }
        })
        return add_cors_headers(response)
        
    except Exception as e:
        response = jsonify({
            "success": False,
            "error": str(e)
        })
        return add_cors_headers(response), 500
        # Add this to your schedules_bp routes
        
@schedules_bp.route('/debug/routes', methods=['GET'])
def debug_routes():
    """Debug endpoint to see all available routes"""
    try:
        # Get all unique route combinations from schedules
        pipeline = [
            {
                '$group': {
                    '_id': {
                        'origin': '$originCity',
                        'destination': '$destinationCity'
                    },
                    'count': {'$sum': 1}
                }
            },
            {
                '$project': {
                    'route': '$_id',
                    'schedule_count': '$count',
                    '_id': 0
                }
            },
            {
                '$sort': {'route.origin': 1, 'route.destination': 1}
            }
        ]
        
        routes = list(mongo.db.busschedules.aggregate(pipeline))
        
        response = jsonify({
            "success": True,
            "total_routes": len(routes),
            "available_routes": routes
        })
        return add_cors_headers(response)
        
    except Exception as e:
        response = jsonify({
            "success": False,
            "error": str(e)
        })
        return add_cors_headers(response), 500

@schedules_bp.route('/debug/schedules', methods=['GET'])
def debug_schedules():
    """Debug endpoint to see all schedules"""
    try:
        schedules = list(mongo.db.busschedules.find({}))
        
        schedule_list = []
        for schedule in schedules:
            schedule_list.append({
                'id': str(schedule['_id']),
                'origin': schedule.get('originCity'),
                'destination': schedule.get('destinationCity'),
                'date': schedule.get('departureDate'),
                'time': schedule.get('departureTime'),
                'seats': schedule.get('availableSeats'),
                'price': schedule.get('fareBirr'),
                'status': schedule.get('status')
            })
        
        response = jsonify({
            "success": True,
            "total_schedules": len(schedules),
            "schedules": schedule_list
        })
        return add_cors_headers(response)
        
    except Exception as e:
        response = jsonify({
            "success": False,
            "error": str(e)
        })
        return add_cors_headers(response), 500
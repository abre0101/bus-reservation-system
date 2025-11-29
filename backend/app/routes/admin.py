from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import mongo
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, make_response

admin_bp = Blueprint('admin_bp', __name__)

# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def safe_object_id(id_string):
    """Safely convert string to ObjectId if valid, otherwise return string"""
    try:
        if isinstance(id_string, str) and len(id_string) == 24:
            return ObjectId(id_string)
        else:
            return id_string
    except (InvalidId, TypeError):
        return id_string

def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
    except Exception as e:
        print(f"❌ Admin check error: {e}")
        return False

def serialize_doc(doc):
    """Serialize MongoDB document for JSON response"""
    if not doc:
        return None
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, list):
            serialized[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            serialized[key] = serialize_doc(value)
        else:
            serialized[key] = value
    return serialized

def get_collection(entity):
    """Get collection name with validation"""
    collection_map = {
        'user': 'users',
        'bus': 'buses',
        'route': 'routes',
        'schedule': 'busschedules',
        'booking': 'bookings',
        'driver': 'users',
        'payment': 'payments',  # Changed from 'bookings' to 'payments'
        'ticketer': 'users'     # New entity
    }
    collection_name = collection_map.get(entity)
    if not collection_name:
        raise ValueError(f'Invalid entity: {entity}')
    return collection_name

def is_schedule_completed(schedule):
    """Check if schedule has already departed (past date/time)"""
    try:
        now = datetime.utcnow()
        
        # Get departure date and time
        departure_date = schedule.get('departure_date')
        departure_time = schedule.get('departure_time', '00:00')
        
        if not departure_date:
            return True  # Consider invalid schedule as completed
        
        # Parse departure datetime
        if isinstance(departure_date, datetime):
            departure_datetime = departure_date
            # Add time if not present
            if departure_time and ':' in departure_time:
                try:
                    hours, minutes = map(int, departure_time.split(':'))
                    departure_datetime = departure_datetime.replace(hour=hours, minute=minutes, second=0, microsecond=0)
                except:
                    pass
        else:
            departure_date_str = str(departure_date)
            try:
                departure_datetime = datetime.strptime(f"{departure_date_str} {departure_time}", "%Y-%m-%d %H:%M")
            except:
                # Fallback: try without time
                departure_datetime = datetime.strptime(departure_date_str, "%Y-%m-%d")
        
        # Check if departure time has passed
        return departure_datetime < now
        
    except Exception as e:
        print(f"❌ Error checking schedule completion: {e}")
        return True  # Consider error cases as completed for safety

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
    """Filter out completed schedules and buses under maintenance"""
    try:
        db = mongo.db
        valid_schedules = []
        filtered_count = 0
        
        for schedule in schedules:
            # Check if schedule has departed
            if is_schedule_completed(schedule):
                print(f"⏰ Schedule {schedule.get('_id')} filtered out: Already departed")
                filtered_count += 1
                continue
            
            # Check bus maintenance status
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
        return schedules  # Return original list on error

# =========================================================================
# ENHANCED DASHBOARD & REPORTS WITH MAINTENANCE & DATE FILTERING
# =========================================================================

@admin_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_admin_dashboard_stats():
    """Get REAL stats with maintenance and schedule filtering"""
    try:
        print("📊 Fetching ENHANCED REAL dashboard stats from database...")
        
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        now = datetime.utcnow()
        
        # Base query for paid bookings
        base_query = {
            'payment_status': 'paid',
            'status': {'$in': ['completed', 'checked_in', 'confirmed', 'pending']}
        }
        
        # TODAY'S REAL STATS
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        today_bookings = list(mongo.db.bookings.find({
            **base_query,
            'created_at': {'$gte': today_start, '$lt': today_end}
        }))
        today_revenue = sum(b.get('total_amount', 0) for b in today_bookings)
        
        # WEEKLY REAL STATS (last 7 days)
        week_start = now - timedelta(days=7)
        weekly_bookings = list(mongo.db.bookings.find({
            **base_query,
            'created_at': {'$gte': week_start, '$lt': now}
        }))
        weekly_revenue = sum(b.get('total_amount', 0) for b in weekly_bookings)
        
        # MONTHLY REAL STATS (this month)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_bookings = list(mongo.db.bookings.find({
            **base_query,
            'created_at': {'$gte': month_start, '$lt': now}
        }))
        monthly_revenue = sum(b.get('total_amount', 0) for b in monthly_bookings)
        
        # ALL-TIME REAL STATS
        all_bookings = list(mongo.db.bookings.find(base_query))
        total_revenue = sum(b.get('total_amount', 0) for b in all_bookings)
        total_bookings = len(all_bookings)
        
        # Other real counts from database
        users_count = mongo.db.users.count_documents({})
        buses_count = mongo.db.buses.count_documents({'status': 'active'})
        routes_count = mongo.db.routes.count_documents({})
        
        # ENHANCED: Get maintenance and schedule statistics
        total_schedules = mongo.db.busschedules.count_documents({})
        active_schedules = mongo.db.busschedules.count_documents({'status': 'scheduled'})
        
        # Get schedules for maintenance analysis
        all_schedules = list(mongo.db.busschedules.find({'status': 'scheduled'}))
        valid_schedules = filter_valid_schedules(all_schedules)
        
        # Get buses for maintenance analysis
        total_buses = mongo.db.buses.count_documents({})
        maintenance_buses = mongo.db.buses.count_documents({
            'status': {'$in': ['maintenance', 'inactive', 'under_maintenance']}
        })
        active_buses = total_buses - maintenance_buses
        
        stats = {
            # Real revenue data from actual bookings
            'today_revenue': today_revenue,
            'weekly_revenue': weekly_revenue,
            'monthly_revenue': monthly_revenue,
            'total_revenue': total_revenue,
            
            # Real booking counts from actual bookings
            'today_bookings': len(today_bookings),
            'weekly_bookings': len(weekly_bookings),
            'monthly_bookings': len(monthly_bookings),
            'total_bookings': total_bookings,
            
            # Other real counts from database
            'total_users': users_count,
            'total_buses': buses_count,
            'total_routes': routes_count,
            
            # ENHANCED: Maintenance and schedule statistics
            'schedule_stats': {
                'total_schedules': total_schedules,
                'active_schedules': active_schedules,
                'available_schedules': len(valid_schedules),
                'completion_rate': round((len(valid_schedules) / active_schedules) * 100, 2) if active_schedules > 0 else 0,
                'filtered_schedules': len(all_schedules) - len(valid_schedules)
            },
            'maintenance_stats': {
                'total_buses': total_buses,
                'active_buses': active_buses,
                'maintenance_buses': maintenance_buses,
                'availability_rate': round((active_buses / total_buses) * 100, 2) if total_buses > 0 else 0
            },
            
            'currency': 'ETB',
            'data_source': 'real_database',
            'is_real_data': True,
            'last_updated': now.isoformat()
        }
        
        print(f"✅ ENHANCED REAL DASHBOARD STATS:")
        print(f"   - Monthly Revenue: ETB {monthly_revenue} (from {len(monthly_bookings)} bookings)")
        print(f"   - Available Schedules: {len(valid_schedules)}/{active_schedules} ({stats['schedule_stats']['completion_rate']}%)")
        print(f"   - Bus Availability: {active_buses}/{total_buses} ({stats['maintenance_stats']['availability_rate']}%)")
        
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"❌ Enhanced dashboard stats error: {e}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reports', methods=['GET'])
@jwt_required()
def get_reports():
    """Generate ENHANCED REAL reports with maintenance and date filtering"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        report_type = request.args.get('report_type', 'daily')
        include_maintenance = request.args.get('include_maintenance', 'false').lower() == 'true'
        include_completed = request.args.get('include_completed', 'false').lower() == 'true'
        
        print(f"🔄 Generating ENHANCED REAL {report_type} report with filtering...")
        
        now = datetime.utcnow()
        base_query = {
            'payment_status': 'paid',
            'status': {'$in': ['completed', 'checked_in', 'confirmed', 'pending']}
        }
        
        # Define REAL date ranges
        if report_type == 'daily':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)
        elif report_type == 'weekly':
            start_date = now - timedelta(days=7)
            end_date = now
        elif report_type == 'monthly':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        else:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)
        
        query = {**base_query, 'created_at': {'$gte': start_date, '$lt': end_date}}
        
        # GET REAL BOOKINGS DATA
        bookings = list(mongo.db.bookings.find(query))
        
        print(f"📊 REAL DATA: Found {len(bookings)} bookings for {report_type} report")
        
        # Calculate REAL statistics from actual bookings
        total_revenue = sum(booking.get('total_amount', 0) for booking in bookings)
        total_bookings = len(bookings)
        total_passengers = total_bookings  # Each booking = 1 passenger
        total_seats = sum(len(booking.get('seat_numbers', [])) for booking in bookings)
        
        # Calculate REAL occupancy rate from actual seats
        occupancy_rate = (total_seats / (total_bookings * 50)) * 100 if total_bookings > 0 else 0
        
        # Get REAL popular routes from actual bookings
        route_counts = {}
        for booking in bookings:
            route = f"{booking.get('departure_city', 'Unknown')} → {booking.get('arrival_city', 'Unknown')}"
            route_counts[route] = route_counts.get(route, 0) + 1
        
        popular_routes = [
            {'name': route_name, 'bookings': count}
            for route_name, count in sorted(route_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        # ENHANCED: Get schedule and maintenance data
        schedules = list(mongo.db.busschedules.find({
            'status': 'scheduled',
            'departure_date': {'$gte': start_date.strftime('%Y-%m-%d'), '$lt': end_date.strftime('%Y-%m-%d')}
        }))
        
        # Apply filtering based on parameters
        if not include_completed or not include_maintenance:
            filtered_schedules = []
            for schedule in schedules:
                # Check if we should include completed schedules
                if not include_completed and is_schedule_completed(schedule):
                    continue
                
                # Check if we should include maintenance schedules
                if not include_maintenance:
                    bus_id = schedule.get('busId')
                    bus_data = None
                    if bus_id:
                        try:
                            bus_data = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                        except:
                            bus_data = mongo.db.buses.find_one({'bus_number': bus_id})
                    
                    if is_bus_under_maintenance(schedule, bus_data):
                        continue
                
                filtered_schedules.append(schedule)
            
            schedules = filtered_schedules
        
        # ENHANCED: Calculate schedule statistics
        total_schedules_count = len(schedules)
        available_schedules = len(filter_valid_schedules(schedules))
        
        # Create ENHANCED REAL report
        enhanced_report = {
            '_id': f'enhanced_{report_type}_{now.strftime("%Y%m%d%H%M%S")}',
            'report_name': f'Enhanced {report_type.capitalize()} Report',
            'report_type': report_type,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'revenue': total_revenue,
            'total_bookings': total_bookings,
            'total_passengers': total_passengers,
            'total_seats': total_seats,
            'occupancy_rate': round(occupancy_rate, 1),
            'popular_routes': popular_routes,
            
            # ENHANCED: Schedule and maintenance data
            'schedule_analysis': {
                'total_schedules': total_schedules_count,
                'available_schedules': available_schedules,
                'unavailable_schedules': total_schedules_count - available_schedules,
                'availability_rate': round((available_schedules / total_schedules_count) * 100, 2) if total_schedules_count > 0 else 0,
                'filters_applied': {
                    'include_completed': include_completed,
                    'include_maintenance': include_maintenance
                }
            },
            
            'generated_at': now.isoformat(),
            'data_source': 'real_database',
            'is_real_data': True,
            'is_enhanced': True
        }
        
        print(f"✅ ENHANCED REAL {report_type.upper()} REPORT:")
        print(f"   - Revenue: ETB {total_revenue}")
        print(f"   - Bookings: {total_bookings}")
        print(f"   - Available Schedules: {available_schedules}/{total_schedules_count}")
        print(f"   - Occupancy: {occupancy_rate}%")
        
        return jsonify([enhanced_report]), 200
        
    except Exception as e:
        print(f"❌ Enhanced real report error: {e}")
        return jsonify({'error': str(e)}), 500

# =========================================================================
# NEW MAINTENANCE ANALYTICS ENDPOINTS
# =========================================================================

@admin_bp.route('/analytics/maintenance', methods=['GET'])
@jwt_required()
def get_maintenance_analytics():
    """Get detailed maintenance analytics"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get all buses with maintenance status
        buses = list(mongo.db.buses.find({}))
        
        # Analyze maintenance status
        maintenance_analysis = {
            'total_buses': len(buses),
            'active_buses': 0,
            'maintenance_buses': 0,
            'inactive_buses': 0,
            'buses_by_status': {},
            'maintenance_trends': []
        }
        
        for bus in buses:
            bus_status = bus.get('status', 'active')
            maintenance_analysis['buses_by_status'][bus_status] = maintenance_analysis['buses_by_status'].get(bus_status, 0) + 1
            
            if is_bus_under_maintenance({'bus_status': bus_status}, bus):
                maintenance_analysis['maintenance_buses'] += 1
            elif bus_status == 'active':
                maintenance_analysis['active_buses'] += 1
            else:
                maintenance_analysis['inactive_buses'] += 1
        
        # Get schedules affected by maintenance
        all_schedules = list(mongo.db.busschedules.find({'status': 'scheduled'}))
        affected_schedules = []
        
        for schedule in all_schedules:
            bus_id = schedule.get('busId')
            bus_data = None
            if bus_id:
                try:
                    bus_data = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    bus_data = mongo.db.buses.find_one({'bus_number': bus_id})
            
            if is_bus_under_maintenance(schedule, bus_data):
                affected_schedules.append({
                    'schedule_id': str(schedule.get('_id')),
                    'bus_number': bus_data.get('bus_number') if bus_data else 'Unknown',
                    'departure_date': schedule.get('departure_date'),
                    'route': f"{schedule.get('origin_city', 'Unknown')} → {schedule.get('destination_city', 'Unknown')}",
                    'maintenance_reason': bus_data.get('maintenance_notes', 'Unknown') if bus_data else 'Unknown'
                })
        
        maintenance_analysis['affected_schedules'] = affected_schedules
        maintenance_analysis['schedules_affected'] = len(affected_schedules)
        
        return jsonify(maintenance_analysis), 200
        
    except Exception as e:
        print(f"❌ Maintenance analytics error: {e}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/analytics/schedule-availability', methods=['GET'])
@jwt_required()
def get_schedule_availability_analytics():
    """Get detailed schedule availability analytics"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get all active schedules
        schedules = list(mongo.db.busschedules.find({'status': 'scheduled'}))
        
        availability_analysis = {
            'total_schedules': len(schedules),
            'available_schedules': 0,
            'completed_schedules': 0,
            'maintenance_schedules': 0,
            'availability_by_route': {},
            'completion_reasons': {
                'past_departure': 0,
                'bus_maintenance': 0,
                'other_reasons': 0
            }
        }
        
        for schedule in schedules:
            # Check completion status
            if is_schedule_completed(schedule):
                availability_analysis['completed_schedules'] += 1
                availability_analysis['completion_reasons']['past_departure'] += 1
                continue
            
            # Check maintenance status
            bus_id = schedule.get('busId')
            bus_data = None
            if bus_id:
                try:
                    bus_data = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    bus_data = mongo.db.buses.find_one({'bus_number': bus_id})
            
            if is_bus_under_maintenance(schedule, bus_data):
                availability_analysis['maintenance_schedules'] += 1
                availability_analysis['completion_reasons']['bus_maintenance'] += 1
                continue
            
            # Count as available
            availability_analysis['available_schedules'] += 1
            
            # Track by route
            route_name = f"{schedule.get('origin_city', 'Unknown')} → {schedule.get('destination_city', 'Unknown')}"
            availability_analysis['availability_by_route'][route_name] = availability_analysis['availability_by_route'].get(route_name, 0) + 1
        
        # Calculate percentages
        total = availability_analysis['total_schedules']
        if total > 0:
            availability_analysis['availability_rate'] = round((availability_analysis['available_schedules'] / total) * 100, 2)
            availability_analysis['completion_rate'] = round((availability_analysis['completed_schedules'] / total) * 100, 2)
            availability_analysis['maintenance_rate'] = round((availability_analysis['maintenance_schedules'] / total) * 100, 2)
        
        return jsonify(availability_analysis), 200
        
    except Exception as e:
        print(f"❌ Schedule availability analytics error: {e}")
        return jsonify({'error': str(e)}), 500

# =========================================================================
# ENHANCED DEBUG ENDPOINT
# =========================================================================

@admin_bp.route('/reports/debug-enhanced', methods=['GET'])
@jwt_required()
def debug_enhanced_reports():
    """Enhanced debug endpoint to verify filtering and maintenance data"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Query for monthly bookings
        query = {
            'payment_status': 'paid',
            'status': {'$in': ['completed', 'checked_in', 'confirmed', 'pending']},
            'created_at': {'$gte': month_start, '$lt': now}
        }
        
        bookings = list(mongo.db.bookings.find(query))
        
        # Get schedules for analysis
        schedules = list(mongo.db.busschedules.find({'status': 'scheduled'}))
        valid_schedules = filter_valid_schedules(schedules)
        
        debug_info = {
            'query_used': str(query),
            'bookings_found': len(bookings),
            'total_revenue_calculated': sum(b.get('total_amount', 0) for b in bookings),
            'schedule_analysis': {
                'total_schedules': len(schedules),
                'valid_schedules': len(valid_schedules),
                'filtered_schedules': len(schedules) - len(valid_schedules),
                'filtering_efficiency': f"{round((len(valid_schedules) / len(schedules)) * 100, 2)}%"
            },
            'bookings_details': []
        }
        
        for booking in bookings[:5]:  # Limit to first 5 for readability
            debug_info['bookings_details'].append({
                'pnr': booking.get('pnr_number'),
                'amount': booking.get('total_amount'),
                'route': f"{booking.get('departure_city')} → {booking.get('arrival_city')}",
                'seats': len(booking.get('seat_numbers', [])),
                'created_at': booking.get('created_at')
            })
        
        return jsonify(debug_info), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =========================================================================
# UNIFIED ENTITY MANAGEMENT
# =========================================================================
# Add to admin.py in the collection_map


# Add ticketer-specific handling in get_all_entities
@admin_bp.route('/<entity>', methods=['GET'])
@jwt_required()
def get_all_entities(entity):
    """Get all items for an entity (admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        collection_name = get_collection(entity)
        
        # Special handling for different entities
        if entity == 'driver':
            items = list(mongo.db[collection_name].find({'role': 'driver'}, {'password': 0}))
        elif entity == 'ticketer':
            items = list(mongo.db[collection_name].find({'role': 'ticketer'}, {'password': 0}))
        elif entity == 'payment':
            items = list(mongo.db[collection_name].find({}))
        elif entity == 'user':
            items = list(mongo.db[collection_name].find({}, {'password': 0}))
        else:
            items = list(mongo.db[collection_name].find({}))
        
        serialized_items = [serialize_doc(item) for item in items]
        
        # Return in the expected format
        response_data = {f'{entity}s': serialized_items}
        return jsonify(response_data), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =========================================================================
# CRUD OPERATIONS
# =========================================================================

def check_driver_conflict_admin(driver_name, departure_date, schedule_id=None):
    """Check if driver is already assigned to another schedule on the same day"""
    if not driver_name or not driver_name.strip():
        return None  # No driver assigned, no conflict
    
    try:
        # Parse the departure date to get the day
        if isinstance(departure_date, str):
            date_obj = datetime.strptime(departure_date.split('T')[0], '%Y-%m-%d')
        else:
            date_obj = departure_date
        
        # Get start and end of the day
        start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Build query to find schedules with same driver on same day
        query = {
            'driver_name': driver_name.strip(),
            'departure_date': {
                '$gte': start_of_day,
                '$lte': end_of_day
            },
            'status': {'$nin': ['cancelled', 'completed']}
        }
        
        # If updating, exclude the current schedule
        if schedule_id:
            query['_id'] = {'$ne': ObjectId(schedule_id)}
        
        # Check for conflicts
        conflicting_schedules = list(mongo.db.busschedules.find(query))
        
        if conflicting_schedules:
            conflict_details = []
            for schedule in conflicting_schedules:
                conflict_details.append({
                    'route': f"{schedule.get('origin_city', 'N/A')} → {schedule.get('destination_city', 'N/A')}",
                    'departure_time': schedule.get('departure_time', 'N/A'),
                    'bus_number': schedule.get('bus_number', 'N/A')
                })
            
            return {
                'has_conflict': True,
                'driver_name': driver_name,
                'date': date_obj.strftime('%Y-%m-%d'),
                'conflicts': conflict_details
            }
        
        return None  # No conflict
        
    except Exception as e:
        print(f"❌ Error checking driver conflict: {e}")
        return None


@admin_bp.route('/<entity>', methods=['POST'])
@jwt_required()
def create_entity(entity):
    """Create new item (admin only)"""
    if not is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        collection_name = get_collection(entity)
        
        # Special handling for schedules - check driver conflicts
        if entity == 'schedule':
            driver_name = data.get('driver_name', '').strip()
            departure_date = data.get('departure_date') or data.get('departureDate')
            
            if driver_name and departure_date:
                conflict = check_driver_conflict_admin(driver_name, departure_date)
                if conflict:
                    conflict_info = conflict['conflicts'][0]
                    return jsonify({
                        'error': f"Driver '{driver_name}' is already assigned to another schedule on {conflict['date']}",
                        'conflict_details': {
                            'driver': driver_name,
                            'date': conflict['date'],
                            'existing_schedule': {
                                'route': conflict_info['route'],
                                'departure_time': conflict_info['departure_time'],
                                'bus_number': conflict_info['bus_number']
                            }
                        }
                    }), 409
            
            # ✅ Look up driver_id from driver_name if provided
            if driver_name and not data.get('driver_id'):
                driver = mongo.db.users.find_one({
                    'role': 'driver',
                    '$or': [
                        {'full_name': driver_name},
                        {'name': driver_name}
                    ]
                })
                if driver:
                    data['driver_id'] = str(driver['_id'])
                    print(f"✅ Found driver_id {data['driver_id']} for driver {driver_name}")
                else:
                    print(f"⚠️ Driver not found: {driver_name}")
        
        # Add timestamps
        data['created_at'] = datetime.utcnow()
        data['updated_at'] = datetime.utcnow()
        
        # Special handling for drivers
        if entity == 'driver':
            data['role'] = 'driver'
        
        result = mongo.db[collection_name].insert_one(data)
        created_item = mongo.db[collection_name].find_one({'_id': result.inserted_id})
        
        return jsonify(serialize_doc(created_item)), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/<entity>/<item_id>', methods=['PUT'])
@jwt_required()
def update_entity(entity, item_id):
    """Update item (admin only)"""
    if not is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        collection_name = get_collection(entity)
        
        # Special handling for schedules - check driver conflicts
        if entity == 'schedule':
            item_id_obj = safe_object_id(item_id)
            existing_schedule = mongo.db[collection_name].find_one({'_id': item_id_obj})
            
            if existing_schedule:
                driver_name = data.get('driver_name', existing_schedule.get('driver_name', '')).strip()
                departure_date = data.get('departure_date') or data.get('departureDate') or existing_schedule.get('departure_date')
                
                if driver_name and departure_date:
                    conflict = check_driver_conflict_admin(driver_name, departure_date, item_id)
                    if conflict:
                        conflict_info = conflict['conflicts'][0]
                        return jsonify({
                            'error': f"Driver '{driver_name}' is already assigned to another schedule on {conflict['date']}",
                            'conflict_details': {
                                'driver': driver_name,
                                'date': conflict['date'],
                                'existing_schedule': {
                                    'route': conflict_info['route'],
                                    'departure_time': conflict_info['departure_time'],
                                    'bus_number': conflict_info['bus_number']
                                }
                            }
                        }), 409
        
        data['updated_at'] = datetime.utcnow()
        
        item_id_obj = safe_object_id(item_id)
        result = mongo.db[collection_name].update_one(
            {'_id': item_id_obj},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': f'{entity} not found'}), 404
        
        updated_item = mongo.db[collection_name].find_one({'_id': item_id_obj})
        return jsonify(serialize_doc(updated_item)), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/<entity>/<item_id>', methods=['DELETE'])
@jwt_required()
def delete_entity(entity, item_id):
    """Delete item (admin only)"""
    if not is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        collection_name = get_collection(entity)
        item_id_obj = safe_object_id(item_id)
        
        result = mongo.db[collection_name].delete_one({'_id': item_id_obj})
        
        if result.deleted_count == 0:
            return jsonify({'error': f'{entity} not found'}), 404
        
        return jsonify({'message': f'{entity} deleted successfully'}), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =========================================================================
# LEGACY ENDPOINTS FOR COMPATIBILITY
# =========================================================================

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users_legacy():
    return get_all_entities('user')

@admin_bp.route('/buses', methods=['GET'])
@jwt_required()
def get_all_buses_legacy():
    return get_all_entities('bus')

@admin_bp.route('/routes', methods=['GET'])
@jwt_required()
def get_all_routes_legacy():
    return get_all_entities('route')

@admin_bp.route('/schedules', methods=['GET'])
@jwt_required()
def get_all_schedules_legacy():
    """Get all schedules with enriched driver information"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        schedules = list(mongo.db.busschedules.find({}))
        
        # Enrich each schedule with driver information
        for schedule in schedules:
            driver_id = schedule.get('driver_id') or schedule.get('driverId')
            
            if driver_id:
                try:
                    # Try to fetch driver details
                    driver = mongo.db.users.find_one({'_id': ObjectId(driver_id)})
                    if driver:
                        schedule['driver_name'] = driver.get('full_name') or driver.get('name') or 'Unknown Driver'
                        schedule['driver_phone'] = driver.get('phone') or driver.get('phone_number')
                    elif not schedule.get('driver_name'):
                        # If driver not found and no driver_name, mark as not assigned
                        schedule['driver_name'] = 'Not assigned'
                        schedule['driver_phone'] = None
                except Exception as e:
                    print(f"Error fetching driver info for schedule {schedule.get('_id')}: {e}")
                    if not schedule.get('driver_name'):
                        schedule['driver_name'] = 'Not assigned'
                        schedule['driver_phone'] = None
            elif not schedule.get('driver_name'):
                # No driver_id and no driver_name
                schedule['driver_name'] = 'Not assigned'
                schedule['driver_phone'] = None
        
        serialized_schedules = [serialize_doc(schedule) for schedule in schedules]
        return jsonify({'schedules': serialized_schedules}), 200
        
    except Exception as e:
        print(f"Error in get_all_schedules_legacy: {e}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_all_bookings_legacy():
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        bookings = list(mongo.db.bookings.find({}))
        serialized_bookings = [serialize_doc(booking) for booking in bookings]
        
        return jsonify({'bookings': serialized_bookings}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/drivers', methods=['GET'])
@jwt_required()
def get_all_drivers_legacy():
    return get_all_entities('driver')

@admin_bp.route('/payments', methods=['GET'])
@jwt_required()
def get_all_payments_legacy():
    return get_all_entities('payment')

# =========================================================================
# EXPORT REPORTS
# =========================================================================

@admin_bp.route('/reports/export', methods=['POST'])
@jwt_required()
def export_reports():
    """Export REAL reports in CSV or PDF format"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        format_type = data.get('format', 'csv').lower()
        report_type = data.get('type', 'comprehensive')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        print(f"📊 Export request: format={format_type}, type={report_type}, dates={start_date} to {end_date}")
        
        if format_type == 'csv':
            # Generate CSV data
            csv_data = generate_comprehensive_csv(start_date, end_date)
            
            # Create response with CSV data
            response = make_response(csv_data)
            response.headers['Content-Type'] = 'text/csv; charset=utf-8'
            response.headers['Content-Disposition'] = f'attachment; filename=ethiobus_report_{datetime.utcnow().strftime("%Y%m%d")}.csv'
            
            return response
        elif format_type == 'pdf':
            return jsonify({'error': 'PDF export not yet implemented. Please use CSV format.'}), 400
        else:
            return jsonify({'error': f'Unsupported format: {format_type}'}), 400
        
    except Exception as e:
        print(f"❌ Export error: {e}")
        return jsonify({'error': str(e)}), 500

def generate_comprehensive_csv(start_date=None, end_date=None):
    """Generate comprehensive CSV report with all data"""
    try:
        # Build date filter
        date_filter = {}
        if start_date and end_date:
            date_filter = {
                'created_at': {
                    '$gte': datetime.strptime(start_date, '%Y-%m-%d'),
                    '$lte': datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                }
            }
        
        # Get data
        bookings = list(mongo.db.bookings.find(date_filter))
        payments = list(mongo.db.payments.find(date_filter))
        users = list(mongo.db.users.find({}))
        buses = list(mongo.db.buses.find({}))
        routes = list(mongo.db.routes.find({}))
        
        csv_lines = []
        
        # Header
        csv_lines.append('ETHIOBUS COMPREHENSIVE REPORT')
        csv_lines.append(f'Generated: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")}')
        if start_date and end_date:
            csv_lines.append(f'Period: {start_date} to {end_date}')
        csv_lines.append('')
        
        # Summary Statistics
        csv_lines.append('SUMMARY STATISTICS')
        csv_lines.append(f'Total Bookings,{len(bookings)}')
        csv_lines.append(f'Total Revenue,{sum(p.get("amount", 0) for p in payments if p.get("status") == "success")} ETB')
        csv_lines.append(f'Total Users,{len(users)}')
        csv_lines.append(f'Total Buses,{len(buses)}')
        csv_lines.append(f'Total Routes,{len(routes)}')
        csv_lines.append('')
        
        # Bookings Detail
        csv_lines.append('BOOKINGS DETAIL')
        csv_lines.append('PNR,Passenger,Phone,Email,Route,Date,Seats,Amount,Status,Payment')
        
        for booking in bookings:
            travel_date = booking.get('travel_date', '')
            if isinstance(travel_date, datetime):
                travel_date = travel_date.strftime('%Y-%m-%d')
            
            route = f"{booking.get('departure_city', '')} → {booking.get('arrival_city', '')}"
            seats = ', '.join(str(s) for s in booking.get('seat_numbers', [])) if isinstance(booking.get('seat_numbers'), list) else str(booking.get('seat_number', ''))
            
            row = [
                f'"{booking.get("pnr_number", "")}"',
                f'"{booking.get("passenger_name", "")}"',
                f'"{booking.get("passenger_phone", "")}"',
                f'"{booking.get("passenger_email", "")}"',
                f'"{route}"',
                f'"{travel_date}"',
                f'"{seats}"',
                str(booking.get('total_amount', 0)),
                f'"{booking.get("status", "")}"',
                f'"{booking.get("payment_status", "")}"'
            ]
            csv_lines.append(','.join(row))
        
        csv_lines.append('')
        
        # Revenue by Payment Method
        csv_lines.append('REVENUE BY PAYMENT METHOD')
        csv_lines.append('Method,Amount (ETB)')
        
        revenue_by_method = {}
        for payment in payments:
            if payment.get('status') == 'success':
                method = payment.get('payment_method', 'unknown')
                revenue_by_method[method] = revenue_by_method.get(method, 0) + payment.get('amount', 0)
        
        for method, amount in revenue_by_method.items():
            csv_lines.append(f'{method},{amount}')
        
        csv_lines.append('')
        
        # Bus Fleet Status
        csv_lines.append('BUS FLEET STATUS')
        csv_lines.append('Bus Number,Name,Type,Capacity,Status')
        
        for bus in buses:
            row = [
                f'"{bus.get("bus_number", "")}"',
                f'"{bus.get("bus_name", "")}"',
                f'"{bus.get("type", "")}"',
                str(bus.get('capacity', 0)),
                f'"{bus.get("status", "")}"'
            ]
            csv_lines.append(','.join(row))
        
        return '\n'.join(csv_lines)
        
    except Exception as e:
        print(f"❌ CSV generation error: {e}")
        return f"Error generating CSV: {str(e)}"

def generate_bookings_csv():
    """Generate CSV data from REAL bookings (legacy function)"""
    return generate_comprehensive_csv()
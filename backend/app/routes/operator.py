from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson import ObjectId
from app import mongo
import logging

operator_bp = Blueprint('operator', __name__)
logger = logging.getLogger(__name__)

# Utility Functions
def is_operator_or_admin():
    """Check if current user is operator, driver or admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') in ['operator', 'admin', 'driver']
    except Exception as e:
        logger.error(f"Role check error: {e}")
        return False

def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
    except Exception as e:
        logger.error(f"Admin check error: {e}")
        return False

def get_current_user_data():
    """Get current user data"""
    try:
        current_user_id = get_jwt_identity()
        return mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return None

def serialize_document(doc):
    """Serialize MongoDB document for JSON response"""
    if not doc:
        return None
    
    if isinstance(doc, list):
        return [serialize_document(item) for item in doc]
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, list):
            serialized[key] = [serialize_document(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            serialized[key] = serialize_document(value)
        else:
            serialized[key] = value
    return serialized

def validate_object_id(id_str):
    """Validate if string is a valid ObjectId"""
    try:
        return ObjectId(id_str)
    except:
        raise ValueError(f"Invalid ID format: {id_str}")

def calculate_date_range(timeframe):
    """Calculate date range based on timeframe - FOR PAST PERIODS BASED ON CREATED DATE"""
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    print(f"📅 Calculating range for: {timeframe}, Today: {today.date()}")
    
    if timeframe == 'week':
        # CURRENT WEEK: Monday to Sunday of current week
        start_date = today - timedelta(days=today.weekday())  # Monday
        end_date = start_date + timedelta(days=7)  # Next Monday
    elif timeframe == 'month':
        # CURRENT MONTH: 1st to last day of current month
        start_date = today.replace(day=1)  # 1st of month
        next_month = start_date.replace(day=28) + timedelta(days=4)  # Move to next month
        end_date = next_month.replace(day=1)  # 1st of next month
    else:  # today
        # TODAY ONLY
        start_date = today
        end_date = today + timedelta(days=1)
    
    print(f"📅 Date range: {start_date.date()} to {end_date.date()}")
    
    return start_date, end_date

def calculate_previous_period(start_date, end_date, timeframe):
    """Calculate the previous period for trend comparison"""
    period_length = (end_date - start_date).days
    
    if timeframe == 'week':
        # Previous week
        prev_end = start_date
        prev_start = prev_end - timedelta(days=7)
    elif timeframe == 'month':
        # Previous month
        prev_end = start_date
        prev_start = (prev_end - timedelta(days=1)).replace(day=1)
    else:  # today
        # Yesterday
        prev_end = start_date
        prev_start = prev_end - timedelta(days=1)
    
    return prev_start, prev_end

def calculate_trend(current_value, previous_value):
    """Calculate percentage change between current and previous values"""
    if previous_value == 0:
        return 100 if current_value > 0 else 0
    
    change = ((current_value - previous_value) / previous_value) * 100
    return round(change, 1)

# ==================== REVENUE ANALYSIS ====================
@operator_bp.route('/revenue/analysis', methods=['GET'])
@jwt_required()
def get_revenue_analysis():
    """Get detailed revenue analysis for different time periods based on booking creation date"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        timeframes = ['today', 'week', 'month']
        analysis = {}
        
        for timeframe in timeframes:
            start_date, end_date = calculate_date_range(timeframe)
            
            # Get bookings CREATED in this timeframe
            bookings = list(mongo.db.bookings.find({
                'created_at': {
                    '$gte': start_date,
                    '$lt': end_date
                }
            }))
            
            # Calculate metrics
            total_bookings_count = len(bookings)
            total_revenue = sum(b.get('total_amount', 0) for b in bookings)
            confirmed_revenue = sum(b.get('total_amount', 0) for b in bookings if b.get('status') != 'cancelled')
            cancelled_revenue = sum(b.get('total_amount', 0) for b in bookings if b.get('status') == 'cancelled')
            
            # Count bookings by status
            confirmed_bookings = len([b for b in bookings if b.get('status') in ['confirmed', 'pending']])
            checked_in_bookings = len([b for b in bookings if b.get('status') in ['checked_in', 'completed']])
            cancelled_bookings = len([b for b in bookings if b.get('status') == 'cancelled'])
            
            analysis[timeframe] = {
                'date_range': f"{start_date.strftime('%Y-%m-%d')} to {(end_date - timedelta(days=1)).strftime('%Y-%m-%d')}",
                'total_bookings': total_bookings_count,
                'total_revenue': total_revenue,
                'confirmed_revenue': confirmed_revenue,
                'cancelled_revenue': cancelled_revenue,
                'net_revenue': confirmed_revenue,
                'bookings_by_status': {
                    'confirmed': confirmed_bookings,
                    'checked_in': checked_in_bookings,
                    'cancelled': cancelled_bookings
                },
                'period_type': 'current'  # current week/month
            }
        
        return jsonify({
            'success': True,
            'revenue_analysis': analysis,
            'currency': 'ETB',
            'current_date': datetime.utcnow().strftime('%Y-%m-%d'),
            'calculation_basis': 'booking_creation_date'
        }), 200
        
    except Exception as e:
        logger.error(f"Revenue analysis error: {e}")
        return jsonify({'error': f'Failed to fetch revenue analysis: {str(e)}'}), 500


# ==================== CHECK-IN MANAGEMENT ====================
@operator_bp.route('/checkin/quick', methods=['POST'])
@jwt_required()
def quick_checkin():
    """Quick check-in by PNR number"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        pnr_number = data.get('pnr_number')
        
        print(f"🎫 Quick check-in attempt for PNR: {pnr_number}")
        
        if not pnr_number:
            return jsonify({'error': 'PNR number is required'}), 400
        
        # Find the booking
        booking = mongo.db.bookings.find_one({'pnr_number': pnr_number.upper()})
        
        if not booking:
            return jsonify({'error': 'Booking not found. Please check PNR number.'}), 404
        
        print(f"✅ Booking found: {booking.get('_id')}, Status: {booking.get('status')}")
        
        # Check current status
        current_status = booking.get('status')
        
        # Define valid status transitions
        valid_transitions = {
            'pending': 'checked_in',
            'confirmed': 'checked_in', 
            'checked_in': 'completed'
        }
        
        if current_status not in valid_transitions:
            return jsonify({
                'success': False,
                'error': f'Cannot check in booking with status: {current_status}',
                'current_status': current_status
            }), 400
        
        # Get next status
        new_status = valid_transitions[current_status]
        
        # Enhanced check-in time validation - only check if moving to checked_in
        check_in_warning = None
        hours_until_departure = None
        
        if new_status == 'checked_in':
            travel_date_str = booking.get('travel_date')
            departure_time_str = booking.get('departure_time')
            
            if travel_date_str and departure_time_str:
                try:
                    # Combine travel date and departure time
                    departure_datetime_str = f"{travel_date_str} {departure_time_str}"
                    departure_datetime = datetime.strptime(departure_datetime_str, '%Y-%m-%d %H:%M:%S')
                    current_datetime = datetime.now()
                    
                    # Calculate time difference
                    time_until_departure = departure_datetime - current_datetime
                    hours_until_departure = time_until_departure.total_seconds() / 3600
                    
                    print(f"⏰ Check-in timing: {hours_until_departure:.2f} hours until departure")
                    
                    # BLOCK: If departure has already passed
                    if hours_until_departure <= 0:
                        return jsonify({
                            'success': False,
                            'error': 'Cannot check in - Bus has already departed',
                            'message': 'This schedule has already departed',
                            'departure_time': departure_time_str,
                            'travel_date': travel_date_str,
                            'hours_until_departure': round(hours_until_departure, 2),
                            'blocked': True
                        }), 400
                    
                    # BLOCK: If departure is within 2 hours (too late to check in)
                    if hours_until_departure < 2:
                        return jsonify({
                            'success': False,
                            'error': 'Check-in closed - Departure within 2 hours',
                            'message': 'Check-in closes 2 hours before departure time',
                            'hours_until_departure': round(hours_until_departure, 2),
                            'departure_time': departure_time_str,
                            'travel_date': travel_date_str,
                            'blocked': True
                        }), 400
                    
                    # ALLOW with WARNING: If departure is more than 24 hours away (early check-in)
                    if hours_until_departure > 24:
                        check_in_warning = f'⚠️ Early check-in - Departure is in {round(hours_until_departure, 1)} hours. Passenger can check in now.'
                        print(f"ℹ️ {check_in_warning}")
                    
                    # ALLOW: Check-in is within optimal window (6-24 hours) - no warning needed
                    # ALLOW with WARNING: If departure is soon (2-6 hours)
                    elif hours_until_departure <= 6:
                        check_in_warning = f'⚠️ Departure is in {round(hours_until_departure, 1)} hours - Passenger should arrive soon!'
                        print(f"⚠️ {check_in_warning}")
                    
                except ValueError as ve:
                    print(f"⚠️ Invalid date/time format: {ve}")
                    # Continue with check-in if date parsing fails (backward compatibility)
            else:
                print(f"⚠️ Missing travel_date or departure_time - skipping time validation")
        
        # Update booking status
        current_time = datetime.now()
        update_data = {
            'status': new_status,
            'updated_at': current_time
        }
        
        if new_status == 'checked_in':
            update_data['checked_in_at'] = current_time
            update_data['checked_in_by'] = get_jwt_identity()
            if check_in_warning:
                update_data['check_in_warning'] = check_in_warning
            if hours_until_departure is not None:
                update_data['hours_until_departure'] = round(hours_until_departure, 2)
        elif new_status == 'completed':
            update_data['completed_at'] = current_time
        
        update_result = mongo.db.bookings.update_one(
            {'pnr_number': pnr_number.upper()},
            {'$set': update_data}
        )
        
        if update_result.modified_count == 0:
            return jsonify({'error': 'Failed to update booking status'}), 500
        
        # Get updated booking
        updated_booking = mongo.db.bookings.find_one({'pnr_number': pnr_number.upper()})
        
        print(f"✅ Status updated: {current_status} → {new_status}")
        
        # Prepare response
        response_data = {
            'success': True,
            'message': f'Booking status updated to {new_status} successfully!',
            'booking': serialize_document(updated_booking),
            'previous_status': current_status,
            'new_status': new_status
        }
        
        # Add warning if exists
        if check_in_warning:
            response_data['warning'] = check_in_warning
            response_data['hours_until_departure'] = round(hours_until_departure, 2)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Quick checkin error: {e}")
        return jsonify({'error': f'Quick check-in failed: {str(e)}'}), 500

@operator_bp.route('/bookings/<booking_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_booking(booking_id):
    """Cancel a booking - OPERATOR VERSION"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json() or {}
        reason = data.get('reason', 'Cancelled by operator')
        
        print(f"🛑 Cancelling booking: {booking_id}")
        
        booking_oid = validate_object_id(booking_id)
        booking = mongo.db.bookings.find_one({'_id': booking_oid})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        current_status = booking.get('status')
        print(f"📋 Current booking status: {current_status}")
        
        # Check if booking can be cancelled
        cancellable_statuses = ['pending', 'confirmed']
        if current_status not in cancellable_statuses:
            return jsonify({
                'success': False,
                'error': f'Cannot cancel booking with status: {current_status}',
                'current_status': current_status
            }), 400
        
        # Calculate refund - 60% refund policy
        total_amount = booking.get('total_amount', 0)
        refund_percentage = 0.60  # 60% refund
        refund_amount = round(total_amount * refund_percentage, 2)
        cancellation_fee = round(total_amount - refund_amount, 2)
        
        print(f"💰 Refund calculation:")
        print(f"   - Total Amount: ETB {total_amount}")
        print(f"   - Refund (60%): ETB {refund_amount}")
        print(f"   - Cancellation Fee (40%): ETB {cancellation_fee}")
        
        # Update booking status to cancelled
        current_time = datetime.now()
        update_result = mongo.db.bookings.update_one(
            {'_id': booking_oid},
            {
                '$set': {
                    'status': 'cancelled',
                    'cancellation_reason': reason,
                    'cancelled_at': current_time,
                    'cancelled_by': get_jwt_identity(),
                    'refund_amount': refund_amount,
                    'refund_percentage': refund_percentage * 100,
                    'cancellation_fee': cancellation_fee,
                    'refund_status': 'processed',
                    'refund_processed_at': current_time,
                    'refund_method': 'original_payment_method',
                    'updated_at': current_time
                }
            }
        )
        
        if update_result.modified_count == 0:
            return jsonify({'error': 'Failed to cancel booking'}), 500
        
        # Get updated booking
        updated_booking = mongo.db.bookings.find_one({'_id': booking_oid})
        
        print(f"✅ Booking cancelled successfully: {booking_id}")
        print(f"   - Refund Amount: ETB {refund_amount}")
        
        return jsonify({
            'success': True,
            'message': 'Booking cancelled successfully with 60% refund',
            'booking': serialize_document(updated_booking),
            'previous_status': current_status,
            'new_status': 'cancelled',
            'total_amount': total_amount,
            'refund_amount': refund_amount,
            'refund_percentage': 60,
            'cancellation_fee': cancellation_fee
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Cancel booking error: {e}")
        return jsonify({'error': f'Failed to cancel booking: {str(e)}'}), 500

@operator_bp.route('/checkin/pending', methods=['GET'])
@jwt_required()
def get_pending_checkins():
    """Get pending check-ins for UPCOMING TRAVEL DATES (next 7 days)"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_str = today.strftime('%Y-%m-%d')
        next_week = today + timedelta(days=7)
        next_week_str = next_week.strftime('%Y-%m-%d')
        
        print(f"🔍 Looking for pending checkins for travel dates: {today_str} to {next_week_str}")
        
        # Get bookings for the next 7 days
        pending_checkins = list(mongo.db.bookings.find({
            'travel_date': {
                '$gte': today_str,
                '$lte': next_week_str
            },
            'status': {'$in': ['confirmed', 'pending']},
            'check_in_status': {'$ne': 'checked_in'}  # Exclude already checked in
        }).sort([('travel_date', 1), ('departure_time', 1)]))
        
        print(f"✅ Found {len(pending_checkins)} pending checkins for next 7 days")
        
        formatted_checkins = []
        for checkin in pending_checkins:
            # Calculate check-in availability
            travel_date_str = checkin.get('travel_date', '')
            departure_time = checkin.get('departure_time', '')
            
            checkin_availability = 'available'
            checkin_message = '✓ Ready to check in'
            
            try:
                if travel_date_str and departure_time:
                    travel_datetime = datetime.strptime(f"{travel_date_str} {departure_time}", '%Y-%m-%d %H:%M')
                    now = datetime.now()
                    time_until_departure = travel_datetime - now
                    hours_until = time_until_departure.total_seconds() / 3600
                    
                    if hours_until > 24:
                        checkin_availability = 'too_early'
                        days = int(hours_until / 24)
                        remaining_hours = int(hours_until % 24)
                        checkin_message = f'Opens in {days}d {remaining_hours}h'
                    elif hours_until < 0:
                        checkin_availability = 'departed'
                        checkin_message = '⚠️ Bus has departed'
                    else:
                        checkin_message = f'Departs in {int(hours_until)}h {int((hours_until % 1) * 60)}m'
            except Exception as e:
                print(f"Error calculating check-in time: {e}")
            
            formatted_checkins.append({
                '_id': str(checkin['_id']),
                'booking_id': str(checkin['_id']),
                'pnr_number': checkin.get('pnr_number', ''),
                'passenger_name': checkin.get('passenger_name', ''),
                'passenger_phone': checkin.get('passenger_phone', ''),
                'seat_numbers': checkin.get('seat_numbers', []),
                'departure_city': checkin.get('departure_city', 'Unknown'),
                'arrival_city': checkin.get('arrival_city', 'Unknown'),
                'departure_time': departure_time,
                'travel_date': travel_date_str,
                'bus_number': checkin.get('bus_number', 'N/A'),
                'payment_status': checkin.get('payment_status', 'pending'),
                'status': checkin.get('status', 'confirmed'),
                'check_in_status': checkin.get('check_in_status', 'pending'),
                'checkin_availability': checkin_availability,
                'checkin_message': checkin_message,
                'has_baggage': checkin.get('has_baggage', False),
                'baggage_weight': checkin.get('baggage_weight', 0),
                'created_at': checkin.get('created_at', '').isoformat() if isinstance(checkin.get('created_at'), datetime) else ''
            })
        
        return jsonify({
            'success': True,
            'bookings': formatted_checkins,  # Changed from 'pending_checkins' to 'bookings' to match frontend
            'total': len(formatted_checkins),
            'date_range': {
                'start': today_str,
                'end': next_week_str
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Pending checkins error: {e}")
        return jsonify({'error': f'Failed to fetch pending check-ins: {str(e)}'}), 500

@operator_bp.route('/checkin/today', methods=['GET'])
@jwt_required()
def get_todays_checkins():
    """Get today's checked-in passengers"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        today_str = datetime.now().strftime('%Y-%m-%d')
        
        checkins = list(mongo.db.bookings.find({
            'travel_date': today_str,
            'status': {'$in': ['checked_in', 'completed']}
        }).sort('checked_in_at', -1))
        
        formatted_checkins = []
        for checkin in checkins:
            checkin_time = checkin.get('checked_in_at')
            if isinstance(checkin_time, datetime):
                checkin_time = checkin_time.isoformat()
            else:
                checkin_time = ''
                
            formatted_checkins.append({
                'id': str(checkin['_id']),
                'booking_id': str(checkin['_id']),
                'pnr_number': checkin.get('pnr_number', ''),
                'passenger_name': checkin.get('passenger_name', ''),
                'passenger_phone': checkin.get('passenger_phone', ''),
                'seat_number': ', '.join(checkin.get('seat_numbers', [])),
                'route': f"{checkin.get('departure_city', 'Unknown')} to {checkin.get('arrival_city', 'Unknown')}",
                'departure_time': checkin.get('departure_time', ''),
                'checkin_time': checkin_time,
                'has_baggage': checkin.get('has_baggage', False),
                'baggage_weight': checkin.get('baggage_weight', 0),
                'status': checkin.get('status', 'checked_in')
            })
        
        return jsonify({
            'success': True,
            'checkins': formatted_checkins,
            'total': len(formatted_checkins),
            'travel_date': today_str
        }), 200
        
    except Exception as e:
        logger.error(f"Today's checkins error: {e}")
        return jsonify({'error': f'Failed to fetch today\'s check-ins: {str(e)}'}), 500

# ==================== BOOKING MANAGEMENT ====================

@operator_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_bookings():
    """Get all bookings for operator with timeframe filtering based on created_at"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        # Get query parameters
        status = request.args.get('status', 'all')
        timeframe = request.args.get('timeframe')  # today, week, month
        schedule_id = request.args.get('schedule_id')
        
        # Build query
        query = {}
        if status != 'all':
            query['status'] = status
        
        # Handle timeframe filtering based on CREATED DATE
        if timeframe:
            start_date, end_date = calculate_date_range(timeframe)
            
            print(f"📅 Filtering bookings by CREATED timeframe: {timeframe} ({start_date.date()} to {end_date.date()})")
            
            query['created_at'] = {
                '$gte': start_date,
                '$lt': end_date
            }
        
        if schedule_id:
            query['schedule_id'] = schedule_id
        
        print(f"📋 Bookings query: {query}")
        bookings = list(mongo.db.bookings.find(query).sort('created_at', -1))
        print(f"📊 Found {len(bookings)} bookings")
        
        # Enhanced serialization with status information
        enhanced_bookings = []
        for booking in bookings:
            enhanced_booking = serialize_document(booking)
            enhanced_booking['can_check_in'] = booking.get('status') in ['pending', 'confirmed']
            enhanced_booking['can_cancel'] = booking.get('status') in ['pending', 'confirmed']
            enhanced_bookings.append(enhanced_booking)
        
        return jsonify({
            'success': True,
            'bookings': enhanced_bookings,
            'total': len(enhanced_bookings),
            'timeframe': timeframe,
            'query': query
        }), 200
        
    except Exception as e:
        logger.error(f"Get bookings error: {e}")
        return jsonify({'error': f'Failed to fetch bookings: {str(e)}'}), 500

@operator_bp.route('/bookings/lookup', methods=['GET'])
@jwt_required()
def lookup_booking():
    """Lookup booking by PNR or phone with enhanced info"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        search = request.args.get('search', '')
        search_type = request.args.get('type', 'pnr')
        
        if not search:
            return jsonify({'error': 'Search term is required'}), 400
        
        query = {}
        if search_type == 'pnr':
            query['pnr_number'] = search.upper()
        else:  # phone
            query['passenger_phone'] = search
        
        booking = mongo.db.bookings.find_one(query)
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Enhanced booking info with action permissions
        current_status = booking.get('status')
        
        formatted_booking = {
            'id': str(booking['_id']),
            'pnr_number': booking.get('pnr_number', ''),
            'passenger_name': booking.get('passenger_name', ''),
            'passenger_phone': booking.get('passenger_phone', ''),
            'passenger_email': booking.get('passenger_email', ''),
            'seat_numbers': booking.get('seat_numbers', []),
            'status': current_status,
            'route': f"{booking.get('departure_city', 'Unknown')} to {booking.get('arrival_city', 'Unknown')}",
            'departure_time': booking.get('departure_time', ''),
            'travel_date': booking.get('travel_date', ''),
            'has_baggage': booking.get('has_baggage', False),
            'baggage_weight': booking.get('baggage_weight', 0),
            'total_amount': booking.get('total_amount', 0),
            'payment_status': booking.get('payment_status', ''),
            'payment_method': booking.get('payment_method', ''),
            'created_at': booking.get('created_at', '').isoformat() if isinstance(booking.get('created_at'), datetime) else '',
            # Action permissions
            'can_check_in': current_status in ['pending', 'confirmed'],
            'can_cancel': current_status in ['pending', 'confirmed'],
            'next_checkin_status': 'checked_in' if current_status in ['pending', 'confirmed'] else 'completed' if current_status == 'checked_in' else None
        }
        
        return jsonify({
            'success': True,
            'booking': formatted_booking
        }), 200
        
    except Exception as e:
        logger.error(f"Booking lookup error: {e}")
        return jsonify({'error': f'Booking lookup failed: {str(e)}'}), 500

# ==================== DASHBOARD ENDPOINTS ====================

@operator_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_operator_dashboard_stats():
    """Get operator dashboard statistics - BASED ON CREATED DATE"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        timeframe = request.args.get('timeframe', 'today')
        
        print(f"📊 Dashboard stats for timeframe: {timeframe} - BASED ON CREATED DATE")
        
        # Calculate date range for CREATED DATE
        start_date, end_date = calculate_date_range(timeframe)
        
        print(f"📅 Date range for created_at: {start_date} to {end_date}")
        
        # Get bookings based on CREATED DATE (when they were booked)
        # Also include bookings without created_at field (legacy bookings)
        query = {
            '$or': [
                {
                    'created_at': {
                        '$gte': start_date,
                        '$lt': end_date
                    }
                },
                {
                    'created_at': {'$exists': False},
                    'travel_date': {
                        '$gte': start_date.strftime('%Y-%m-%d'),
                        '$lte': end_date.strftime('%Y-%m-%d')
                    }
                }
            ]
        }
        
        print(f"📋 Query: {query}")
        
        timeframe_bookings = list(mongo.db.bookings.find(query))
        
        print(f"📋 Found {len(timeframe_bookings)} bookings CREATED in timeframe {timeframe}")
        
        # Debug: Show all bookings in DB
        all_bookings = list(mongo.db.bookings.find({}))
        print(f"📊 Total bookings in database: {len(all_bookings)}")
        for b in all_bookings:
            print(f"   - PNR: {b.get('pnr_number')}, created_at: {b.get('created_at')}, travel_date: {b.get('travel_date')}")
        
        # Calculate stats - ALL bookings created in the timeframe
        period_checkins = len([b for b in timeframe_bookings if b.get('status') in ['checked_in', 'completed']])
        pending_checkins = len([b for b in timeframe_bookings if b.get('status') in ['confirmed', 'pending']])
        period_bookings_count = len(timeframe_bookings)
        
        # Calculate revenue - include ALL bookings created in the period
        period_revenue = sum(
            booking.get('total_amount', 0) 
            for booking in timeframe_bookings
            if booking.get('status') != 'cancelled'  # Only count non-cancelled bookings for revenue
        )
        
        # Count completed and cancelled trips created in the period
        completed_trips = len([b for b in timeframe_bookings if b.get('status') == 'completed'])
        cancelled_trips = len([b for b in timeframe_bookings if b.get('status') == 'cancelled'])
        
        print(f"📊 Detailed counts for {timeframe} (CREATED DATE):")
        print(f"   - Total bookings created: {period_bookings_count}")
        print(f"   - Checked in: {period_checkins}")
        print(f"   - Pending: {pending_checkins}")
        print(f"   - Completed: {completed_trips}")
        print(f"   - Cancelled: {cancelled_trips}")
        print(f"   - Revenue generated: {period_revenue}")
        
        # Get ALL schedules for occupancy calculation
        all_schedules = list(mongo.db.busschedules.find({}))
        
        print(f"🚌 Found {len(all_schedules)} total schedules")
        
        # Calculate overall occupancy rate (all time)
        total_seats = 0
        booked_seats = 0
        
        for schedule in all_schedules:
            schedule_id = str(schedule['_id'])
            schedule_seats = schedule.get('total_seats', 45)
            total_seats += schedule_seats
            
            # Count bookings for this schedule
            schedule_bookings = mongo.db.bookings.count_documents({
                'schedule_id': schedule_id,
                'status': {'$ne': 'cancelled'}
            })
            booked_seats += min(schedule_bookings, schedule_seats)
        
        occupancy_rate = round((booked_seats / total_seats * 100), 1) if total_seats > 0 else 0
        
        # Trip stats breakdown by status
        # Active Trips = Scheduled + Boarding + Departed + Active
        # On Route Trips = Departed + Active (subset of Active Trips)
        
        # Handle both string and datetime formats for departure_date
        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')
        
        schedule_date_filter = {
            '$or': [
                # String format (most common)
                {
                    'departure_date': {
                        '$gte': start_date_str,
                        '$lt': end_date_str
                    }
                },
                # Datetime format (legacy)
                {
                    'departure_date': {
                        '$gte': start_date,
                        '$lt': end_date
                    }
                }
            ]
        }
        
        print(f"🔍 Schedule date filter: {schedule_date_filter}")
        
        # Count trips by status
        scheduled_trips = mongo.db.busschedules.count_documents({
            **schedule_date_filter,
            'status': 'scheduled'
        })
        
        boarding_trips = mongo.db.busschedules.count_documents({
            **schedule_date_filter,
            'status': 'boarding'
        })
        
        departed_trips = mongo.db.busschedules.count_documents({
            **schedule_date_filter,
            'status': 'departed'
        })
        
        active_status_trips = mongo.db.busschedules.count_documents({
            **schedule_date_filter,
            'status': 'active'
        })
        
        # Calculate aggregated metrics
        # Active Trips = All operational trips (scheduled + boarding + departed + active)
        active_trips = scheduled_trips + boarding_trips + departed_trips + active_status_trips
        
        # On Route Trips = Only trips currently traveling (departed + active)
        on_route_trips = departed_trips + active_status_trips
        
        # Completed and cancelled trips in the period
        completed_trips_count = mongo.db.busschedules.count_documents({
            **schedule_date_filter,
            'status': 'completed'
        })
        
        cancelled_trips_count = mongo.db.busschedules.count_documents({
            **schedule_date_filter,
            'status': 'cancelled'
        })
        
        total_drivers = mongo.db.users.count_documents({'role': 'driver', 'is_active': True})
        
        # Check-in rate for the period
        total_period_bookings = period_checkins + pending_checkins
        checkin_rate = round((period_checkins / total_period_bookings * 100)) if total_period_bookings > 0 else 0
        
        # Calculate trends (compare with previous period)
        prev_start, prev_end = calculate_previous_period(start_date, end_date, timeframe)
        
        prev_active_trips = mongo.db.busschedules.count_documents({
            'departure_date': {'$gte': prev_start, '$lt': prev_end},
            'status': {'$in': ['scheduled', 'boarding', 'active', 'departed']}
        })
        
        prev_bookings = mongo.db.bookings.count_documents({
            'created_at': {'$gte': prev_start, '$lt': prev_end}
        })
        
        prev_revenue = sum(
            b.get('total_amount', 0) 
            for b in mongo.db.bookings.find({
                'created_at': {'$gte': prev_start, '$lt': prev_end},
                'status': {'$ne': 'cancelled'}
            })
        )
        
        # Calculate percentage changes
        active_trips_trend = calculate_trend(active_trips, prev_active_trips)
        bookings_trend = calculate_trend(period_bookings_count, prev_bookings)
        revenue_trend = calculate_trend(period_revenue, prev_revenue)
        occupancy_trend = 0  # Occupancy is overall, not period-specific
        
        print(f"📈 Final {timeframe.capitalize()} stats (CREATED DATE):")
        print(f"   - Active Trips: {active_trips} (Scheduled: {scheduled_trips}, Boarding: {boarding_trips}, On Route: {on_route_trips})")
        print(f"   - Bookings created: {period_bookings_count}")
        print(f"   - Checkins: {period_checkins}")
        print(f"   - Pending: {pending_checkins}")
        print(f"   - Revenue generated: {period_revenue}")
        print(f"   - Occupancy: {occupancy_rate}%")
        print(f"   - Completed: {completed_trips}")
        print(f"   - Cancelled: {cancelled_trips}")
        print(f"   - Trends: Active {active_trips_trend}%, Bookings {bookings_trend}%, Revenue {revenue_trend}%")
        
        return jsonify({
            'success': True,
            # Main metrics
            'activeTrips': active_trips,  # Total operational trips
            'totalDrivers': total_drivers,
            'periodBookings': period_bookings_count,
            'pendingCheckins': pending_checkins,
            'periodCheckins': period_checkins,
            'periodRevenue': period_revenue,
            'checkinRate': checkin_rate,
            'occupancyRate': occupancy_rate,
            
            # Trip breakdown by status
            'scheduledTrips': scheduled_trips,      # Awaiting departure
            'boardingTrips': boarding_trips,        # Loading passengers
            'onRouteTrips': on_route_trips,         # Departed + Active (traveling)
            'completedTrips': completed_trips_count,  # Finished trips
            'cancelledTrips': cancelled_trips_count,  # Cancelled trips
            
            # Trends (percentage change from previous period)
            'activeTripsTrend': active_trips_trend,
            'bookingsTrend': bookings_trend,
            'revenueTrend': revenue_trend,
            'occupancyTrend': occupancy_trend,
            
            # Metadata
            'currency': 'ETB',
            'timeframe': timeframe,
            'startDate': start_date.strftime('%Y-%m-%d'),
            'endDate': (end_date - timedelta(days=1)).strftime('%Y-%m-%d'),
            'period_type': 'current',
            'debug': {
                'total_bookings_in_db': mongo.db.bookings.count_documents({}),
                'timeframe_bookings_count': len(timeframe_bookings),
                'calculation_based_on': 'created_date',
                'trip_breakdown': {
                    'scheduled': scheduled_trips,
                    'boarding': boarding_trips,
                    'departed': departed_trips,
                    'active': active_status_trips,
                    'completed': completed_trips_count,
                    'cancelled': cancelled_trips_count
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        return jsonify({'error': f'Failed to fetch dashboard stats: {str(e)}'}), 500

@operator_bp.route('/dashboard/recent-trips', methods=['GET'])
@jwt_required()
def get_recent_trips():
    """Get recent trips for dashboard"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        limit = int(request.args.get('limit', 5))
        
        # Get recent schedules (upcoming and active)
        schedules = list(mongo.db.busschedules.find({
            'status': {'$in': ['scheduled', 'boarding', 'active', 'departed']}
        }).sort('departure_date', 1).limit(limit))
        
        trips = []
        for schedule in schedules:
            schedule_id = str(schedule['_id'])
            
            # Count bookings for this schedule
            booked_seats = mongo.db.bookings.count_documents({
                'schedule_id': schedule_id,
                'status': {'$ne': 'cancelled'}
            })
            
            total_seats = schedule.get('total_seats', 45)
            available_seats = max(0, total_seats - booked_seats)
            
            trips.append({
                'id': schedule_id,
                'route': schedule.get('route_name', f"{schedule.get('origin_city', 'Unknown')} - {schedule.get('destination_city', 'Unknown')}"),
                'departure_time': schedule.get('departure_time', 'N/A'),
                'bus': schedule.get('bus_number', 'Unknown'),
                'status': schedule.get('status', 'scheduled'),
                'booked_seats': booked_seats,
                'available_seats': available_seats,
                'total_seats': total_seats,
                'fare_birr': schedule.get('fare_birr', 0),
                'driver_name': schedule.get('driver_name', 'Not assigned')
            })
        
        return jsonify({
            'success': True,
            'trips': trips
        }), 200
        
    except Exception as e:
        logger.error(f"Recent trips error: {e}")
        return jsonify({'error': f'Failed to fetch recent trips: {str(e)}'}), 500

@operator_bp.route('/dashboard/alerts', methods=['GET'])
@jwt_required()
def get_dashboard_alerts():
    """Get system alerts for dashboard"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        severity = request.args.get('severity', 'all')
        alerts = []
        
        # Check for high occupancy routes
        schedules = list(mongo.db.busschedules.find({
            'status': {'$in': ['scheduled', 'boarding']}
        }))
        
        for schedule in schedules:
            schedule_id = str(schedule['_id'])
            total_seats = schedule.get('total_seats', 45)
            
            booked_seats = mongo.db.bookings.count_documents({
                'schedule_id': schedule_id,
                'status': {'$ne': 'cancelled'}
            })
            
            occupancy_rate = (booked_seats / total_seats * 100) if total_seats > 0 else 0
            
            # High occupancy alert (>90%)
            if occupancy_rate > 90:
                alerts.append({
                    'id': f"occupancy_{schedule_id}",
                    'title': 'High Occupancy Alert',
                    'description': f"Route {schedule.get('route_name', 'Unknown')} is {occupancy_rate:.0f}% full ({booked_seats}/{total_seats} seats)",
                    'severity': 'high',
                    'time': datetime.utcnow().isoformat()
                })
        
        # Check for pending check-ins
        today_str = datetime.now().strftime('%Y-%m-%d')
        pending_checkins_count = mongo.db.bookings.count_documents({
            'travel_date': today_str,
            'status': {'$in': ['confirmed', 'pending']}
        })
        
        if pending_checkins_count > 0:
            alerts.append({
                'id': 'pending_checkins',
                'title': 'Pending Check-ins',
                'description': f"{pending_checkins_count} passengers need to check in for today's trips",
                'severity': 'medium',
                'time': datetime.utcnow().isoformat()
            })
        
        # Filter by severity if specified
        if severity != 'all':
            alerts = [a for a in alerts if a['severity'] == severity]
        
        return jsonify({
            'success': True,
            'alerts': alerts
        }), 200
        
    except Exception as e:
        logger.error(f"Dashboard alerts error: {e}")
        return jsonify({'error': f'Failed to fetch alerts: {str(e)}'}), 500

@operator_bp.route('/dashboard/charts', methods=['GET'])
@jwt_required()
def get_dashboard_charts():
    """Get chart data for dashboard"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        timeframe = request.args.get('timeframe', 'week')
        
        # Calculate date range
        now = datetime.utcnow()
        
        if timeframe == 'week':
            # Last 7 days
            days = 7
            labels = []
            revenue_data = []
            occupancy_data = []
            
            for i in range(days):
                day_date = now - timedelta(days=days - 1 - i)
                day_start = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                # Revenue for this day
                day_bookings = list(mongo.db.bookings.find({
                    'created_at': {'$gte': day_start, '$lt': day_end},
                    'status': {'$ne': 'cancelled'}
                }))
                
                day_revenue = sum(b.get('total_amount', 0) for b in day_bookings)
                
                # Occupancy for this day
                day_schedules = list(mongo.db.busschedules.find({
                    'departure_date': {'$gte': day_start, '$lt': day_end}
                }))
                
                total_seats = sum(s.get('total_seats', 45) for s in day_schedules)
                booked_seats = 0
                
                for schedule in day_schedules:
                    schedule_id = str(schedule['_id'])
                    booked_seats += mongo.db.bookings.count_documents({
                        'schedule_id': schedule_id,
                        'status': {'$ne': 'cancelled'}
                    })
                
                day_occupancy = (booked_seats / total_seats * 100) if total_seats > 0 else 0
                
                labels.append(day_date.strftime('%a'))  # Mon, Tue, etc.
                revenue_data.append(day_revenue)
                occupancy_data.append(round(day_occupancy, 1))
        
        else:  # month
            # Last 30 days grouped by week
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
            revenue_data = [0, 0, 0, 0]
            occupancy_data = [0, 0, 0, 0]
            
            # Simplified monthly data - you can enhance this
            for i in range(4):
                week_start = now - timedelta(days=30 - (i * 7))
                week_end = week_start + timedelta(days=7)
                
                week_bookings = list(mongo.db.bookings.find({
                    'created_at': {'$gte': week_start, '$lt': week_end},
                    'status': {'$ne': 'cancelled'}
                }))
                
                revenue_data[i] = sum(b.get('total_amount', 0) for b in week_bookings)
                occupancy_data[i] = 70 + (i * 5)  # Placeholder
        
        # Booking sources (simplified)
        total_bookings = mongo.db.bookings.count_documents({'status': {'$ne': 'cancelled'}})
        
        return jsonify({
            'success': True,
            'revenue_trend': {
                'labels': labels,
                'data': revenue_data
            },
            'occupancy_rate': {
                'labels': labels,
                'data': occupancy_data
            },
            'booking_sources': {
                'labels': ['Website', 'Mobile App', 'Agent', 'Walk-in'],
                'data': [45, 35, 15, 5]  # Placeholder percentages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Dashboard charts error: {e}")
        return jsonify({'error': f'Failed to fetch chart data: {str(e)}'}), 500

# ==================== SCHEDULE MANAGEMENT ====================

@operator_bp.route('/schedules', methods=['GET'])
@jwt_required()
def get_schedules():
    """Get all schedules with filtering and timeframe support"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        status = request.args.get('status', 'all')
        date = request.args.get('date')
        timeframe = request.args.get('timeframe')  # today, week, month
        
        query = {}
        
        # Handle status filtering with 'active' as a special case
        if status != 'all':
            if status == 'active':
                # 'active' means all operational statuses
                query['status'] = {'$in': ['scheduled', 'boarding', 'departed', 'active']}
            else:
                # Specific status
                query['status'] = status
        
        # Handle timeframe filtering
        if timeframe:
            start_date, end_date = calculate_date_range(timeframe)
            
            print(f"📅 Filtering schedules by timeframe: {timeframe} ({start_date} to {end_date})")
            
            query['departure_date'] = {
                '$gte': start_date,
                '$lt': end_date
            }
        elif date:
            # Specific date filter (legacy support)
            try:
                search_date = datetime.strptime(date, '%Y-%m-%d')
                start_date = search_date.replace(hour=0, minute=0, second=0, microsecond=0)
                end_date = start_date + timedelta(days=1)
                query['departure_date'] = {'$gte': start_date, '$lt': end_date}
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        print(f"📋 Schedules query: {query}")
        schedules = list(mongo.db.busschedules.find(query).sort('departure_date', 1))
        print(f"📊 Found {len(schedules)} schedules")
        
        enriched_schedules = []
        for schedule in schedules:
            # Get route information
            route_name = schedule.get('route_name', '')
            if not route_name:
                # Fallback to route construction
                origin = schedule.get('origin_city', schedule.get('originCity', 'Unknown'))
                destination = schedule.get('destination_city', schedule.get('destinationCity', 'Unknown'))
                route_name = f"{origin} - {destination}"
            
            # Get bus capacity
            bus_capacity = schedule.get('total_seats', 45)
            bus_number = schedule.get('bus_number', schedule.get('busNumber', 'Unknown'))
            
            # Calculate booked seats
            schedule_id_str = str(schedule['_id'])
            bookings_count = mongo.db.bookings.count_documents({
                'schedule_id': schedule_id_str,
                'status': {'$ne': 'cancelled'}
            })
            
            available_seats = max(0, bus_capacity - bookings_count)
            
            # Use correct field names with fallbacks
            enriched_schedule = {
                '_id': str(schedule['_id']),
                'route_name': route_name,
                'bus_number': bus_number,
                'driver_name': schedule.get('driver_name', 'Not assigned'),
                'departure_date': schedule.get('departure_date', schedule.get('departure_date', '').strftime('%Y-%m-%d') if isinstance(schedule.get('departure_date'), datetime) else ''),
                'departure_time': schedule.get('departure_time', schedule.get('departureTime', '')),
                'arrival_time': schedule.get('arrivalTime', ''),
                'status': schedule.get('status', 'scheduled'),
                'available_seats': available_seats,
                'booked_seats': bookings_count,
                'total_seats': bus_capacity,
                'fare_birr': schedule.get('fare_birr', schedule.get('fareBirr', 0)),
                'origin_city': schedule.get('origin_city', schedule.get('originCity', '')),
                'destination_city': schedule.get('destination_city', schedule.get('destinationCity', ''))
            }
            
            # Ensure we have a proper route name
            if not enriched_schedule['route_name']:
                enriched_schedule['route_name'] = f"{enriched_schedule['origin_city']} → {enriched_schedule['destination_city']}"
            
            enriched_schedules.append(enriched_schedule)
        
        return jsonify({
            'success': True,
            'schedules': enriched_schedules,
            'total': len(enriched_schedules)
        }), 200
        
    except Exception as e:
        logger.error(f"Get schedules error: {e}")
        return jsonify({'error': f'Failed to fetch schedules: {str(e)}'}), 500

# ==================== ROUTES MANAGEMENT ====================

@operator_bp.route('/routes', methods=['GET'])
@jwt_required()
def get_routes():
    """Get all routes for operator"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        print("📋 Fetching all routes for operator")
        
        routes = list(mongo.db.routes.find({'status': {'$ne': 'inactive'}}))
        
        formatted_routes = []
        for route in routes:
            # Support both distance_km and distance field names
            distance = route.get('distance_km') or route.get('distance', 0)
            
            formatted_routes.append({
                '_id': str(route['_id']),
                'name': route.get('name', ''),
                'origin_city': route.get('originCity') or route.get('origin_city', ''),
                'destination_city': route.get('destinationCity') or route.get('destination_city', ''),
                'originCity': route.get('originCity') or route.get('origin_city', ''),
                'destinationCity': route.get('destinationCity') or route.get('destination_city', ''),
                'distance': distance,
                'distance_km': distance,
                'duration': route.get('estimated_duration_hours') or route.get('duration', 0),
                'fare': route.get('base_fare_birr') or route.get('fare', 0),
                'base_fare': route.get('base_fare_birr') or route.get('base_fare') or route.get('fare', 0),
                'status': route.get('status', 'active')
            })
        
        print(f"✅ Found {len(formatted_routes)} routes")
        
        return jsonify({
            'success': True,
            'routes': formatted_routes,
            'total': len(formatted_routes)
        }), 200
        
    except Exception as e:
        logger.error(f"Get routes error: {e}")
        return jsonify({'error': f'Failed to fetch routes: {str(e)}'}), 500


# ==================== BUSES MANAGEMENT ====================

@operator_bp.route('/buses', methods=['GET'])
@jwt_required()
def get_buses():
    """Get all buses for operator (only active buses, excluding maintenance and inactive)"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        print("📋 Fetching available buses for operator")
        
        # Get all buses first
        all_buses = list(mongo.db.buses.find({}))
        print(f"🔍 Total buses in database: {len(all_buses)}")
        
        formatted_buses = []
        for bus in all_buses:
            bus_status = (bus.get('status') or 'active').lower().strip()
            bus_number = bus.get('bus_number', 'Unknown')
            
            print(f"🚌 Bus {bus_number}: status = '{bus_status}'")
            
            # Skip buses that are not available for scheduling
            if bus_status in ['inactive', 'maintenance', 'under_maintenance', 'retired', 'out_of_service']:
                print(f"   ❌ Skipping bus {bus_number} - status: {bus_status}")
                continue
            
            print(f"   ✅ Including bus {bus_number}")
            
            formatted_buses.append({
                '_id': str(bus['_id']),
                'bus_number': bus.get('bus_number', ''),
                'bus_name': bus.get('bus_name', ''),
                'bus_type': bus.get('bus_type') or bus.get('type', 'Standard'),
                'type': bus.get('type') or bus.get('bus_type', 'Standard'),
                'capacity': bus.get('capacity', 45),
                'total_seats': bus.get('total_seats') or bus.get('capacity', 45),
                'plate_number': bus.get('plate_number', ''),
                'status': bus.get('status', 'active'),
                'manufacturer': bus.get('manufacturer', ''),
                'model': bus.get('model', ''),
                'year': bus.get('year', '')
            })
        
        print(f"✅ Found {len(formatted_buses)} available buses (excluding maintenance/inactive)")
        
        return jsonify({
            'success': True,
            'buses': formatted_buses,
            'total': len(formatted_buses)
        }), 200
        
    except Exception as e:
        logger.error(f"Get buses error: {e}")
        return jsonify({'error': f'Failed to fetch buses: {str(e)}'}), 500


# ==================== DRIVER MANAGEMENT ====================

@operator_bp.route('/drivers', methods=['GET'])
@jwt_required()
def get_drivers():
    """Get all drivers"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        drivers = list(mongo.db.users.find(
            {'role': 'driver', 'is_active': True},
            {'password': 0}
        ).sort('name', 1))
        
        serialized_drivers = []
        for driver in drivers:
            serialized_driver = serialize_document(driver)
            
            # Ensure name field exists
            if not serialized_driver.get('name'):
                first_name = driver.get('first_name', '')
                last_name = driver.get('last_name', '')
                serialized_driver['name'] = f"{first_name} {last_name}".strip()
            
            serialized_drivers.append(serialized_driver)
        
        return jsonify({
            'success': True,
            'drivers': serialized_drivers,
            'total': len(serialized_drivers)
        }), 200
        
    except Exception as e:
        logger.error(f"Get drivers error: {e}")
        return jsonify({'error': f'Failed to fetch drivers: {str(e)}'}), 500

# ==================== SYSTEM STATUS ====================

@operator_bp.route('/system/status', methods=['GET'])
@jwt_required()
def get_system_status():
    """Get system status"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        # Test database connection
        mongo.db.command('ping')
        
        # Get system metrics
        total_schedules = mongo.db.busschedules.count_documents({})
        active_schedules = mongo.db.busschedules.count_documents({'status': 'scheduled'})
        total_bookings = mongo.db.bookings.count_documents({})
        active_drivers = mongo.db.users.count_documents({'role': 'driver', 'is_active': True})
        active_buses = mongo.db.buses.count_documents({'status': 'active'})
        
        return jsonify({
            'status': 'healthy',
            'service': 'Operator API',
            'database': 'connected',
            'metrics': {
                'total_schedules': total_schedules,
                'active_schedules': active_schedules,
                'total_bookings': total_bookings,
                'active_drivers': active_drivers,
                'active_buses': active_buses
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"System status error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'Operator API',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

# ==================== SCHEDULE MANAGEMENT ENDPOINTS ====================

def check_driver_conflict(driver_name, departure_date, schedule_id=None):
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
            'status': {'$nin': ['cancelled', 'completed']}  # Exclude cancelled/completed schedules
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
                    'schedule_id': str(schedule.get('_id')),
                    'route': f"{schedule.get('origin_city', 'N/A')} → {schedule.get('destination_city', 'N/A')}",
                    'departure_time': schedule.get('departure_time', 'N/A'),
                    'bus_number': schedule.get('bus_number', 'N/A'),
                    'status': schedule.get('status', 'N/A')
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


@operator_bp.route('/schedules/driver-conflicts', methods=['GET'])
@jwt_required()
def get_driver_conflicts():
    """Get all existing driver conflicts in schedules"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        print("🔍 Checking for driver conflicts in schedules...")
        
        # Get all active schedules (not cancelled or completed)
        schedules = list(mongo.db.busschedules.find({
            'status': {'$nin': ['cancelled', 'completed']},
            'driver_name': {'$exists': True, '$ne': '', '$ne': None}
        }).sort('departure_date', 1))
        
        conflicts = []
        checked_combinations = set()
        
        for schedule in schedules:
            driver_name = schedule.get('driver_name', '').strip()
            departure_date = schedule.get('departure_date')
            schedule_id = str(schedule.get('_id'))
            
            if not driver_name or not departure_date:
                continue
            
            # Create a unique key for this driver-date combination
            date_str = departure_date.strftime('%Y-%m-%d') if isinstance(departure_date, datetime) else str(departure_date).split('T')[0]
            combo_key = f"{driver_name}_{date_str}"
            
            # Skip if we already checked this combination
            if combo_key in checked_combinations:
                continue
            
            checked_combinations.add(combo_key)
            
            # Check for conflicts
            conflict = check_driver_conflict(driver_name, departure_date, schedule_id)
            
            if conflict:
                # Add the current schedule to the conflict list
                conflict['conflicts'].insert(0, {
                    'schedule_id': schedule_id,
                    'route': f"{schedule.get('origin_city', 'N/A')} → {schedule.get('destination_city', 'N/A')}",
                    'departure_time': schedule.get('departure_time', 'N/A'),
                    'bus_number': schedule.get('bus_number', 'N/A'),
                    'status': schedule.get('status', 'N/A')
                })
                
                conflicts.append(conflict)
        
        print(f"✅ Found {len(conflicts)} driver conflicts")
        
        return jsonify({
            'success': True,
            'conflicts': conflicts,
            'total': len(conflicts)
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking driver conflicts: {e}")
        return jsonify({'error': f'Failed to check driver conflicts: {str(e)}'}), 500


@operator_bp.route('/schedules', methods=['POST'])
@jwt_required()
def create_schedule():
    """Create a new bus schedule"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        print(f"🆕 Creating schedule with data: {data}")
        
        # Validate required fields
        required_fields = ['route_name', 'origin_city', 'destination_city', 'bus_number', 
                          'departure_date', 'departure_time', 'fare_birr']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Parse departure date and time
        try:
            departure_date = datetime.strptime(data['departure_date'], '%Y-%m-%d')
            departure_datetime = departure_date.replace(
                hour=int(data['departure_time'].split(':')[0]),
                minute=int(data['departure_time'].split(':')[1])
            )
        except ValueError as e:
            return jsonify({'error': f'Invalid date/time format: {str(e)}'}), 400
        
        # Validate that departure date is not in the past
        now = datetime.now()
        if departure_datetime < now:
            return jsonify({
                'error': 'Cannot create schedule for past date/time',
                'departure_datetime': departure_datetime.strftime('%Y-%m-%d %H:%M'),
                'current_datetime': now.strftime('%Y-%m-%d %H:%M')
            }), 400
        
        # Check for driver conflicts
        driver_name = data.get('driver_name', '').strip()
        if driver_name:
            conflict = check_driver_conflict(driver_name, departure_datetime)
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
                }), 409  # 409 Conflict status code
        
        # VALIDATE FARE AGAINST MAXIMUM TARIFF (Real-world logic)
        bus_type = data.get('bus_type', 'Standard')
        fare_birr = float(data['fare_birr'])
        discount_reason = data.get('discount_reason', '')
        
        # Get maximum tariff rate for this bus type
        tariff_rate = mongo.db.tariff_rates.find_one({
            'bus_type': bus_type,
            'is_active': True
        })
        
        if tariff_rate:
            # Calculate maximum allowed fare based on route distance
            route_distance = data.get('route_distance', 0)
            if route_distance > 0:
                max_fare = max(
                    route_distance * tariff_rate['rate_per_km'],
                    tariff_rate['minimum_fare']
                )
                
                # BLOCK if fare exceeds maximum tariff
                if fare_birr > max_fare:
                    return jsonify({
                        'error': 'Fare exceeds maximum government-approved tariff',
                        'details': {
                            'your_fare': fare_birr,
                            'maximum_tariff': round(max_fare, 2),
                            'bus_type': bus_type,
                            'rate_per_km': tariff_rate['rate_per_km'],
                            'distance': route_distance,
                            'message': f'Maximum allowed fare for {bus_type} bus on {route_distance}km route is {round(max_fare, 2)} ETB'
                        }
                    }), 400
                
                # WARN if fare is significantly below tariff (>20% discount)
                discount_percentage = ((max_fare - fare_birr) / max_fare) * 100
                if discount_percentage > 20 and not discount_reason:
                    return jsonify({
                        'error': 'Large discount requires justification',
                        'details': {
                            'your_fare': fare_birr,
                            'maximum_tariff': round(max_fare, 2),
                            'discount_percentage': round(discount_percentage, 1),
                            'message': 'Discounts over 20% require a reason. Please provide discount_reason field.'
                        }
                    }), 400
        
        # Calculate arrival time (add 4 hours as default)
        arrival_datetime = departure_datetime + timedelta(hours=4)
        
        # Validate fare against tariff (if tariff system is active)
        fare_birr = float(data['fare_birr'])
        bus_type = data.get('bus_type', 'Standard')
        discount_reason = data.get('discount_reason', '')
        
        # Get current tariff rate for validation
        tariff_rate = mongo.db.tariff_rates.find_one({
            'bus_type': bus_type,
            'is_active': True,
            'effective_from': {'$lte': now},
            '$or': [
                {'effective_until': None},
                {'effective_until': {'$gte': now}}
            ]
        })
        
        # Calculate maximum allowed fare based on tariff
        if tariff_rate:
            # Get route distance for calculation
            route = mongo.db.routes.find_one({
                '$or': [
                    {'name': data['route_name']},
                    {
                        'origin_city': data['origin_city'],
                        'destination_city': data['destination_city']
                    }
                ]
            })
            
            if route:
                distance = route.get('distance_km') or route.get('distance', 0)
                if distance > 0:
                    rate_per_km = tariff_rate.get('rate_per_km', 2.5)
                    minimum_fare = tariff_rate.get('minimum_fare', 50)
                    max_tariff = max(round(distance * rate_per_km), minimum_fare)
                    
                    # Check if fare exceeds maximum tariff
                    if fare_birr > max_tariff:
                        return jsonify({
                            'error': f'Fare ({fare_birr} ETB) exceeds maximum allowed tariff ({max_tariff} ETB)',
                            'max_tariff': max_tariff,
                            'your_fare': fare_birr,
                            'message': 'Cannot charge more than government-regulated tariff'
                        }), 400
                    
                    # Warn if fare is significantly below tariff (>20% discount)
                    discount_percentage = ((max_tariff - fare_birr) / max_tariff) * 100
                    if discount_percentage > 20 and not discount_reason:
                        return jsonify({
                            'error': f'Fare is {discount_percentage:.1f}% below tariff. Please provide discount reason.',
                            'requires_discount_reason': True,
                            'max_tariff': max_tariff,
                            'your_fare': fare_birr,
                            'discount_percentage': round(discount_percentage, 1)
                        }), 400
        
        # Create schedule document
        # Look up driver_id from driver_name if provided
        driver_id = None
        driver_name = data.get('driver_name', '').strip()
        if driver_name:
            # Try to find the driver by name
            driver = mongo.db.users.find_one({
                'role': 'driver',
                '$or': [
                    {'full_name': driver_name},
                    {'name': driver_name}
                ]
            })
            if driver:
                driver_id = str(driver['_id'])
                print(f"✅ Found driver_id {driver_id} for driver {driver_name}")
            else:
                print(f"⚠️ Driver not found: {driver_name}")
        
        schedule_data = {
            # Route information
            'route_name': data['route_name'],
            'origin_city': data['origin_city'].strip(),
            'destination_city': data['destination_city'].strip(),
            'route_distance': data.get('route_distance', 0),
            
            # Bus information
            'bus_number': data['bus_number'],
            'bus_type': data.get('bus_type', 'Standard'),
            
            # Driver information
            'driver_name': driver_name,
            'driver_id': driver_id,  # ✅ Add driver_id field
            
            # Schedule timing
            'departure_date': departure_datetime,
            'departure_time': data['departure_time'],
            'arrival_time': arrival_datetime.strftime('%H:%M'),
            
            # Pricing and capacity
            'fareBirr': float(data['fare_birr']),
            'fare_birr': float(data['fare_birr']),
            'discount_reason': discount_reason,
            'total_seats': int(data.get('total_seats', 45)),
            'available_seats': int(data.get('total_seats', 45)),
            'booked_seats': 0,
            
            # Status and metadata
            'status': data.get('status', 'scheduled'),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        # Insert schedule
        result = mongo.db.busschedules.insert_one(schedule_data)
        schedule_id = str(result.inserted_id)
        
        print(f"✅ Schedule created successfully: {schedule_id}")
        
        # Return the exact same structure as get_schedules
        enriched_schedule = {
            '_id': schedule_id,
            'route_name': schedule_data['route_name'],
            'origin_city': schedule_data['origin_city'],
            'destination_city': schedule_data['destination_city'],
            'bus_number': schedule_data['bus_number'],
            'bus_type': schedule_data['bus_type'],
            'driver_name': schedule_data['driver_name'],
            'departure_date': schedule_data['departure_date'],
            'departure_time': schedule_data['departure_time'],
            'arrival_time': schedule_data['arrival_time'],
            'status': schedule_data['status'],
            'available_seats': schedule_data['available_seats'],
            'booked_seats': schedule_data['booked_seats'],
            'total_seats': schedule_data['total_seats'],
            'fare_birr': schedule_data['fare_birr']
        }
        
        return jsonify({
            'success': True,
            'message': 'Schedule created successfully',
            'schedule': enriched_schedule
        }), 201
        
    except Exception as e:
        logger.error(f"Create schedule error: {e}")
        return jsonify({'error': f'Failed to create schedule: {str(e)}'}), 500
    
@operator_bp.route('/schedules/<schedule_id>', methods=['PUT'])
@jwt_required()
def update_schedule(schedule_id):
    """Update a bus schedule"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        print(f"🔄 Updating schedule: {schedule_id} with data: {data}")
        
        schedule_oid = validate_object_id(schedule_id)
        
        # Check if schedule exists
        schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Prepare update data
        update_data = {
            'updated_at': datetime.now()
        }
        
        # Handle all possible field names (both formats)
        field_mappings = {
            'route_name': 'route_name',
            'origin_city': ['origin_city', 'originCity'],
            'destination_city': ['destination_city', 'destinationCity'],
            'bus_number': ['bus_number', 'busNumber'],
            'bus_type': ['bus_type', 'busType'],
            'driver_name': 'driver_name',
            'driver_id': 'driver_id',
            'fareBirr': ['fareBirr', 'fare_birr'],
            'fare_birr': ['fare_birr', 'fareBirr'],
            'total_seats': 'total_seats',
            'status': 'status',
            'duration': 'duration'
        }
        
        # Process each field
        for db_field, source_fields in field_mappings.items():
            if isinstance(source_fields, list):
                # Try multiple source field names
                for source_field in source_fields:
                    if source_field in data and data[source_field]:
                        update_data[db_field] = data[source_field]
                        # Also add the alternate format
                        for alt_field in source_fields:
                            if alt_field != db_field:
                                update_data[alt_field] = data[source_field]
                        break
            else:
                # Single field name
                if source_fields in data and data[source_fields]:
                    update_data[db_field] = data[source_fields]
        
        # Handle date and time updates
        departure_date_value = data.get('departure_date')
        departure_time_value = data.get('departure_time')
        
        if departure_date_value and departure_time_value:
            try:
                # Parse date
                if isinstance(departure_date_value, str):
                    departure_date = datetime.strptime(departure_date_value.split('T')[0], '%Y-%m-%d')
                else:
                    departure_date = departure_date_value
                
                # Parse time
                time_parts = departure_time_value.split(':')
                departure_datetime = departure_date.replace(
                    hour=int(time_parts[0]),
                    minute=int(time_parts[1]),
                    second=0,
                    microsecond=0
                )
                
                # Validate that departure date is not in the past
                now = datetime.now()
                if departure_datetime < now:
                    return jsonify({
                        'error': 'Cannot update schedule to past date/time',
                        'departure_datetime': departure_datetime.strftime('%Y-%m-%d %H:%M'),
                        'current_datetime': now.strftime('%Y-%m-%d %H:%M')
                    }), 400
                
                # Update both field formats
                update_data['departure_date'] = departure_datetime
                update_data['departure_date'] = departure_date_value.split('T')[0]
                update_data['departureTime'] = departure_time_value
                update_data['departure_time'] = departure_time_value
                
                # Handle arrival time
                arrival_time_value = data.get('arrival_time')
                if arrival_time_value:
                    update_data['arrival_time'] = arrival_time_value
                else:
                    # Calculate arrival time (add 4 hours as default)
                    arrival_datetime = departure_datetime + timedelta(hours=4)
                    arrival_time_str = arrival_datetime.strftime('%H:%M')
                    update_data['arrival_time'] = arrival_time_str
                    
            except (ValueError, IndexError) as e:
                print(f"⚠️ Date/time parsing error: {e}")
                return jsonify({'error': f'Invalid date/time format: {str(e)}'}), 400
        
        # Handle driver assignment
        if 'driver_id' in data:
            driver_id = data['driver_id']
            if driver_id:
                # Get driver name
                try:
                    driver = mongo.db.users.find_one({'_id': ObjectId(driver_id), 'role': 'driver'})
                    if driver:
                        update_data['driver_id'] = driver_id
                        update_data['driver_name'] = driver.get('name', '')
                    else:
                        print(f"⚠️ Driver not found: {driver_id}")
                except Exception as e:
                    print(f"⚠️ Error fetching driver: {e}")
            else:
                # Clear driver assignment
                update_data['driver_id'] = None
                update_data['driver_name'] = ''
        
        # Check for driver conflicts before updating
        driver_name_to_check = update_data.get('driver_name') or data.get('driver_name')
        departure_date_to_check = update_data.get('departure_date') or schedule.get('departure_date')
        
        if driver_name_to_check and driver_name_to_check.strip():
            conflict = check_driver_conflict(driver_name_to_check, departure_date_to_check, schedule_id)
            if conflict:
                conflict_info = conflict['conflicts'][0]
                return jsonify({
                    'error': f"Driver '{driver_name_to_check}' is already assigned to another schedule on {conflict['date']}",
                    'conflict_details': {
                        'driver': driver_name_to_check,
                        'date': conflict['date'],
                        'existing_schedule': {
                            'route': conflict_info['route'],
                            'departure_time': conflict_info['departure_time'],
                            'bus_number': conflict_info['bus_number']
                        }
                    }
                }), 409  # 409 Conflict status code
        
        print(f"📝 Update data: {update_data}")
        
        result = mongo.db.busschedules.update_one(
            {'_id': schedule_oid},
            {'$set': update_data}
        )
        
        print(f"✅ Update result - modified: {result.modified_count}")
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made to schedule'}), 400
        
        # Get updated schedule
        updated_schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        
        return jsonify({
            'success': True,
            'message': 'Schedule updated successfully',
            'schedule': serialize_document(updated_schedule)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Update schedule error: {e}")
        return jsonify({'error': f'Failed to update schedule: {str(e)}'}), 500

@operator_bp.route('/schedules/<schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(schedule_id):
    """Delete a bus schedule"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        print(f"🗑️ Deleting schedule: {schedule_id}")
        
        schedule_oid = validate_object_id(schedule_id)
        
        # Check if schedule exists
        schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Check if there are active bookings for this schedule
        bookings_count = mongo.db.bookings.count_documents({
            'schedule_id': schedule_id,
            'status': {'$nin': ['cancelled', 'completed']}
        })
        
        if bookings_count > 0:
            return jsonify({
                'error': f'Cannot delete schedule with {bookings_count} active booking(s). Cancel bookings first.'
            }), 400
        
        # Delete the schedule
        result = mongo.db.busschedules.delete_one({'_id': schedule_oid})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Failed to delete schedule'}), 500
        
        print(f"✅ Schedule deleted successfully: {schedule_id}")
        
        return jsonify({
            'success': True,
            'message': 'Schedule deleted successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Delete schedule error: {e}")
        return jsonify({'error': f'Failed to delete schedule: {str(e)}'}), 500

@operator_bp.route('/schedules/<schedule_id>/status', methods=['PUT'])
@jwt_required()
def update_schedule_status(schedule_id):
    """Update schedule status"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400
        
        valid_statuses = ['scheduled', 'boarding', 'active', 'departed', 'completed', 'cancelled', 'paused']
        if new_status not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
        
        schedule_oid = validate_object_id(schedule_id)
        
        # Check if schedule exists
        schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Update status
        result = mongo.db.busschedules.update_one(
            {'_id': schedule_oid},
            {'$set': {
                'status': new_status,
                'updated_at': datetime.now()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to update schedule status'}), 500
        
        # Get updated schedule
        updated_schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        
        return jsonify({
            'success': True,
            'message': f'Schedule status updated to {new_status}',
            'schedule': serialize_document(updated_schedule)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Update schedule status error: {e}")
        return jsonify({'error': f'Failed to update schedule status: {str(e)}'}), 500

@operator_bp.route('/schedules/<schedule_id>', methods=['GET'])
@jwt_required()
def get_schedule_details(schedule_id):
    """Get detailed information for a specific schedule"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        schedule_oid = validate_object_id(schedule_id)
        
        schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Get bookings for this schedule
        bookings = list(mongo.db.bookings.find({
            'schedule_id': schedule_id
        }).sort('created_at', -1))
        
        # Calculate booking statistics
        total_bookings = len(bookings)
        confirmed_bookings = len([b for b in bookings if b.get('status') in ['confirmed', 'checked_in']])
        cancelled_bookings = len([b for b in bookings if b.get('status') == 'cancelled'])
        
        # Calculate revenue
        revenue = sum(booking.get('total_amount', 0) for booking in bookings if booking.get('status') != 'cancelled')
        
        # Enrich schedule data
        enriched_schedule = serialize_document(schedule)
        enriched_schedule['booking_stats'] = {
            'total': total_bookings,
            'confirmed': confirmed_bookings,
            'cancelled': cancelled_bookings,
            'revenue': revenue
        }
        
        # Add recent bookings
        enriched_schedule['recent_bookings'] = []
        for booking in bookings[:10]:  # Last 10 bookings
            enriched_schedule['recent_bookings'].append({
                'id': str(booking['_id']),
                'pnr_number': booking.get('pnr_number', ''),
                'passenger_name': booking.get('passenger_name', ''),
                'status': booking.get('status', ''),
                'seat_numbers': booking.get('seat_numbers', []),
                'total_amount': booking.get('total_amount', 0),
                'created_at': booking.get('created_at', '').isoformat() if isinstance(booking.get('created_at'), datetime) else ''
            })
        
        return jsonify({
            'success': True,
            'schedule': enriched_schedule
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Get schedule details error: {e}")
        return jsonify({'error': f'Failed to fetch schedule details: {str(e)}'}), 500

@operator_bp.route('/schedules/<schedule_id>/pause', methods=['POST'])
@jwt_required()
def pause_schedule(schedule_id):
    """Pause a schedule"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        schedule_oid = validate_object_id(schedule_id)
        
        schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        if schedule.get('status') != 'active':
            return jsonify({'error': 'Only active schedules can be paused'}), 400
        
        result = mongo.db.busschedules.update_one(
            {'_id': schedule_oid},
            {'$set': {
                'status': 'paused',
                'updated_at': datetime.now()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to pause schedule'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Schedule paused successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Pause schedule error: {e}")
        return jsonify({'error': f'Failed to pause schedule: {str(e)}'}), 500

@operator_bp.route('/schedules/<schedule_id>/resume', methods=['POST'])
@jwt_required()
def resume_schedule(schedule_id):
    """Resume a paused schedule"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        schedule_oid = validate_object_id(schedule_id)
        
        schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        if schedule.get('status') != 'paused':
            return jsonify({'error': 'Only paused schedules can be resumed'}), 400
        
        result = mongo.db.busschedules.update_one(
            {'_id': schedule_oid},
            {'$set': {
                'status': 'scheduled',
                'updated_at': datetime.now()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to resume schedule'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Schedule resumed successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Resume schedule error: {e}")
        return jsonify({'error': f'Failed to resume schedule: {str(e)}'}), 500
@operator_bp.route('/drivers/<driver_id>', methods=['DELETE'])
@jwt_required()
def delete_driver(driver_id):
    """Delete a driver (soft delete)"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        driver_oid = validate_object_id(driver_id)
        
        # Check if driver exists
        driver = mongo.db.users.find_one({'_id': driver_oid, 'role': 'driver'})
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        # Check if driver has active assignments
        active_assignments = mongo.db.driver_assignments.count_documents({
            'driver_id': driver_id,
            'status': 'active'
        })
        
        if active_assignments > 0:
            return jsonify({
                'error': f'Cannot delete driver with {active_assignments} active assignment(s). Remove assignments first.'
            }), 400
        
        # Soft delete by setting is_active to False
        result = mongo.db.users.update_one(
            {'_id': driver_oid},
            {'$set': {
                'is_active': False,
                'updated_at': datetime.now()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to delete driver'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Driver deleted successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Delete driver error: {e}")
        return jsonify({'error': f'Failed to delete driver: {str(e)}'}), 500

@operator_bp.route('/drivers/<driver_id>/performance', methods=['GET'])
@jwt_required()
def get_driver_performance(driver_id):
    """Get driver performance metrics"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        driver_oid = validate_object_id(driver_id)
        
        # Check if driver exists
        driver = mongo.db.users.find_one({'_id': driver_oid, 'role': 'driver'})
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        # Get driver's completed assignments
        completed_assignments = list(mongo.db.driver_assignments.find({
            'driver_id': driver_id,
            'status': 'completed'
        }))
        
        # Calculate performance metrics
        total_trips = len(completed_assignments)
        experience_years = driver.get('experience_years', 0)
        
        # Calculate rating (simplified - in real app this would come from reviews)
        base_rating = 4.0
        if experience_years > 5:
            base_rating = 4.5
        elif experience_years > 10:
            base_rating = 4.8
        
        # Add some variation based on trips completed
        if total_trips > 50:
            base_rating = min(5.0, base_rating + 0.2)
        
        status = 'active' if driver.get('is_active', True) else 'inactive'
        
        return jsonify({
            'success': True,
            'performance': {
                'total_trips': total_trips,
                'rating': round(base_rating, 1),
                'experience_years': experience_years,
                'status': status,
                'last_active': driver.get('updated_at', '').isoformat() if isinstance(driver.get('updated_at'), datetime) else ''
            }
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Get driver performance error: {e}")
        return jsonify({'error': f'Failed to fetch driver performance: {str(e)}'}), 500

@operator_bp.route('/drivers/<driver_id>/status', methods=['PUT'])
@jwt_required()
def update_driver_status(driver_id):
    """Update driver active status"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        is_active = data.get('is_active')
        
        if is_active is None:
            return jsonify({'error': 'is_active field is required'}), 400
        
        driver_oid = validate_object_id(driver_id)
        
        # Check if driver exists
        driver = mongo.db.users.find_one({'_id': driver_oid, 'role': 'driver'})
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        result = mongo.db.users.update_one(
            {'_id': driver_oid},
            {'$set': {
                'is_active': is_active,
                'updated_at': datetime.now()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to update driver status'}), 500
        
        status_text = 'activated' if is_active else 'deactivated'
        
        return jsonify({
            'success': True,
            'message': f'Driver {status_text} successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Update driver status error: {e}")
        return jsonify({'error': f'Failed to update driver status: {str(e)}'}), 500
                
@operator_bp.route('/drivers', methods=['POST'])
@jwt_required()
def create_driver():
    """Create a new driver"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        print(f"🆕 Creating driver with data: {data}")
        
        # Validate required fields
        required_fields = ['name', 'email', 'phone', 'license_number']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if email already exists
        existing_user = mongo.db.users.find_one({'email': data['email']})
        if existing_user:
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create driver document
        driver_data = {
            'name': data['name'],
            'email': data['email'],
            'phone': data['phone'],
            'license_number': data['license_number'],
            'address': data.get('address', ''),
            'emergency_contact': data.get('emergency_contact', ''),
            'experience_years': data.get('experience_years', 0),
            'role': 'driver',
            'is_active': True,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        # Insert driver
        result = mongo.db.users.insert_one(driver_data)
        driver_data['_id'] = str(result.inserted_id)
        
        print(f"✅ Driver created successfully: {result.inserted_id}")
        
        return jsonify({
            'success': True,
            'message': 'Driver created successfully',
            'driver': serialize_document(driver_data)
        }), 201
        
    except Exception as e:
        logger.error(f"Create driver error: {e}")
        return jsonify({'error': f'Failed to create driver: {str(e)}'}), 500

@operator_bp.route('/drivers/<driver_id>', methods=['PUT'])
@jwt_required()
def update_driver(driver_id):
    """Update driver information"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        print(f"🔄 Updating driver: {driver_id} with data: {data}")
        
        driver_oid = validate_object_id(driver_id)
        
        # Check if driver exists
        driver = mongo.db.users.find_one({'_id': driver_oid, 'role': 'driver'})
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        # Prepare update data
        update_data = {
            'updated_at': datetime.now()
        }
        
        # Add allowed fields to update
        allowed_fields = ['name', 'email', 'phone', 'license_number', 'address', 
                         'emergency_contact', 'experience_years', 'is_active']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        print(f"📝 Update data: {update_data}")
        
        result = mongo.db.users.update_one(
            {'_id': driver_oid},
            {'$set': update_data}
        )
        
        print(f"✅ Update result - modified: {result.modified_count}")
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made to driver'}), 400
        
        # Get updated driver
        updated_driver = mongo.db.users.find_one({'_id': driver_oid})
        
        return jsonify({
            'success': True,
            'message': 'Driver updated successfully',
            'driver': serialize_document(updated_driver)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Update driver error: {e}")
        return jsonify({'error': f'Failed to update driver: {str(e)}'}), 500
       
@operator_bp.route('/drivers/<driver_id>/assignments', methods=['GET'])
@jwt_required()
def get_driver_assignments(driver_id):
    """Get driver assignments from driver_assignments collection"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        driver_oid = validate_object_id(driver_id)
        
        # Check if driver exists
        driver = mongo.db.users.find_one({'_id': driver_oid, 'role': 'driver'})
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        # Get assignments from driver_assignments collection
        assignments = list(mongo.db.driver_assignments.find(
            {'driver_id': driver_id}
        ).sort('assigned_date', -1))
        
        # Enrich assignments with schedule information
        enriched_assignments = []
        for assignment in assignments:
            enriched_assignment = serialize_document(assignment)
            
            # Get schedule details if schedule_id exists
            if assignment.get('schedule_id'):
                try:
                    schedule_oid = validate_object_id(assignment['schedule_id'])
                    schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
                    if schedule:
                        enriched_assignment['schedule_details'] = {
                            'route_name': f"{schedule.get('origin_city', 'Unknown')} - {schedule.get('destination_city', 'Unknown')}",
                            'departure_date': schedule.get('departure_date', '').strftime('%Y-%m-%d') if isinstance(schedule.get('departure_date'), datetime) else '',
                            'departure_time': schedule.get('departure_time', ''),
                            'bus_number': schedule.get('bus_number', 'Unknown'),
                            'status': schedule.get('status', 'scheduled')
                        }
                except:
                    # If schedule ID is invalid, skip enrichment
                    pass
            
            enriched_assignments.append(enriched_assignment)
        
        return jsonify({
            'success': True,
            'assignments': enriched_assignments,
            'total': len(enriched_assignments),
            'driver_id': driver_id,
            'driver_name': driver.get('name', '')
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Get driver assignments error: {e}")
        return jsonify({'error': f'Failed to fetch driver assignments: {str(e)}'}), 500

@operator_bp.route('/assign-driver', methods=['POST'])
@jwt_required()
def assign_driver_to_schedule():
    """Assign driver to schedule and store in driver_assignments collection"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        schedule_id = data.get('schedule_id')
        driver_id = data.get('driver_id')
        notes = data.get('notes', '')
        
        if not schedule_id or not driver_id:
            return jsonify({'error': 'Schedule ID and Driver ID are required'}), 400
        
        # Validate schedule exists
        schedule_oid = validate_object_id(schedule_id)
        schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Validate driver exists
        driver_oid = validate_object_id(driver_id)
        driver = mongo.db.users.find_one({'_id': driver_oid, 'role': 'driver'})
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        # Check if assignment already exists for this schedule
        existing_assignment = mongo.db.driver_assignments.find_one({
            'schedule_id': schedule_id,
            'status': 'active'
        })
        
        if existing_assignment:
            return jsonify({
                'error': 'This schedule is already assigned to another driver',
                'assigned_driver': existing_assignment.get('driver_name', 'Unknown')
            }), 400
        
        # Update schedule with driver assignment
        result = mongo.db.busschedules.update_one(
            {'_id': schedule_oid},
            {'$set': {
                'driver_id': driver_id,
                'driver_name': driver.get('name', ''),
                'assignment_notes': notes,
                'updated_at': datetime.now()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to assign driver to schedule'}), 500
        
        # Create assignment record in driver_assignments collection
        assignment_data = {
            'driver_id': driver_id,
            'driver_name': driver.get('name', ''),
            'schedule_id': schedule_id,
            'route_name': f"{schedule.get('origin_city', 'Unknown')} - {schedule.get('destination_city', 'Unknown')}",
            'bus_number': schedule.get('busNumber', 'Unknown'),
            'departure_date': schedule.get('departure_date'),
            'departure_time': schedule.get('departureTime', ''),
            'assigned_date': datetime.now(),
            'assigned_by': get_jwt_identity(),
            'notes': notes,
            'status': 'active'
        }
        
        # Insert into driver_assignments collection
        assignment_result = mongo.db.driver_assignments.insert_one(assignment_data)
        assignment_data['_id'] = str(assignment_result.inserted_id)
        
        return jsonify({
            'success': True,
            'message': 'Driver assigned to schedule successfully',
            'assignment': assignment_data
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Assign driver error: {e}")
        return jsonify({'error': f'Failed to assign driver: {str(e)}'}), 500

@operator_bp.route('/assignments/<assignment_id>', methods=['PUT'])
@jwt_required()
def update_assignment(assignment_id):
    """Update driver assignment"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        assignment_oid = validate_object_id(assignment_id)
        
        # Check if assignment exists
        assignment = mongo.db.driver_assignments.find_one({'_id': assignment_oid})
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Update assignment
        update_data = {
            **data,
            'updated_at': datetime.now()
        }
        
        result = mongo.db.driver_assignments.update_one(
            {'_id': assignment_oid},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made to assignment'}), 400
        
        # Get updated assignment
        updated_assignment = mongo.db.driver_assignments.find_one({'_id': assignment_oid})
        
        return jsonify({
            'success': True,
            'message': 'Assignment updated successfully',
            'assignment': serialize_document(updated_assignment)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Update assignment error: {e}")
        return jsonify({'error': f'Failed to update assignment: {str(e)}'}), 500

@operator_bp.route('/assignments/<assignment_id>', methods=['DELETE'])
@jwt_required()
def remove_assignment(assignment_id):
    """Remove driver assignment (soft delete)"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        assignment_oid = validate_object_id(assignment_id)
        
        # Check if assignment exists
        assignment = mongo.db.driver_assignments.find_one({'_id': assignment_oid})
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Get schedule ID to update the schedule
        schedule_id = assignment.get('schedule_id')
        
        # Remove driver from schedule
        if schedule_id:
            try:
                schedule_oid = validate_object_id(schedule_id)
                mongo.db.busschedules.update_one(
                    {'_id': schedule_oid},
                    {'$unset': {
                        'driver_id': "",
                        'driver_name': "",
                        'assignment_notes': ""
                    }}
                )
            except:
                logger.warning(f"Could not remove driver from schedule: {schedule_id}")
        
        # Soft delete assignment by setting status to cancelled
        result = mongo.db.driver_assignments.update_one(
            {'_id': assignment_oid},
            {'$set': {
                'status': 'cancelled',
                'cancelled_at': datetime.now(),
                'cancelled_by': get_jwt_identity()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to remove assignment'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Assignment removed successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Remove assignment error: {e}")
        return jsonify({'error': f'Failed to remove assignment: {str(e)}'}), 500

@operator_bp.route('/assignments', methods=['GET'])
@jwt_required()
def get_all_assignments():
    """Get all driver assignments with filtering"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        status = request.args.get('status', 'active')
        driver_id = request.args.get('driver_id')
        schedule_id = request.args.get('schedule_id')
        
        query = {}
        
        if status != 'all':
            query['status'] = status
        
        if driver_id:
            query['driver_id'] = driver_id
        
        if schedule_id:
            query['schedule_id'] = schedule_id
        
        assignments = list(mongo.db.driver_assignments.find(query).sort('assigned_date', -1))
        
        # Enrich assignments with additional data
        enriched_assignments = []
        for assignment in assignments:
            enriched_assignment = serialize_document(assignment)
            
            # Get driver details
            if assignment.get('driver_id'):
                try:
                    driver_oid = validate_object_id(assignment['driver_id'])
                    driver = mongo.db.users.find_one({'_id': driver_oid})
                    if driver:
                        enriched_assignment['driver_details'] = {
                            'name': driver.get('name', ''),
                            'phone': driver.get('phone', ''),
                            'license_number': driver.get('license_number', '')
                        }
                except:
                    pass
            
            # Get schedule details
            if assignment.get('schedule_id'):
                try:
                    schedule_oid = validate_object_id(assignment['schedule_id'])
                    schedule = mongo.db.busschedules.find_one({'_id': schedule_oid})
                    if schedule:
                        enriched_assignment['schedule_details'] = {
                            'route_name': f"{schedule.get('origin_city', 'Unknown')} - {schedule.get('destination_city', 'Unknown')}",
                            'departure_date': schedule.get('departure_date', '').strftime('%Y-%m-%d') if isinstance(schedule.get('departure_date'), datetime) else '',
                            'departure_time': schedule.get('departure_time', ''),
                            'bus_number': schedule.get('bus_number', 'Unknown'),
                            'status': schedule.get('status', 'scheduled')
                        }
                except:
                    pass
            
            enriched_assignments.append(enriched_assignment)
        
        return jsonify({
            'success': True,
            'assignments': enriched_assignments,
            'total': len(enriched_assignments)
        }), 200
        
    except Exception as e:
        logger.error(f"Get all assignments error: {e}")
        return jsonify({'error': f'Failed to fetch assignments: {str(e)}'}), 500


# ==================== CHECK-IN ENDPOINTS ====================

@operator_bp.route('/checkins/recent', methods=['GET'])
@jwt_required()
def get_recent_checkins():
    """Get recent check-ins (last 50)"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        # Get recent check-ins
        checkins = list(mongo.db.bookings.find({
            'check_in_status': 'checked_in',
            'checked_in_at': {'$exists': True}
        }).sort('checked_in_at', -1).limit(50))
        
        formatted_checkins = []
        for checkin in checkins:
            formatted_checkins.append({
                '_id': str(checkin['_id']),
                'pnr_number': checkin.get('pnr_number', ''),
                'passenger_name': checkin.get('passenger_name', ''),
                'passenger_phone': checkin.get('passenger_phone', ''),
                'departure_city': checkin.get('departure_city', ''),
                'arrival_city': checkin.get('arrival_city', ''),
                'seat_numbers': checkin.get('seat_numbers', []),
                'check_in_status': checkin.get('check_in_status', ''),
                'checked_in_at': checkin.get('checked_in_at').isoformat() if isinstance(checkin.get('checked_in_at'), datetime) else '',
                'id_verified': checkin.get('id_verified', '')
            })
        
        return jsonify({
            'success': True,
            'checkins': formatted_checkins
        }), 200
        
    except Exception as e:
        logger.error(f"Recent check-ins error: {e}")
        return jsonify({'error': f'Failed to fetch recent check-ins: {str(e)}'}), 500

@operator_bp.route('/checkins/pending', methods=['GET'])
@jwt_required()
def get_pending_checkins_list():
    """Get bookings pending check-in for today and tomorrow with time remaining info"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        now = datetime.now()
        today_str = now.strftime('%Y-%m-%d')
        tomorrow_str = (now + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Get bookings for today and tomorrow that haven't been checked in
        pending = list(mongo.db.bookings.find({
            'travel_date': {'$in': [today_str, tomorrow_str]},
            'payment_status': 'paid',
            '$or': [
                {'check_in_status': {'$exists': False}},
                {'check_in_status': 'pending'}
            ],
            'status': {'$in': ['confirmed', 'pending']}
        }).sort([('travel_date', 1), ('departure_time', 1)]))
        
        formatted_bookings = []
        for booking in pending:
            travel_date = booking.get('travel_date', '')
            departure_time = booking.get('departure_time', '00:00')
            
            # Calculate check-in window and time remaining
            try:
                travel_datetime = datetime.strptime(f"{travel_date} {departure_time}", '%Y-%m-%d %H:%M')
                checkin_opens_at = travel_datetime - timedelta(hours=24)
                
                # Calculate time until check-in opens (in minutes)
                time_until_checkin = (checkin_opens_at - now).total_seconds() / 60
                time_until_departure = (travel_datetime - now).total_seconds() / 60
                
                # Determine check-in status
                if time_until_checkin > 0:
                    checkin_status = 'too_early'
                    checkin_message = f'Opens in {int(time_until_checkin // 60)}h {int(time_until_checkin % 60)}m'
                elif time_until_departure > 0:
                    checkin_status = 'available'
                    checkin_message = f'Departs in {int(time_until_departure // 60)}h {int(time_until_departure % 60)}m'
                else:
                    checkin_status = 'departed'
                    checkin_message = 'Bus departed'
                    
            except Exception as e:
                print(f"Error calculating time: {e}")
                time_until_checkin = 0
                time_until_departure = 0
                checkin_status = 'unknown'
                checkin_message = 'Time unavailable'
            
            formatted_bookings.append({
                '_id': str(booking['_id']),
                'booking_id': str(booking['_id']),
                'pnr_number': booking.get('pnr_number', ''),
                'passenger_name': booking.get('passenger_name', ''),
                'passenger_phone': booking.get('passenger_phone', ''),
                'phone_number': booking.get('passenger_phone', ''),
                'departure_city': booking.get('departure_city', ''),
                'arrival_city': booking.get('arrival_city', ''),
                'origin': booking.get('departure_city', ''),
                'destination': booking.get('arrival_city', ''),
                'seat_numbers': booking.get('seat_numbers', []),
                'number_of_seats': len(booking.get('seat_numbers', [])),
                'departure_time': departure_time,
                'travel_date': travel_date,
                'status': booking.get('status', ''),
                'payment_status': booking.get('payment_status', ''),
                'check_in_status': booking.get('check_in_status', 'pending'),
                'total_amount': booking.get('total_amount', 0),
                'bus_number': booking.get('bus_number', 'N/A'),
                # Time remaining info
                'time_until_checkin_minutes': int(time_until_checkin),
                'time_until_departure_minutes': int(time_until_departure),
                'checkin_availability': checkin_status,
                'checkin_message': checkin_message,
                'can_checkin_now': checkin_status == 'available'
            })
        
        return jsonify({
            'success': True,
            'bookings': formatted_bookings,
            'total': len(formatted_bookings),
            'current_time': now.isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Pending check-ins error: {e}")
        return jsonify({'error': f'Failed to fetch pending check-ins: {str(e)}'}), 500

@operator_bp.route('/checkins/stats', methods=['GET'])
@jwt_required()
def get_checkin_stats():
    """Get check-in statistics for today and tomorrow with complete breakdown"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        now = datetime.now()
        today_str = now.strftime('%Y-%m-%d')
        tomorrow_str = (now + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Total bookings for today and tomorrow (all statuses)
        total = mongo.db.bookings.count_documents({
            'travel_date': {'$in': [today_str, tomorrow_str]}
        })
        
        # Checked in
        checked_in = mongo.db.bookings.count_documents({
            'travel_date': {'$in': [today_str, tomorrow_str]},
            'status': {'$in': ['checked_in', 'completed']}
        })
        
        # Pending check-in (paid and confirmed/pending status)
        pending = mongo.db.bookings.count_documents({
            'travel_date': {'$in': [today_str, tomorrow_str]},
            'payment_status': 'paid',
            '$or': [
                {'check_in_status': {'$exists': False}},
                {'check_in_status': 'pending'}
            ],
            'status': {'$in': ['confirmed', 'pending']}
        })
        
        # Cancelled bookings
        cancelled = mongo.db.bookings.count_documents({
            'travel_date': {'$in': [today_str, tomorrow_str]},
            'status': 'cancelled'
        })
        
        # Unpaid bookings
        unpaid = mongo.db.bookings.count_documents({
            'travel_date': {'$in': [today_str, tomorrow_str]},
            'payment_status': {'$ne': 'paid'},
            'status': {'$ne': 'cancelled'}
        })
        
        # Completed trips
        completed = mongo.db.bookings.count_documents({
            'travel_date': {'$in': [today_str, tomorrow_str]},
            'status': 'completed'
        })
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'checkedIn': checked_in,
                'pending': pending,
                'cancelled': cancelled,
                'unpaid': unpaid,
                'completed': completed
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Check-in stats error: {e}")
        return jsonify({'error': f'Failed to fetch check-in stats: {str(e)}'}), 500

@operator_bp.route('/bookings/search', methods=['GET'])
@jwt_required()
def search_booking():
    """Search for a booking by PNR, booking ID, phone, or email"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        pnr = request.args.get('pnr')
        booking_id = request.args.get('booking_id')
        phone = request.args.get('phone')
        email = request.args.get('email')
        
        query = {}
        
        if pnr:
            query['pnr_number'] = pnr.upper()
        elif booking_id:
            try:
                query['_id'] = validate_object_id(booking_id)
            except:
                return jsonify({'error': 'Invalid booking ID format'}), 400
        elif phone:
            query['passenger_phone'] = phone
        elif email:
            query['passenger_email'] = email
        else:
            return jsonify({'error': 'Please provide search criteria'}), 400
        
        booking = mongo.db.bookings.find_one(query)
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        formatted_booking = {
            '_id': str(booking['_id']),
            'booking_id': str(booking['_id']),
            'pnr_number': booking.get('pnr_number', ''),
            'passenger_name': booking.get('passenger_name', ''),
            'passenger_phone': booking.get('passenger_phone', ''),
            'passenger_email': booking.get('passenger_email', ''),
            'phone_number': booking.get('passenger_phone', ''),
            'departure_city': booking.get('departure_city', ''),
            'arrival_city': booking.get('arrival_city', ''),
            'origin': booking.get('departure_city', ''),
            'destination': booking.get('arrival_city', ''),
            'seat_numbers': booking.get('seat_numbers', []),
            'number_of_seats': len(booking.get('seat_numbers', [])),
            'departure_time': booking.get('departure_time', ''),
            'travel_date': booking.get('travel_date', ''),
            'bus_number': booking.get('bus_number', ''),
            'bus_plate_number': booking.get('bus_plate_number', ''),
            'total_amount': booking.get('total_amount', 0),
            'total_fare': booking.get('total_amount', 0),
            'status': booking.get('status', ''),
            'payment_status': booking.get('payment_status', ''),
            'check_in_status': booking.get('check_in_status', 'pending'),
            'created_at': booking.get('created_at').isoformat() if isinstance(booking.get('created_at'), datetime) else '',
            'booking_date': booking.get('created_at').isoformat() if isinstance(booking.get('created_at'), datetime) else '',
            'checked_in_at': booking.get('checked_in_at').isoformat() if isinstance(booking.get('checked_in_at'), datetime) else None
        }
        
        return jsonify({
            'success': True,
            'booking': formatted_booking
        }), 200
        
    except Exception as e:
        logger.error(f"Search booking error: {e}")
        return jsonify({'error': f'Failed to search booking: {str(e)}'}), 500

@operator_bp.route('/bookings/<booking_id>/checkin', methods=['POST'])
@jwt_required()
def checkin_booking(booking_id):
    """Check in a passenger"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json() or {}
        
        booking_oid = validate_object_id(booking_id)
        booking = mongo.db.bookings.find_one({'_id': booking_oid})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Validation
        if booking.get('status') == 'cancelled':
            return jsonify({'error': 'Cannot check in a cancelled booking'}), 400
        
        if booking.get('check_in_status') == 'checked_in':
            return jsonify({'error': 'Passenger already checked in'}), 400
        
        if booking.get('payment_status') != 'paid':
            return jsonify({'error': 'Payment must be completed before check-in'}), 400
        
        # Update booking
        current_time = datetime.now()
        update_data = {
            'check_in_status': 'checked_in',
            'checked_in_at': current_time,
            'checked_in_by': get_jwt_identity(),
            'updated_at': current_time
        }
        
        # Add optional fields
        if data.get('id_verified'):
            update_data['id_verified'] = data['id_verified']
        
        if data.get('operator_notes'):
            update_data['operator_notes'] = data['operator_notes']
        
        result = mongo.db.bookings.update_one(
            {'_id': booking_oid},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to check in passenger'}), 500
        
        # Get updated booking
        updated_booking = mongo.db.bookings.find_one({'_id': booking_oid})
        
        return jsonify({
            'success': True,
            'message': 'Passenger checked in successfully',
            'booking': serialize_document(updated_booking)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Check-in error: {e}")
        return jsonify({'error': f'Failed to check in passenger: {str(e)}'}), 500

@operator_bp.route('/notifications/checkin', methods=['POST'])
@jwt_required()
def send_checkin_notification():
    """Send check-in notification (placeholder for SMS/Email integration)"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        data = request.get_json()
        
        # Log notification request
        logger.info(f"Check-in notification requested for booking: {data.get('booking_id')}")
        logger.info(f"Phone: {data.get('passenger_phone')}, Email: {data.get('passenger_email')}")
        
        # TODO: Integrate with SMS/Email service
        # For now, just return success
        
        return jsonify({
            'success': True,
            'message': 'Notification sent successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Notification error: {e}")
        return jsonify({'error': f'Failed to send notification: {str(e)}'}), 500


# ==================== REAL-TIME BUS TRACKING ====================

@operator_bp.route('/tracking/updates', methods=['GET'])
@jwt_required()
def get_tracking_updates():
    """Get real-time tracking updates from drivers"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        today_str = datetime.now().strftime('%Y-%m-%d')
        
        # Get all tracking updates for today
        tracking_updates = list(mongo.db.bus_tracking.find({
            'date': today_str
        }).sort('timestamp', -1))
        
        # Get schedules for today
        schedules = list(mongo.db.busschedules.find({
            'departure_date': {'$gte': datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)}
        }))
        
        # Enrich tracking data with schedule info
        enriched_tracking = []
        for update in tracking_updates:
            schedule_id = update.get('schedule_id')
            if schedule_id:
                schedule = next((s for s in schedules if str(s['_id']) == schedule_id), None)
                if schedule:
                    enriched_update = serialize_document(update)
                    enriched_update['schedule_info'] = serialize_document(schedule)
                    enriched_tracking.append(enriched_update)
        
        return jsonify({
            'success': True,
            'tracking_updates': enriched_tracking,
            'total': len(enriched_tracking)
        }), 200
        
    except Exception as e:
        logger.error(f"Get tracking updates error: {e}")
        return jsonify({'error': f'Failed to fetch tracking updates: {str(e)}'}), 500

@operator_bp.route('/tracking/schedule/<schedule_id>', methods=['GET'])
@jwt_required()
def get_schedule_tracking(schedule_id):
    """Get tracking history for a specific schedule"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        # Get all tracking updates for this schedule
        tracking_updates = list(mongo.db.bus_tracking.find({
            'schedule_id': schedule_id
        }).sort('timestamp', 1))
        
        return jsonify({
            'success': True,
            'tracking_updates': serialize_document(tracking_updates),
            'total': len(tracking_updates)
        }), 200
        
    except Exception as e:
        logger.error(f"Get schedule tracking error: {e}")
        return jsonify({'error': f'Failed to fetch schedule tracking: {str(e)}'}), 500

@operator_bp.route('/tracking/live', methods=['GET'])
@jwt_required()
def get_live_tracking():
    """Get live tracking status of all active buses"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get today's schedules
        schedules = list(mongo.db.busschedules.find({
            'departure_date': {'$gte': today}
        }))
        
        live_tracking = []
        for schedule in schedules:
            schedule_id = str(schedule['_id'])
            
            # Get latest tracking update for this schedule
            latest_update = mongo.db.bus_tracking.find_one(
                {'schedule_id': schedule_id},
                sort=[('timestamp', -1)]
            )
            
            # Get passenger count
            passenger_count = mongo.db.bookings.count_documents({
                'schedule_id': schedule_id,
                'status': {'$in': ['confirmed', 'checked_in', 'completed']},
                'payment_status': 'paid'
            })
            
            tracking_info = {
                'schedule': serialize_document(schedule),
                'latest_update': serialize_document(latest_update) if latest_update else None,
                'passenger_count': passenger_count,
                'status': latest_update.get('status') if latest_update else 'scheduled',
                'last_checkpoint': latest_update.get('checkpoint') if latest_update else None,
                'last_update_time': latest_update.get('timestamp') if latest_update else None
            }
            
            live_tracking.append(tracking_info)
        
        return jsonify({
            'success': True,
            'live_tracking': live_tracking,
            'total': len(live_tracking)
        }), 200
        
    except Exception as e:
        logger.error(f"Get live tracking error: {e}")
        return jsonify({'error': f'Failed to fetch live tracking: {str(e)}'}), 500

# ==================== REPORTS & ANALYTICS ====================

@operator_bp.route('/reports', methods=['GET'])
@jwt_required()
def get_reports():
    """Get comprehensive reports and analytics"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Operator access required'}), 403
        
        period = request.args.get('period', 'today')
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        
        print(f"📊 Generating reports for period: {period}")
        
        # Calculate date range
        if period == 'custom' and start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)
        else:
            start_date, end_date = calculate_date_range(period)
        
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        tomorrow_end = tomorrow + timedelta(days=1)
        
        print(f"📅 Report date range: {start_date.date()} to {end_date.date()}")
        
        # Get today's bookings (by CREATED DATE - tickets sold today)
        # This shows bookings MADE today, regardless of travel date
        # Include ALL bookings (even cancelled) to show accurate sales data
        today_bookings = list(mongo.db.bookings.find({
            '$or': [
                {
                    'created_at': {
                        '$gte': today,
                        '$lt': tomorrow
                    }
                },
                {
                    'created_at': {'$exists': False},
                    'booked_at': {
                        '$gte': today,
                        '$lt': tomorrow
                    }
                }
            ]
        }))
        
        print(f"📊 Today's bookings (created {today.date()}): {len(today_bookings)}")
        if today_bookings:
            print(f"   Sample: PNR {today_bookings[0].get('pnr_number')}, Travel: {today_bookings[0].get('travel_date')}, Amount: {today_bookings[0].get('total_amount')}")
        
        # Get tomorrow's bookings (by CREATED DATE - tickets sold tomorrow)
        # Include ALL bookings (even cancelled) to show accurate sales data
        tomorrow_bookings = list(mongo.db.bookings.find({
            '$or': [
                {
                    'created_at': {
                        '$gte': tomorrow,
                        '$lt': tomorrow_end
                    }
                },
                {
                    'created_at': {'$exists': False},
                    'booked_at': {
                        '$gte': tomorrow,
                        '$lt': tomorrow_end
                    }
                }
            ]
        }))
        
        # Format today's bookings
        formatted_today_bookings = []
        for booking in today_bookings:
            # Get schedule info - handle both string and ObjectId
            schedule = None
            schedule_id = booking.get('schedule_id')
            if schedule_id:
                try:
                    if isinstance(schedule_id, str):
                        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
                    else:
                        schedule = mongo.db.busschedules.find_one({'_id': schedule_id})
                except Exception as e:
                    print(f"⚠️ Failed to fetch schedule for booking {booking.get('_id')}: {e}")
            
            # Get bus number from schedule or booking
            bus_number = booking.get('bus_number', 'N/A')
            if schedule:
                bus_number = schedule.get('bus_number', bus_number)
            
            formatted_today_bookings.append({
                'id': str(booking['_id']),
                'busNumber': bus_number,
                'routeName': f"{booking.get('departure_city', 'Unknown')} - {booking.get('arrival_city', 'Unknown')}",
                'origin': booking.get('departure_city', 'Unknown'),
                'destination': booking.get('arrival_city', 'Unknown'),
                'departureTime': booking.get('departure_time', 'N/A'),
                'passengerName': booking.get('passenger_name', 'Unknown'),
                'phoneNumber': booking.get('passenger_phone', 'N/A'),
                'seatsBooked': len(booking.get('seat_numbers', [])),
                'seatNumbers': booking.get('seat_numbers', []),
                'totalPrice': booking.get('total_amount', 0),
                'bookingTime': booking.get('created_at').isoformat() if booking.get('created_at') else '',
                'status': booking.get('status', 'confirmed')
            })
        
        # Format tomorrow's bookings
        formatted_tomorrow_bookings = []
        for booking in tomorrow_bookings:
            # Get schedule info - handle both string and ObjectId
            schedule = None
            schedule_id = booking.get('schedule_id')
            if schedule_id:
                try:
                    if isinstance(schedule_id, str):
                        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
                    else:
                        schedule = mongo.db.busschedules.find_one({'_id': schedule_id})
                except Exception as e:
                    print(f"⚠️ Failed to fetch schedule for booking {booking.get('_id')}: {e}")
            
            # Get bus number from schedule or booking
            bus_number = booking.get('bus_number', 'N/A')
            if schedule:
                bus_number = schedule.get('bus_number', bus_number)
            
            formatted_tomorrow_bookings.append({
                'id': str(booking['_id']),
                'busNumber': bus_number,
                'routeName': f"{booking.get('departure_city', 'Unknown')} - {booking.get('arrival_city', 'Unknown')}",
                'origin': booking.get('departure_city', 'Unknown'),
                'destination': booking.get('arrival_city', 'Unknown'),
                'departureTime': booking.get('departure_time', 'N/A'),
                'passengerName': booking.get('passenger_name', 'Unknown'),
                'phoneNumber': booking.get('passenger_phone', 'N/A'),
                'seatsBooked': len(booking.get('seat_numbers', [])),
                'seatNumbers': booking.get('seat_numbers', []),
                'totalPrice': booking.get('total_amount', 0),
                'bookingTime': booking.get('created_at').isoformat() if booking.get('created_at') else '',
                'status': booking.get('status', 'confirmed')
            })
        
        # Calculate today's revenue (EARNED TODAY from bookings made today)
        # For non-cancelled bookings: full amount
        # For cancelled bookings: cancellation fee (40%)
        today_revenue = 0
        for b in today_bookings:
            if b.get('status') == 'cancelled':
                # Add cancellation fee (40% of total)
                today_revenue += b.get('cancellation_fee', 0)
            else:
                # Add full amount for non-cancelled bookings
                today_revenue += b.get('total_amount', 0)
        
        # Passenger count excludes cancelled bookings
        today_passenger_count = sum(len(b.get('seat_numbers', [])) for b in today_bookings if b.get('status') != 'cancelled')
        
        print(f"💰 Today's revenue (earned today): ETB {today_revenue}")
        print(f"👥 Today's passengers (non-cancelled): {today_passenger_count}")
        
        # Get weekly stats
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=7)
        
        # Get ALL weekly bookings (including cancelled)
        weekly_bookings = list(mongo.db.bookings.find({
            'created_at': {'$gte': week_start, '$lt': week_end}
        }))
        
        # Calculate weekly revenue (full amount + cancellation fees)
        weekly_revenue = 0
        for b in weekly_bookings:
            if b.get('status') == 'cancelled':
                weekly_revenue += b.get('cancellation_fee', 0)
            else:
                weekly_revenue += b.get('total_amount', 0)
        
        # Passenger count excludes cancelled bookings
        weekly_passengers = sum(len(b.get('seat_numbers', [])) for b in weekly_bookings if b.get('status') != 'cancelled')
        
        # Calculate average occupancy
        total_schedules = mongo.db.busschedules.count_documents({})
        total_capacity = total_schedules * 45  # Assuming 45 seats per bus
        total_booked = mongo.db.bookings.count_documents({'status': {'$ne': 'cancelled'}})
        avg_occupancy = round((total_booked / total_capacity * 100)) if total_capacity > 0 else 0
        
        # Generate booking trends (last 7 days)
        booking_trends = []
        for i in range(7):
            day = today - timedelta(days=6-i)
            day_end = day + timedelta(days=1)
            
            # Get ALL bookings for the day (including cancelled)
            day_bookings = list(mongo.db.bookings.find({
                'created_at': {'$gte': day, '$lt': day_end}
            }))
            
            # Calculate revenue (full amount + cancellation fees)
            day_revenue = 0
            for b in day_bookings:
                if b.get('status') == 'cancelled':
                    day_revenue += b.get('cancellation_fee', 0)
                else:
                    day_revenue += b.get('total_amount', 0)
            
            booking_trends.append({
                'date': day.strftime('%a'),
                'bookings': len(day_bookings),
                'revenue': day_revenue
            })
        
        # Route performance - try multiple approaches
        route_performance = []
        
        # First try: Group by departure_city and arrival_city
        routes_pipeline = [
            {'$match': {
                'status': {'$ne': 'cancelled'},
                'departure_city': {'$exists': True, '$ne': None, '$ne': ''},
                'arrival_city': {'$exists': True, '$ne': None, '$ne': ''}
            }},
            {'$group': {
                '_id': {
                    'departure': '$departure_city',
                    'arrival': '$arrival_city'
                },
                'bookings': {'$sum': 1},
                'revenue': {'$sum': '$total_amount'}
            }},
            {'$sort': {'bookings': -1}},
            {'$limit': 10}
        ]
        
        try:
            for route in mongo.db.bookings.aggregate(routes_pipeline):
                if route['_id']['departure'] and route['_id']['arrival']:
                    route_name = f"{route['_id']['departure']} - {route['_id']['arrival']}"
                    route_performance.append({
                        'routeName': route_name,
                        'bookings': route['bookings'],
                        'revenue': route['revenue'],
                        'occupancyRate': round((route['bookings'] / 45) * 100) if route['bookings'] > 0 else 0
                    })
        except Exception as e:
            print(f"⚠️ Route aggregation error: {e}")
        
        # If no routes found, try alternative: use routeName field directly
        if len(route_performance) == 0:
            print("📊 Trying alternative route grouping by routeName field...")
            alt_pipeline = [
                {'$match': {
                    'status': {'$ne': 'cancelled'},
                    'routeName': {'$exists': True, '$ne': None, '$ne': ''}
                }},
                {'$group': {
                    '_id': '$routeName',
                    'bookings': {'$sum': 1},
                    'revenue': {'$sum': '$total_amount'}
                }},
                {'$sort': {'bookings': -1}},
                {'$limit': 10}
            ]
            
            try:
                for route in mongo.db.bookings.aggregate(alt_pipeline):
                    route_performance.append({
                        'routeName': route['_id'],
                        'bookings': route['bookings'],
                        'revenue': route['revenue'],
                        'occupancyRate': round((route['bookings'] / 45) * 100) if route['bookings'] > 0 else 0
                    })
            except Exception as e:
                print(f"⚠️ Alternative route aggregation error: {e}")
        
        print(f"📊 Route performance: {len(route_performance)} routes found")
        
        # Bus performance - aggregate by bus number from bookings
        bus_performance_pipeline = [
            {'$match': {'status': {'$ne': 'cancelled'}}},
            {'$group': {
                '_id': '$bus_number',
                'totalTrips': {'$sum': 1},
                'bookings': {'$sum': 1},
                'revenue': {'$sum': '$total_amount'},
                'totalSeats': {'$sum': {'$size': '$seat_numbers'}},
                'bus_name': {'$first': '$bus_name'}  # Get bus name from bookings
            }},
            {'$match': {'_id': {'$ne': None, '$ne': 'N/A', '$exists': True}}},
            {'$sort': {'revenue': -1}},
            {'$limit': 10}
        ]
        
        bus_stats = list(mongo.db.bookings.aggregate(bus_performance_pipeline))
        
        bus_performance = []
        for stat in bus_stats:
            bus_number = stat.get('_id', 'Unknown')
            bus_name = stat.get('bus_name')
            
            # If bus_name not in bookings, try to fetch from buses collection
            if not bus_name:
                bus_doc = mongo.db.buses.find_one({'bus_number': bus_number})
                if bus_doc:
                    bus_name = bus_doc.get('bus_name') or bus_doc.get('name')
            
            # Fallback to bus number if no name found
            if not bus_name:
                bus_name = f"Bus {bus_number}"
            
            total_bookings = stat.get('bookings', 0)
            total_seats = stat.get('totalSeats', 0)
            
            # Calculate occupancy based on actual seats booked vs capacity
            # Assuming each trip has 45 seats
            total_trips = stat.get('totalTrips', 0)
            total_capacity = total_trips * 45
            avg_occupancy = round((total_seats / total_capacity * 100)) if total_capacity > 0 else 0
            
            bus_performance.append({
                'busNumber': bus_number,
                'busName': bus_name,  # Add bus name
                'totalTrips': total_trips,
                'bookings': total_bookings,
                'revenue': stat.get('revenue', 0),
                'avgOccupancy': avg_occupancy
            })
        
        # Calculate cancellation rate for the period
        total_bookings_in_period = mongo.db.bookings.count_documents({
            'created_at': {'$gte': start_date, '$lt': end_date}
        })
        cancelled_bookings_in_period = mongo.db.bookings.count_documents({
            'created_at': {'$gte': start_date, '$lt': end_date},
            'status': 'cancelled'
        })
        cancellation_rate = round((cancelled_bookings_in_period / total_bookings_in_period * 100), 1) if total_bookings_in_period > 0 else 0
        
        # Get most popular route (most bookings) - already sorted by bookings
        most_popular_route = None
        if route_performance and len(route_performance) > 0:
            top_route = route_performance[0]
            most_popular_route = {
                'routeName': top_route['routeName'],
                'bookings': top_route['bookings'],
                'revenue': top_route['revenue']
            }
            print(f"🏆 Most popular route: {most_popular_route['routeName']} with {most_popular_route['bookings']} bookings")
        else:
            print(f"⚠️ No route performance data available")
        
        print(f"✅ Report generated successfully")
        print(f"   - Today's bookings (SOLD today): {len(formatted_today_bookings)}")
        print(f"   - Tomorrow's bookings (SOLD tomorrow): {len(formatted_tomorrow_bookings)}")
        print(f"   - Today's revenue (SOLD today): ETB {today_revenue}")
        print(f"   - Cancellation rate: {cancellation_rate}%")
        print(f"   - Total routes analyzed: {len(route_performance)}")
        
        return jsonify({
            'success': True,
            'todayBookings': formatted_today_bookings,
            'todayRevenue': today_revenue,
            'todayPassengerCount': today_passenger_count,
            'tomorrowBookings': formatted_tomorrow_bookings,
            'weeklyStats': {
                'totalBookings': len(weekly_bookings),
                'totalRevenue': weekly_revenue,
                'totalPassengers': weekly_passengers,
                'averageOccupancy': avg_occupancy
            },
            'bookingTrends': booking_trends,
            'routePerformance': route_performance,
            'busPerformance': bus_performance,
            'cancellationRate': cancellation_rate,
            'totalBookingsInPeriod': total_bookings_in_period,
            'cancelledBookingsInPeriod': cancelled_bookings_in_period,
            'mostPopularRoute': most_popular_route
        }), 200
        
    except Exception as e:
        logger.error(f"Reports error: {e}")
        return jsonify({'error': f'Failed to generate reports: {str(e)}'}), 500




# ==================== TARIFF MANAGEMENT (ADMIN ONLY) ====================

@operator_bp.route('/tariff-rates', methods=['GET'])
@jwt_required()
def get_tariff_rates():
    """Get all tariff rates (current and historical)"""
    try:
        if not is_operator_or_admin():
            return jsonify({'error': 'Access denied'}), 403
        
        # Get query parameters
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        query = {}
        if active_only:
            query['is_active'] = True
            # Also check effective dates
            now = datetime.now()
            query['$or'] = [
                {'effective_until': None},
                {'effective_until': {'$gte': now}}
            ]
        
        tariff_rates = list(mongo.db.tariff_rates.find(query).sort('bus_type', 1))
        
        return jsonify({
            'success': True,
            'tariff_rates': serialize_document(tariff_rates),
            'total': len(tariff_rates)
        }), 200
        
    except Exception as e:
        logger.error(f"Get tariff rates error: {e}")
        return jsonify({'error': f'Failed to fetch tariff rates: {str(e)}'}), 500


@operator_bp.route('/tariff-rates/current', methods=['GET'])
def get_current_tariff_rates():
    """Get current active tariff rates (public endpoint for operators and customers)"""
    try:
        now = datetime.now()
        
        # Get active rates that are currently effective
        tariff_rates = list(mongo.db.tariff_rates.find({
            'is_active': True,
            'effective_from': {'$lte': now},
            '$or': [
                {'effective_until': None},
                {'effective_until': {'$gte': now}}
            ]
        }).sort('bus_type', 1))
        
        # If no rates found, return default rates
        if not tariff_rates:
            default_rates = [
                {'bus_type': 'Standard', 'rate_per_km': 2.5, 'minimum_fare': 50},
                {'bus_type': 'Luxury', 'rate_per_km': 3.5, 'minimum_fare': 50},
                {'bus_type': 'Premium', 'rate_per_km': 4.0, 'minimum_fare': 50},
                {'bus_type': 'VIP', 'rate_per_km': 4.5, 'minimum_fare': 50},
                {'bus_type': 'Sleeper', 'rate_per_km': 5.0, 'minimum_fare': 50}
            ]
            return jsonify({
                'success': True,
                'tariff_rates': default_rates,
                'using_defaults': True,
                'message': 'Using default rates. Admin should configure official rates.'
            }), 200
        
        # Format rates for easy lookup
        formatted_rates = {}
        for rate in tariff_rates:
            formatted_rates[rate['bus_type']] = {
                'rate_per_km': rate.get('rate_per_km', 2.5),
                'minimum_fare': rate.get('minimum_fare', 50),
                'effective_from': rate.get('effective_from').isoformat() if rate.get('effective_from') else None,
                'effective_until': rate.get('effective_until').isoformat() if rate.get('effective_until') else None,
                'notes': rate.get('notes', '')
            }
        
        return jsonify({
            'success': True,
            'tariff_rates': formatted_rates,
            'using_defaults': False
        }), 200
        
    except Exception as e:
        logger.error(f"Get current tariff rates error: {e}")
        return jsonify({'error': f'Failed to fetch current tariff rates: {str(e)}'}), 500


@operator_bp.route('/tariff-rates', methods=['POST'])
@jwt_required()
def create_tariff_rate():
    """Create new tariff rate (Admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['bus_type', 'rate_per_km', 'minimum_fare', 'effective_from']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate bus type
        valid_bus_types = ['Standard', 'Luxury', 'Premium', 'VIP', 'Sleeper']
        if data['bus_type'] not in valid_bus_types:
            return jsonify({'error': f'Invalid bus type. Must be one of: {", ".join(valid_bus_types)}'}), 400
        
        # Validate rates
        if data['rate_per_km'] <= 0:
            return jsonify({'error': 'Rate per km must be positive'}), 400
        
        if data['minimum_fare'] < 0:
            return jsonify({'error': 'Minimum fare cannot be negative'}), 400
        
        # Parse dates
        try:
            effective_from = datetime.strptime(data['effective_from'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid effective_from date format. Use YYYY-MM-DD'}), 400
        
        effective_until = None
        if data.get('effective_until'):
            try:
                effective_until = datetime.strptime(data['effective_until'], '%Y-%m-%d')
                if effective_until <= effective_from:
                    return jsonify({'error': 'effective_until must be after effective_from'}), 400
            except ValueError:
                return jsonify({'error': 'Invalid effective_until date format. Use YYYY-MM-DD'}), 400
        
        # Deactivate existing rates for this bus type if requested
        if data.get('replace_existing', False):
            mongo.db.tariff_rates.update_many(
                {
                    'bus_type': data['bus_type'],
                    'is_active': True
                },
                {
                    '$set': {
                        'is_active': False,
                        'deactivated_at': datetime.now(),
                        'deactivated_by': get_jwt_identity()
                    }
                }
            )
        
        # Create new tariff rate
        tariff_rate = {
            'bus_type': data['bus_type'],
            'rate_per_km': float(data['rate_per_km']),
            'minimum_fare': float(data['minimum_fare']),
            'effective_from': effective_from,
            'effective_until': effective_until,
            'is_active': True,
            'notes': data.get('notes', ''),
            'created_by': get_jwt_identity(),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        result = mongo.db.tariff_rates.insert_one(tariff_rate)
        tariff_rate['_id'] = str(result.inserted_id)
        
        logger.info(f"Tariff rate created: {data['bus_type']} - {data['rate_per_km']} ETB/km")
        
        return jsonify({
            'success': True,
            'message': 'Tariff rate created successfully',
            'tariff_rate': serialize_document(tariff_rate)
        }), 201
        
    except Exception as e:
        logger.error(f"Create tariff rate error: {e}")
        return jsonify({'error': f'Failed to create tariff rate: {str(e)}'}), 500


@operator_bp.route('/tariff-rates/<rate_id>', methods=['PUT'])
@jwt_required()
def update_tariff_rate(rate_id):
    """Update tariff rate (Admin only)"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        rate_oid = validate_object_id(rate_id)
        
        # Check if rate exists
        existing_rate = mongo.db.tariff_rates.find_one({'_id': rate_oid})
        if not existing_rate:
            return jsonify({'error': 'Tariff rate not found'}), 404
        
        # Prepare update data
        update_data = {'updated_at': datetime.now()}
        
        # Update allowed fields
        if 'rate_per_km' in data:
            if data['rate_per_km'] <= 0:
                return jsonify({'error': 'Rate per km must be positive'}), 400
            update_data['rate_per_km'] = float(data['rate_per_km'])
        
        if 'minimum_fare' in data:
            if data['minimum_fare'] < 0:
                return jsonify({'error': 'Minimum fare cannot be negative'}), 400
            update_data['minimum_fare'] = float(data['minimum_fare'])
        
        if 'effective_from' in data:
            try:
                update_data['effective_from'] = datetime.strptime(data['effective_from'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'Invalid effective_from date format'}), 400
        
        if 'effective_until' in data:
            if data['effective_until']:
                try:
                    update_data['effective_until'] = datetime.strptime(data['effective_until'], '%Y-%m-%d')
                except ValueError:
                    return jsonify({'error': 'Invalid effective_until date format'}), 400
            else:
                update_data['effective_until'] = None
        
        if 'is_active' in data:
            update_data['is_active'] = bool(data['is_active'])
            if not data['is_active']:
                update_data['deactivated_at'] = datetime.now()
                update_data['deactivated_by'] = get_jwt_identity()
        
        if 'notes' in data:
            update_data['notes'] = data['notes']
        
        # Update the rate
        result = mongo.db.tariff_rates.update_one(
            {'_id': rate_oid},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made'}), 400
        
        # Get updated rate
        updated_rate = mongo.db.tariff_rates.find_one({'_id': rate_oid})
        
        logger.info(f"Tariff rate updated: {rate_id}")
        
        return jsonify({
            'success': True,
            'message': 'Tariff rate updated successfully',
            'tariff_rate': serialize_document(updated_rate)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Update tariff rate error: {e}")
        return jsonify({'error': f'Failed to update tariff rate: {str(e)}'}), 500


@operator_bp.route('/tariff-rates/<rate_id>', methods=['DELETE'])
@jwt_required()
def delete_tariff_rate(rate_id):
    """Deactivate tariff rate (Admin only) - soft delete"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        rate_oid = validate_object_id(rate_id)
        
        # Soft delete - just deactivate
        result = mongo.db.tariff_rates.update_one(
            {'_id': rate_oid},
            {
                '$set': {
                    'is_active': False,
                    'deactivated_at': datetime.now(),
                    'deactivated_by': get_jwt_identity()
                }
            }
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Tariff rate not found or already deactivated'}), 404
        
        logger.info(f"Tariff rate deactivated: {rate_id}")
        
        return jsonify({
            'success': True,
            'message': 'Tariff rate deactivated successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Delete tariff rate error: {e}")
        return jsonify({'error': f'Failed to delete tariff rate: {str(e)}'}), 500


@operator_bp.route('/tariff-rates/calculate', methods=['POST'])
def calculate_tariff():
    """Calculate tariff for a given distance and bus type (public endpoint)"""
    try:
        data = request.get_json()
        
        distance = data.get('distance', 0)
        bus_type = data.get('bus_type', 'Standard')
        
        if distance <= 0:
            return jsonify({'error': 'Distance must be positive'}), 400
        
        # Get current rate for bus type
        now = datetime.now()
        rate_doc = mongo.db.tariff_rates.find_one({
            'bus_type': bus_type,
            'is_active': True,
            'effective_from': {'$lte': now},
            '$or': [
                {'effective_until': None},
                {'effective_until': {'$gte': now}}
            ]
        })
        
        # Use default if not found
        default_rates = {
            'Standard': 2.5,
            'Luxury': 3.5,
            'Premium': 4.0,
            'VIP': 4.5,
            'Sleeper': 5.0
        }
        
        if rate_doc:
            rate_per_km = rate_doc.get('rate_per_km', default_rates.get(bus_type, 2.5))
            minimum_fare = rate_doc.get('minimum_fare', 50)
        else:
            rate_per_km = default_rates.get(bus_type, 2.5)
            minimum_fare = 50
        
        # Calculate tariff
        calculated_tariff = distance * rate_per_km
        final_tariff = max(round(calculated_tariff), minimum_fare)
        
        return jsonify({
            'success': True,
            'calculation': {
                'distance': distance,
                'bus_type': bus_type,
                'rate_per_km': rate_per_km,
                'minimum_fare': minimum_fare,
                'calculated_tariff': calculated_tariff,
                'final_tariff': final_tariff,
                'formula': f'{distance} km × {rate_per_km} ETB/km = {final_tariff} ETB'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Calculate tariff error: {e}")
        return jsonify({'error': f'Failed to calculate tariff: {str(e)}'}), 500

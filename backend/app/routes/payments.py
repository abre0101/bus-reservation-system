from flask import Blueprint, request, jsonify, current_app, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import mongo
from bson import ObjectId
from datetime import datetime
import requests
import re
import random
import string

payments_bp = Blueprint('payments', __name__)

def is_valid_object_id(id_string):
    """Check if a string is a valid MongoDB ObjectId"""
    if not id_string:
        return False
    return re.match(r'^[a-f\d]{24}$', id_string) is not None

def generate_pnr():
    """Generate unique PNR number"""
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    return f"ETB{timestamp}"

def generate_baggage_tag():
    """Generate unique baggage tag"""
    timestamp = datetime.utcnow().strftime('%H%M%S')
    return f"BT{timestamp}"

def calculate_baggage_fee(weight_kg):
    """Calculate baggage fee based on weight"""
    if weight_kg <= 15:
        return 0  # Free allowance
    elif weight_kg <= 25:
        return 50  # Standard fee
    elif weight_kg <= 35:
        return 100  # Heavy baggage fee
    else:
        return 150  # Extra heavy baggage fee

def verify_with_chapa_directly_full(tx_ref):
    """Verify payment directly with Chapa API and return full data"""
    try:
        chapa_secret_key = current_app.config.get('CHAPA_SECRET_KEY')
        if not chapa_secret_key:
            print("❌ Chapa secret key not configured")
            return None
        
        headers = {'Authorization': f'Bearer {chapa_secret_key}'}
        
        print(f"🔍 Checking Chapa API for: {tx_ref}")
        
        response = requests.get(
            f"{current_app.config['CHAPA_BASE_URL']}/transaction/verify/{tx_ref}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            chapa_status = data.get('data', {}).get('status')
            print(f"✅ Chapa direct verification: {chapa_status}")
            
            return {
                'status': chapa_status,
                'reference': data.get('data', {}).get('reference'),
                'full_data': data
            }
        else:
            print(f"❌ Chapa verification failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Direct verification error: {str(e)}")
        return None

def get_schedule_with_cities(schedule_id):
    """Get schedule with city information"""
    try:
        db = mongo.db
        
        print(f"🔍 Getting schedule: {schedule_id}")
        schedule = db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        
        if not schedule:
            print(f"❌ Schedule not found: {schedule_id}")
            return None
        
        print(f"✅ Schedule found: {schedule.get('_id')}")
        print(f"📋 Schedule keys: {list(schedule.keys())}")
        print(f"📋 Schedule sample data: origin_city={schedule.get('origin_city')}, destination_city={schedule.get('destination_city')}")
        
        # FIXED: Get cities from schedule using snake_case field names
        departure_city = schedule.get('origin_city') or schedule.get('departure_city')
        arrival_city = schedule.get('destination_city') or schedule.get('arrival_city')
        
        print(f"📍 Schedule cities - departure: {departure_city}, arrival: {arrival_city}")
        
        # If schedule doesn't have direct city fields, get from route
        if not departure_city or not arrival_city:
            print("🔄 Getting cities from route...")
            route_id = schedule.get('route_id') or schedule.get('routeId')
            if not route_id:
                print("❌ No route_id in schedule")
                return None
            
            try:
                route = db.routes.find_one({'_id': ObjectId(route_id)})
            except:
                # Try as string if ObjectId conversion fails
                route = db.routes.find_one({'_id': route_id})
                
            if not route:
                print(f"❌ Route not found: {route_id}")
                return None
            
            print(f"✅ Route found: {route.get('_id')}")
            
            departure_city = route.get('originCity')
            arrival_city = route.get('destinationCity')
            print(f"📍 Route cities - origin: {departure_city}, destination: {arrival_city}")
        
        # VALIDATION: Ensure we have both cities
        if not departure_city:
            print("❌ Missing departure city")
            return None
        if not arrival_city:
            print("❌ Missing arrival city")
            return None
        
        print(f"✅ Cities confirmed: {departure_city} → {arrival_city}")
        
        # Handle travel date - check both formats
        travel_date_obj = schedule.get('departureDate') or schedule.get('departure_date')
        if isinstance(travel_date_obj, datetime):
            travel_date = travel_date_obj.strftime('%Y-%m-%d')
        else:
            travel_date = str(travel_date_obj) if travel_date_obj else ''
        
        # Get departure time - check both formats
        departure_time = schedule.get('departure_time') or schedule.get('departureTime')
        arrival_time = schedule.get('arrival_time') or schedule.get('arrivalTime', '')
        
        # Validate required fields
        if not travel_date:
            print("❌ Missing travel date")
            return None
        if not departure_time:
            print("❌ Missing departure time")
            return None
        
        return {
            'departure_city': departure_city,
            'arrival_city': arrival_city,
            'travel_date': travel_date,
            'departure_time': departure_time,
            'arrival_time': arrival_time,
            'bus_type': schedule.get('bus_type') or schedule.get('busType', ''),
            'bus_number': schedule.get('bus_number') or schedule.get('busNumber', 'Unknown'),
            'bus_name': schedule.get('bus_name') or schedule.get('busName', 'EthioBus'),
            'fare': schedule.get('fare_birr') or schedule.get('fareBirr', 0)
        }
        
    except Exception as e:
        print(f"❌ Error getting schedule: {str(e)}")
        return None

def create_booking_from_payment(booking_data, user_id, tx_ref, payment_method='chapa'):
    """Create booking record after successful payment - SET STATUS TO PENDING"""
    try:
        pnr_number = generate_pnr()
        has_baggage = booking_data.get('has_baggage', False)
        baggage_weight = booking_data.get('baggage_weight', 0)
        baggage_tag = generate_baggage_tag() if has_baggage and baggage_weight > 0 else None
        
        # Get schedule with city information
        schedule_id = booking_data.get('schedule_id')
        schedule_info = get_schedule_with_cities(schedule_id)
        
        if not schedule_info:
            print(f"❌ Failed to get route information for schedule: {schedule_id}")
            return None
        
        print(f"📍 Route Info: {schedule_info['departure_city']} → {schedule_info['arrival_city']}")
        print(f"📅 Schedule Info: {schedule_info['travel_date']} at {schedule_info['departure_time']}")
        
        # Calculate baggage fee if needed
        baggage_fee = 0
        if has_baggage and baggage_weight > 0:
            baggage_fee = calculate_baggage_fee(baggage_weight)
        
        # Calculate total amount
        base_fare = booking_data.get('base_fare', 0)
        total_amount = base_fare + baggage_fee
        
        # FIXED: Set status to 'pending' for both payment methods
        booking_status = 'pending'  # Always set to pending for new bookings
        payment_status = 'paid'     # Payment is completed
        
        print(f"🎯 STATUS SETTINGS: booking='{booking_status}', payment='{payment_status}'")
        
        # Create booking record
        booking_record = {
            'user_id': ObjectId(user_id),
            'schedule_id': ObjectId(schedule_id) if schedule_id and is_valid_object_id(schedule_id) else None,
            'seat_numbers': booking_data.get('seat_numbers', []),
            'passenger_name': booking_data.get('passenger_name', ''),
            'passenger_phone': booking_data.get('passenger_phone', ''),
            'passenger_email': booking_data.get('passenger_email', ''),
            
            # Baggage Information
            'has_baggage': has_baggage,
            'baggage_weight': baggage_weight,
            'baggage_fee': baggage_fee,
            'base_fare': base_fare,
            'total_amount': total_amount,
            
            # Booking Status & Identification - FIXED: Set to 'pending'
            'status': booking_status,
            'pnr_number': pnr_number,
            'baggage_tag': baggage_tag,
            
            # Payment Information
            'payment_method': payment_method,
            'payment_status': payment_status,
            'payment_tx_ref': tx_ref if payment_method == 'chapa' else None,
            
            # Ethiopian Bus Details
            'bus_company': 'EthioBus',
            'departure_city': schedule_info['departure_city'],
            'arrival_city': schedule_info['arrival_city'],
            'travel_date': schedule_info['travel_date'],
            'departure_time': schedule_info['departure_time'],
            'arrival_time': schedule_info['arrival_time'],
            'bus_type': schedule_info['bus_type'],
            'bus_number': schedule_info['bus_number'],
            'bus_name': schedule_info['bus_name'],
            
            # Timestamps
            'booked_at': datetime.utcnow(),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert the booking
        result = mongo.db.bookings.insert_one(booking_record)
        
        print(f"✅ Booking created successfully: {result.inserted_id}")
        print(f"📋 Booking details: {schedule_info['departure_city']} → {schedule_info['arrival_city']} on {schedule_info['travel_date']}")
        print(f"💰 Payment method: {payment_method}")
        print(f"✅ Booking status set to: {booking_status}")
        print(f"✅ Payment status set to: {payment_status}")
        
        return {
            'booking_id': str(result.inserted_id),
            'pnr_number': pnr_number,
            'baggage_tag': baggage_tag,
            'route': f"{schedule_info['departure_city']} → {schedule_info['arrival_city']}",
            'travel_date': schedule_info['travel_date'],
            'departure_time': schedule_info['departure_time'],
            'status': booking_status,
            'payment_method': payment_method,
            'payment_status': payment_status
        }
        
    except Exception as e:
        print(f"❌ Error creating booking: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return None

@payments_bp.route('/chapa/initialize', methods=['POST'])
@jwt_required()
def initialize_chapa_payment():
    try:
        chapa_secret_key = current_app.config.get('CHAPA_SECRET_KEY')
        if not chapa_secret_key:
            return jsonify({
                'error': 'Payment gateway not configured',
                'message': 'CHAPA_SECRET_KEY is missing'
            }), 500

        data = request.get_json()
        user_id = get_jwt_identity()
        
        print(f"🔄 Initializing Chapa payment for user {user_id}")
        
        # Generate unique transaction reference
        tx_ref = data.get('tx_ref', f"ethiobus-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{user_id[-6:]}")
        
        # Store payment record immediately
        payment_record = {
            'user_id': ObjectId(user_id),
            'tx_ref': tx_ref,
            'amount': data['amount'],
            'currency': 'ETB',
            'status': 'initiated',
            'payment_method': 'chapa',
            'booking_data': data,
            'created_at': datetime.utcnow()
        }
        
        mongo.db.payments.insert_one(payment_record)
        print(f"💾 Stored payment record with tx_ref: {tx_ref}")

        # Get URLs
        base_url = request.host_url.rstrip('/')
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
        
        # Use the frontend URL directly for return_url to avoid parameter loss
        return_url = f"{frontend_url}/payment-callback?tx_ref={tx_ref}"
        callback_url = f"{base_url}/payments/chapa/callback"
        
        # Prepare Chapa request
        chapa_data = {
            'amount': str(data['amount']),
            'currency': 'ETB',
            'email': data.get('email', 'test@example.com'),
            'first_name': data.get('first_name', 'Test'),
            'last_name': data.get('last_name', 'User'),
            'phone_number': data.get('phone_number', '0900123456'),
            'tx_ref': tx_ref,
            'callback_url': callback_url,
            'return_url': return_url,
            'customization': {
                'title': 'EthioBus Booking',
                'description': 'Bus Ticket Payment'
            }
        }
        
        print(f"📤 Making request to Chapa API with tx_ref: {tx_ref}")
        
        headers = {
            'Authorization': f'Bearer {chapa_secret_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{current_app.config['CHAPA_BASE_URL']}/transaction/initialize",
            json=chapa_data,
            headers=headers,
            timeout=30
        )
        
        response_data = response.json()
        print(f"📥 Chapa API response: {response.status_code}")
        
        if response.status_code == 200 and response_data['status'] == 'success':
            # Update payment record with checkout URL
            mongo.db.payments.update_one(
                {'tx_ref': tx_ref},
                {'$set': {
                    'checkout_url': response_data['data']['checkout_url'],
                    'status': 'pending',
                    'return_url': return_url,
                    'callback_url': callback_url
                }}
            )
            
            return jsonify({
                'status': 'success',
                'message': 'Payment initialized successfully',
                'data': response_data['data'],
                'tx_ref': tx_ref
            }), 200
        else:
            error_msg = response_data.get('message', 'Failed to initialize payment')
            print(f"❌ Chapa API error: {error_msg}")
            
            mongo.db.payments.update_one(
                {'tx_ref': tx_ref},
                {'$set': {
                    'status': 'failed',
                    'error_message': error_msg
                }}
            )
            
            return jsonify({
                'status': 'error',
                'message': error_msg
            }), 400
            
    except Exception as e:
        print(f"❌ Internal server error: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@payments_bp.route('/chapa/callback', methods=['GET', 'POST'])
def chapa_callback():
    """Handle Chapa payment callback - both return_url (GET) and webhook (POST)"""
    try:
        print("=" * 50)
        print("🔄 CHAPA CALLBACK RECEIVED")
        print(f"📨 Method: {request.method}")
        print(f"📍 URL: {request.url}")
        
        # Get data based on method
        if request.method == 'GET':
            data = request.args.to_dict()
            print("📨 GET Parameters:", data)
        else:
            data = request.get_json() or request.form.to_dict()
            print("📨 POST Data:", data)
        
        tx_ref = data.get('tx_ref')
        status = data.get('status')
        
        print(f"🔍 Extracted - tx_ref: {tx_ref}, status: {status}")
        
        if not tx_ref:
            print("❌ No tx_ref in callback")
            return redirect(f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/payment-failed?error=no_tx_ref")
        
        # Find payment record
        payment = mongo.db.payments.find_one({'tx_ref': tx_ref})
        if not payment:
            print(f"❌ Payment not found: {tx_ref}")
            return redirect(f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/payment-failed?error=payment_not_found")
        
        # If status is not provided or is pending, verify with Chapa directly
        if not status or status == 'pending':
            print("🔄 Status missing or pending, verifying with Chapa...")
            chapa_result = verify_with_chapa_directly_full(tx_ref)
            if chapa_result and chapa_result.get('status'):
                status = chapa_result['status']
                print(f"🔄 Updated status to: {status}")
        
        print(f"📊 Final status: {status}")
        
        # Update payment record
        update_data = {
            'status': status,
            'chapa_callback_data': data,
            'updated_at': datetime.utcnow()
        }
        
        if status == 'success':
            update_data['paid_at'] = datetime.utcnow()
            update_data['transaction_id'] = data.get('transaction_id') or data.get('chapa_ref')
            
            # Create booking if not already created
            if 'booking_data' in payment and not payment.get('booking_created'):
                booking_result = create_booking_from_payment(
                    payment['booking_data'], 
                    payment['user_id'], 
                    tx_ref,
                    'chapa'  
                )
                if booking_result:
                    update_data['booking_created'] = True
                    update_data['booking_id'] = booking_result['booking_id']
                    print(f"✅ Booking created with status: {booking_result['status']}")
        
        mongo.db.payments.update_one(
            {'tx_ref': tx_ref},
            {'$set': update_data}
        )
        
        print(f"✅ Callback processed - tx_ref: {tx_ref}, status: {status}")
        
        # Redirect to frontend
        if request.method == 'GET':
            frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
            redirect_url = f"{frontend_url}/payment-callback?tx_ref={tx_ref}&status={status}"
            print(f"🔀 Redirecting to: {redirect_url}")
            return redirect(redirect_url)
        else:
            return jsonify({'status': 'success', 'message': 'Webhook processed'}), 200
        
    except Exception as e:
        print(f"❌ Callback error: {str(e)}")
        import traceback
        print(f"🐛 Stack trace: {traceback.format_exc()}")
        
        if request.method == 'GET':
            return redirect(f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/payment-failed?error=callback_error")
        return jsonify({'error': 'Callback processing failed'}), 500

@payments_bp.route('/verify/<tx_ref>', methods=['GET'])
@jwt_required()
def verify_payment(tx_ref):
    """Verify payment status and create booking if successful"""
    try:
        user_id = get_jwt_identity()
        print(f"🔍 Verifying payment for tx_ref: {tx_ref}, user: {user_id}")
        
        # Find payment record
        payment = mongo.db.payments.find_one({
            'tx_ref': tx_ref,
            'user_id': ObjectId(user_id)
        })
        
        if not payment:
            print(f"❌ Payment not found for tx_ref: {tx_ref}")
            return jsonify({
                'success': False,
                'message': 'Payment not found',
                'payment_status': 'not_found'
            }), 404
        
        payment_status = payment.get('status', 'unknown')
        print(f"📊 Payment status in DB: {payment_status}")
        
        # If payment is pending, check with Chapa directly
        if payment_status == 'pending':
            print("🔄 Payment is pending, checking with Chapa directly...")
            chapa_result = verify_with_chapa_directly_full(tx_ref)
            
            if chapa_result and chapa_result.get('status') and chapa_result['status'] != 'pending':
                new_status = chapa_result['status']
                print(f"🔄 Updating status from {payment_status} to {new_status}")
                payment_status = new_status
                
                # Update database with Chapa's actual status
                update_data = {
                    'status': new_status,
                    'chapa_verification_data': chapa_result,
                    'updated_at': datetime.utcnow()
                }
                
                if new_status == 'success':
                    update_data['paid_at'] = datetime.utcnow()
                    update_data['transaction_id'] = chapa_result.get('reference')
                
                mongo.db.payments.update_one(
                    {'tx_ref': tx_ref},
                    {'$set': update_data}
                )
                
                # Refresh payment data
                payment = mongo.db.payments.find_one({'tx_ref': tx_ref})
        
        # If payment is successful, create booking
        if payment_status == 'success':
            print(f"✅ Payment successful, creating booking...")
            
            # Create booking if not already created
            if not payment.get('booking_created') and 'booking_data' in payment:
                booking_result = create_booking_from_payment(
                    payment.get('booking_data', {}),
                    payment['user_id'],
                    tx_ref,
                    'chapa'
                )
                
                if booking_result:
                    print(f"✅ Booking created: {booking_result}")
                    # Update payment record
                    mongo.db.payments.update_one(
                        {'tx_ref': tx_ref},
                        {'$set': {
                            'booking_created': True,
                            'booking_id': booking_result.get('booking_id')
                        }}
                    )
                    
                    return jsonify({
                        'success': True,
                        'message': 'Payment verified successfully and booking created',
                        'payment_status': 'success',
                        'booking_status': booking_result.get('status', 'pending'),
                        'booking_id': booking_result.get('booking_id'),
                        'pnr_number': booking_result.get('pnr_number'),
                        'baggage_tag': booking_result.get('baggage_tag')
                    })
                else:
                    print(f"❌ Failed to create booking for tx_ref: {tx_ref}")
                    return jsonify({
                        'success': False,
                        'message': 'Payment successful but booking creation failed',
                        'payment_status': 'success'
                    })
            else:
                # Booking already exists or no booking data
                booking = mongo.db.bookings.find_one({'payment_tx_ref': tx_ref})
                return jsonify({
                    'success': True,
                    'message': 'Payment already verified',
                    'payment_status': 'success',
                    'booking_status': booking.get('status') if booking else 'pending',
                    'booking_id': str(booking['_id']) if booking else None,
                    'pnr_number': booking.get('pnr_number') if booking else None
                })
        else:
            # Payment still pending or failed
            return jsonify({
                'success': False,
                'message': f'Payment status: {payment_status}',
                'payment_status': payment_status
            })
            
    except Exception as e:
        print(f"❌ Verification error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        
        return jsonify({
            'success': False,
            'message': f'Verification failed: {str(e)}'
        }), 500

@payments_bp.route('/cash', methods=['POST'])
@jwt_required()
def create_cash_payment():
    """Create booking with cash payment - SET STATUS TO PENDING"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        print(f"💵 Creating cash booking for user {user_id}")
        print(f"📦 Booking data: {data}")
        
        # Required fields validation
        required_fields = ['schedule_id', 'passenger_name', 'passenger_phone', 'seat_numbers', 'base_fare']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        schedule_id = data['schedule_id']
        
        # Get schedule with city information
        schedule_info = get_schedule_with_cities(schedule_id)
        if not schedule_info:
            return jsonify({'error': 'Could not retrieve complete schedule information. Missing route data.'}), 400
        
        print(f"✅ Schedule info retrieved: {schedule_info['departure_city']} → {schedule_info['arrival_city']}")
        
        pnr_number = generate_pnr()
        has_baggage = data.get('has_baggage', False)
        baggage_weight = data.get('baggage_weight', 0)
        baggage_tag = generate_baggage_tag() if has_baggage and baggage_weight > 0 else None
        
        # Calculate baggage fee if needed
        baggage_fee = 0
        if has_baggage and baggage_weight > 0:
            baggage_fee = calculate_baggage_fee(baggage_weight)
        
        # Calculate total amount
        base_fare = data['base_fare']
        total_amount = base_fare + baggage_fee
        
        print(f"💰 Pricing - Base: {base_fare}, Baggage: {baggage_fee}, Total: {total_amount}")
        
        # FIXED: Set status to 'pending' for cash payments
        booking_status = 'pending'
        payment_status = 'paid'
        
        print(f"🎯 CASH PAYMENT STATUS: booking='{booking_status}', payment='{payment_status}'")
        
        # Create booking record
        booking_record = {
            'user_id': ObjectId(user_id),
            'schedule_id': ObjectId(schedule_id),
            'seat_numbers': data['seat_numbers'],
            'passenger_name': data['passenger_name'],
            'passenger_phone': data['passenger_phone'],
            'passenger_email': data.get('passenger_email', ''),
            
            # Baggage Information
            'has_baggage': has_baggage,
            'baggage_weight': baggage_weight,
            'baggage_fee': baggage_fee,
            'base_fare': base_fare,
            'total_amount': total_amount,
            
            # Booking Status & Identification - FIXED: Set to 'pending'
            'status': booking_status,
            'pnr_number': pnr_number,
            'baggage_tag': baggage_tag,
            
            # Payment Information
            'payment_method': 'cash',
            'payment_status': payment_status,
            
            # Route Information (from schedule)
            'bus_company': 'EthioBus',
            'departure_city': schedule_info['departure_city'],
            'arrival_city': schedule_info['arrival_city'],
            'travel_date': schedule_info['travel_date'],
            'departure_time': schedule_info['departure_time'],
            'arrival_time': schedule_info['arrival_time'],
            'bus_type': schedule_info['bus_type'],
            'bus_number': schedule_info['bus_number'],
            'bus_name': schedule_info['bus_name'],
            
            # Timestamps
            'booked_at': datetime.utcnow(),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        print(f"📝 Final booking record:")
        print(f"   Route: {booking_record['departure_city']} → {booking_record['arrival_city']}")
        print(f"   Date: {booking_record['travel_date']} at {booking_record['departure_time']}")
        print(f"   Bus: {booking_record['bus_type']} {booking_record['bus_number']}")
        print(f"   Status: {booking_record['status']}")
        print(f"   Payment Status: {booking_record['payment_status']}")
        
        # Insert the booking
        result = mongo.db.bookings.insert_one(booking_record)
        
        print(f"✅ Cash booking created: {result.inserted_id}")
        
        return jsonify({
            'success': True,
            'message': 'Booking created successfully with cash payment.',
            'booking_id': str(result.inserted_id),
            'pnr_number': pnr_number,
            'baggage_tag': baggage_tag,
            'status': booking_status,  # Return pending status
            'payment_method': 'cash',
            'payment_status': payment_status,  # Return paid status
            'route': f"{schedule_info['departure_city']} → {schedule_info['arrival_city']}",
            'travel_date': schedule_info['travel_date'],
            'departure_time': schedule_info['departure_time'],
            'bus_type': schedule_info['bus_type'],
            'bus_number': schedule_info['bus_number']
        }), 200
        
    except Exception as e:
        print(f"❌ Cash booking error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Cash booking failed: {str(e)}'}), 500

@payments_bp.route('/methods', methods=['GET'])
def get_payment_methods():
    """Get available payment methods in Ethiopia"""
    payment_methods = [
        {
            'id': 'chapa',
            'name': 'Chapa',
            'description': 'Pay with Telebirr, CBE Birr, HelloCash, Bank, or Card',
            'icon': 'payment',
            'supported': True,
            'supported_methods': ['telebirr', 'cbebirr', 'hellocash', 'bank', 'visa', 'mastercard']
        },
        {
            'id': 'cash',
            'name': 'Pay at Station',
            'description': 'Pay cash at bus station or office',
            'icon': 'cash',
            'supported': True
        }
    ]
    
    return jsonify({
        'payment_methods': payment_methods,
        'default_currency': 'ETB',
        'currency_symbol': 'Br'
    }), 200

# Debug endpoint to check schedule data
@payments_bp.route('/debug/schedule/<schedule_id>', methods=['GET'])
def debug_schedule(schedule_id):
    """Debug endpoint to check schedule data"""
    try:
        db = mongo.db
        
        print(f"🔍 Debugging schedule: {schedule_id}")
        schedule = db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Get route information
        route = None
        route_id = schedule.get('routeId')
        if route_id:
            route = db.routes.find_one({'_id': ObjectId(route_id)})
        
        response_data = {
            'schedule': {
                'id': str(schedule['_id']),
                'departure_city': schedule.get('departure_city'),
                'arrival_city': schedule.get('arrival_city'),
                'departureDate': str(schedule.get('departureDate')),
                'departureTime': schedule.get('departureTime'),
                'busType': schedule.get('busType'),
                'busNumber': schedule.get('busNumber'),
                'routeId': str(route_id) if route_id else None
            },
            'route': {
                'id': str(route['_id']) if route else None,
                'originCity': route.get('originCity') if route else None,
                'destinationCity': route.get('destinationCity') if route else None
            } if route else None
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
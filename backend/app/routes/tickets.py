from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
import json
import re

ticket_bp = Blueprint('tickets', __name__)

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

# Get database instance
def get_db():
    from flask import current_app
    from flask_pymongo import PyMongo
    mongo = PyMongo(current_app)
    return mongo.db

# Helper function to check ticketer role
def is_ticketer(user_id):
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return user and 'ticketer' in user.get('roles', [])

# Helper function to validate phone number
def validate_phone(phone):
    # Remove any non-digit characters
    phone = re.sub(r'\D', '', phone)
    # Check if it's a valid 10-digit phone number
    if len(phone) == 10 and phone.isdigit():
        return phone
    return None

# Ticketer Dashboard Stats
@ticket_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_ticketer_stats():
    try:
        current_user = get_jwt_identity()
        
        if not is_ticketer(current_user['id']):
            return jsonify({"error": "Unauthorized access - Ticketer role required"}), 403
        
        db = get_db()
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        # Get today's bookings count
        today_bookings = db.bookings.count_documents({
            "created_at": {"$gte": today},
            "booked_by": ObjectId(current_user['id'])
        })
        
        # Get pending bookings count
        pending_bookings = db.bookings.count_documents({
            "status": "pending",
            "booked_by": ObjectId(current_user['id'])
        })
        
        # Get total passengers today
        today_passengers = db.bookings.aggregate([
            {"$match": {
                "created_at": {"$gte": today},
                "booked_by": ObjectId(current_user['id'])
            }},
            {"$group": {"_id": None, "total": {"$sum": {"$size": "$passengers"}}}}
        ])
        
        total_passengers = list(today_passengers)
        passengers_count = total_passengers[0]['total'] if total_passengers else 0
        
        # Get revenue today
        today_revenue = db.bookings.aggregate([
            {"$match": {
                "created_at": {"$gte": today},
                "status": "confirmed",
                "booked_by": ObjectId(current_user['id'])
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ])
        
        revenue_data = list(today_revenue)
        revenue = revenue_data[0]['total'] if revenue_data else 0
        
        # Weekly stats
        weekly_revenue = db.bookings.aggregate([
            {"$match": {
                "created_at": {"$gte": week_ago},
                "status": "confirmed",
                "booked_by": ObjectId(current_user['id'])
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ])
        
        weekly_revenue_data = list(weekly_revenue)
        weekly_revenue_total = weekly_revenue_data[0]['total'] if weekly_revenue_data else 0
        
        return jsonify({
            "today_bookings": today_bookings,
            "pending_bookings": pending_bookings,
            "today_passengers": passengers_count,
            "today_revenue": revenue,
            "weekly_revenue": weekly_revenue_total
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch dashboard stats: {str(e)}"}), 500

# Get all bookings with filters
@ticket_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_all_bookings():
    try:
        current_user = get_jwt_identity()
        
        if not is_ticketer(current_user['id']):
            return jsonify({"error": "Unauthorized access - Ticketer role required"}), 403
        
        db = get_db()
        
        # Get query parameters
        status = request.args.get('status')
        date = request.args.get('date')
        passenger_phone = request.args.get('passenger_phone')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        skip = (page - 1) * limit
        
        # Build filter query
        filter_query = {"booked_by": ObjectId(current_user['id'])}
        
        if status and status != 'all':
            filter_query['status'] = status
            
        if date:
            try:
                filter_date = datetime.strptime(date, '%Y-%m-%d')
                filter_query['travel_date'] = {
                    "$gte": filter_date,
                    "$lt": filter_date + timedelta(days=1)
                }
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
            
        if passenger_phone:
            validated_phone = validate_phone(passenger_phone)
            if validated_phone:
                passenger = db.users.find_one({"phone": validated_phone})
                if passenger:
                    filter_query['passenger_id'] = passenger['_id']
            else:
                return jsonify({"error": "Invalid phone number format"}), 400
        
        # Get bookings with passenger and bus details
        bookings = list(db.bookings.aggregate([
            {"$match": filter_query},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {"$lookup": {
                "from": "users",
                "localField": "passenger_id",
                "foreignField": "_id",
                "as": "passenger_info"
            }},
            {"$lookup": {
                "from": "buses",
                "localField": "bus_id",
                "foreignField": "_id",
                "as": "bus_info"
            }},
            {"$unwind": {"path": "$passenger_info", "preserveNullAndEmptyArrays": True}},
            {"$unwind": {"path": "$bus_info", "preserveNullAndEmptyArrays": True}}
        ]))
        
        total = db.bookings.count_documents(filter_query)
        
        # Convert ObjectId to string for JSON serialization
        for booking in bookings:
            booking['_id'] = str(booking['_id'])
            if booking.get('passenger_info'):
                booking['passenger_info']['_id'] = str(booking['passenger_info']['_id'])
                # Hide sensitive passenger information
                if 'password' in booking['passenger_info']:
                    del booking['passenger_info']['password']
            if booking.get('bus_info'):
                booking['bus_info']['_id'] = str(booking['bus_info']['_id'])
        
        return jsonify({
            "bookings": bookings,
            "total": total,
            "page": page,
            "total_pages": (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch bookings: {str(e)}"}), 500

# Create manual booking
@ticket_bp.route('/bookings/manual', methods=['POST'])
@jwt_required()
def create_manual_booking():
    try:
        current_user = get_jwt_identity()
        
        if not is_ticketer(current_user['id']):
            return jsonify({"error": "Unauthorized access - Ticketer role required"}), 403
        
        db = get_db()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Validate required fields
        required_fields = ['passenger_phone', 'bus_id', 'travel_date', 'seats', 'passengers']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Validate phone number
        validated_phone = validate_phone(data['passenger_phone'])
        if not validated_phone:
            return jsonify({"error": "Invalid phone number format. Must be 10 digits."}), 400
        
        # Find passenger by phone
        passenger = db.users.find_one({"phone": validated_phone})
        if not passenger:
            return jsonify({
                "error": "Passenger not found. Please ask passenger to register first or use a registered phone number."
            }), 404
        
        # Check bus availability
        bus = db.buses.find_one({"_id": ObjectId(data['bus_id'])})
        if not bus:
            return jsonify({"error": "Bus not found"}), 404
        
        # Parse travel date
        try:
            travel_date = datetime.strptime(data['travel_date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid travel date format. Use YYYY-MM-DD"}), 400
        
        # Check if travel date is in the future
        if travel_date.date() < datetime.now().date():
            return jsonify({"error": "Travel date cannot be in the past"}), 400
        
        # Check seat availability
        selected_seats = data['seats']
        if not selected_seats:
            return jsonify({"error": "At least one seat must be selected"}), 400
        
        # Validate seat numbers
        if any(seat < 1 or seat > bus['total_seats'] for seat in selected_seats):
            return jsonify({"error": f"Seat numbers must be between 1 and {bus['total_seats']}"}), 400
        
        # Check for duplicate seats in request
        if len(selected_seats) != len(set(selected_seats)):
            return jsonify({"error": "Duplicate seat numbers are not allowed"}), 400
        
        existing_bookings = db.bookings.find({
            "bus_id": ObjectId(data['bus_id']),
            "travel_date": travel_date,
            "status": {"$in": ["confirmed", "pending"]}
        })
        
        booked_seats = []
        for booking in existing_bookings:
            booked_seats.extend(booking.get('seats', []))
        
        conflicting_seats = set(selected_seats) & set(booked_seats)
        if conflicting_seats:
            return jsonify({
                "error": f"Seats {list(conflicting_seats)} are already booked",
                "available_seats": [s for s in range(1, bus['total_seats'] + 1) if s not in booked_seats]
            }), 400
        
        # Validate passenger details
        passengers = data['passengers']
        if len(passengers) != len(selected_seats):
            return jsonify({"error": "Number of passengers must match number of seats"}), 400
        
        for i, passenger_info in enumerate(passengers):
            if not passenger_info.get('name') or not passenger_info.get('age'):
                return jsonify({"error": f"Passenger {i+1} must have name and age"}), 400
            if not isinstance(passenger_info.get('age'), int) or passenger_info['age'] <= 0:
                return jsonify({"error": f"Passenger {i+1} must have a valid age"}), 400
        
        # Calculate total amount
        seat_price = bus['price_per_seat']
        total_amount = len(selected_seats) * seat_price
        
        # Create booking
        booking_data = {
            "passenger_id": passenger['_id'],
            "bus_id": ObjectId(data['bus_id']),
            "travel_date": travel_date,
            "seats": selected_seats,
            "passengers": passengers,
            "total_amount": total_amount,
            "status": "confirmed",
            "payment_status": "paid",
            "payment_method": "cash",
            "booked_by": ObjectId(current_user['id']),
            "booking_type": "manual",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        result = db.bookings.insert_one(booking_data)
        
        # Get the complete booking with populated data
        new_booking = db.bookings.aggregate([
            {"$match": {"_id": result.inserted_id}},
            {"$lookup": {
                "from": "users",
                "localField": "passenger_id",
                "foreignField": "_id",
                "as": "passenger_info"
            }},
            {"$lookup": {
                "from": "buses",
                "localField": "bus_id",
                "foreignField": "_id",
                "as": "bus_info"
            }},
            {"$unwind": "$passenger_info"},
            {"$unwind": "$bus_info"}
        ])
        
        booking_list = list(new_booking)
        if booking_list:
            booking = booking_list[0]
            booking['_id'] = str(booking['_id'])
            booking['passenger_info']['_id'] = str(booking['passenger_info']['_id'])
            booking['bus_info']['_id'] = str(booking['bus_info']['_id'])
            
            return jsonify({
                "message": "Booking created successfully",
                "booking": booking
            }), 201
        
        return jsonify({"error": "Failed to create booking"}), 500
        
    except Exception as e:
        return jsonify({"error": f"Failed to create booking: {str(e)}"}), 500

# Update booking status
@ticket_bp.route('/bookings/<booking_id>/status', methods=['PUT'])
@jwt_required()
def update_booking_status(booking_id):
    try:
        current_user = get_jwt_identity()
        
        if not is_ticketer(current_user['id']):
            return jsonify({"error": "Unauthorized access - Ticketer role required"}), 403
        
        db = get_db()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        new_status = data.get('status')
        
        if new_status not in ['confirmed', 'cancelled', 'completed']:
            return jsonify({"error": "Invalid status. Allowed: confirmed, cancelled, completed"}), 400
        
        # Check if booking exists and belongs to this ticketer
        booking = db.bookings.find_one({
            "_id": ObjectId(booking_id),
            "booked_by": ObjectId(current_user['id'])
        })
        
        if not booking:
            return jsonify({"error": "Booking not found or access denied"}), 404
        
        # Update booking
        result = db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now()
                }
            }
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Failed to update booking status"}), 400
        
        return jsonify({"message": f"Booking status updated to {new_status}"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to update booking status: {str(e)}"}), 500

# Cancel booking with refund
@ticket_bp.route('/bookings/<booking_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_booking(booking_id):
    try:
        current_user = get_jwt_identity()
        
        if not is_ticketer(current_user['id']):
            return jsonify({"error": "Unauthorized access - Ticketer role required"}), 403
        
        db = get_db()
        data = request.get_json() or {}
        refund_amount = data.get('refund_amount', 0)
        reason = data.get('reason', '')
        
        # Get booking details and verify ownership
        booking = db.bookings.find_one({
            "_id": ObjectId(booking_id),
            "booked_by": ObjectId(current_user['id'])
        })
        
        if not booking:
            return jsonify({"error": "Booking not found or access denied"}), 404
        
        if booking['status'] == 'cancelled':
            return jsonify({"error": "Booking is already cancelled"}), 400
        
        # Validate refund amount
        if refund_amount < 0 or refund_amount > booking['total_amount']:
            return jsonify({"error": "Invalid refund amount"}), 400
        
        # Update booking status and refund info
        update_data = {
            "status": "cancelled",
            "payment_status": "refunded" if refund_amount > 0 else "cancelled",
            "refund_amount": refund_amount,
            "cancellation_reason": reason,
            "cancelled_by": ObjectId(current_user['id']),
            "cancelled_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        result = db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Failed to cancel booking"}), 400
        
        # Add to refunds collection if refund was processed
        if refund_amount > 0:
            db.refunds.insert_one({
                "booking_id": ObjectId(booking_id),
                "passenger_id": booking['passenger_id'],
                "amount": refund_amount,
                "reason": reason,
                "processed_by": ObjectId(current_user['id']),
                "processed_at": datetime.now(),
                "status": "completed"
            })
        
        return jsonify({
            "message": "Booking cancelled successfully",
            "refund_processed": refund_amount > 0,
            "refund_amount": refund_amount
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to cancel booking: {str(e)}"}), 500

# Get available seats for a bus on specific date
@ticket_bp.route('/buses/<bus_id>/seats-availability', methods=['GET'])
@jwt_required()
def get_seats_availability(bus_id):
    try:
        current_user = get_jwt_identity()
        
        if not is_ticketer(current_user['id']):
            return jsonify({"error": "Unauthorized access - Ticketer role required"}), 403
        
        db = get_db()
        travel_date = request.args.get('travel_date')
        
        if not travel_date:
            return jsonify({"error": "Travel date is required"}), 400
        
        # Get bus details
        bus = db.buses.find_one({"_id": ObjectId(bus_id)})
        if not bus:
            return jsonify({"error": "Bus not found"}), 404
        
        # Parse travel date
        try:
            target_date = datetime.strptime(travel_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid travel date format. Use YYYY-MM-DD"}), 400
        
        # Get booked seats for this bus on travel date
        bookings = db.bookings.find({
            "bus_id": ObjectId(bus_id),
            "travel_date": target_date,
            "status": {"$in": ["confirmed", "pending"]}
        })
        
        booked_seats = []
        for booking in bookings:
            booked_seats.extend(booking.get('seats', []))
        
        # Generate seat map
        total_seats = bus['total_seats']
        seats = []
        for seat_number in range(1, total_seats + 1):
            seats.append({
                "number": seat_number,
                "available": seat_number not in booked_seats,
                "class": "economy"  # Can be extended based on bus configuration
            })
        
        available_seats = total_seats - len(set(booked_seats))
        
        return jsonify({
            "bus": {
                "_id": str(bus['_id']),
                "bus_number": bus['bus_number'],
                "route": f"{bus.get('source', 'N/A')} to {bus.get('destination', 'N/A')}",
                "total_seats": total_seats,
                "price_per_seat": bus['price_per_seat']
            },
            "travel_date": travel_date,
            "seats": seats,
            "available_seats": available_seats,
            "booked_seats": len(booked_seats)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch seat availability: {str(e)}"}), 500

# Search available buses
@ticket_bp.route('/buses/available', methods=['GET'])
@jwt_required()
def search_available_buses():
    try:
        current_user = get_jwt_identity()
        
        if not is_ticketer(current_user['id']):
            return jsonify({"error": "Unauthorized access - Ticketer role required"}), 403
        
        db = get_db()
        
        source = request.args.get('source')
        destination = request.args.get('destination')
        travel_date = request.args.get('travel_date')
        
        if not all([source, destination, travel_date]):
            return jsonify({"error": "Source, destination, and travel date are required"}), 400
        
        # Parse travel date
        try:
            target_date = datetime.strptime(travel_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid travel date format. Use YYYY-MM-DD"}), 400
        
        # Search buses based on route
        buses = list(db.buses.find({
            "$or": [
                {"source": {"$regex": source, "$options": "i"}},
                {"destination": {"$regex": destination, "$options": "i"}}
            ]
        }))
        
        # Check availability for each bus
        available_buses = []
        for bus in buses:
            # Get booked seats count
            bookings = db.bookings.find({
                "bus_id": bus['_id'],
                "travel_date": target_date,
                "status": {"$in": ["confirmed", "pending"]}
            })
            
            booked_seats = []
            for booking in bookings:
                booked_seats.extend(booking.get('seats', []))
            
            available_seats = bus['total_seats'] - len(set(booked_seats))
            
            if available_seats > 0:
                bus_data = {
                    "_id": str(bus['_id']),
                    "bus_number": bus['bus_number'],
                    "source": bus.get('source', 'N/A'),
                    "destination": bus.get('destination', 'N/A'),
                    "departure_time": bus.get('departure_time', 'N/A'),
                    "arrival_time": bus.get('arrival_time', 'N/A'),
                    "price_per_seat": bus.get('price_per_seat', 0),
                    "total_seats": bus.get('total_seats', 0),
                    "available_seats": available_seats
                }
                available_buses.append(bus_data)
        
        return jsonify({
            "travel_date": travel_date,
            "source": source,
            "destination": destination,
            "available_buses": available_buses,
            "total_buses": len(available_buses)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to search buses: {str(e)}"}), 500
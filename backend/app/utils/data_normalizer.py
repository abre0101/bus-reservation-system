"""
Data normalizer utility - uses only snake_case field names
"""

def normalize_schedule(schedule):
    """Normalize schedule data to use consistent snake_case field names"""
    if not schedule:
        return None
    
    return {
        '_id': str(schedule.get('_id')),
        'id': str(schedule.get('_id')),
        # Route info
        'route_id': schedule.get('route_id'),
        'route_name': schedule.get('route_name'),
        'origin_city': schedule.get('origin_city'),
        'destination_city': schedule.get('destination_city'),
        # Bus info
        'bus_id': schedule.get('bus_id'),
        'bus_type': schedule.get('bus_type'),
        'bus_number': schedule.get('bus_number'),
        'plate_number': schedule.get('plate_number'),
        # Time info
        'departure_date': schedule.get('departure_date'),
        'departure_time': schedule.get('departure_time'),
        'arrival_time': schedule.get('arrival_time'),
        # Capacity
        'total_seats': schedule.get('total_seats'),
        'available_seats': schedule.get('available_seats'),
        'booked_seats': schedule.get('booked_seats', 0),
        # Pricing
        'fare_birr': schedule.get('fare_birr'),
        # Status
        'status': schedule.get('status', 'scheduled'),
        'amenities': schedule.get('amenities', []),
        # Driver
        'driver_id': schedule.get('driver_id'),
        'driver_name': schedule.get('driver_name')
    }

def normalize_booking(booking):
    """Normalize booking data to use consistent snake_case field names"""
    if not booking:
        return None
    
    return {
        '_id': str(booking.get('_id')),
        'id': str(booking.get('_id')),
        'pnr_number': booking.get('pnr_number'),
        'schedule_id': booking.get('schedule_id'),
        'user_id': booking.get('user_id'),
        # Passenger info
        'passenger_name': booking.get('passenger_name'),
        'passenger_phone': booking.get('passenger_phone'),
        'passenger_email': booking.get('passenger_email'),
        # Seat info
        'seat_number': booking.get('seat_number'),
        'seat_numbers': booking.get('seat_numbers', []),
        # Trip info
        'departure_city': booking.get('departure_city'),
        'arrival_city': booking.get('arrival_city'),
        'travel_date': booking.get('travel_date'),
        'departure_time': booking.get('departure_time'),
        'arrival_time': booking.get('arrival_time'),
        # Payment
        'total_amount': booking.get('total_amount'),
        'base_fare': booking.get('base_fare'),
        'payment_status': booking.get('payment_status'),
        'payment_method': booking.get('payment_method'),
        # Bus info
        'bus_type': booking.get('bus_type'),
        'bus_number': booking.get('bus_number'),
        'plate_number': booking.get('plate_number'),
        'bus_name': booking.get('bus_name'),
        # Status
        'status': booking.get('status'),
        'checked_in': booking.get('checked_in', False),
        # Baggage
        'has_baggage': booking.get('has_baggage', False),
        'baggage_weight': booking.get('baggage_weight', 0),
        'baggage_fee': booking.get('baggage_fee', 0),
        # Cancellation info
        'cancellation_requested': booking.get('cancellation_requested', False),
        'cancellation_status': booking.get('cancellation_status'),
        'cancellation_reason': booking.get('cancellation_reason'),
        'cancellation_request_date': booking.get('cancellation_request_date'),
        'cancellation_approved_at': booking.get('cancellation_approved_at'),
        'cancellation_rejected_at': booking.get('cancellation_rejected_at'),
        'cancellation_rejection_reason': booking.get('cancellation_rejection_reason'),
        'refund_amount': booking.get('refund_amount'),
        'refund_method': booking.get('refund_method'),
        'refund_status': booking.get('refund_status'),
        # User details
        'user': booking.get('user', {}),
        # Timestamps
        'created_at': booking.get('created_at'),
        'updated_at': booking.get('updated_at')
    }

def normalize_schedule_list(schedules):
    """Normalize a list of schedules"""
    return [normalize_schedule(s) for s in schedules if s]

def normalize_booking_list(bookings):
    """Normalize a list of bookings"""
    return [normalize_booking(b) for b in bookings if b]

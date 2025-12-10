"""
WebSocket Event Handlers for Real-Time Seat Updates
"""
from flask_socketio import emit, join_room, leave_room
from flask import request
from app import socketio, mongo
from app.utils.seat_lock import get_locked_seats, cleanup_expired_locks
from bson import ObjectId

# Store connected users per schedule
connected_users = {}

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"🔌 Client connected: {request.sid}")
    emit('connection_response', {'status': 'connected', 'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection and cleanup their locks"""
    print(f"🔌 Client disconnected: {request.sid}")
    
    # Clean up any rooms this client was in
    for schedule_id, users in list(connected_users.items()):
        if request.sid in users:
            users.remove(request.sid)
            if not users:
                del connected_users[schedule_id]

@socketio.on('join_schedule')
def handle_join_schedule(data):
    """
    Client joins a schedule room to receive real-time updates
    data: {'schedule_id': 'xxx', 'user_id': 'xxx'}
    """
    schedule_id = data.get('schedule_id')
    user_id = data.get('user_id')
    
    if not schedule_id:
        emit('error', {'message': 'schedule_id is required'})
        return
    
    # Join the room for this schedule
    join_room(schedule_id)
    
    # Track connected users
    if schedule_id not in connected_users:
        connected_users[schedule_id] = []
    if request.sid not in connected_users[schedule_id]:
        connected_users[schedule_id].append(request.sid)
    
    print(f"👥 User {user_id} joined schedule room: {schedule_id}")
    
    # Send current seat status
    try:
        # Clean up expired locks first
        cleanup_expired_locks(schedule_id)
        
        # Get occupied seats from bookings
        db = mongo.db
        bookings = db.bookings.find({
            'schedule_id': schedule_id,
            'status': {'$in': ['confirmed', 'checked_in', 'completed']}
        })
        
        occupied_seats = []
        for booking in bookings:
            occupied_seats.extend(booking.get('seat_numbers', []))
        
        # Get locked seats
        locked_seats = get_locked_seats(schedule_id)
        
        emit('seat_status_update', {
            'schedule_id': schedule_id,
            'occupied_seats': list(set(occupied_seats)),
            'locked_seats': locked_seats,
            'timestamp': str(mongo.db.command('serverStatus')['localTime'])
        })
        
    except Exception as e:
        print(f"❌ Error sending seat status: {e}")
        emit('error', {'message': str(e)})

@socketio.on('leave_schedule')
def handle_leave_schedule(data):
    """
    Client leaves a schedule room
    data: {'schedule_id': 'xxx'}
    """
    schedule_id = data.get('schedule_id')
    
    if schedule_id:
        leave_room(schedule_id)
        
        # Remove from connected users
        if schedule_id in connected_users and request.sid in connected_users[schedule_id]:
            connected_users[schedule_id].remove(request.sid)
            if not connected_users[schedule_id]:
                del connected_users[schedule_id]
        
        print(f"👋 Client left schedule room: {schedule_id}")

@socketio.on('lock_seats')
def handle_lock_seats(data):
    """
    Lock seats for a user
    data: {'schedule_id': 'xxx', 'seat_numbers': [1,2,3], 'user_id': 'xxx'}
    """
    from app.utils.seat_lock import lock_seats
    
    schedule_id = data.get('schedule_id')
    seat_numbers = data.get('seat_numbers', [])
    user_id = data.get('user_id')
    
    if not all([schedule_id, seat_numbers, user_id]):
        emit('lock_response', {
            'success': False,
            'message': 'Missing required fields'
        })
        return
    
    # Lock the seats
    success, message, locked_seats = lock_seats(schedule_id, seat_numbers, user_id)
    
    # Send response to requesting client
    emit('lock_response', {
        'success': success,
        'message': message,
        'locked_seats': locked_seats,
        'user_id': user_id
    })
    
    if success:
        # Broadcast to all clients in this schedule room
        emit('seats_locked', {
            'schedule_id': schedule_id,
            'seat_numbers': locked_seats,
            'user_id': user_id,
            'timestamp': str(mongo.db.command('serverStatus')['localTime'])
        }, room=schedule_id, include_self=False)
        
        print(f"🔒 Seats {locked_seats} locked for user {user_id} in schedule {schedule_id}")

@socketio.on('unlock_seats')
def handle_unlock_seats(data):
    """
    Unlock seats for a user
    data: {'schedule_id': 'xxx', 'seat_numbers': [1,2,3], 'user_id': 'xxx'}
    """
    from app.utils.seat_lock import unlock_seats
    
    schedule_id = data.get('schedule_id')
    seat_numbers = data.get('seat_numbers', [])
    user_id = data.get('user_id')
    
    if not all([schedule_id, seat_numbers, user_id]):
        emit('unlock_response', {
            'success': False,
            'message': 'Missing required fields'
        })
        return
    
    # Unlock the seats
    success, message = unlock_seats(schedule_id, seat_numbers, user_id)
    
    # Send response to requesting client
    emit('unlock_response', {
        'success': success,
        'message': message
    })
    
    if success:
        # Broadcast to all clients in this schedule room
        emit('seats_unlocked', {
            'schedule_id': schedule_id,
            'seat_numbers': seat_numbers,
            'user_id': user_id,
            'timestamp': str(mongo.db.command('serverStatus')['localTime'])
        }, room=schedule_id, include_self=False)
        
        print(f"🔓 Seats {seat_numbers} unlocked for user {user_id} in schedule {schedule_id}")

@socketio.on('refresh_seats')
def handle_refresh_seats(data):
    """
    Force refresh seat status for a schedule
    data: {'schedule_id': 'xxx'}
    """
    schedule_id = data.get('schedule_id')
    
    if not schedule_id:
        emit('error', {'message': 'schedule_id is required'})
        return
    
    try:
        # Clean up expired locks
        cleanup_expired_locks(schedule_id)
        
        # Get current seat status
        db = mongo.db
        bookings = db.bookings.find({
            'schedule_id': schedule_id,
            'status': {'$in': ['confirmed', 'checked_in', 'completed']}
        })
        
        occupied_seats = []
        for booking in bookings:
            occupied_seats.extend(booking.get('seat_numbers', []))
        
        locked_seats = get_locked_seats(schedule_id)
        
        # Broadcast to all clients in this schedule room
        emit('seat_status_update', {
            'schedule_id': schedule_id,
            'occupied_seats': list(set(occupied_seats)),
            'locked_seats': locked_seats,
            'timestamp': str(mongo.db.command('serverStatus')['localTime'])
        }, room=schedule_id)
        
        print(f"🔄 Refreshed seat status for schedule {schedule_id}")
        
    except Exception as e:
        print(f"❌ Error refreshing seats: {e}")
        emit('error', {'message': str(e)})

def broadcast_seat_booked(schedule_id, seat_numbers):
    """
    Broadcast that seats have been booked (called from booking route)
    """
    try:
        socketio.emit('seats_booked', {
            'schedule_id': schedule_id,
            'seat_numbers': seat_numbers,
            'timestamp': str(mongo.db.command('serverStatus')['localTime'])
        }, room=schedule_id)
        
        print(f"📢 Broadcasted seat booking: {seat_numbers} for schedule {schedule_id}")
    except Exception as e:
        print(f"❌ Error broadcasting seat booking: {e}")

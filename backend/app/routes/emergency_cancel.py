"""
Emergency Schedule Cancellation with Automatic Refunds
Handles emergency cancellations due to accidents, blockages, weather, etc.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import logging

from app import mongo

emergency_bp = Blueprint('emergency', __name__)
logger = logging.getLogger(__name__)

def is_admin():
    """Check if current user is admin"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
    except Exception as e:
        logger.error(f"Admin check error: {e}")
        return False

@emergency_bp.route('/schedules/<schedule_id>/emergency-cancel', methods=['POST'])
@jwt_required()
def emergency_cancel_schedule(schedule_id):
    """
    Emergency cancel a schedule and automatically refund all passengers 100%
    
    Use cases:
    - Road blockage
    - Accident on route
    - Severe weather
    - Bus breakdown
    - Driver emergency
    - Government order
    """
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data required'}), 400
        
        reason = data.get('reason', '').strip()
        if not reason:
            return jsonify({'error': 'Cancellation reason is required'}), 400
        
        refund_percentage = data.get('refund_percentage', 100)
        
        # Get the schedule
        schedule = mongo.db.busschedules.find_one({'_id': ObjectId(schedule_id)})
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Check if already cancelled
        if schedule.get('status') == 'cancelled':
            return jsonify({'error': 'Schedule is already cancelled'}), 400
        
        # Get all bookings for this schedule
        bookings = list(mongo.db.bookings.find({
            'schedule_id': ObjectId(schedule_id),
            'status': {'$in': ['confirmed', 'pending', 'checked_in']},
            'payment_status': 'paid'
        }))
        
        logger.info(f"🚨 Emergency cancellation: Schedule {schedule_id}, {len(bookings)} bookings affected")
        
        # Calculate total refund amount
        total_refund_amount = 0
        refunded_bookings = []
        failed_refunds = []
        
        # Process refunds for each booking
        for booking in bookings:
            try:
                booking_id = booking['_id']
                amount = booking.get('total_amount', 0)
                refund_amount = (amount * refund_percentage) / 100
                
                # Update booking status
                mongo.db.bookings.update_one(
                    {'_id': booking_id},
                    {
                        '$set': {
                            'status': 'cancelled',
                            'cancellation_reason': reason,  # Store the full reason
                            'cancellation_type': 'emergency',  # Mark as emergency cancellation
                            'cancelled_at': datetime.utcnow(),
                            'refund_status': 'refunded',
                            'refund_amount': refund_amount,
                            'refund_percentage': refund_percentage,
                            'refunded_at': datetime.utcnow(),
                            'updated_at': datetime.utcnow()
                        }
                    }
                )
                
                # Create refund record
                refund_record = {
                    'booking_id': booking_id,
                    'schedule_id': ObjectId(schedule_id),
                    'passenger_name': booking.get('passenger_name'),
                    'passenger_email': booking.get('passenger_email'),
                    'passenger_phone': booking.get('passenger_phone'),
                    'original_amount': amount,
                    'refund_amount': refund_amount,
                    'refund_percentage': refund_percentage,
                    'refund_reason': reason,
                    'refund_type': 'emergency_cancellation',
                    'payment_method': booking.get('payment_method', 'cash'),
                    'status': 'completed',
                    'processed_by': get_jwt_identity(),
                    'created_at': datetime.utcnow(),
                    'processed_at': datetime.utcnow()
                }
                mongo.db.refunds.insert_one(refund_record)
                
                total_refund_amount += refund_amount
                refunded_bookings.append({
                    'booking_id': str(booking_id),
                    'pnr_number': booking.get('pnr_number'),
                    'passenger_name': booking.get('passenger_name'),
                    'refund_amount': refund_amount
                })
                
                logger.info(f"✅ Refunded booking {booking.get('pnr_number')}: {refund_amount} ETB")
                
            except Exception as e:
                logger.error(f"❌ Failed to refund booking {booking.get('_id')}: {e}")
                failed_refunds.append({
                    'booking_id': str(booking.get('_id')),
                    'pnr_number': booking.get('pnr_number'),
                    'error': str(e)
                })
        
        # Calculate total seats to restore
        total_seats_to_restore = sum(len(b.get('seat_numbers', [])) for b in bookings)
        
        # Update schedule status and restore all seats
        mongo.db.busschedules.update_one(
            {'_id': ObjectId(schedule_id)},
            {
                '$set': {
                    'status': 'cancelled',
                    'cancellation_reason': reason,
                    'cancellation_type': 'emergency',
                    'cancelled_at': datetime.utcnow(),
                    'cancelled_by': get_jwt_identity(),
                    'affected_bookings': len(bookings),
                    'total_refund_amount': total_refund_amount,
                    'booked_seats': 0,  # Reset to 0 since all bookings cancelled
                    'updated_at': datetime.utcnow()
                },
                '$inc': {
                    'available_seats': total_seats_to_restore  # Restore all seats
                }
            }
        )
        
        logger.info(f"✅ Schedule {schedule_id} cancelled. Total refund: {total_refund_amount} ETB")
        
        # TODO: Send notifications to passengers
        # - Email notification
        # - SMS notification
        # - Push notification (if app exists)
        
        return jsonify({
            'success': True,
            'message': 'Schedule cancelled and passengers refunded successfully',
            'schedule_id': schedule_id,
            'cancellation_reason': reason,
            'affected_bookings': len(bookings),
            'refunded_bookings': len(refunded_bookings),
            'failed_refunds': len(failed_refunds),
            'total_refund_amount': total_refund_amount,
            'refund_percentage': refund_percentage,
            'refunded_passengers': refunded_bookings,
            'failed_refunds': failed_refunds if failed_refunds else None
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Emergency cancellation error: {e}")
        return jsonify({'error': str(e)}), 500


@emergency_bp.route('/schedules/<schedule_id>/refund-summary', methods=['GET'])
@jwt_required()
def get_refund_summary(schedule_id):
    """Get refund summary for a cancelled schedule"""
    try:
        if not is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get refunds for this schedule
        refunds = list(mongo.db.refunds.find({
            'schedule_id': ObjectId(schedule_id)
        }))
        
        total_refunded = sum(r.get('refund_amount', 0) for r in refunds)
        
        return jsonify({
            'schedule_id': schedule_id,
            'total_refunds': len(refunds),
            'total_amount_refunded': total_refunded,
            'refunds': [{
                'booking_id': str(r.get('booking_id')),
                'passenger_name': r.get('passenger_name'),
                'refund_amount': r.get('refund_amount'),
                'refund_percentage': r.get('refund_percentage'),
                'status': r.get('status'),
                'processed_at': r.get('processed_at').isoformat() if r.get('processed_at') else None
            } for r in refunds]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting refund summary: {e}")
        return jsonify({'error': str(e)}), 500

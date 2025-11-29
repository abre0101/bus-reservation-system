import React, { useState } from 'react'
import { X, AlertCircle, Send, Clock } from 'lucide-react'
import { bookingService } from '../../services/bookingService'
import { toast } from 'react-toastify'

const CancellationRequestModal = ({ booking, onClose, onSuccess, isOpen }) => {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Calculate days until departure - with null safety
  const getDaysUntilDeparture = () => {
    if (!booking || !booking.travel_date || !booking.departure_time) return null
    
    try {
      const now = new Date()
      const travelDate = new Date(booking.travel_date)
      const [hours, minutes] = booking.departure_time.split(':').map(Number)
      
      const departure_dateTime = new Date(travelDate)
      departure_dateTime.setHours(hours, minutes, 0, 0)
      
      const timeDiff = departure_dateTime.getTime() - now.getTime()
      const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000))
      const hours_remaining = Math.floor((timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
      
      return { days, hours: hours_remaining, total_hours: timeDiff / (60 * 60 * 1000) }
    } catch (error) {
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }

    try {
      setSubmitting(true)
      console.log('📤 Submitting cancellation request for booking:', booking._id)
      
      const response = await bookingService.requestCancellation(booking._id, reason)
      
      console.log('✅ Cancellation request submitted:', response)
      toast.success('Cancellation request submitted successfully! An operator will review your request.')
      
      if (onSuccess) {
        onSuccess(response)
      }
      
      onClose()
    } catch (error) {
      console.error('❌ Error submitting cancellation request:', error)
      
      // Handle duplicate request error specifically
      if (error.message && error.message.includes('already submitted')) {
        toast.warning('You have already submitted a cancellation request for this booking. Please wait for operator review.')
      } else {
        toast.error(error.message || 'Failed to submit cancellation request')
      }
      
      // Close modal on duplicate request error
      if (error.message && error.message.includes('already submitted')) {
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Don't render if modal is not open or booking is null
  if (!isOpen || !booking) {
    return null
  }

  const timeInfo = getDaysUntilDeparture()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Request Cancellation</h2>
            <p className="text-orange-100 mt-1">PNR: {booking.pnr_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-3">Booking Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Route:</span>
                <p className="font-semibold text-gray-900">
                  {booking.departure_city} → {booking.arrival_city}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Travel Date:</span>
                <p className="font-semibold text-gray-900">{booking.travel_date}</p>
              </div>
              <div>
                <span className="text-gray-600">Passenger:</span>
                <p className="font-semibold text-gray-900">{booking.passenger_name}</p>
              </div>
              <div>
                <span className="text-gray-600">Amount:</span>
                <p className="font-semibold text-gray-900">{booking.total_amount} ETB</p>
              </div>
            </div>
          </div>

          {/* Time Until Departure */}
          {timeInfo && (
            <div className={`border-2 rounded-xl p-4 ${
              timeInfo.total_hours >= 48 
                ? 'bg-green-50 border-green-300' 
                : 'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Clock className={`h-5 w-5 ${
                  timeInfo.total_hours >= 48 ? 'text-green-600' : 'text-yellow-600'
                }`} />
                <h3 className={`font-semibold ${
                  timeInfo.total_hours >= 48 ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  Time Until Departure
                </h3>
              </div>
              <p className={`text-lg font-bold ${
                timeInfo.total_hours >= 48 ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {timeInfo.days} days, {timeInfo.hours} hours
              </p>
              {timeInfo.total_hours < 48 && (
                <p className="text-yellow-700 text-sm mt-2">
                  ⚠️ Cancellation requests should be made at least 2 days before departure
                </p>
              )}
            </div>
          )}

          {/* Important Notice */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-2">Important Information</h3>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Cancellation requests must be made at least 2 days before departure</li>
                  <li>• An operator will review your request within 24 hours</li>
                  <li>• Refunds will be processed to your original payment method</li>
                  <li>• You will be notified via SMS/Email about the decision</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Cancellation Reason Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Cancellation *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your cancellation request..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                rows={4}
                required
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-2">
                Providing a clear reason helps us process your request faster
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CancellationRequestModal

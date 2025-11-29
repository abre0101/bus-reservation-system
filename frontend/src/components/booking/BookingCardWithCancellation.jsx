import React, { useState } from 'react'
import { XCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import CancellationRequestModal from './CancellationRequestModal'

/**
 * Example Booking Card Component with Cancellation Feature
 * 
 * This is a reference implementation showing how to integrate
 * the cancellation request feature into your booking cards.
 * 
 * Copy the relevant parts into your MyBookings.jsx component.
 */

const BookingCardWithCancellation = ({ booking, onRefresh }) => {
  const [showCancellationModal, setShowCancellationModal] = useState(false)

  // Check if booking is eligible for cancellation
  const canRequestCancellation = (booking) => {
    // Already cancelled or completed
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return false
    }

    // Already requested cancellation
    if (booking.cancellation_requested) {
      return false
    }

    // Missing travel information
    if (!booking.travel_date || !booking.departure_time) {
      return false
    }

    try {
      const now = new Date()
      const travelDate = new Date(booking.travel_date)
      const [hours, minutes] = booking.departure_time.split(':').map(Number)
      
      const departure_dateTime = new Date(travelDate)
      departure_dateTime.setHours(hours, minutes, 0, 0)
      
      const timeDiff = departure_dateTime.getTime() - now.getTime()
      const hoursDiff = timeDiff / (60 * 60 * 1000)
      
      // Must be at least 48 hours (2 days) before departure
      return hoursDiff >= 48
    } catch (error) {
      console.error('Error checking cancellation eligibility:', error)
      return false
    }
  }

  // Get cancellation status badge
  const getCancellationStatusBadge = () => {
    if (!booking.cancellation_requested) return null

    const status = booking.cancellation_status || 'pending'
    
    const statusConfig = {
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: Clock,
        label: 'Cancellation Pending'
      },
      approved: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Cancellation Approved'
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: AlertCircle,
        label: 'Cancellation Rejected'
      }
    }

    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon

    return (
      <div className={`${config.bg} ${config.text} px-4 py-2 rounded-lg flex items-center space-x-2`}>
        <Icon className="h-4 w-4" />
        <span className="font-semibold text-sm">{config.label}</span>
      </div>
    )
  }

  const handleCancellationSuccess = (response) => {
    console.log('Cancellation request submitted:', response)
    setShowCancellationModal(false)
    
    // Refresh bookings list
    if (onRefresh) {
      onRefresh()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      {/* Booking Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            PNR: {booking.pnr_number}
          </h3>
          <p className="text-gray-600">
            {booking.departure_city} → {booking.arrival_city}
          </p>
        </div>
        
        {/* Status Badge */}
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {booking.status}
        </span>
      </div>

      {/* Booking Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Travel Date</p>
          <p className="font-semibold text-gray-900">{booking.travel_date}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Departure Time</p>
          <p className="font-semibold text-gray-900">{booking.departure_time}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Passenger</p>
          <p className="font-semibold text-gray-900">{booking.passenger_name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Amount</p>
          <p className="font-semibold text-green-600">{booking.total_amount} ETB</p>
        </div>
      </div>

      {/* Cancellation Status Badge */}
      {getCancellationStatusBadge()}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
        {/* View Details Button */}
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          View Details
        </button>

        {/* Cancellation Button - Only show if eligible */}
        {canRequestCancellation(booking) && (
          <button
            onClick={() => setShowCancellationModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
          >
            <XCircle className="h-4 w-4" />
            <span>Request Cancellation</span>
          </button>
        )}

        {/* Show reason if rejected */}
        {booking.cancellation_status === 'rejected' && booking.cancellation_rejection_reason && (
          <div className="w-full mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason:</p>
            <p className="text-sm text-red-700">{booking.cancellation_rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancellationModal && (
        <CancellationRequestModal
          booking={booking}
          onClose={() => setShowCancellationModal(false)}
          onSuccess={handleCancellationSuccess}
        />
      )}
    </div>
  )
}

export default BookingCardWithCancellation

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. Copy the imports at the top
 * 2. Copy the canRequestCancellation function
 * 3. Copy the getCancellationStatusBadge function
 * 4. Add the cancellation button to your existing booking card
 * 5. Add the modal at the end of your component
 * 
 * Example usage in MyBookings.jsx:
 * 
 * import CancellationRequestModal from '../../components/booking/CancellationRequestModal'
 * 
 * const [showCancellationModal, setShowCancellationModal] = useState(false)
 * const [selectedBooking, setSelectedBooking] = useState(null)
 * 
 * // In your booking card render:
 * {canRequestCancellation(booking) && (
 *   <button onClick={() => {
 *     setSelectedBooking(booking)
 *     setShowCancellationModal(true)
 *   }}>
 *     Request Cancellation
 *   </button>
 * )}
 * 
 * // At the end of your component:
 * {showCancellationModal && selectedBooking && (
 *   <CancellationRequestModal
 *     booking={selectedBooking}
 *     onClose={() => {
 *       setShowCancellationModal(false)
 *       setSelectedBooking(null)
 *     }}
 *     onSuccess={() => {
 *       setShowCancellationModal(false)
 *       setSelectedBooking(null)
 *       loadBookings() // Refresh your bookings
 *     }}
 *   />
 * )}
 */

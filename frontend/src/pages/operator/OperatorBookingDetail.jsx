import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  Bus, 
  Ticket, 
  CheckCircle, 
  XCircle,
  Download,
  Mail,
  Phone,
  Shield,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { operatorService } from '../../services/operatorService'
import { formatDate, formatTime, formatCurrency } from '../../utils/helpers'
import { toast } from 'react-toastify'

const OperatorBookingDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    loadBookingDetails()
  }, [id])

  const loadBookingDetails = async () => {
    try {
      setLoading(true)
      setApiError(null)
      console.log('🔄 Loading booking details for ID:', id)
      console.log('📡 Making API call to:', `/operator/bookings/${id}`)
      
      const result = await operatorService.getBookingDetails(id)
      console.log('📋 Full API response:', result)
      
      if (result.success && result.booking) {
        console.log('✅ Booking data received:', result.booking)
        setBooking(result.booking)
      } else {
        console.log('❌ API returned success but no booking data')
        setApiError(result.message || 'Booking not found in response')
        toast.error('Booking not found')
      }
    } catch (error) {
      console.error('❌ API call failed:', error)
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      })
      setApiError(error.message)
      toast.error(error.message || 'Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
          <p className="text-sm text-gray-500 mt-2">ID: {id}</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-2">The requested booking could not be found.</p>
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">Error: {apiError}</p>
              <p className="text-xs text-red-600 mt-1">Booking ID: {id}</p>
            </div>
          )}
          <Link
            to="/operator/checkin"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Check-in</span>
          </Link>
          <button
            onClick={loadBookingDetails}
            className="mt-4 flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    )
  }

  // If we have booking data, show the booking details
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/operator/checkin"
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Check-in</span>
          </Link>
        </div>
        <button
          onClick={loadBookingDetails}
          className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Booking Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{booking.passenger_name}</h1>
              <div className="flex items-center space-x-4 text-blue-100">
                <div className="flex items-center space-x-1">
                  <Ticket className="h-4 w-4" />
                  <span className="font-mono">PNR: {booking.pnr_number}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{booking.departure_city} → {booking.arrival_city}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 lg:mt-0">
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                <CheckCircle className="h-3 w-3" />
                <span>{booking.status || 'Confirmed'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Passenger Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <span>Passenger Information</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Full Name:</span>
                  <span className="font-semibold">{booking.passenger_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-semibold flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{booking.passenger_email || 'N/A'}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-semibold flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>{booking.passenger_phone || 'N/A'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Journey Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Bus className="h-5 w-5 text-blue-600" />
                <span>Journey Details</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Travel Date:</span>
                  <span className="font-semibold flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(booking.travel_date)}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Departure Time:</span>
                  <span className="font-semibold flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(booking.departure_time)}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bus Number:</span>
                  <span className="font-semibold">{booking.bus_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seat Numbers:</span>
                  <span className="font-semibold">
                    {Array.isArray(booking.seat_numbers) 
                      ? booking.seat_numbers.join(', ') 
                      : booking.seat_numbers || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Refund Information */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(booking.total_amount || 0)} ETB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className={`font-semibold ${
                      booking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {booking.payment_status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Show refund info if booking is cancelled */}
              {booking.status === 'cancelled' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">Cancellation Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-700">Refund Amount (60%):</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency((booking.refund_amount || booking.total_amount * 0.60))} ETB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Cancellation Fee (40%):</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency((booking.cancellation_fee || booking.total_amount * 0.40))} ETB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Refund Status:</span>
                      <span className="font-semibold text-gray-900">
                        {booking.refund_status || 'Processed'}
                      </span>
                    </div>
                    {booking.refund_method && (
                      <div className="flex justify-between">
                        <span className="text-red-700">Refund Method:</span>
                        <span className="font-semibold text-gray-900">
                          {booking.refund_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Show cancellation request info if pending */}
              {booking.cancellation_requested && booking.cancellation_status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">Cancellation Requested</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Potential Refund (60%):</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(booking.total_amount * 0.60)} ETB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Cancellation Fee (40%):</span>
                      <span className="font-semibold text-yellow-600">
                        {formatCurrency(booking.total_amount * 0.40)} ETB
                      </span>
                    </div>
                    {booking.cancellation_reason && (
                      <div className="mt-2 pt-2 border-t border-yellow-200">
                        <span className="text-yellow-700 block mb-1">Reason:</span>
                        <p className="text-gray-700 text-xs">{booking.cancellation_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-blue-700 text-sm">
              <strong>Note:</strong> All cancellations are subject to a 60% refund policy with a 40% cancellation fee.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OperatorBookingDetail
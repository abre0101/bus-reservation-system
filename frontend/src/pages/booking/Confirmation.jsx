import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Download, Printer, Mail, ArrowLeft } from 'lucide-react'
import { bookingService } from '../../services/bookingService'
import { toast } from 'react-toastify'

const Confirmation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  const bookingId = location.state?.bookingId

  useEffect(() => {
    if (bookingId) {
      loadBookingDetails()
    } else {
      // Try to get from session storage
      const storedBooking = sessionStorage.getItem('bookingData')
      if (storedBooking) {
        try {
          setBooking(JSON.parse(storedBooking))
        } catch (error) {
          console.error('Error parsing stored booking:', error)
        }
      }
      setLoading(false)
    }
  }, [bookingId])

  const loadBookingDetails = async () => {
    try {
      const bookingData = await bookingService.getBookingDetails(bookingId)
      setBooking(bookingData)
    } catch (error) {
      toast.error('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // In a real app, this would generate a PDF ticket
    toast.info('Download feature coming soon!')
  }

  const handleEmail = () => {
    // In a real app, this would send email
    toast.info('Email feature coming soon!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">Unable to load booking confirmation.</p>
          <button onClick={() => navigate('/search')} className="btn-primary">
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/search')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </button>
          
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
            <p className="text-gray-600">Your journey is booked successfully</p>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-xl text-gray-600 mb-4">
            Your booking has been confirmed successfully
          </p>
          {booking.payment?.pnr_number && (
            <p className="text-lg font-semibold text-ethio-green">
              PNR: {booking.payment.pnr_number}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handlePrint}
              className="btn-outline flex items-center justify-center space-x-2"
            >
              <Printer className="h-5 w-5" />
              <span>Print Ticket</span>
            </button>
            
            <button
              onClick={handleDownload}
              className="btn-outline flex items-center justify-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Download PDF</span>
            </button>
            
            <button
              onClick={handleEmail}
              className="btn-outline flex items-center justify-center space-x-2"
            >
              <Mail className="h-5 w-5" />
              <span>Email Ticket</span>
            </button>
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Booking Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Journey Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Journey Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Route:</span>
                  <span className="font-medium">
                    {booking.schedule?.departure_city} → {booking.schedule?.arrival_city}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(booking.schedule?.departure_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">
                    {booking.schedule?.departure_time} - {booking.schedule?.arrival_time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bus:</span>
                  <span className="font-medium">
                    {booking.schedule?.bus?.name} ({booking.schedule?.bus?.number})
                  </span>
                </div>
              </div>
            </div>

            {/* Passenger Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Passenger Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{booking.passenger?.passenger_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{booking.passenger?.passenger_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seats:</span>
                  <span className="font-medium">
                    {Array.isArray(booking.seats) ? booking.seats.join(', ') : 'N/A'}
                  </span>
                </div>
                {booking.baggage?.has_baggage && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Baggage:</span>
                    <span className="font-medium">
                      {booking.baggage.baggage_weight}kg
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Payment Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Fare:</span>
                <span className="font-medium">{booking.baseFare || booking.totalAmount - (booking.baggage?.baggage_fee || 0)} ETB</span>
              </div>
              {booking.baggage?.has_baggage && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Baggage Fee:</span>
                  <span className="font-medium">{booking.baggage.baggage_fee} ETB</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total Paid:</span>
                <span className="text-ethio-green">{booking.totalAmount} ETB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-3">What's Next?</h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Your ticket has been sent to your email (if provided)</li>
            <li>• Arrive at the boarding point 30 minutes before departure</li>
            <li>• Bring a valid ID and your ticket (digital or printed)</li>
            <li>• Present your PNR number or QR code for check-in</li>
            <li>• Keep your baggage tag safe for identification</li>
          </ul>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Link to="/my-bookings" className="btn-primary">
            View My Bookings
          </Link>
          <Link to="/search" className="btn-outline">
            Book Another Ticket
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Confirmation
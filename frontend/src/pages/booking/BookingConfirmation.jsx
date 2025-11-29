import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BookingProgress from '../../components/booking/BookingProgress'
import { CheckCircle, Download, Home } from 'lucide-react'
import { toast } from 'react-toastify'

const BookingConfirmation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  const { paymentResult, txRef, status } = location.state || {}

  // Clear all booking session data when confirmation page loads
  // This ensures a fresh start for the next booking
  useEffect(() => {
    console.log('🎉 Booking confirmed - clearing session for next booking')
    const bookingSessionKeys = [
      'selectedSchedule',
      'selectedSeats',
      'passengerData',
      'baseFare',
      'passengerCount',
      'baggageData',
      'totalBaggageFee',
      'totalAmount',
      'bookingData',
      'chapa_tx_ref',
      'pending_booking_data',
      'pending_chapa_tx_ref',
      'pending_chapa_booking_data'
    ]
    bookingSessionKeys.forEach(key => sessionStorage.removeItem(key))
    console.log('✅ All booking session data cleared - ready for next booking')
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 py-8">
      {/* Elegant Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-green-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-3xl">
        {/* Booking Progress */}
        <BookingProgress currentStep={5} />

        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-32 h-32 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-white animate-bounce">
            <CheckCircle className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Booking Confirmed!
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
            🎉 Your bus ticket has been successfully booked. You will receive a confirmation email shortly.
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border-2 border-white/60">

          {paymentResult?.pnr_number && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl p-8 mb-8 border-2 border-green-300 shadow-2xl relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200/30 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mr-4 shadow-xl transform hover:scale-110 transition-transform">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">Booking Details</h3>
                    <p className="text-sm text-gray-600 font-medium mt-1">Save these details for your journey</p>
                  </div>
                </div>
                
                <div className="space-y-3 text-base">
                  {/* PNR Number - Most Important */}
                  <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-green-200 hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                          <span className="text-2xl">📋</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium block">PNR Number</span>
                          <span className="font-bold text-green-600 text-2xl tracking-wide">{paymentResult.pnr_number}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(paymentResult.pnr_number)
                          toast.success('PNR copied to clipboard!')
                        }}
                        className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium text-sm transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Booking ID */}
                  {paymentResult.booking_id && (
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🎫</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-sm font-medium block">Booking ID</span>
                            <span className="font-bold text-gray-900 text-lg">{paymentResult.booking_id}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(paymentResult.booking_id)
                            toast.success('Booking ID copied!')
                          }}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Baggage Tag */}
                  {paymentResult.baggage_tag && (
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🧳</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-sm font-medium block">Baggage Tag</span>
                            <span className="font-bold text-gray-900 text-lg">{paymentResult.baggage_tag}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(paymentResult.baggage_tag)
                            toast.success('Baggage tag copied!')
                          }}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment Method Badge */}
                  {paymentResult.payment_method && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">💳</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-sm font-medium block">Payment Method</span>
                            <span className="font-bold text-purple-700 text-lg capitalize">{paymentResult.payment_method}</span>
                          </div>
                        </div>
                        <div className="bg-green-100 px-4 py-2 rounded-full">
                          <span className="text-green-700 font-bold text-sm flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Paid
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Important Information */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border-2 border-blue-200">
            <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
              <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Important Information
            </h4>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-500 mr-2 mt-1">✓</span>
                <span>Please arrive at the station at least 30 minutes before departure</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2 mt-1">✓</span>
                <span>Bring a valid ID and your PNR number for boarding</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2 mt-1">✓</span>
                <span>Check your email for the complete booking confirmation</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/my-bookings')}
              className="relative flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-all font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 border-2 border-white/50 overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              <Download className="h-6 w-6 mr-2 relative" />
              <span className="relative">View My Bookings</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-bold text-lg shadow-lg hover:shadow-xl"
            >
              <Home className="h-6 w-6 mr-2" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingConfirmation
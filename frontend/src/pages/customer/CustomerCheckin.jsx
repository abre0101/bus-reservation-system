import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  User, 
  Ticket, 
  MapPin, 
  Calendar, 
  Clock,
  Bus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-toastify'
import { checkinService } from '../../services/checkinService'

const CustomerCheckin = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkinSuccess, setCheckinSuccess] = useState(false)

  useEffect(() => {
    console.log('📍 Location state:', location.state)
    console.log('📍 Booking data from state:', location.state?.booking)

    const initializeBooking = async () => {
      try {
        // If we have booking data from navigation
        if (location.state?.booking) {
          const bookingData = location.state.booking
          
          // Use _id instead of id (MongoDB uses _id)
          const bookingId = bookingData._id || bookingData.id
          
          if (!bookingId) {
            toast.error('Invalid booking data: Missing booking ID')
            navigate('/customer/my-bookings')
            return
          }

          console.log('🔍 Booking ID:', bookingId)
          
          // Set the booking data immediately for display
          setBooking(bookingData)
          
        } else {
          toast.error('No booking information found. Please select a booking from your bookings page.')
          navigate('/customer/my-bookings')
        }
      } catch (error) {
        console.error('Error initializing booking:', error)
        toast.error('Failed to load booking details')
        navigate('/customer/my-bookings')
      }
    }

    initializeBooking()
  }, [location, navigate])

  const handleCheckin = async () => {
    if (!booking) return

    // Get the correct booking ID (MongoDB uses _id)
    const bookingId = booking._id || booking.id
    
    if (!bookingId) {
      toast.error('Invalid booking: Missing booking ID')
      return
    }

    console.log('🎫 Processing check-in for booking ID:', bookingId)
    console.log('📋 Booking details:', booking)

    setLoading(true)
    try {
      // Call the real API to check in using the correct booking ID
      const updatedBooking = await checkinService.checkin(bookingId)
      
      console.log('✅ Check-in successful, updated booking:', updatedBooking)
      
      // Update local state with the response from API
      setBooking(updatedBooking)
      setCheckinSuccess(true)
      toast.success('Check-in successful! Your boarding pass has been generated.')
      
      // Trigger refresh in MyBookings
      window.dispatchEvent(new Event('bookingUpdated'))
      
    } catch (error) {
      console.error('❌ Check-in failed:', error)
      toast.error(error.message || 'Check-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToBookings = () => {
    navigate('/customer/my-bookings')
  }

  const handleDownloadBoardingPass = () => {
    if (!booking) return

    const boardingPassContent = `
      BOARDING PASS
      =============
      PNR: ${booking.pnr_number}
      Passenger: ${booking.passenger_name}
      Route: ${booking.departure_city} → ${booking.arrival_city}
      Date: ${booking.travel_date}
      Time: ${booking.departure_time}
      Bus: ${booking.bus_type} (${booking.bus_number})
      Seats: ${Array.isArray(booking.seat_numbers) ? booking.seat_numbers.join(', ') : booking.seat_numbers}
      
      Status: CHECKED IN
      Check-in Time: ${new Date().toLocaleString()}
      
      Please arrive at the boarding point 30 minutes before departure.
    `
    
    const blob = new Blob([boardingPassContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `boarding-pass-${booking.pnr_number}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    toast.success('Boarding pass downloaded!')
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBackToBookings}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to My Bookings</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Online Check-in</h1>
          <div className="w-24"></div>
        </div>


        {!checkinSuccess ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Ready to Check In</h2>
                  <p className="text-blue-100">Complete your online check-in for a smoother journey</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{booking.pnr_number}</div>
                  <div className="text-blue-100">Booking Reference</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Journey Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600">Route</div>
                    <div className="font-semibold text-gray-900">
                      {booking.departure_city} → {booking.arrival_city}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600">Travel Date</div>
                    <div className="font-semibold text-gray-900">{booking.travel_date}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600">Departure Time</div>
                    <div className="font-semibold text-gray-900">{booking.departure_time}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Bus className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600">Bus</div>
                    <div className="font-semibold text-gray-900">
                      {booking.bus_type} ({booking.bus_number})
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-semibold text-gray-900">{booking.passenger_name}</div>
                    <div className="text-sm text-gray-600">
                      Seats: {Array.isArray(booking.seat_numbers) ? booking.seat_numbers.join(', ') : booking.seat_numbers}
                    </div>
                    <div className="text-sm text-gray-600">
                      Phone: {booking.passenger_phone}
                    </div>
                    <div className="text-sm text-gray-600">
                      Email: {booking.passenger_email}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-2">Important Information</h4>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li>• Please arrive at the boarding point at least 30 minutes before departure</li>
                    <li>• Have your ID and this boarding pass ready for verification</li>
                    <li>• Check-in closes 1 hour before departure time</li>
                    <li>• Baggage allowance: 15kg per passenger</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6">
              <button
                onClick={handleCheckin}
                disabled={loading}
                className="w-full bg-green-600 text-white py-4 px-6 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg flex items-center justify-center space-x-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Processing Check-in...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-6 w-6" />
                    <span>Complete Check-in</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden text-center">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-8 text-white">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Check-in Successful!</h2>
              <p className="text-green-100 text-lg">You're all set for your journey</p>
            </div>

            <div className="p-8">
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900">{booking.pnr_number}</div>
                  <div className="text-gray-600">Booking Reference</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Passenger</div>
                    <div className="font-semibold">{booking.passenger_name}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Seats</div>
                    <div className="font-semibold">
                      {Array.isArray(booking.seat_numbers) ? booking.seat_numbers.join(', ') : booking.seat_numbers}
                    </div>
                  </div>
                  <div className="text-center md:col-span-2">
                    <div className="text-gray-600">Status</div>
                    <div className="font-semibold text-green-600 flex items-center justify-center space-x-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Checked In</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleDownloadBoardingPass}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                >
                  <Ticket className="h-5 w-5" />
                  <span>Download Boarding Pass</span>
                </button>
                <button
                  onClick={handleBackToBookings}
                  className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors font-semibold"
                >
                  Back to My Bookings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerCheckin
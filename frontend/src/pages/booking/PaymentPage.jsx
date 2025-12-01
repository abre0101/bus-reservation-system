import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import BookingProgress from '../../components/booking/BookingProgress'
import PaymentForm from '../../components/booking/PaymentForm'
import { toast } from 'react-toastify'

const PaymentPage = () => {
  const navigate = useNavigate()
  const [bookingData, setBookingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(null)

  useEffect(() => {
    const loadBookingData = async () => {
      try {
        console.log('💰 PaymentPage loading booking data...')
        
        // Get all data from session storage
        const storedSchedule = sessionStorage.getItem('selectedSchedule')
        const storedSeats = sessionStorage.getItem('selectedSeats')
        const storedPassenger = sessionStorage.getItem('passengerData')
        const storedBaseFare = sessionStorage.getItem('baseFare')
        const storedBaggage = sessionStorage.getItem('baggageData')
        const storedTotalBaggageFee = sessionStorage.getItem('totalBaggageFee')
        const storedPassengerCount = sessionStorage.getItem('passengerCount')

        console.log('📦 Session storage check:', {
          schedule: !!storedSchedule,
          seats: !!storedSeats,
          passenger: !!storedPassenger,
          baseFare: storedBaseFare,
          baggage: !!storedBaggage,
          baggageFee: storedTotalBaggageFee,
          passengerCount: storedPassengerCount
        })

        // Validate required data
        if (!storedSchedule || !storedSeats || !storedPassenger) {
          console.error('❌ Missing required booking data')
          toast.error('Missing booking information. Please start over.')
          navigate('/search')
          return
        }

        // Parse all data
        const schedule = JSON.parse(storedSchedule)
        const selectedSeats = JSON.parse(storedSeats)
        const passengers = JSON.parse(storedPassenger)
        const baseFare = parseFloat(storedBaseFare || '0')
        const baggageData = storedBaggage ? JSON.parse(storedBaggage) : { has_baggage: false, baggage_fee: 0, baggage_weight: 0 }
        const totalBaggageFee = parseFloat(storedTotalBaggageFee || '0')
        const passengerCount = parseInt(storedPassengerCount || '1')

        // Calculate base total amount
        const baseTotal = baseFare + totalBaggageFee

        // Fetch loyalty discount
        let discountAmount = 0
        let discountPercentage = 0
        let finalAmount = baseTotal
        let loyaltyInfo = null

        try {
          const token = sessionStorage.getItem('token')
          console.log('🔑 Token exists:', !!token)
          console.log('💰 Fetching discount for base price:', baseTotal)
          
          if (token) {
            const response = await fetch('http://localhost:5000/api/loyalty/apply-discount', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ base_price: baseTotal })
            })

            console.log('📡 Loyalty API response status:', response.status)
            
            if (response.ok) {
              const data = await response.json()
              console.log('📊 Loyalty API data:', data)
              
              if (data.success) {
                discountAmount = data.discount_amount || 0
                discountPercentage = data.discount_percentage || 0
                finalAmount = data.final_price || baseTotal
                loyaltyInfo = {
                  tier: data.tier,
                  discount_percentage: discountPercentage,
                  discount_amount: discountAmount
                }
                console.log('🎁 Loyalty discount applied:', loyaltyInfo)
                console.log('💵 Final amount after discount:', finalAmount)
                setLoyaltyDiscount(loyaltyInfo)
              } else {
                console.log('⚠️ Loyalty API returned success=false')
              }
            } else {
              const errorText = await response.text()
              console.error('❌ Loyalty API error:', response.status, errorText)
            }
          } else {
            console.log('⚠️ No token found, skipping loyalty discount')
          }
        } catch (error) {
          console.error('⚠️ Error fetching loyalty discount:', error)
          // Continue without discount if there's an error
        }

        // Prepare complete booking data for payment
        const completeBookingData = {
          // Schedule information
          schedule: schedule,
          schedule_id: schedule._id || schedule.id,
          
          // Passenger information (take first passenger as primary)
          passenger_name: passengers.passenger_0_name || 'Passenger',
          passenger_phone: passengers.passenger_0_phone || '',
          passenger_email: passengers.passenger_0_email || '',
          passenger_count: passengerCount,
          passengers: passengers,
          
          // Booking details
          selectedSeats: selectedSeats,
          seat_numbers: selectedSeats,
          base_fare: baseFare,
          
          // Baggage information
          has_baggage: baggageData.has_baggage || false,
          baggage_weight: baggageData.baggage_weight || 0,
          baggage_fee: baggageData.baggage_fee || totalBaggageFee,
          baggage_data: baggageData,
          
          // Calculated amounts
          base_total: baseTotal,
          loyalty_discount_percentage: discountPercentage,
          loyalty_discount_amount: discountAmount,
          total_amount: finalAmount,
          totalAmount: finalAmount,
          
          // Additional journey information
          departure_city: schedule.departure_city || schedule.origin_city,
          arrival_city: schedule.arrival_city || schedule.destination_city,
          travel_date: schedule.travel_date || schedule.departure_date,
          departure_time: schedule.departure_time
        }

        console.log('✅ Complete booking data prepared:', completeBookingData)
        console.log('💰 Discount values in booking data:', {
          base_total: completeBookingData.base_total,
          loyalty_discount_amount: completeBookingData.loyalty_discount_amount,
          loyalty_discount_percentage: completeBookingData.loyalty_discount_percentage,
          total_amount: completeBookingData.total_amount,
          finalAmount: finalAmount,
          discountAmount: discountAmount
        })
        setBookingData(completeBookingData)
        
      } catch (error) {
        console.error('❌ Error loading booking data:', error)
        toast.error('Error loading booking information. Please try again.')
        navigate('/search')
      } finally {
        setLoading(false)
      }
    }

    loadBookingData()
  }, [navigate])

  const handlePaymentSuccess = (paymentResult) => {
    console.log('🎉 Payment successful:', paymentResult)
    
    // Prepare confirmation data
    const confirmationData = {
      bookingId: paymentResult.booking_id || paymentResult.data?.booking_id || paymentResult.bookingId,
      pnrNumber: paymentResult.pnr_number || paymentResult.data?.pnr_number,
      paymentResult: paymentResult,
      bookingData: bookingData,
      totalAmount: bookingData?.total_amount || 0,
      paymentMethod: paymentResult.payment_method || 'chapa'
    }

    console.log('📋 Confirmation data:', confirmationData)

    // Note: Session will be cleared on confirmation page
    // This allows the confirmation page to access booking data if needed
    console.log('💾 Keeping session data until confirmation page loads')

    // Navigate to confirmation page
    navigate('/booking/booking-confirmation', {
      state: confirmationData,
      replace: true
    })
  }

  const handleBackToBaggage = () => {
    console.log('🔙 Going back to baggage')
    navigate('/booking/baggage', {
      state: {
        schedule: bookingData?.schedule,
        selectedSeats: bookingData?.selectedSeats,
        passengers: bookingData?.passengers,
        baseFare: bookingData?.base_fare,
        passengerCount: bookingData?.passenger_count
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Payment</h3>
          <p className="text-gray-600">Preparing your payment information...</p>
        </div>
      </div>
    )
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find your booking information. Please start over.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Start New Booking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 py-8">
      {/* Elegant Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Booking Progress */}
        <BookingProgress currentStep={4} />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl border-2 border-white/50">
            <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Complete Payment
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
            Secure payment for your journey
          </p>
          <button
            onClick={handleBackToBaggage}
            className="mt-4 inline-flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-all bg-white/90 backdrop-blur-md px-5 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 shadow-lg hover:shadow-xl font-semibold"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Baggage</span>
          </button>
        </div>

        {/* Booking Summary Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 mb-8 border-2 border-white/60">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Booking Summary</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Journey Details</h3>
              <p className="text-gray-600">
                {bookingData.departure_city} → {bookingData.arrival_city}
              </p>
              <p className="text-gray-600 text-sm">
                {bookingData.travel_date} • {bookingData.departure_time}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Passenger Details</h3>
              <p className="text-gray-600">{bookingData.passenger_name}</p>
              <p className="text-gray-600 text-sm">{bookingData.passenger_phone}</p>
              {bookingData.passenger_email && (
                <p className="text-gray-600 text-sm">{bookingData.passenger_email}</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Selected Seats:</span>
              <span className="font-semibold text-gray-900">
                {bookingData.selectedSeats?.sort((a, b) => a - b).join(', ')}
              </span>
            </div>
            
            {bookingData.has_baggage && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Baggage:</span>
                <span className="font-semibold text-gray-900">
                  {bookingData.baggage_weight}kg ({bookingData.baggage_fee} ETB)
                </span>
              </div>
            )}
            
            {loyaltyDiscount && loyaltyDiscount.discount_amount > 0 && (
              <>
                <div className="flex justify-between items-center mb-2 pt-2 border-t">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{bookingData.base_total} ETB</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-600 flex items-center gap-2">
                    <span className="text-xl">🎁</span>
                    Loyalty Discount ({loyaltyDiscount.discount_percentage}% - {loyaltyDiscount.tier} tier):
                  </span>
                  <span className="font-semibold text-green-600">-{loyaltyDiscount.discount_amount.toFixed(2)} ETB</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between items-center text-lg font-semibold mt-3 pt-3 border-t-4 border-blue-300">
              <span className="text-xl font-bold text-gray-900">Total Amount:</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{bookingData.total_amount.toFixed(2)} ETB</span>
            </div>
            
            {loyaltyDiscount && loyaltyDiscount.discount_amount > 0 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium text-center">
                  🎉 You saved {loyaltyDiscount.discount_amount.toFixed(2)} ETB with your {loyaltyDiscount.tier} tier membership!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border-2 border-white/60">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
          </div>
          <PaymentForm
            amount={bookingData.total_amount}
            bookingData={bookingData}
            loyaltyDiscount={loyaltyDiscount}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-200 shadow-md">
          <p className="text-sm text-gray-700 font-medium flex items-center justify-center space-x-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Your payment is secure and encrypted. We do not store your payment details.</span>
          </p>
        </div>


      </div>
      </div>
    </div>
  )
}

export default PaymentPage
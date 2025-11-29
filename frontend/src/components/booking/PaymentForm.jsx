import React, { useState, useEffect } from 'react'
import { CreditCard, Wallet, ExternalLink } from 'lucide-react'
import { paymentService } from '../../services/paymentService'
import { toast } from 'react-toastify'

const PaymentForm = ({ amount, bookingData, onPaymentSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('')
  const [processing, setProcessing] = useState(false)

  const paymentMethods = [
    {
      id: 'chapa',
      name: 'Chapa',
      icon: CreditCard,
      description: 'Pay with Telebirr, CBE Birr, HelloCash, Bank, or Card',
      color: 'bg-purple-100 text-purple-800',
      supported_methods: ['telebirr', 'cbebirr', 'hellocash', 'bank', 'card']
    },
  
    {
      id: 'telebirr',
      name: 'Telebirr',
      icon: Wallet,
      description: 'Pay with Telebirr mobile money',
      color: 'bg-green-100 text-green-800'
    }
  ]

  // Load booking data from session storage if not provided via props
  useEffect(() => {
    if (!bookingData) {
      console.log('📥 Loading booking data from session storage...')
      try {
        const storedSchedule = sessionStorage.getItem('selectedSchedule')
        const storedSeats = sessionStorage.getItem('selectedSeats')
        const storedPassengers = sessionStorage.getItem('passengerData')
        const storedBaseFare = sessionStorage.getItem('baseFare')
        const storedBaggageData = sessionStorage.getItem('baggageData')
        const storedTotalBaggageFee = sessionStorage.getItem('totalBaggageFee')
        const storedTotalAmount = sessionStorage.getItem('totalAmount')

        if (storedSchedule && storedSeats) {
          console.log('✅ Found booking data in session storage')
        } else {
          console.warn('⚠️ No booking data found in session storage')
        }
      } catch (error) {
        console.error('❌ Error loading session storage data:', error)
      }
    }
  }, [bookingData])

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method')
      return
    }

    setProcessing(true)

    try {
      console.log('💰 Starting payment process...')
      
      // Prepare payment data with comprehensive fallbacks
      const paymentData = {
        payment_method: selectedMethod,
        amount: amount,
        schedule_id: bookingData?.schedule_id || bookingData?.schedule?._id,
        passenger_name: bookingData?.passenger_name || bookingData?.passengers?.passenger_0_name,
        passenger_phone: bookingData?.passenger_phone || bookingData?.passengers?.passenger_0_phone,
        passenger_email: bookingData?.passenger_email || bookingData?.passengers?.passenger_0_email || '',
        seat_numbers: bookingData?.seat_numbers || bookingData?.selectedSeats,
        base_fare: bookingData?.base_fare || amount,
        total_amount: amount,
        has_baggage: bookingData?.has_baggage || false,
        baggage_weight: bookingData?.baggage_weight || 0,
        baggage_fee: bookingData?.baggage_fee || 0,
        passenger_count: bookingData?.passenger_count || 1,
        // Include additional data that might be needed
        schedule: bookingData?.schedule,
        passengers: bookingData?.passengers,
        baggage_data: bookingData?.baggageData
      }

      console.log('📤 Payment data being sent:', paymentData)

      let paymentResult;

      if (selectedMethod === 'cbe' || selectedMethod === 'telebirr') {
        // Handle CBE or Telebirr payment - create booking and redirect to payment
        paymentData.payment_method = selectedMethod
        paymentResult = await paymentService.createTelebirrBooking(paymentData)
        console.log(`✅ ${selectedMethod.toUpperCase()} payment initialized:`, paymentResult)
        
        if (paymentResult.success) {
          toast.success(`Booking created! Please complete payment at the station.`)
          
          // Clear session storage after successful booking
          clearBookingSessionData()
          
          onPaymentSuccess(paymentResult)
        } else {
          throw new Error(paymentResult.message || 'Failed to create booking')
        }
      } else {
        // Handle Chapa payment
        paymentResult = await paymentService.processPayment(paymentData)
        console.log('✅ Payment initialization successful:', paymentResult)

        if (paymentResult.status === 'success' && paymentResult.data?.checkout_url) {
          console.log('🔗 Redirecting to Chapa checkout...')
          
          // Store the transaction reference for callback handling
          if (paymentResult.tx_ref) {
            sessionStorage.setItem('chapa_tx_ref', paymentResult.tx_ref)
            sessionStorage.setItem('pending_booking_data', JSON.stringify(paymentData))
            console.log('💾 Stored tx_ref in sessionStorage:', paymentResult.tx_ref)
          }
          
          // Redirect to Chapa checkout
          window.location.href = paymentResult.data.checkout_url
        } else {
          throw new Error('Failed to get checkout URL from payment gateway')
        }
      }
      
    } catch (error) {
      console.error('❌ Payment error:', error)
      toast.error(error.message || 'Payment processing failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  // Helper function to clear session storage
  const clearBookingSessionData = () => {
    const itemsToClear = [
      'selectedSchedule',
      'selectedSeats',
      'passengerData',
      'baseFare',
      'passengerCount',
      'baggageData',
      'totalBaggageFee',
      'totalAmount'
    ]
    
    itemsToClear.forEach(item => sessionStorage.removeItem(item))
    console.log('🧹 Cleared booking session data')
  }

  // Handle Chapa callback when returning from payment
  useEffect(() => {
    const handleChapaCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const txRef = urlParams.get('tx_ref')
      const status = urlParams.get('status')
      
      if (txRef && status) {
        console.log('🔄 Handling Chapa callback:', { txRef, status })
        
        try {
          if (status === 'success') {
            // Verify the payment
            setProcessing(true)
            const verificationResult = await paymentService.verifyPayment(txRef)
            console.log('✅ Payment verification result:', verificationResult)

            if (verificationResult.success && verificationResult.data?.status === 'success') {
              toast.success('Payment completed successfully!')
              
              // Clear stored data
              sessionStorage.removeItem('chapa_tx_ref')
              sessionStorage.removeItem('pending_booking_data')
              clearBookingSessionData()
              
              onPaymentSuccess(verificationResult)
            } else {
              toast.error('Payment verification failed. Please contact support.')
            }
          } else if (status === 'failed') {
            toast.error('Payment was cancelled or failed. Please try again.')
          }
        } catch (error) {
          console.error('Verification error:', error)
          toast.error('Payment verification failed. Please check your booking status.')
        } finally {
          setProcessing(false)
        }
      }
    }

    handleChapaCallback()
  }, [onPaymentSuccess])

  // Calculate breakdown amounts with better fallbacks
  const baseFare = bookingData?.base_fare || amount - (bookingData?.baggage_fee || 0)
  const baggageFee = bookingData?.baggage_fee || 0


  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-6">

        {/* Payment Methods */}
        <div className="space-y-4 mb-8">
          {paymentMethods.map((method) => {
            const IconComponent = method.icon
            return (
              <div
                key={method.id}
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 ${
                  selectedMethod === method.id
                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-green-300 hover:shadow-lg bg-white'
                }`}
                onClick={() => setSelectedMethod(method.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${
                    selectedMethod === method.id
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg'
                      : method.color
                  }`}>
                    <IconComponent className={`h-7 w-7 ${
                      selectedMethod === method.id ? 'text-white' : ''
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{method.name}</h3>
                    <p className="text-sm text-gray-600 font-medium">{method.description}</p>
                    {method.supported_methods && (
                      <p className="text-xs text-gray-500 mt-1">
                        💳 Supports: {method.supported_methods.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === method.id
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedMethod === method.id && (
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Payment Method Details */}
        {selectedMethod === 'chapa' && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 mb-6 shadow-md">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                <ExternalLink className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 mb-2 text-lg">Chapa Payment</h4>
                <p className="text-sm text-blue-800 mb-3 font-medium">
                  You will be redirected to Chapa's secure payment page to complete your transaction.
                </p>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li className="flex items-center space-x-2">
                    <span className="text-blue-500">✓</span>
                    <span>Supports multiple payment methods including mobile money and cards</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-blue-500">✓</span>
                    <span>Secure and encrypted payment processing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-blue-500">✓</span>
                    <span>Instant booking confirmation upon successful payment</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {(selectedMethod === 'cbe' || selectedMethod === 'telebirr') && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-5 mb-6 shadow-md">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-yellow-900 mb-2 text-lg">Pay at Station</h4>
                <p className="text-sm text-yellow-800 mb-3 font-medium">
                  Your seats will be reserved for 2 hours. Please visit any EthioBus station to complete your payment.
                </p>
                <ul className="text-sm text-yellow-700 space-y-2">
                  <li className="flex items-center space-x-2">
                    <span className="text-yellow-500">⚠</span>
                    <span>Bring your PNR number and ID to the station</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-yellow-500">⚠</span>
                    <span>Payment must be completed within 2 hours of booking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-yellow-500">⚠</span>
                    <span>Seats will be released if payment is not made</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Amount Summary */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border-2 border-gray-200 shadow-md">
          <h4 className="font-bold text-gray-900 mb-4 text-lg">Payment Summary</h4>
          <div className="space-y-3 text-base">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Base Fare:</span>
              <span className="font-bold text-gray-900">{baseFare} ETB</span>
            </div>
            {baggageFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Baggage Fee:</span>
                <span className="font-bold text-gray-900">{baggageFee} ETB</span>
              </div>
            )}
            <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center">
              <span className="text-gray-900 font-bold text-lg">Total Amount:</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{amount} ETB</span>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={!selectedMethod || processing}
          className="relative w-full py-4 px-6 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 border-2 border-white/50 overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
          {processing ? (
            <div className="flex items-center justify-center relative">
              <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent mr-3"></div>
              <span className="font-bold">{selectedMethod === 'chapa' ? 'Redirecting to Payment...' : 'Processing...'}</span>
            </div>
          ) : (
            <span className="relative flex items-center justify-center">
              <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Pay {amount} ETB</span>
            </span>
          )}
        </button>

        {/* Security Notice */}
        <div className="mt-6 text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-sm text-gray-600 flex items-center justify-center font-medium">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Secure payment • Encrypted connection • Ethiopian payment partners</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentForm
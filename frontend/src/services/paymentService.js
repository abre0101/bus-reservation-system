import api from './api'

export const paymentService = {
// In your paymentService.js
async initiatePayment(paymentData) {
  try {
    console.log('🇪🇹 Initiating Chapa payment:', paymentData)
    
    // Generate a unique transaction reference
    const txRef = `ethiobus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    console.log('🎫 Generated tx_ref:', txRef)

    // Store the tx_ref in multiple places for redundancy
    sessionStorage.setItem('pending_chapa_tx_ref', txRef)
    sessionStorage.setItem('pending_chapa_booking_data', JSON.stringify(paymentData))
    localStorage.setItem('last_payment_tx_ref', txRef) // More persistent storage

    // Prepare data for Chapa
    // Extract email from various possible sources
    let email = paymentData.passenger_email || paymentData.email
    
    // If email is empty string, undefined, or invalid, use Chapa test default
    if (!email || email.trim() === '' || !email.includes('@') || email.includes('customer@ethiobus')) {
      email = 'test@test.com'  // Chapa test environment default
    }
    
    // Ensure email is properly formatted
    email = email.trim().toLowerCase()
    
    // Get passenger name
    const passengerName = paymentData.passenger_name || paymentData.first_name || 'Customer'
    const nameParts = passengerName.split(' ')
    
    const requestData = {
      ...paymentData,
      tx_ref: txRef,
      amount: paymentData.amount || paymentData.total_amount,
      email: email,
      first_name: nameParts[0] || 'Customer',
      last_name: nameParts.slice(1).join(' ') || 'User',
      phone_number: paymentData.passenger_phone || paymentData.phone_number || '0911000000'
    }

    console.log('📤 Sending to backend with tx_ref:', txRef)
    console.log('📤 Request data:', {
      ...requestData,
      // Don't log full booking data, just key fields
      email: requestData.email,
      first_name: requestData.first_name,
      last_name: requestData.last_name,
      phone_number: requestData.phone_number,
      amount: requestData.amount
    })
    
    const response = await api.post('/payments/chapa/initialize', requestData)
    
    console.log('✅ Chapa payment initialized:', response.data)
    
    return {
      ...response.data,
      tx_ref: txRef
    }

  } catch (error) {
    console.error('❌ Error initiating Chapa payment:', error)
    console.error('❌ Error response:', error.response?.data)
    throw this.formatError(error)
  }
},
  // Add this to your paymentService.js
async verifyPayment(txRef) {
  try {
    console.log('🔍 Verifying payment with tx_ref:', txRef)
    
    const response = await api.get(`/payments/verify/${txRef}`)
    
    console.log('✅ Verification response:', response.data)
    
    return response.data
    
  } catch (error) {
    console.error('❌ Payment verification error:', error)
    throw this.formatError(error)
  }
},
  // Create Telebirr payment booking
  async createTelebirrBooking(bookingData) {
    try {
      console.log('� Creatting Telebirr booking:', bookingData)
      
      // Validate required fields for cash booking
      const requiredFields = [
        'schedule_id',
        'passenger_name', 
        'passenger_phone',
        'seat_numbers',
        'amount'
      ]
      
      const missingFields = requiredFields.filter(field => {
        const value = bookingData[field]
        return value === undefined || value === null || value === ''
      })
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
      }

      const cleanedData = this.cleanPaymentData(bookingData)
      
      const response = await api.post('/payments/telebirr', cleanedData)
      
      console.log('✅ Telebirr booking created:', response.data)
      return {
        success: true,
        ...response.data,
        payment_method: 'telebirr'
      }

    } catch (error) {
      console.error('❌ Error creating cash booking:', error)
      throw this.formatError(error)
    }
  },

  // Process complete payment flow
  async processPayment(paymentData) {
    try {
      console.log('🚀 Starting complete payment process:', paymentData)
      
      if (paymentData.payment_method === 'telebirr' || paymentData.payment_method === 'cbe') {
        // Handle Telebirr or CBE payment
        const result = await this.createTelebirrBooking(paymentData)
        console.log('🎉 Telebirr/CBE payment process completed:', result)
        return result
      } else {
        // Handle Chapa payment
        const result = await this.initiatePayment(paymentData)
        console.log('🎉 Chapa payment process completed:', result)
        return result
      }
      
    } catch (error) {
      console.error('❌ Payment process failed:', error)
      throw this.formatError(error)
    }
  },

  // Get payment status by transaction reference
  async getPaymentStatus(txRef) {
    try {
      if (!txRef) {
        throw new Error('Transaction reference is required')
      }

      console.log('🔍 Checking payment status for:', txRef)
      const response = await api.get(`/payments/status/${txRef}`)
      
      console.log('✅ Payment status response:', response.data)
      return response.data

    } catch (error) {
      console.error('❌ Error getting payment status:', error)
      throw this.formatError(error)
    }
  },

  // Get available payment methods
  async getPaymentMethods() {
    try {
      console.log('📋 Fetching payment methods')
      const response = await api.get('/payments/methods')
      
      console.log('✅ Payment methods:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching payment methods:', error)
      
      // Return default payment methods if API fails
      return {
        payment_methods: [
          {
            id: 'chapa',
            name: 'Chapa',
            description: 'Pay with Telebirr, CBE Birr, HelloCash, Bank, or Card',
            icon: 'payment',
            supported: true,
            supported_methods: ['telebirr', 'cbebirr', 'hellocash', 'bank', 'visa', 'mastercard']
          },
          {
            id: 'cash',
            name: 'Pay at Station',
            description: 'Pay cash at bus station or office',
            icon: 'cash',
            supported: true
          }
        ],
        default_currency: 'ETB',
        currency_symbol: 'Br'
      }
    }
  },

  // Check if payment was successful
  async checkPaymentSuccess(txRef) {
    try {
      if (!txRef) {
        throw new Error('Transaction reference is required')
      }

      console.log('💰 Checking payment success for:', txRef)
      
      // First verify with Chapa
      const verification = await this.verifyPayment(txRef)
      
      if (verification.success) {
        return {
          success: true,
          message: 'Payment completed successfully',
          data: verification.data,
          booking_id: verification.booking_id,
          pnr_number: verification.pnr_number
        }
      } else {
        // Check local status as fallback
        const localStatus = await this.getPaymentStatus(txRef)
        return {
          success: localStatus.payment_status === 'completed',
          message: localStatus.payment_status === 'completed' ? 'Payment completed' : 'Payment pending',
          data: localStatus
        }
      }

    } catch (error) {
      console.error('❌ Error checking payment success:', error)
      throw this.formatError(error)
    }
  },

  // Helper method to clean payment data
  cleanPaymentData(data) {
    const cleaned = { ...data }
    
    // Remove any undefined, null, or empty string values
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') {
        delete cleaned[key]
      }
    })
    
    // Ensure numeric fields are numbers
    if (cleaned.amount) cleaned.amount = parseFloat(cleaned.amount)
    if (cleaned.baggage_fee) cleaned.baggage_fee = parseFloat(cleaned.baggage_fee)
    if (cleaned.base_fare) cleaned.base_fare = parseFloat(cleaned.base_fare)
    if (cleaned.baggage_weight) cleaned.baggage_weight = parseFloat(cleaned.baggage_weight)
    
    // Ensure seat_numbers is an array
    if (cleaned.seat_numbers && typeof cleaned.seat_numbers === 'string') {
      try {
        cleaned.seat_numbers = JSON.parse(cleaned.seat_numbers)
      } catch (e) {
        // If it's a comma-separated string, convert to array
        cleaned.seat_numbers = cleaned.seat_numbers.split(',').map(s => s.trim()).filter(s => s)
      }
    }
    
    // Format phone number if needed
    if (cleaned.passenger_phone) {
      cleaned.passenger_phone = this.formatPhoneNumber(cleaned.passenger_phone)
    }
    
    return cleaned
  },

  // Helper method to format phone numbers
  formatPhoneNumber(phone) {
    if (!phone) return phone
    
    // Remove all non-digit characters except +
    let cleanPhone = phone.toString().replace(/[^\d+]/g, '')
    
    // Convert Ethiopian numbers to international format
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '+251' + cleanPhone.slice(1)
    } else if (cleanPhone.startsWith('251')) {
      cleanPhone = '+' + cleanPhone
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
      cleanPhone = '+251' + cleanPhone
    }
    
    return cleanPhone
  },

  // Helper method to format errors consistently
  formatError(error) {
    if (error.response?.data) {
      const apiError = error.response.data
      
      console.error('📋 API Error Data:', apiError)
      
      // Handle different error formats from API
      if (apiError.message) {
        return new Error(apiError.message)
      } else if (apiError.error) {
        return new Error(apiError.error)
      } else if (apiError.errors) {
        // Handle validation errors
        const errorMessages = Object.values(apiError.errors).flat()
        return new Error(errorMessages.join(', '))
      } else if (typeof apiError === 'string') {
        return new Error(apiError)
      } else {
        // If we can't parse the error, stringify it
        return new Error(JSON.stringify(apiError))
      }
    }
    
    // Handle specific error cases
    if (error.code === 'ERR_NETWORK') {
      return new Error('Network error: Please check your internet connection and ensure the server is running')
    }
    
    if (error.message === 'Network Error') {
      return new Error('Cannot connect to server. Please check if the backend is running on localhost:5000')
    }
    
    if (error.response?.status === 404) {
      return new Error('Server endpoint not found. Please check the API URL')
    }
    
    if (error.response?.status === 500) {
      return new Error('Server error. Please try again later')
    }
    
    return error
  },

  // Check if phone number is valid Ethiopian number
  isValidEthiopianPhone(phone) {
    if (!phone) return false
    const cleanPhone = phone.toString().replace(/[^\d+]/g, '')
    const ethiopianPhoneRegex = /^(\+251|251|0)(9\d{8})$/
    return ethiopianPhoneRegex.test(cleanPhone)
  },

  // Generate test payment data for development
  generateTestPaymentData() {
    return {
      payment_method: 'chapa',
      amount: 1500,
      schedule_id: '65a1b2c3d4e5f67890123456',
      passenger_name: 'Test User',
      passenger_phone: '+251911223344',
      passenger_email: 'test@example.com',
      seat_numbers: ['A1', 'A2'],
      base_fare: 1200,
      baggage_fee: 300,
      baggage_weight: 15,
      has_baggage: true
    }
  }
}

export default paymentService
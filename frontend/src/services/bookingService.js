import api from './api'

export const bookingService = {
  async searchSchedules(params) {
    try {
      console.log('🔍 Searching schedules with params:', params)
      
      const searchData = {
        origin_city: params.source || params.origin_city || params.originCity,
        destination_city: params.destination || params.destination_city || params.destinationCity,
        date: params.date
      }
      
      const response = await api.post('/bookings/schedules/search', searchData)
      console.log('✅ Schedules search successful:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error searching schedules:', {
        status: error.response?.status,
        data: error.response?.data,
        params
      })
      throw this.handleError(error)
    }
  },

  async getScheduleDetails(scheduleId) {
    try {
      if (!scheduleId) {
        throw new Error('Schedule ID is required')
      }
      console.log(`🔍 Getting schedule details for: ${scheduleId}`)
      const response = await api.get(`/schedules/${scheduleId}`)
      console.log('✅ Schedule details retrieved')
      return response.data
    } catch (error) {
      console.error('❌ Error getting schedule details:', {
        scheduleId,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  async getOccupiedSeats(scheduleId) {
    try {
      if (!scheduleId) {
        throw new Error('Schedule ID is required')
      }
      console.log(`🔍 Getting occupied seats for schedule: ${scheduleId}`)
      const response = await api.get(`/bookings/occupied-seats/${scheduleId}`)
      console.log('✅ Occupied seats retrieved:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting occupied seats:', {
        scheduleId,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  async createBooking(bookingData) {
    try {
      if (!bookingData || !bookingData.schedule_id || !bookingData.seat_numbers) {
        throw new Error('Invalid booking data: schedule_id and seat_numbers are required')
      }
      console.log('📝 Creating booking:', bookingData)
      const response = await api.post('/bookings', bookingData)
      console.log('✅ Booking created successfully')
      return response.data
    } catch (error) {
      console.error('❌ Error creating booking:', {
        status: error.response?.status,
        data: error.response?.data,
        bookingData
      })
      throw this.handleError(error)
    }
  },

  async getUserBookings() {
    try {
      console.log('🔍 Getting user bookings...')
      const response = await api.get('/bookings/user')
      console.log('✅ User bookings retrieved:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting user bookings:', {
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  async getBookingByPNR(pnrNumber) {
    try {
      if (!pnrNumber) {
        throw new Error('PNR number is required')
      }
      console.log(`🔍 Getting booking by PNR: ${pnrNumber}`)
      const response = await api.get(`/bookings/pnr/${pnrNumber.toUpperCase()}`)
      console.log('✅ Booking by PNR retrieved')
      return response.data
    } catch (error) {
      console.error('❌ Error getting booking by PNR:', error)
      throw this.handleError(error)
    }
  },

  async getBookingDetails(bookingId) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`🔍 Getting booking details for: ${bookingId}`)
      const response = await api.get(`/bookings/${bookingId}`)
      
      console.log('✅ Booking details retrieved:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting booking details:', {
        bookingId,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Download ticket method
  async downloadTicket(bookingId) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`🎫 Downloading ticket for booking: ${bookingId}`)
      const response = await api.get(`/bookings/${bookingId}/ticket`, {
        responseType: 'blob'
      })
      
      console.log('✅ Ticket download successful')
      return response.data
    } catch (error) {
      console.error('❌ Error downloading ticket:', {
        bookingId,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Customer requests cancellation (must be 2+ days before departure)
  async requestCancellation(bookingId, reason = '') {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`📤 Requesting cancellation for booking: ${bookingId}`, { reason })
      const response = await api.post(`/bookings/${bookingId}/cancel-request`, {
        reason
      })
      
      console.log('✅ Cancellation request submitted')
      return response.data
    } catch (error) {
      console.error('❌ Error requesting cancellation:', {
        bookingId,
        reason,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Operator gets all cancellation requests
  async getCancellationRequests(params = {}) {
    try {
      console.log('🔍 Getting cancellation requests with params:', params)
      const response = await api.get('/bookings/cancellation-requests', { params })
      console.log('✅ Cancellation requests retrieved:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting cancellation requests:', {
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Operator approves cancellation and processes refund
  async approveCancellation(bookingId, refundData = {}) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`✅ Approving cancellation for booking: ${bookingId}`, refundData)
      const response = await api.put(`/bookings/${bookingId}/cancel`, refundData)
      
      console.log('✅ Cancellation approved and refund processed')
      return response.data
    } catch (error) {
      console.error('❌ Error approving cancellation:', {
        bookingId,
        refundData,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Operator rejects cancellation request
  async rejectCancellation(bookingId, reason = '') {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`❌ Rejecting cancellation for booking: ${bookingId}`, { reason })
      const response = await api.put(`/bookings/${bookingId}/reject-cancellation`, {
        reason
      })
      
      console.log('✅ Cancellation request rejected')
      return response.data
    } catch (error) {
      console.error('❌ Error rejecting cancellation:', {
        bookingId,
        reason,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Check-in method
  async checkIn(bookingId, checkInData = {}) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`🛂 Processing check-in for booking: ${bookingId}`, checkInData)
      const response = await api.post(`/bookings/${bookingId}/checkin`, checkInData)
      
      console.log('✅ Check-in successful')
      return response.data
    } catch (error) {
      console.error('❌ Error during check-in:', {
        bookingId,
        checkInData,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Get booking status
  async getBookingStatus(bookingId) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`📊 Getting status for booking: ${bookingId}`)
      const response = await api.get(`/bookings/${bookingId}/status`)
      
      console.log('✅ Booking status retrieved')
      return response.data
    } catch (error) {
      console.error('❌ Error getting booking status:', {
        bookingId,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Update booking details
  async updateBooking(bookingId, updateData) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`✏️ Updating booking: ${bookingId}`, updateData)
      const response = await api.put(`/bookings/${bookingId}`, updateData)
      
      console.log('✅ Booking updated successfully')
      return response.data
    } catch (error) {
      console.error('❌ Error updating booking:', {
        bookingId,
        updateData,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // Get booking history
  async getBookingHistory(bookingId) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      
      console.log(`📜 Getting history for booking: ${bookingId}`)
      const response = await api.get(`/bookings/${bookingId}/history`)
      
      console.log('✅ Booking history retrieved')
      return response.data
    } catch (error) {
      console.error('❌ Error getting booking history:', {
        bookingId,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  async cancelBooking(bookingId) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      console.log(`❌ Canceling booking: ${bookingId}`)
      const response = await api.put(`/bookings/${bookingId}/cancel`)
      console.log('✅ Booking canceled successfully')
      return response.data
    } catch (error) {
      console.error('❌ Error canceling booking:', {
        bookingId,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  async calculateBaggageFee(weight) {
    try {
      if (!weight || weight <= 0) {
        throw new Error('Valid weight is required')
      }
      console.log(`💰 Calculating baggage fee for weight: ${weight}kg`)
      const response = await api.post('/bookings/baggage/calculate-fee', { weight_kg: weight })
      console.log('✅ Baggage fee calculated')
      return response.data
    } catch (error) {
      console.error('❌ Error calculating baggage fee:', {
        weight,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  async getBaggagePolicy() {
    try {
      console.log('📋 Getting baggage policy')
      const response = await api.get('/bookings/baggage/policy')
      console.log('✅ Baggage policy retrieved')
      return response.data
    } catch (error) {
      console.error('❌ Error getting baggage policy:', {
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // NEW: Get available seats with visual layout
  async getSeatLayout(scheduleId) {
    try {
      if (!scheduleId) {
        throw new Error('Schedule ID is required')
      }
      console.log(`💺 Getting seat layout for schedule: ${scheduleId}`)
      const response = await api.get(`/bookings/${scheduleId}/seat-layout`)
      console.log('✅ Seat layout retrieved')
      return response.data
    } catch (error) {
      console.error('❌ Error getting seat layout:', {
        scheduleId,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // NEW: Validate booking before creation
  async validateBooking(bookingData) {
    try {
      console.log('🔍 Validating booking data:', bookingData)
      const response = await api.post('/bookings/validate', bookingData)
      console.log('✅ Booking validation successful')
      return response.data
    } catch (error) {
      console.error('❌ Booking validation failed:', {
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // NEW: Get booking analytics for operators
  async getBookingAnalytics(params = {}) {
    try {
      console.log('📊 Getting booking analytics:', params)
      const response = await api.get('/bookings/analytics', { params })
      console.log('✅ Booking analytics retrieved')
      return response.data
    } catch (error) {
      console.error('❌ Error getting booking analytics:', {
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  // NEW: Send booking confirmation
  async sendConfirmation(bookingId, method = 'email') {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required')
      }
      console.log(`📧 Sending ${method} confirmation for booking: ${bookingId}`)
      const response = await api.post(`/bookings/${bookingId}/send-confirmation`, { method })
      console.log('✅ Confirmation sent successfully')
      return response.data
    } catch (error) {
      console.error('❌ Error sending confirmation:', {
        bookingId,
        method,
        status: error.response?.status,
        data: error.response?.data
      })
      throw this.handleError(error)
    }
  },

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response
      const serverMessage = data?.message || data?.error || JSON.stringify(data)
      
      // Enhanced error messages for common status codes
      const errorMessages = {
        400: `Bad request: ${serverMessage}`,
        401: 'Authentication required - please login again',
        403: 'Access denied - insufficient permissions',
        404: `Booking not found: ${serverMessage}`,
        409: `Conflict: ${serverMessage}`,
        422: `Validation error: ${serverMessage}`,
        500: `Server error: ${serverMessage}`
      }
      
      return new Error(errorMessages[status] || `Server error ${status}: ${serverMessage}`)
    } else if (error.request) {
      return new Error('Network error - please check your internet connection')
    } else {
      return new Error(error.message || 'An unexpected error occurred')
    }
  },

  // Utility method for development - test all endpoints
  async testAllEndpoints() {
    console.group('🧪 TESTING ALL BOOKING ENDPOINTS')
    
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    console.log('Testing with user:', user)

    const endpoints = [
      '/bookings/user',
      '/bookings',
      `/users/${user.id}/bookings`,
      '/my-bookings',
      '/bookings/my',
      '/user/bookings'
    ]

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing: ${endpoint}`)
        const response = await api.get(endpoint)
        console.log(`✅ ${endpoint}: SUCCESS`, response.data)
        return { success: true, endpoint, data: response.data }
      } catch (error) {
        console.log(`❌ ${endpoint}: FAILED -`, error.response?.status, error.response?.data)
      }
    }

    console.groupEnd()
    return { success: false, message: 'All endpoints failed' }
  },

  // Debug function for booking access issues
  async debugBookingAccess(bookingId) {
    try {
      console.group('🔍 DEBUG: Booking Access Check')
      
      const token = sessionStorage.getItem('token')
      const user = JSON.parse(sessionStorage.getItem('user') || '{}')
      
      console.log('👤 Current User:', user)
      console.log('🎫 Requested Booking ID:', bookingId)
      
      // Test the debug endpoint first (if available)
      try {
        const debugResponse = await api.get('/bookings/debug/user-bookings')
        console.log('📋 User Bookings:', debugResponse.data)
      } catch (debugError) {
        console.log('⚠️ Debug endpoint not available:', debugError.message)
      }
      
      // Then try to access the specific booking
      console.log('🔐 Testing booking access...')
      const bookingResponse = await api.get(`/bookings/${bookingId}`)
      
      console.log('✅ SUCCESS: Booking access granted')
      console.groupEnd()
      
      return {
        success: true,
        user: user,
        booking: bookingResponse.data
      }
      
    } catch (error) {
      console.error('❌ DEBUG FAILED:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      console.groupEnd()
      
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      }
    }
  }
}

// Export debug functions
export const debugBookingService = () => {
  return bookingService.testAllEndpoints()
}

export const debugBookingAccess = (bookingId) => {
  return bookingService.debugBookingAccess(bookingId)
}

export default bookingService
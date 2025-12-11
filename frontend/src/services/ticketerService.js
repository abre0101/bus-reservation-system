// services/ticketerService.js
import axios from 'axios';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Request Controller for managing API request cancellation
class RequestController {
  constructor() {
    this.controllers = new Map()
  }

  createKey(method, url, params = {}) {
    const paramsString = JSON.stringify(params)
    return `${method}:${url}:${paramsString}`
  }

  cancelRequest(key) {
    if (this.controllers.has(key)) {
      const controller = this.controllers.get(key)
      if (controller && !controller.signal.aborted) {
        console.log(`🛑 Cancelling request: ${key}`)
        controller.abort()
      }
      this.controllers.delete(key)
    }
  }

  cancelAllRequests() {
    this.controllers.forEach((controller, key) => {
      if (controller && !controller.signal.aborted) {
        console.log(`🛑 Cancelling all requests: ${key}`)
        controller.abort()
      }
    })
    this.controllers.clear()
  }

  createController(key) {
    const controller = new AbortController()
    this.controllers.set(key, controller)
    return controller
  }

  removeController(key) {
    this.controllers.delete(key)
  }
}

const requestController = new RequestController()

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000 // Increased timeout for better reliability
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add abort controller signal
    const key = requestController.createKey(config.method, config.url, config.params)
    const controller = requestController.createController(key)
    config.signal = controller.signal
    
    console.log(`📡 Making API call: ${config.method?.toUpperCase()} ${config.url}`, config.data)
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and cleanup
apiClient.interceptors.response.use(
  (response) => {
    // Clean up controller on successful response
    const key = requestController.createKey(response.config.method, response.config.url, response.config.params)
    setTimeout(() => {
      requestController.removeController(key)
    }, 1000)
    
    console.log(`✅ API call successful: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    return response;
  },
  (error) => {
    // Clean up controller on error
    if (error.config) {
      const key = requestController.createKey(error.config.method, error.config.url, error.config.params)
      setTimeout(() => {
        requestController.removeController(key)
      }, 1000)
    }
    
    if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      console.log('Request was cancelled')
      return Promise.reject(new Error('Request cancelled'))
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    if (!error.response) {
      if (error.message === 'Network Error') {
        return Promise.reject(new Error('Network error - please check your connection'))
      }
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('Request timeout - please try again'))
      }
    }
    
    console.error(`❌ API call failed: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })
    
    return Promise.reject(error);
  }
);

// Response handler
const handleBackendResponse = (response) => {
  console.log('🔧 Raw API response:', response)
  
  if (response.data && response.data.success === true) {
    console.log('✅ API success, returning data:', response.data)
    return response.data
  }
  
  if (response.data) {
    console.log('⚠️ No success flag, returning raw data:', response.data)
    return response.data
  }
  
  throw new Error('Invalid response format from server')
}

// Enhanced error handler with better error extraction
const handleServiceError = (error, defaultMessage, returnDefault = null) => {
  if (error.message === 'Request cancelled') {
    console.log('Request was cancelled')
    if (returnDefault !== null) {
      return returnDefault
    }
    throw new Error('Request cancelled')
  }
  
  console.error(`${defaultMessage}:`, error)
  
  // Extract meaningful error message
  let errorMessage = defaultMessage;
  
  if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  } else if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error.response?.data) {
    // Handle cases where error is in different format
    const errorData = error.response.data;
    if (typeof errorData === 'string') {
      errorMessage = errorData;
    } else if (errorData.detail) {
      errorMessage = errorData.detail;
    }
  } else if (error.message && error.message !== 'Network Error') {
    errorMessage = error.message;
  }
  
  if (returnDefault !== null) {
    return returnDefault
  }
  
  throw new Error(errorMessage)
}

// Main service object
export const ticketerService = {
  // ==================== REQUEST MANAGEMENT ====================
  cancelRequest(method, url, params = {}) {
    const key = requestController.createKey(method, url, params)
    requestController.cancelRequest(key)
  },

  cancelAllRequests() {
    requestController.cancelAllRequests()
  },

  // ==================== TICKETER DASHBOARD ====================
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get('/api/ticketer/dashboard/stats')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch dashboard stats')
    }
  },

  // ==================== QUICK BOOKING ====================
  createBooking: async (bookingData) => {
    try {
      console.log('🎫 Creating booking with data:', bookingData)
      
      // Validate required fields before sending
      const requiredFields = ['schedule_id', 'passenger_name', 'passenger_phone', 'seat_numbers']
      const missingFields = requiredFields.filter(field => !bookingData[field])
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
      }
      
      // Ensure seat_numbers is an array
      const processedData = {
        ...bookingData,
        seat_numbers: Array.isArray(bookingData.seat_numbers) ? bookingData.seat_numbers : [bookingData.seat_numbers]
      }
      
      const response = await apiClient.post('/api/ticketer/quick-booking', processedData)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to create booking')
    }
  },

  // ==================== CHECK-IN MANAGEMENT ====================
  getPendingCheckins: async (date) => {
    try {
      const response = await apiClient.get('/api/ticketer/checkins/pending', {
        params: { date }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch pending check-ins')
    }
  },

  getCheckedInPassengers: async (date) => {
    try {
      const response = await apiClient.get('/api/ticketer/checkins/completed', {
        params: { date }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch checked-in passengers')
    }
  },

  checkInPassenger: async (bookingId) => {
    try {
      const response = await apiClient.post(`/api/ticketer/checkin/${bookingId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to check-in passenger')
    }
  },

  bulkCheckIn: async (bookingIds) => {
    try {
      const response = await apiClient.post('/api/ticketer/checkin/bulk', {
        booking_ids: bookingIds
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to bulk check-in')
    }
  },

  markAsNoShow: async (bookingId) => {
    try {
      const response = await apiClient.post(`/api/ticketer/noshow/${bookingId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to mark as no-show')
    }
  },

  // ==================== BOOKING LOOKUP ====================
  getBookingByPNR: async (pnr) => {
    try {
      const response = await apiClient.get(`/api/ticketer/booking/pnr/${pnr}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch booking by PNR')
    }
  },

  getBookingsByPhone: async (phone) => {
    try {
      const response = await apiClient.get(`/api/ticketer/booking/phone/${phone}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch bookings by phone')
    }
  },

  // ==================== CUSTOMER MANAGEMENT ====================
  getCustomers: async () => {
    try {
      const response = await apiClient.get('/api/ticketer/customers')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch customers')
    }
  },

  getCustomerBookings: async (identifier) => {
    try {
      // Always use the /customer/<id>/bookings endpoint
      // Backend will handle both ObjectId and phone number formats
      const response = await apiClient.get(`/api/ticketer/customer/${identifier}/bookings`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch customer bookings')
    }
  },

  // ==================== POINT OF SALE ====================
  getCashDrawer: async () => {
    try {
      const response = await apiClient.get('/api/ticketer/pos/cash-drawer')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch cash drawer')
    }
  },

  openCashDrawer: async (openingBalance = 0) => {
    try {
      const response = await apiClient.post('/api/ticketer/pos/cash-drawer/open', {
        opening_balance: openingBalance
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to open cash drawer')
    }
  },

  closeCashDrawer: async () => {
    try {
      const response = await apiClient.post('/api/ticketer/pos/cash-drawer/close')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to close cash drawer')
    }
  },

  getSalesStats: async (date) => {
    try {
      const response = await apiClient.get('/api/ticketer/pos/sales-stats', {
        params: { date }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch sales stats')
    }
  },

  getTransactions: async (params = {}) => {
    try {
      const response = await apiClient.get('/api/ticketer/pos/transactions', {
        params
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch transactions')
    }
  },

  // ==================== SCHEDULE MANAGEMENT ====================
  getSchedules: async (params = {}) => {
    try {
      const response = await apiClient.get('/api/ticketer/schedules', { params })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch schedules')
    }
  },

  getRoutes: async () => {
    try {
      const response = await apiClient.get('/api/ticketer/routes')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch routes')
    }
  },

  getOccupiedSeats: async (scheduleId) => {
    try {
      const response = await apiClient.get(`/api/ticketer/schedules/${scheduleId}/occupied-seats`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch occupied seats')
    }
  },

  // ==================== PAYMENT PROCESSING ====================
  processChapaPayment: async (paymentData) => {
    try {
      const response = await apiClient.post('/api/ticketer/payments/chapa/initialize', paymentData)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to process Chapa payment')
    }
  },

  verifyChapaPayment: async (transactionId) => {
    try {
      const response = await apiClient.get(`/api/ticketer/payments/chapa/verify/${transactionId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to verify Chapa payment')
    }
  },

  getPaymentMethods: async () => {
    try {
      const response = await apiClient.get('/api/ticketer/payments/methods')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch payment methods')
    }
  },

  getPaymentStatus: async (paymentId) => {
    try {
      const response = await apiClient.get(`/api/ticketer/payments/${paymentId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch payment status')
    }
  },

  // ==================== BOOKING MANAGEMENT ====================
  getBookings: async (params = {}) => {
    try {
      const response = await apiClient.get('/api/ticketer/bookings', { params })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch bookings')
    }
  },

  updateBooking: async (bookingId, updateData) => {
    try {
      const response = await apiClient.put(`/api/bookings/${bookingId}`, updateData)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to update booking')
    }
  },

  cancelBooking: async (bookingId) => {
    try {
      const response = await apiClient.post(`/api/bookings/${bookingId}/cancel`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to cancel booking')
    }
  },

  // ==================== UTILITY FUNCTIONS ====================
  exportReport: async (reportType, params = {}) => {
    try {
      const response = await apiClient.get(`/api/reports/${reportType}`, {
        params,
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      return handleServiceError(error, 'Failed to export report')
    }
  },

  // ==================== PRINT FUNCTIONS ====================
  printTicket: async (bookingId) => {
    try {
      const response = await apiClient.post(`/api/print/ticket/${bookingId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to print ticket')
    }
  },

  printReceipt: async (transactionId) => {
    try {
      const response = await apiClient.post(`/api/print/receipt/${transactionId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to print receipt')
    }
  },

  // ==================== SYSTEM STATUS ====================
  getSystemStatus: async () => {
    try {
      const response = await apiClient.get('/api/system/status')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch system status')
    }
  },

  // ==================== VALIDATION FUNCTIONS ====================
  validateSchedule: async (scheduleId) => {
    try {
      const response = await apiClient.get(`/api/bookings/schedule/${scheduleId}/validate`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to validate schedule')
    }
  },

  getBaggagePolicy: async () => {
    try {
      const response = await apiClient.get('/api/bookings/baggage/policy')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch baggage policy')
    }
  },

  calculateBaggageFee: async (weight) => {
    try {
      const response = await apiClient.post('/api/bookings/baggage/calculate-fee', {
        weight_kg: weight
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to calculate baggage fee')
    }
  }
};


export default ticketerService;
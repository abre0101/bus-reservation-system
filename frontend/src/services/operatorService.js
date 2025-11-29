import api from './api'

// Request Controller
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

// Error handler
const handleServiceError = (error, defaultMessage, returnDefault = null) => {
  if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancel')) {
    console.log('Request was cancelled')
    if (returnDefault !== null) {
      return returnDefault
    }
    throw new Error('Request cancelled')
  }
  
  console.error(`${defaultMessage}:`, error)
  
  if (!error.response) {
    if (error.message === 'Network Error') {
      throw new Error('Network error - please check your connection')
    }
    throw new Error(defaultMessage)
  }
  
  if (error.response?.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/operator/login'
    throw new Error('Authentication required')
  }
  
  if (error.response?.data?.error) {
    throw new Error(error.response.data.error)
  }
  
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message)
  }
  
  if (returnDefault !== null) {
    return returnDefault
  }
  
  throw new Error(defaultMessage)
}

// API call wrapper
const makeApiCall = async (method, url, options = {}) => {
  const key = requestController.createKey(method, url, options.params || {})
  const controller = requestController.createController(key)
  
  try {
    const config = {
      method,
      url,
      ...options,
      signal: controller.signal,
      timeout: 10000
    }
    
    console.log(`📡 Making API call: ${method} ${url}`)
    const response = await api(config)
    console.log(`✅ API call successful: ${method} ${url}`)
    return response
  } catch (error) {
    if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
      console.error(`❌ API call failed: ${method} ${url}`, error)
    }
    throw error
  } finally {
    setTimeout(() => {
      requestController.removeController(key)
    }, 1000)
  }
}

export const operatorService = {
  // Request management
  cancelRequest(method, url, params = {}) {
    const key = requestController.createKey(method, url, params)
    requestController.cancelRequest(key)
  },

  cancelAllRequests() {
    requestController.cancelAllRequests()
  },

  // ==================== DASHBOARD ENDPOINTS ====================

  async getDashboardStats(timeframe = 'today') {
    try {
      const response = await makeApiCall('get', '/operator/dashboard/stats', {
        params: { timeframe }
      })
      
      const data = handleBackendResponse(response)
      
      // Active Trips = Scheduled + Boarding + Departed + Active
      // On Route Trips = Departed + Active (subset of Active Trips)
      
      return {
        // Main metrics
        activeTrips: data.activeTrips || 0,  // Total operational trips
        totalDrivers: data.totalDrivers || 0,
        periodBookings: data.periodBookings || 0,
        pendingCheckins: data.pendingCheckins || 0,
        periodRevenue: data.periodRevenue || 0,
        checkinRate: data.checkinRate || 0,
        occupancyRate: data.occupancyRate || 0,
        
        // Trip breakdown by status
        scheduledTrips: data.scheduledTrips || 0,    // Awaiting departure
        boardingTrips: data.boardingTrips || 0,      // Loading passengers
        onRouteTrips: data.onRouteTrips || 0,        // Departed + Active (traveling)
        completedTrips: data.completedTrips || 0,    // Finished trips
        cancelledTrips: data.cancelledTrips || 0,    // Cancelled trips
        
        // Trends (percentage change from previous period)
        activeTripsTrend: data.activeTripsTrend || 0,
        bookingsTrend: data.bookingsTrend || 0,
        revenueTrend: data.revenueTrend || 0,
        occupancyTrend: data.occupancyTrend || 0,
        
        // Metadata
        currency: data.currency || 'ETB',
        timeframe: data.timeframe || timeframe,
        startDate: data.startDate,
        endDate: data.endDate
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch dashboard stats')
    }
  },

  async getRecentTrips(limit = 5) {
    try {
      const response = await makeApiCall('get', '/operator/dashboard/recent-trips', {
        params: { limit }
      })
      const data = handleBackendResponse(response)
      
      return (data.trips || data.schedules || []).map(schedule => ({
        id: schedule._id || schedule.id,
        route: schedule.route_name || schedule.route || `${schedule.origin_city} - ${schedule.destination_city}`,
        departure_time: schedule.departure_time,
        bus: schedule.bus_number || schedule.bus,
        status: schedule.status,
        booked_seats: schedule.booked_seats || 0,
        available_seats: schedule.available_seats || 0,
        total_seats: schedule.total_seats || 45,
        fare_birr: schedule.fare_birr || 0,
        driver_name: schedule.driver_name || 'Not assigned'
      }))
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch recent trips')
    }
  },

  async getAlerts(severity = 'all') {
    try {
      const response = await makeApiCall('get', '/operator/dashboard/alerts', {
        params: { severity }
      })
      const data = handleBackendResponse(response)
      return data.alerts || []
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch alerts')
    }
  },

  async getDashboardCharts(timeframe = 'week') {
    try {
      const response = await makeApiCall('get', '/operator/dashboard/charts', {
        params: { timeframe }
      })
      const data = handleBackendResponse(response)
      return {
        revenue_trend: data.revenue_trend || { labels: [], data: [] },
        occupancy_rate: data.occupancy_rate || { labels: [], data: [] },
        booking_sources: data.booking_sources || { labels: [], data: [] }
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch chart data')
    }
  },

  // ==================== REPORTS ENDPOINTS ====================

  async getReports(params = {}) {
    try {
      const response = await makeApiCall('get', '/operator/reports', {
        params
      })
      const data = handleBackendResponse(response)
      
      return {
        todayBookings: data.todayBookings || [],
        todayRevenue: data.todayRevenue ?? 0,
        todayPassengerCount: data.todayPassengerCount || 0,
        tomorrowBookings: data.tomorrowBookings || [],
        weeklyStats: data.weeklyStats || {
          totalBookings: 0,
          totalRevenue: 0,
          totalPassengers: 0,
          averageOccupancy: 0
        },
        bookingTrends: data.bookingTrends || [],
        routePerformance: data.routePerformance || [],
        busPerformance: data.busPerformance || [],
        cancellationRate: data.cancellationRate || 0,
        totalBookingsInPeriod: data.totalBookingsInPeriod || 0,
        cancelledBookingsInPeriod: data.cancelledBookingsInPeriod || 0,
        mostPopularRoute: data.mostPopularRoute || null
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch reports')
    }
  },

  async getOperatorReports(timeframe = 'today', reportType = 'overview') {
    try {
      const response = await makeApiCall('get', '/operator/reports', {
        params: { timeframe, type: reportType }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch reports')
    }
  },

  async exportReport(timeframe, format) {
    try {
      const response = await makeApiCall('get', '/operator/reports/export', {
        params: { timeframe, format },
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      return handleServiceError(error, 'Failed to export report')
    }
  },

  // ==================== CHECK-IN MANAGEMENT ====================

  async getPendingCheckins() {
    try {
      const response = await makeApiCall('get', '/operator/checkin/pending')
      const data = handleBackendResponse(response)
      return data.pending_checkins || []
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch pending checkins', [])
    }
  },

  async getTodayCheckins() {
    try {
      const response = await makeApiCall('get', '/operator/checkin/today')
      const data = handleBackendResponse(response)
      return {
        checkins: data.checkins || [],
        total: data.total || 0
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch today\'s checkins', {
        checkins: [],
        total: 0
      })
    }
  },

  async checkInBooking(bookingId) {
    try {
      const response = await makeApiCall('post', `/operator/checkin/${bookingId}`, {
        data: {}
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Check-in failed')
    }
  },

  async quickCheckin(pnrNumber) {
    try {
      const response = await makeApiCall('post', '/operator/checkin/quick', {
        data: { pnr_number: pnrNumber }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Quick check-in failed')
    }
  },

  async markNoShow(bookingId, reason = '') {
    try {
      const response = await makeApiCall('post', `/operator/checkin/${bookingId}/no-show`, {
        data: { reason }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to mark no-show')
    }
  },

  async bulkCheckin(bookingIds) {
    try {
      const response = await makeApiCall('post', '/operator/checkin/bulk', {
        data: { booking_ids: bookingIds }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Bulk check-in failed')
    }
  },

  // ==================== BOOKING MANAGEMENT ====================

  async getBookings(params = {}) {
    try {
      const response = await makeApiCall('get', '/operator/bookings', {
        params: {
          status: params.status || 'all',
          date: params.date,
          schedule_id: params.schedule_id
        }
      })
      const data = handleBackendResponse(response)
      return {
        bookings: data.bookings || [],
        total: data.total || 0
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch bookings', {
        bookings: [],
        total: 0
      })
    }
  },

  async getBookingDetails(bookingId) {
    try {
      const response = await makeApiCall('get', `/operator/bookings/${bookingId}`)
      const data = handleBackendResponse(response)
      return data.booking || null
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch booking details', null)
    }
  },

  async lookupBooking(search, searchType = 'pnr') {
    try {
      const response = await makeApiCall('get', '/operator/bookings/lookup', {
        params: { 
          search: search,
          type: searchType
        }
      })
      const data = handleBackendResponse(response)
      return data.booking || null
    } catch (error) {
      return handleServiceError(error, 'Booking lookup failed', null)
    }
  },

  // ==================== SCHEDULES MANAGEMENT ====================

  async getSchedules(params = {}) {
    try {
      const response = await makeApiCall('get', '/operator/schedules', {
        params
      })
      const data = handleBackendResponse(response)
      return {
        schedules: data.schedules || [],
        total: data.total || 0
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch schedules', {
        schedules: [],
        total: 0
      })
    }
  },

  async updateScheduleStatus(scheduleId, newStatus) {
    try {
      const response = await makeApiCall('put', `/operator/schedules/${scheduleId}/status`, {
        data: { status: newStatus }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to update schedule status')
    }
  },

  async updateSchedule(scheduleId, updateData) {
    try {
      console.log('🔄 Updating schedule:', scheduleId, updateData);
      
      const response = await makeApiCall('put', `/operator/schedules/${scheduleId}`, {
        data: updateData
      });
      
      console.log('✅ Schedule updated successfully');
      return handleBackendResponse(response);
      
    } catch (error) {
      console.error('❌ Update schedule failed:', error);
      return handleServiceError(error, 'Failed to update schedule');
    }
  },

  async pauseSchedule(scheduleId) {
    try {
      const response = await makeApiCall('post', `/operator/schedules/${scheduleId}/pause`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to pause schedule')
    }
  },

  async resumeSchedule(scheduleId) {
    try {
      const response = await makeApiCall('post', `/operator/schedules/${scheduleId}/resume`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to resume schedule')
    }
  },

  async getScheduleDetails(scheduleId) {
    try {
      const response = await makeApiCall('get', `/operator/schedules/${scheduleId}`)
      const data = handleBackendResponse(response)
      return data.schedule || null
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch schedule details', null)
    }
  },

  async createSchedule(scheduleData) {
    try {
      console.log('📤 Creating schedule with data:', scheduleData);
      
      const response = await makeApiCall('post', '/operator/schedules', {
        data: scheduleData
      });
      
      console.log('✅ Schedule created successfully');
      return handleBackendResponse(response);
      
    } catch (error) {
      console.error('❌ Create schedule failed:', error);
      return handleServiceError(error, 'Failed to create schedule');
    }
  },

  async deleteSchedule(scheduleId) {
    try {
      const response = await makeApiCall('delete', `/operator/schedules/${scheduleId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to delete schedule')
    }
  },

  async emergencyCancelSchedule(scheduleId, data) {
    try {
      console.log('🚨 Emergency cancelling schedule:', scheduleId, data)
      const response = await makeApiCall('post', `/operator/schedules/${scheduleId}/emergency-cancel`, {
        data
      })
      console.log('✅ Schedule cancelled:', response.data)
      return handleBackendResponse(response)
    } catch (error) {
      console.error('❌ Error cancelling schedule:', error)
      return handleServiceError(error, 'Failed to cancel schedule')
    }
  },

  // ==================== ROUTES MANAGEMENT ====================

  async getRoutes() {
    try {
      const response = await makeApiCall('get', '/operator/routes')
      const data = handleBackendResponse(response)
      return {
        routes: data.routes || data || [],
        total: data.total || (data.routes || data || []).length
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch routes', {
        routes: [],
        total: 0
      })
    }
  },

  // ==================== BUSES MANAGEMENT ====================

  async getBuses() {
    try {
      const response = await makeApiCall('get', '/operator/buses')
      const data = handleBackendResponse(response)
      return {
        buses: data.buses || data || [],
        total: data.total || (data.buses || data || []).length
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch buses', {
        buses: [],
        total: 0
      })
    }
  },

  // ==================== DRIVER MANAGEMENT ====================

  async getDrivers() {
    try {
      const response = await makeApiCall('get', '/operator/drivers')
      const data = handleBackendResponse(response)
      return {
        drivers: data.drivers || data || [],
        total: data.total || (data.drivers || data || []).length
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch drivers', {
        drivers: [],
        total: 0
      })
    }
  },

  async createDriver(driverData) {
    try {
      const response = await makeApiCall('post', '/operator/drivers', {
        data: driverData
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to create driver')
    }
  },

  async updateDriver(driverId, driverData) {
    try {
      const response = await makeApiCall('put', `/operator/drivers/${driverId}`, {
        data: driverData
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to update driver')
    }
  },

  async deleteDriver(driverId) {
    try {
      const response = await makeApiCall('delete', `/operator/drivers/${driverId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to delete driver')
    }
  },

  async getDriver(driverId) {
    try {
      const response = await makeApiCall('get', `/operator/drivers/${driverId}`)
      const data = handleBackendResponse(response)
      return data.driver || data || null
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch driver details', null)
    }
  },

  async assignDriver(scheduleId, driverId, notes = '') {
    try {
      const response = await makeApiCall('post', '/operator/assign-driver', {
        data: {
          schedule_id: scheduleId,
          driver_id: driverId,
          notes
        }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to assign driver')
    }
  },

  async getDriverAssignments(driverId) {
    try {
      const response = await makeApiCall('get', `/operator/drivers/${driverId}/assignments`)
      const data = handleBackendResponse(response)
      return data.assignments || data || []
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch driver assignments', [])
    }
  },

  async getDriverPerformance(driverId) {
    try {
      const response = await makeApiCall('get', `/operator/drivers/${driverId}/performance`)
      const data = handleBackendResponse(response)
      return data.performance || data || {
        total_trips: 0,
        rating: 0,
        experience_years: 0,
        status: 'inactive'
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch driver performance')
    }
  },

  async updateDriverStatus(driverId, isActive) {
    try {
      const response = await makeApiCall('put', `/operator/drivers/${driverId}/status`, {
        data: { is_active: isActive }
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to update driver status')
    }
  },

  // ==================== TARIFF MANAGEMENT ====================

  async getTariffRates(activeOnly = true) {
    try {
      const response = await makeApiCall('get', '/operator/tariff-rates', {
        params: { active_only: activeOnly }
      })
      const data = handleBackendResponse(response)
      return {
        tariff_rates: data.tariff_rates || [],
        total: data.total || 0
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch tariff rates', {
        tariff_rates: [],
        total: 0
      })
    }
  },

  async getCurrentTariffRates() {
    try {
      const response = await makeApiCall('get', '/operator/tariff-rates/current')
      const data = handleBackendResponse(response)
      return {
        tariff_rates: data.tariff_rates || {},
        using_defaults: data.using_defaults || false
      }
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch current tariff rates', {
        tariff_rates: {},
        using_defaults: true
      })
    }
  },

  async createTariffRate(tariffData) {
    try {
      const response = await makeApiCall('post', '/operator/tariff-rates', {
        data: tariffData
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to create tariff rate')
    }
  },

  async updateTariffRate(rateId, tariffData) {
    try {
      const response = await makeApiCall('put', `/operator/tariff-rates/${rateId}`, {
        data: tariffData
      })
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to update tariff rate')
    }
  },

  async deleteTariffRate(rateId) {
    try {
      const response = await makeApiCall('delete', `/operator/tariff-rates/${rateId}`)
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to delete tariff rate')
    }
  },

  async calculateTariff(distance, busType) {
    try {
      const response = await makeApiCall('post', '/operator/tariff-rates/calculate', {
        data: { distance, bus_type: busType }
      })
      const data = handleBackendResponse(response)
      return data.calculation || null
    } catch (error) {
      return handleServiceError(error, 'Failed to calculate tariff', null)
    }
  },

  // ==================== SYSTEM ENDPOINTS ====================

  async getSystemStatus() {
    try {
      const response = await makeApiCall('get', '/operator/system/status')
      return handleBackendResponse(response)
    } catch (error) {
      return handleServiceError(error, 'Failed to fetch system status')
    }
  }
}

export default operatorService
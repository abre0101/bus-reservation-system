import api from './api'

export const adminService = {
  // Dashboard
  async getDashboardStats() {
    try {
      console.log('🔄 Fetching admin dashboard stats...')
      const response = await api.get('/admin/dashboard/stats')
      console.log('✅ Dashboard stats response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting dashboard stats:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      throw this.handleError(error)
    }
  },

  // REPORTS METHODS - ADDED AND FIXED
  async getReports(params = {}) {
    try {
      console.log('🔄 Fetching reports with params:', params)
      
      // Build query parameters for reports
      const queryParams = {}
      if (params.start_date) queryParams.start_date = params.start_date
      if (params.end_date) queryParams.end_date = params.end_date
      if (params.report_type && params.report_type !== 'all') {
        queryParams.report_type = params.report_type
      }

      const response = await api.get('/admin/reports', { params: queryParams })
      console.log('✅ Reports API response:', response.data)
      
      // Handle different response formats
      let reportsData = []
      if (Array.isArray(response.data)) {
        reportsData = response.data
      } else if (response.data && typeof response.data === 'object') {
        if (response.data.reports && Array.isArray(response.data.reports)) {
          reportsData = response.data.reports
        } else if (response.data.data && Array.isArray(response.data.data)) {
          reportsData = response.data.data
        } else {
          // If it's a single report object, wrap it in array
          reportsData = [response.data]
        }
      }
      
      console.log(`📊 Processed ${reportsData.length} reports from database`)
      return reportsData
      
    } catch (error) {
      console.error('❌ Error getting reports:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      throw this.handleError(error)
    }
  },

  async exportReports(format = 'csv', params = {}) {
    try {
      console.log('🔄 Exporting reports with:', { format, params })
      
      const requestData = {
        format: format.toLowerCase(),
        type: params.report_type || 'payments'
      }
      
      // Add date filters if provided
      if (params.start_date) requestData.start_date = params.start_date
      if (params.end_date) requestData.end_date = params.end_date

      const response = await api.post('/admin/reports/export', requestData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('✅ Export response received, creating download...')
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/pdf' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const reportType = params.report_type || 'payments'
      const filename = `${reportType}_report_${timestamp}.${format}`
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      console.log(`✅ File download triggered: ${filename}`)
      return { success: true, filename }
      
    } catch (error) {
      console.error('❌ Error exporting reports:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      throw this.handleError(error)
    }
  },

  // Generate quick report (convenience method)
  async generateQuickReport(type = 'daily') {
    try {
      console.log(`🚀 Generating quick ${type} report...`)
      const response = await api.get('/admin/reports', {
        params: { report_type: type }
      })
      return response.data
    } catch (error) {
      console.error(`❌ Error generating ${type} report:`, error)
      throw this.handleError(error)
    }
  },

  // Unified entity management
  async getEntities(entity, params = {}) {
    try {
      console.log(`🔄 Fetching ${entity} with params:`, params)
      const response = await api.get(`/admin/${entity}`)
      console.log(`✅ ${entity} response:`, response.data)
      
      const data = response.data
      
      // Handle different response formats
      if (data && data[`${entity}s`]) {
        console.log(`✅ Found ${data[`${entity}s`].length} ${entity} records`)
        return data[`${entity}s`]
      } else if (Array.isArray(data)) {
        console.log(`✅ Found ${data.length} ${entity} records (array format)`)
        return data
      } else {
        console.warn(`⚠️ Unexpected response format for ${entity}:`, data)
        return []
      }
    } catch (error) {
      console.error(`❌ Error getting ${entity}:`, {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      throw this.handleError(error)
    }
  },

  async createEntity(entity, data) {
    try {
      if (!data) {
        throw new Error(`${entity} data is required`)
      }
      console.log(`🔄 Creating ${entity}:`, data)
      const response = await api.post(`/admin/${entity}`, data)
      return response.data
    } catch (error) {
      console.error(`❌ Error creating ${entity}:`, error)
      throw this.handleError(error)
    }
  },

  async updateEntity(entity, id, data) {
    try {
      if (!id) {
        throw new Error(`${entity} ID is required`)
      }
      console.log(`🔄 Updating ${entity} ${id}:`, data)
      const response = await api.put(`/admin/${entity}/${id}`, data)
      return response.data
    } catch (error) {
      console.error(`❌ Error updating ${entity}:`, error)
      throw this.handleError(error)
    }
  },

  async deleteEntity(entity, id) {
    try {
      if (!id) {
        throw new Error(`${entity} ID is required`)
      }
      console.log(`🔄 Deleting ${entity} ${id}`)
      const response = await api.delete(`/admin/${entity}/${id}`)
      return response.data
    } catch (error) {
      console.error(`❌ Error deleting ${entity}:`, error)
      throw this.handleError(error)
    }
  },

  // User methods
  async getUsers(params = {}) {
    console.log('🔄 Getting users via legacy method...')
    const users = await this.getEntities('user', params)
    console.log(`✅ Legacy users method found ${users.length} users`)
    return users
  },

  async createUser(userData) {
    return this.createEntity('user', userData)
  },

  async updateUser(id, userData) {
    return this.updateEntity('user', id, userData)
  },

  async deleteUser(id) {
    return this.deleteEntity('user', id)
  },

  // Bus methods
  async getBuses(params = {}) {
    try {
      console.log('🔄 Fetching buses with params:', params)
      const response = await api.get('/admin/buses', { params })
      console.log('✅ Buses API response:', response.data)
      console.log('🔍 Response data type:', typeof response.data)
      console.log('🔍 Response data keys:', Object.keys(response.data))
      console.log('🔍 Has buses property?', 'buses' in response.data)
      console.log('🔍 response.data.buses:', response.data.buses)
      
      // Handle different response formats
      let buses = []
      if (response.data && response.data.buses && Array.isArray(response.data.buses)) {
        console.log('✅ Using response.data.buses format')
        buses = response.data.buses
      } else if (Array.isArray(response.data)) {
        console.log('✅ Using direct array format')
        buses = response.data
      } else {
        console.warn('⚠️ Unexpected buses response format:', response.data)
        console.warn('⚠️ Trying to extract buses from all possible keys...')
        // Try to find buses in any property
        for (const key of Object.keys(response.data)) {
          if (Array.isArray(response.data[key])) {
            console.log(`🔍 Found array in key: ${key}`)
            buses = response.data[key]
            break
          }
        }
      }
      
      console.log(`✅ Found ${buses.length} buses`)
      return { buses }
    } catch (error) {
      console.error('❌ Error getting buses:', error)
      throw this.handleError(error)
    }
  },

  async createBus(busData) {
    return this.createEntity('bus', busData)
  },

  async updateBus(id, busData) {
    return this.updateEntity('bus', id, busData)
  },

  async deleteBus(id) {
    return this.deleteEntity('bus', id)
  },

  // Route methods
  async getRoutes(params = {}) {
    try {
      console.log('🔄 Fetching routes with params:', params)
      const response = await api.get('/admin/routes', { params })
      console.log('✅ Routes API response:', response.data)
      
      // Handle different response formats
      let routes = []
      if (response.data && response.data.routes && Array.isArray(response.data.routes)) {
        routes = response.data.routes
      } else if (Array.isArray(response.data)) {
        routes = response.data
      } else {
        console.warn('⚠️ Unexpected routes response format:', response.data)
      }
      
      console.log(`✅ Found ${routes.length} routes`)
      return { routes }
    } catch (error) {
      console.error('❌ Error getting routes:', error)
      throw this.handleError(error)
    }
  },

  async createRoute(routeData) {
    return this.createEntity('route', routeData)
  },

  async updateRoute(id, routeData) {
    return this.updateEntity('route', id, routeData)
  },

  async deleteRoute(id) {
    return this.deleteEntity('route', id)
  },

  // Schedule methods
  async getSchedules(params = {}) {
    try {
      console.log('🔄 Fetching schedules with params:', params)
      const response = await api.get('/admin/schedules', { params })
      console.log('✅ Schedules API response:', response.data)
      
      // Handle different response formats
      let schedules = []
      if (response.data && response.data.schedules && Array.isArray(response.data.schedules)) {
        schedules = response.data.schedules
      } else if (Array.isArray(response.data)) {
        schedules = response.data
      } else {
        console.warn('⚠️ Unexpected schedules response format:', response.data)
      }
      
      console.log(`✅ Found ${schedules.length} schedules`)
      return { schedules }
    } catch (error) {
      console.error('❌ Error getting schedules:', error)
      throw this.handleError(error)
    }
  },

  async createSchedule(scheduleData) {
    return this.createEntity('schedule', scheduleData)
  },

  async updateSchedule(id, scheduleData) {
    return this.updateEntity('schedule', id, scheduleData)
  },

  async deleteSchedule(id) {
    return this.deleteEntity('schedule', id)
  },

  async emergencyCancelSchedule(scheduleId, data) {
    try {
      console.log('🚨 Emergency cancelling schedule:', scheduleId, data)
      const response = await api.post(`/admin/schedules/${scheduleId}/emergency-cancel`, data)
      console.log('✅ Schedule cancelled:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error cancelling schedule:', error)
      throw this.handleError(error)
    }
  },

  // Booking methods
  async getBookings(params = {}) {
    return this.getEntities('booking', params)
  },

  async updateBooking(id, bookingData) {
    return this.updateEntity('booking', id, bookingData)
  },

  // DRIVER METHODS - FIXED AND COMPLETE
  async getDrivers(params = {}) {
    try {
      console.log('🔄 Fetching drivers with params:', params)
      const response = await api.get('/admin/drivers', { params })
      console.log('✅ Drivers API response:', response.data)
      
      // Handle different response formats
      let drivers = []
      if (response.data && response.data.drivers && Array.isArray(response.data.drivers)) {
        drivers = response.data.drivers
      } else if (Array.isArray(response.data)) {
        drivers = response.data
      } else {
        console.warn('⚠️ Unexpected drivers response format:', response.data)
      }
      
      console.log(`✅ Found ${drivers.length} drivers`)
      return { drivers }
    } catch (error) {
      console.error('❌ Error getting drivers:', error)
      throw this.handleError(error)
    }
  },

  async getDriver(id) {
    try {
      console.log(`🔄 Fetching driver ${id}...`)
      const response = await api.get(`/admin/drivers/${id}`)
      return response.data
    } catch (error) {
      console.error(`❌ Error getting driver ${id}:`, error)
      throw this.handleError(error)
    }
  },

  async createDriver(driverData) {
    try {
      console.log('🔄 Creating driver with data:', driverData)
      
      // Check if driverData is FormData (has files)
      if (driverData instanceof FormData) {
        console.log('📤 Sending driver data as multipart/form-data')
        const response = await api.post('/admin/driver', driverData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        return response.data
      } else {
        // Regular JSON data
        return this.createEntity('driver', driverData)
      }
    } catch (error) {
      console.error('❌ Error creating driver:', error)
      throw this.handleError(error)
    }
  },

  async updateDriver(id, driverData) {
    try {
      console.log(`🔄 Updating driver ${id} with data:`, driverData)
      
      // Check if driverData is FormData (has files)
      if (driverData instanceof FormData) {
        console.log('📤 Sending driver update as multipart/form-data')
        const response = await api.put(`/admin/driver/${id}`, driverData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        return response.data
      } else {
        // Regular JSON data
        return this.updateEntity('driver', id, driverData)
      }
    } catch (error) {
      console.error(`❌ Error updating driver ${id}:`, error)
      throw this.handleError(error)
    }
  },

  async updateDriverStatus(id, status) {
    return this.updateEntity('driver', id, { status })
  },

  async deleteDriver(id) {
    return this.deleteEntity('driver', id)
  },

  // Payment methods
  async getPayments(params = {}) {
    try {
      console.log('🔄 Fetching payments with refund stats')
      const response = await api.get('/admin/payments')
      console.log('✅ Payments response:', response.data)
      
      const data = response.data
      
      // Handle new response format with refund_stats
      if (data && data.payments) {
        return {
          payments: data.payments,
          refund_stats: data.refund_stats || { total_refunds: 0, refunded_bookings_count: 0 }
        }
      } else if (data && data.payments) {
        // Legacy format
        return { payments: data.payments, refund_stats: { total_refunds: 0, refunded_bookings_count: 0 } }
      } else if (Array.isArray(data)) {
        // Array format
        return { payments: data, refund_stats: { total_refunds: 0, refunded_bookings_count: 0 } }
      } else {
        console.warn('⚠️ Unexpected payments response format:', data)
        return { payments: [], refund_stats: { total_refunds: 0, refunded_bookings_count: 0 } }
      }
    } catch (error) {
      console.error('❌ Error getting payments:', error)
      throw this.handleError(error)
    }
  },

  // Enhanced error handler
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 400:
          return new Error(data.message || data.error || 'Bad request. Please check your input data.')
        case 401:
          return new Error('Authentication required. Please log in again.')
        case 403:
          return new Error('You do not have permission to perform this action.')
        case 404:
          return new Error('The requested resource was not found.')
        case 405:
          return new Error('Method not allowed. Please check the API endpoint.')
        case 409:
          return new Error(data.message || 'Conflict. Resource already exists.')
        case 422:
          return new Error(data.message || 'Validation failed. Please check your input.')
        case 500:
          return new Error('Server error. Please try again later.')
        default:
          return new Error(data.message || data.error || `Request failed with status ${status}`)
      }
    } else if (error.request) {
      return new Error('Network error. Please check your connection and try again.')
    } else {
      return new Error(error.message || 'An unexpected error occurred.')
    }
  },

  // Utility method to check admin permissions
  async checkAdminAccess() {
    try {
      const response = await api.get('/admin/test-auth')
      return response.data
    } catch (error) {
      console.error('❌ Error checking admin access:', error)
      throw this.handleError(error)
    }
  },

  // Get popular routes for analytics (if available)
  async getPopularRoutes() {
    try {
      // Try to get routes data and calculate popularity
      const routes = await this.getRoutes()
      const bookings = await this.getBookings()
      
      // Calculate route popularity based on bookings
      const routeCounts = {}
      bookings.forEach(booking => {
        const routeKey = `${booking.departure_city} → ${booking.arrival_city}`
        routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1
      })
      
      return Object.entries(routeCounts)
        .map(([name, bookings]) => ({ name, bookings }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5)
        
    } catch (error) {
      console.error('❌ Error calculating popular routes:', error)
      return []
    }
  },

  // Get current tariff rates
  async getCurrentTariffRates() {
    try {
      console.log('🔄 Fetching current tariff rates...')
      const response = await api.get('/tariff/rates/current')
      console.log('✅ Tariff rates response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting tariff rates:', error)
      throw this.handleError(error)
    }
  },

  // Get all tariff rates (admin only)
  async getTariffRates() {
    try {
      console.log('🔄 Fetching all tariff rates...')
      const response = await api.get('/tariff/rates')
      console.log('✅ All tariff rates response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting all tariff rates:', error)
      throw this.handleError(error)
    }
  },

  // Create tariff rate (admin only)
  async createTariffRate(rateData) {
    try {
      console.log('🔄 Creating tariff rate:', rateData)
      const response = await api.post('/tariff/rates', rateData)
      console.log('✅ Tariff rate created:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error creating tariff rate:', error)
      throw this.handleError(error)
    }
  },

  // Update tariff rate (admin only)
  async updateTariffRate(rateId, rateData) {
    try {
      console.log('🔄 Updating tariff rate:', rateId, rateData)
      const response = await api.put(`/tariff/rates/${rateId}`, rateData)
      console.log('✅ Tariff rate updated:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error updating tariff rate:', error)
      throw this.handleError(error)
    }
  },

  // Delete (deactivate) tariff rate (admin only)
  async deleteTariffRate(rateId) {
    try {
      console.log('🔄 Deactivating tariff rate:', rateId)
      const response = await api.delete(`/tariff/rates/${rateId}`)
      console.log('✅ Tariff rate deactivated:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error deactivating tariff rate:', error)
      throw this.handleError(error)
    }
  },

  // Get tariff rate history (admin only)
  async getTariffHistory(busType = null) {
    try {
      console.log('🔄 Fetching tariff history...')
      const params = busType ? { bus_type: busType } : {}
      const response = await api.get('/tariff/rates/history', { params })
      console.log('✅ Tariff history response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting tariff history:', error)
      throw this.handleError(error)
    }
  },

  // ==================== CUSTOMER MANAGEMENT ====================
  async getCustomers() {
    try {
      console.log('🔄 Fetching customers...')
      const response = await api.get('/admin/customers')
      console.log('✅ Customers response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error getting customers:', error)
      throw this.handleError(error)
    }
  },

  async getCustomerBookings(customerId) {
    try {
      console.log(`🔄 Fetching bookings for customer ${customerId}...`)
      const response = await api.get(`/admin/customer/${customerId}/bookings`)
      console.log('✅ Customer bookings response:', response.data)
      return response.data
    } catch (error) {
      console.error(`❌ Error getting customer ${customerId} bookings:`, error)
      throw this.handleError(error)
    }
  }
}
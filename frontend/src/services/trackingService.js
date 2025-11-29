import api from './api'

export const trackingService = {
  // ==================== BUS LOCATION TRACKING ====================
  
  async updateBusLocation(locationData) {
    try {
      console.log('📍 Updating bus location:', locationData)
      const response = await api.post('/tracking/bus-location', locationData)
      console.log('✅ Location updated successfully')
      return response.data
    } catch (error) {
      console.error('❌ Error updating location:', error)
      throw this.handleError(error)
    }
  },

  async getBusLocation(scheduleId) {
    try {
      console.log(`📍 Getting location for schedule: ${scheduleId}`)
      const response = await api.get(`/tracking/bus-location/${scheduleId}`)
      console.log('✅ Location retrieved')
      return response.data
    } catch (error) {
      console.error('❌ Error getting location:', error)
      throw this.handleError(error)
    }
  },

  async getActiveBuses() {
    try {
      console.log('🚌 Getting all active buses')
      const response = await api.get('/tracking/active-buses')
      console.log(`✅ Retrieved ${response.data.active_buses?.length || 0} active buses`)
      return response.data
    } catch (error) {
      console.error('❌ Error getting active buses:', error)
      throw this.handleError(error)
    }
  },

  async getActiveTrips() {
    try {
      console.log('🚌 Getting active trips with tracking')
      const response = await api.get('/tracking/active-buses')
      
      // Transform data for the UI
      const trips = (response.data.active_buses || []).map(bus => ({
        schedule_id: bus._id,
        bus_number: bus.bus_number || 'N/A',
        route_name: bus.route_name || `${bus.origin_city} - ${bus.destination_city}`,
        driver_name: bus.driver_name || 'Not assigned',
        departure_date: bus.departure_date ? new Date(bus.departure_date).toLocaleDateString() : 'N/A',
        status: bus.journey_status || 'scheduled',
        current_location: bus.current_location || 'Not started',
        total_stops: bus.total_stops || 0,
        completed_stops: bus.checked_stops_count || 0,
        progress: bus.progress_percentage || 0,
        last_update: bus.latest_checkin?.timestamp || null,
        is_delayed: bus.is_delayed || false
      }))
      
      console.log(`✅ Retrieved ${trips.length} active trips`)
      return { active_trips: trips }
    } catch (error) {
      console.error('❌ Error getting active trips:', error)
      throw this.handleError(error)
    }
  },

  async getTrackingStats() {
    try {
      const response = await api.get('/tracking/active-buses')
      const buses = response.data.active_buses || []
      
      return {
        totalActiveTrips: buses.length,
        onTimeTrips: buses.filter(b => !b.is_delayed && b.journey_status === 'in_progress').length,
        delayedTrips: buses.filter(b => b.is_delayed).length,
        completedToday: buses.filter(b => b.journey_status === 'completed').length
      }
    } catch (error) {
      console.error('❌ Error getting tracking stats:', error)
      return {
        totalActiveTrips: 0,
        onTimeTrips: 0,
        delayedTrips: 0,
        completedToday: 0
      }
    }
  },

  // ==================== BUS STOPS ====================
  
  async getBusStops(routeId = null) {
    try {
      const params = routeId ? { route_id: routeId } : {}
      const response = await api.get('/tracking/bus-stops', { params })
      return response.data
    } catch (error) {
      console.error('❌ Error getting bus stops:', error)
      throw this.handleError(error)
    }
  },

  async createBusStop(busStopData) {
    try {
      const response = await api.post('/tracking/bus-stops', busStopData)
      return response.data
    } catch (error) {
      console.error('❌ Error creating bus stop:', error)
      throw this.handleError(error)
    }
  },

  // ==================== LIVE TRACKING ====================
  
  async getLiveTracking(scheduleId) {
    try {
      console.log(`📍 Getting live tracking for schedule: ${scheduleId}`)
      const response = await api.get(`/tracking/bus-location/${scheduleId}`)
      
      // Transform the response to match the expected format
      const location = response.data.location || {}
      const schedule = response.data.schedule || {}
      
      return {
        tracking: {
          schedule_id: scheduleId,
          bus_number: schedule.bus_number || 'N/A',
          route: schedule.route_name || `${schedule.origin_city} - ${schedule.destination_city}`,
          current_status: location.journey_status || schedule.status || 'scheduled',
          current_location: location.current_location || 'Not started',
          progress: location.progress_percentage ? `${location.progress_percentage}%` : '0%',
          estimated_arrival: location.estimated_arrival || schedule.arrival_time || 'N/A',
          last_update: location.timestamp || null,
          message: this.getStatusMessage(location.journey_status || schedule.status)
        }
      }
    } catch (error) {
      console.error('❌ Error getting live tracking:', error)
      throw this.handleError(error)
    }
  },

  startRealTimeTracking(scheduleId, callback, interval = 30000) {
    console.log(`🔄 Starting real-time tracking for schedule: ${scheduleId}`)
    
    // Initial load
    this.getLiveTracking(scheduleId)
      .then(callback)
      .catch(err => {
        console.error('❌ Initial tracking load failed:', err)
        callback({ tracking: null, error: err.message })
      })
    
    // Set up interval for updates
    const intervalId = setInterval(() => {
      this.getLiveTracking(scheduleId)
        .then(callback)
        .catch(err => {
          console.error('❌ Tracking update failed:', err)
          callback({ tracking: null, error: err.message })
        })
    }, interval)
    
    // Return cleanup function
    return () => {
      console.log(`🛑 Stopping real-time tracking for schedule: ${scheduleId}`)
      clearInterval(intervalId)
    }
  },

  getStatusMessage(status) {
    const messages = {
      'scheduled': 'Bus is scheduled and ready for departure',
      'boarding': 'Passengers are boarding',
      'departed': 'Bus has departed and is on the way',
      'en_route': 'Bus is traveling to destination',
      'in_progress': 'Journey in progress',
      'completed': 'Journey completed - arrived at destination',
      'delayed': 'Bus is running behind schedule',
      'cancelled': 'Trip has been cancelled'
    }
    return messages[status] || 'Status unknown'
  },

  // ==================== SIMULATOR ====================
  
  async simulateLocation(scheduleId, type = 'random') {
    try {
      console.log(`🎮 Simulating ${type} location for schedule: ${scheduleId}`)
      const response = await api.post('/tracking/simulator/generate-location', {
        schedule_id: scheduleId,
        type: type
      })
      console.log('✅ Location simulated')
      return response.data
    } catch (error) {
      console.error('❌ Error simulating location:', error)
      throw this.handleError(error)
    }
  },

  async autoTrackBus(scheduleId) {
    try {
      console.log(`🎮 Starting auto-track for schedule: ${scheduleId}`)
      const response = await api.post(`/tracking/simulator/auto-track/${scheduleId}`)
      console.log(`✅ Generated ${response.data.total_stops} location updates`)
      return response.data
    } catch (error) {
      console.error('❌ Error auto-tracking:', error)
      throw this.handleError(error)
    }
  },

  // ==================== ERROR HANDLING ====================
  
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response
      const serverMessage = data?.message || data?.error || JSON.stringify(data)
      return new Error(`Server error ${status}: ${serverMessage}`)
    } else if (error.request) {
      return new Error('Network error - check connection')
    } else {
      return new Error(error.message)
    }
  }
}

export default trackingService

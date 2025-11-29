// src/services/scheduleService.js
import api from './api'

// Data transformation utilities
const transformScheduleData = (schedule) => {
  console.log('🔄 Transforming schedule data:', schedule)
  
  // Use the actual data from backend - don't create duplicates!
  const transformed = {
    // Core identifiers
    _id: schedule._id,
    route_id: schedule.route_id,
    bus_id: schedule.bus_id,
    
    // Route information - use snake_case from backend
    origin_city: schedule.origin_city,
    destination_city: schedule.destination_city,
    
    // Date and time
    departure_date: schedule.departure_date ? new Date(schedule.departure_date).toISOString().split('T')[0] : '',
    departure_time: schedule.departure_time,
    arrival_time: schedule.arrival_time,
    
    // Pricing
    price: schedule.fare_birr || schedule.price,
    fare_birr: schedule.fare_birr || schedule.price,
    fare: schedule.fare_birr || schedule.price, // Alias for components expecting 'fare'
    
    // Bus information - use actual bus data if available
    bus: schedule.bus || {
      _id: schedule.bus_id,
      name: schedule.bus_name || `EthioBus ${schedule.bus_type?.charAt(0).toUpperCase() + schedule.bus_type?.slice(1)}`,
      type: schedule.bus_type,
      number: schedule.bus_number,
      capacity: schedule.bus_capacity || 45,
      status: schedule.bus_status || 'active',
      amenities: schedule.bus_amenities || schedule.amenities || []
    },
    bus_type: schedule.bus_type,
    bus_number: schedule.bus_number,
    
    // Availability
    available_seats: schedule.available_seats,
    seats_available: schedule.available_seats, // Alias
    
    // Status and metadata
    status: schedule.status,
    amenities: schedule.amenities || [],
    duration: calculateDuration(schedule.departure_time, schedule.arrival_time),
    driver_name: schedule.driver_name,
    driver_id: schedule.driver_id,
    
    // Additional route info from backend
    distance_km: schedule.distance_km,
    estimated_duration_hours: schedule.estimated_duration_hours,
    stops: schedule.stops,
    
    // Status flags from backend
    is_completed: schedule.is_completed,
    is_under_maintenance: schedule.is_under_maintenance,
    is_available: schedule.is_available,
    
    // Timestamps
    created_at: schedule.created_at,
    updated_at: schedule.updated_at,
    
    // ===== COMPATIBILITY LAYER (for gradual migration) =====
    // These camelCase aliases allow existing components to work
    // TODO: Remove these once all components are updated to snake_case
    originCity: schedule.origin_city,
    destinationCity: schedule.destination_city,
    departureTime: schedule.departure_time,
    arrivalTime: schedule.arrival_time,
    busType: schedule.bus_type,
    busNumber: schedule.bus_number,
    availableSeats: schedule.available_seats,
    fareBirr: schedule.fare_birr || schedule.price,
    routeId: schedule.route_id,
    busId: schedule.bus_id,
    distanceKm: schedule.distance_km,
    estimatedDurationHours: schedule.estimated_duration_hours
  }

  console.log('✅ Transformed schedule:', transformed)
  return transformed
}

const calculateDuration = (departure_time, arrival_time) => {
  if (!departure_time || !arrival_time) return 'N/A'
  
  try {
    const [depHours, depMinutes] = departure_time.split(':').map(Number)
    const [arrHours, arrMinutes] = arrival_time.split(':').map(Number)
    
    let totalMinutes = (arrHours * 60 + arrMinutes) - (depHours * 60 + depMinutes)
    
    // Handle overnight trips
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60
    }
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  } catch (error) {
    console.error('Error calculating duration:', error)
    return 'N/A'
  }
}

const transformCitiesResponse = (response) => {
  console.log('🏙️ Transforming cities response:', response)
  
  // If response already has cities array, return as-is
  if (response.cities && Array.isArray(response.cities)) {
    return response
  }
  
  // If response is direct array
  if (Array.isArray(response)) {
    return { cities: response }
  }
  
  // Fallback to default cities
  return {
    cities: [
      'Addis Ababa',
      'Hawassa', 
      'Dire Dawa',
      'Jimma',
      'Adama',
      'Shashemene',
      'Bishoftu',
      'Bahir Dar',
      'Mekele',
      'Gondar'
    ]
  }
}

const transformDatesResponse = (response) => {
  console.log('📅 Transforming dates response:', response)
  
  // If response already has dates array, return as-is
  if (response.dates && Array.isArray(response.dates)) {
    return response
  }
  
  // If response is direct array
  if (Array.isArray(response)) {
    return { dates: response }
  }
  
  // Fallback - generate next 7 days
  const dates = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  return { dates }
}

export const scheduleService = {
  async searchSchedules(params = {}) {
    try {
      console.log('🚀 Searching schedules with params:', params)
      
      const backendParams = {
        origin_city: params.origin_city || params.originCity,
        destination_city: params.destination_city || params.destinationCity,
        date: params.date,
      }
      
      const response = await api.get('/schedules', { params: backendParams })
      console.log('✅ Raw schedules API response:', response.data)
      
      // Check if we got a successful response with schedules
      if (!response.data.success) {
        console.log('❌ Backend returned unsuccessful response:', response.data)
        return {
          success: false,
          schedules: [],
          count: 0,
          error: response.data.error || 'No schedules found',
          message: response.data.message || 'No schedules available'
        }
      }
      
      // Transform the schedule data
      let schedules = []
      if (response.data.schedules && Array.isArray(response.data.schedules)) {
        schedules = response.data.schedules.map(transformScheduleData)
      }
      
      const transformedResponse = {
        success: true,
        schedules: schedules,
        count: schedules.length,
        total: response.data.total || schedules.length,
        message: `Found ${schedules.length} schedules`,
        search: response.data.search,
        stats: response.data.stats
      }
      
      console.log('✅ Transformed schedules response:', transformedResponse)
      return transformedResponse
      
    } catch (error) {
      console.error('❌ Schedules API error:', error)
      
      // Return structured error response
      return {
        success: false,
        schedules: [],
        count: 0,
        error: error.response?.data?.message || error.message || 'Failed to fetch schedules',
        message: 'No schedules available for the selected route and date'
      }
    }
  },

  async getAvailableCities() {
    try {
      console.log('🏙️ Fetching available cities...')
      const response = await api.get('/schedules/cities')
      console.log('✅ Raw cities response:', response.data)
      
      const transformedResponse = transformCitiesResponse(response.data)
      console.log('✅ Transformed cities response:', transformedResponse)
      return transformedResponse
      
    } catch (error) {
      console.error('❌ Error fetching cities:', error)
      
      // Return fallback cities
      const fallbackResponse = transformCitiesResponse([])
      console.log('🔄 Using fallback cities:', fallbackResponse)
      return fallbackResponse
    }
  },

  async getAvailableDates(params = {}) {
    try {
      console.log('📅 Fetching available dates:', params)
      
      const backendParams = {
        origin_city: params.origin_city || params.originCity,
        destination_city: params.destination_city || params.destinationCity
      }
      
      const response = await api.get('/schedules/dates', { params: backendParams })
      console.log('✅ Raw dates response:', response.data)
      
      const transformedResponse = transformDatesResponse(response.data)
      console.log('✅ Transformed dates response:', transformedResponse)
      return transformedResponse
      
    } catch (error) {
      console.error('❌ Error fetching dates:', error)
      
      // Return fallback dates
      const fallbackResponse = transformDatesResponse([])
      console.log('🔄 Using fallback dates:', fallbackResponse)
      return fallbackResponse
    }
  },

  async getScheduleById(scheduleId) {
    try {
      console.log('🔍 Fetching schedule by ID:', scheduleId)
      const response = await api.get(`/schedules/${scheduleId}`)
      console.log('✅ Raw schedule response:', response.data)
      
      const transformedSchedule = transformScheduleData(response.data.schedule || response.data)
      console.log('✅ Transformed schedule:', transformedSchedule)
      
      return {
        success: true,
        schedule: transformedSchedule
      }
      
    } catch (error) {
      console.error('❌ Error fetching schedule:', error)
      throw error
    }
  },

  async testConnection() {
    try {
      console.log('🔌 Testing schedules API connection...')
      const response = await api.get('/schedules/health')
      console.log('✅ Schedules API health check:', response.data)
      return {
        success: true,
        message: 'Schedules API is available',
        data: response.data
      }
    } catch (error) {
      console.error('❌ Schedules API health check failed:', error)
      return {
        success: false,
        message: 'Schedules API is not available',
        error: error.message
      }
    }
  },

  // Helper method to transform raw schedule data (useful for other services)
  transformScheduleData
}

export default scheduleService
import api from './api'

export const driverService = {
  // Trip Management
  async getTripDetails(tripId) {
    const response = await api.get(`/driver/trips/${tripId}`)
    return response.data
  },

  async getTripPassengers(tripId) {
    const response = await api.get(`/driver/trips/${tripId}/passengers`)
    return response.data
  },

  async checkinPassenger(tripId, passengerId) {
    const response = await api.post(`/driver/trips/${tripId}/checkin`, {
      passenger_id: passengerId
    })
    return response.data
  },

  async markNoShow(tripId, passengerId) {
    const response = await api.post(`/driver/trips/${tripId}/no-show`, {
      passenger_id: passengerId
    })
    return response.data
  },

  // Schedules
  async getSchedules(params = {}) {
    const response = await api.get('/driver/schedules', { params })
    return response.data
  },

  async updateTripStatus(tripId, status) {
    const response = await api.put(`/driver/trips/${tripId}/status`, { status })
    return response.data
  },

  // Dashboard
  async getDriverStats() {
    const response = await api.get('/driver/dashboard/stats')
    return response.data
  },

  async getUpcomingTrips() {
    const response = await api.get('/driver/trips/upcoming')
    return response.data
  },
   async getProfile() {
    const response = await api.get('/driver/profile')
    return response.data
  },

  async updateProfile(profileData) {
    const response = await api.put('/driver/profile', profileData)
    return response.data
  },

  async uploadDocument(documentData) {
    const formData = new FormData()
    Object.keys(documentData).forEach(key => {
      formData.append(key, documentData[key])
    })
    
    const response = await api.post('/driver/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
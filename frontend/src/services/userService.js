import api from './api'

export const userService = {
  async updateProfile(profileData) {
    const response = await api.put('/users/profile', profileData)
    return response.data
  },

  async changePassword(passwordData) {
    const response = await api.put('/users/password', passwordData)
    return response.data
  },

  async getBookingHistory() {
    const response = await api.get('/users/bookings')
    return response.data
  },

  async getProfile() {
    const response = await api.get('/users/profile')
    return response.data
  }
}
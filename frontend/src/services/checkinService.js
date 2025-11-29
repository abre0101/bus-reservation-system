import api from './api'

export const checkinService = {
  // Check in a booking
  checkin: async (bookingId) => {
    try {
      const response = await api.put(`/bookings/${bookingId}/checkin`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Check-in failed')
    }
  },

  // Get booking details
  getBooking: async (bookingId) => {
    try {
      const response = await api.get(`/bookings/${bookingId}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch booking')
    }
  }
}
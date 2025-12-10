/**
 * WebSocket Service for Real-Time Seat Updates
 */
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.listeners = new Map()
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket?.connected) {
      console.log('🔌 Socket already connected')
      return this.socket
    }

    console.log('🔌 Connecting to WebSocket server:', SOCKET_URL)

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000
    })

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id)
      this.connected = true
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
      this.connected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error)
    })

    this.socket.on('connection_response', (data) => {
      console.log('📡 Connection response:', data)
    })

    return this.socket
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from WebSocket')
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  /**
   * Join a schedule room to receive real-time updates
   */
  joinSchedule(scheduleId, userId) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected, connecting now...')
      this.connect()
    }

    console.log('👥 Joining schedule room:', scheduleId)
    this.socket.emit('join_schedule', { schedule_id: scheduleId, user_id: userId })
  }

  /**
   * Leave a schedule room
   */
  leaveSchedule(scheduleId) {
    if (!this.socket?.connected) return

    console.log('👋 Leaving schedule room:', scheduleId)
    this.socket.emit('leave_schedule', { schedule_id: scheduleId })
  }

  /**
   * Lock seats for the current user
   */
  lockSeats(scheduleId, seatNumbers, userId) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'))
        return
      }

      console.log('🔒 Locking seats:', seatNumbers)

      // Listen for lock response
      this.socket.once('lock_response', (response) => {
        if (response.success) {
          console.log('✅ Seats locked successfully:', response.locked_seats)
          resolve(response)
        } else {
          console.error('❌ Failed to lock seats:', response.message)
          reject(new Error(response.message))
        }
      })

      // Emit lock request
      this.socket.emit('lock_seats', {
        schedule_id: scheduleId,
        seat_numbers: seatNumbers,
        user_id: userId
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Lock request timeout'))
      }, 5000)
    })
  }

  /**
   * Unlock seats for the current user
   */
  unlockSeats(scheduleId, seatNumbers, userId) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'))
        return
      }

      console.log('🔓 Unlocking seats:', seatNumbers)

      // Listen for unlock response
      this.socket.once('unlock_response', (response) => {
        if (response.success) {
          console.log('✅ Seats unlocked successfully')
          resolve(response)
        } else {
          console.error('❌ Failed to unlock seats:', response.message)
          reject(new Error(response.message))
        }
      })

      // Emit unlock request
      this.socket.emit('unlock_seats', {
        schedule_id: scheduleId,
        seat_numbers: seatNumbers,
        user_id: userId
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Unlock request timeout'))
      }, 5000)
    })
  }

  /**
   * Request seat status refresh
   */
  refreshSeats(scheduleId) {
    if (!this.socket?.connected) return

    console.log('🔄 Requesting seat refresh for schedule:', scheduleId)
    this.socket.emit('refresh_seats', { schedule_id: scheduleId })
  }

  /**
   * Listen for seat status updates
   */
  onSeatStatusUpdate(callback) {
    if (!this.socket) return

    this.socket.on('seat_status_update', (data) => {
      console.log('📊 Seat status update:', data)
      callback(data)
    })
  }

  /**
   * Listen for seats being locked by other users
   */
  onSeatsLocked(callback) {
    if (!this.socket) return

    this.socket.on('seats_locked', (data) => {
      console.log('🔒 Seats locked by another user:', data)
      callback(data)
    })
  }

  /**
   * Listen for seats being unlocked by other users
   */
  onSeatsUnlocked(callback) {
    if (!this.socket) return

    this.socket.on('seats_unlocked', (data) => {
      console.log('🔓 Seats unlocked by another user:', data)
      callback(data)
    })
  }

  /**
   * Listen for seats being booked
   */
  onSeatsBooked(callback) {
    if (!this.socket) return

    this.socket.on('seats_booked', (data) => {
      console.log('✅ Seats booked:', data)
      callback(data)
    })
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (!this.socket) return

    this.socket.off('seat_status_update')
    this.socket.off('seats_locked')
    this.socket.off('seats_unlocked')
    this.socket.off('seats_booked')
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.connected && this.socket?.connected
  }
}

// Export singleton instance
const socketService = new SocketService()
export default socketService

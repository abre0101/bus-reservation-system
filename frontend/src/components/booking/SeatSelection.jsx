// src/components/booking/SeatSelection.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { generateSeatLayout } from '../../utils/helpers'
import { bookingService } from '../../services/bookingService'
import socketService from '../../services/socketService'
import LoadingSpinner from '../common/LoadingSpinner'
import Button from '../common/Button'
import BookingProgress from './BookingProgress'
import { User, Clock, MapPin, AlertCircle, RefreshCw, Bus, Shield, CheckCircle, Users, X, ArrowLeft } from 'lucide-react'

const SeatSelection = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Get schedule and booking data from navigation state
  const schedule = location.state?.schedule
  const bookingData = location.state?.bookingData
  const scheduleId = schedule?._id || new URLSearchParams(location.search).get('scheduleId')
  
  // Get previously selected seats from location state or session storage
  const previouslySelectedSeats = location.state?.selectedSeats || 
                                   JSON.parse(sessionStorage.getItem('selectedSeats') || '[]')
  
  const [seats, setSeats] = useState([])
  const [occupiedSeats, setOccupiedSeats] = useState([])
  const [lockedSeats, setLockedSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState(previouslySelectedSeats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [socketConnected, setSocketConnected] = useState(false)

  // Get passenger count from booking data or default to 1
  const passengerCount = bookingData?.passengers || 1

  console.log('🎫 SeatSelection received:', { 
    schedule, 
    scheduleId, 
    passengerCount,
    bookingData,
    locationState: location.state,
    previouslySelectedSeats: previouslySelectedSeats
  })

  const loadOccupiedSeats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🪑 Loading occupied seats for schedule:', scheduleId)
      
      const response = await bookingService.getOccupiedSeats(scheduleId)
      console.log('✅ Occupied seats response:', response)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load seat information')
      }
      
      const occupied = response.occupiedSeats || []
      const locked = response.lockedSeats || []
      
      // Get current user ID to check if any locked seats belong to them
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user') || '{}'
      const user = JSON.parse(userStr)
      const currentUserId = user._id || user.id || user.userId
      
      setOccupiedSeats(occupied)
      
      // Filter locked seats - don't show user's own locks as "locked"
      // Instead, restore them as selected seats
      console.log('🔍 Current user ID:', currentUserId)
      console.log('🔍 User locked seats from backend:', response.userLockedSeats)
      console.log('🔍 All locked seats from backend:', locked)
      
      if (currentUserId && response.userLockedSeats && response.userLockedSeats.length > 0) {
        // If backend provides user's locked seats separately
        const userLocks = response.userLockedSeats || []
        const otherLocks = locked.filter(seat => !userLocks.includes(seat))
        
        setLockedSeats(otherLocks)
        setSelectedSeats(userLocks) // Restore user's previous selection
        console.log('✅ Restored your previously selected seats:', userLocks)
        console.log('🔒 Other users locked seats:', otherLocks)
      } else {
        // Fallback: treat all locks as from other users
        console.log('⚠️ No userLockedSeats found, treating all as other users')
        console.log('⚠️ CurrentUserId:', currentUserId)
        console.log('⚠️ userLockedSeats:', response.userLockedSeats)
        setLockedSeats(locked)
      }
      
      setLastUpdated(new Date())
      
      // Generate realistic bus layout with 2+2 seating
      const totalSeats = schedule?.bus?.capacity || 45
      const seatLayout = generateRealisticBusLayout(totalSeats, occupied)
      setSeats(seatLayout)

      // Clear any selected seats that are now occupied (but not locked by this user)
      setSelectedSeats(prev => prev.filter(seat => !occupied.includes(seat)))
      
    } catch (err) {
      console.error('❌ Error loading seat information:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load seat information'
      setError(errorMessage)
      
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, 1000 * Math.pow(2, retryCount))
      }
    } finally {
      setLoading(false)
    }
  }, [scheduleId, schedule, retryCount])

  // Generate realistic bus layout with 2+2 seating and aisle
  const generateRealisticBusLayout = (totalSeats, occupiedSeats) => {
    const rows = Math.ceil(totalSeats / 4) // 4 seats per row (2+2)
    const layout = []
    
    let seatNumber = 1
    
    for (let row = 1; row <= rows; row++) {
      const rowSeats = []
      
      // Left side seats (Window, Middle)
      for (let col = 1; col <= 2; col++) {
        if (seatNumber <= totalSeats) {
          rowSeats.push({
            number: seatNumber,
            label: seatNumber.toString(), // Simple number: 1, 2, 3, etc.
            row: row,
            position: 'left',
            isOccupied: occupiedSeats.includes(seatNumber),
            type: 'standard'
          })
          seatNumber++
        }
      }
      
      // Right side seats (Aisle, Window)
      for (let col = 3; col <= 4; col++) {
        if (seatNumber <= totalSeats) {
          rowSeats.push({
            number: seatNumber,
            label: seatNumber.toString(), // Simple number: 1, 2, 3, etc.
            row: row,
            position: 'right',
            isOccupied: occupiedSeats.includes(seatNumber),
            type: 'standard'
          })
          seatNumber++
        }
      }
      
      layout.push(rowSeats)
    }
    
    return layout
  }

  useEffect(() => {
    if (!scheduleId) {
      setError('No schedule information available. Please go back and select a schedule first.')
      setLoading(false)
      return
    }

    // Get user ID from sessionStorage (where auth stores it)
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user') || '{}'
    const user = JSON.parse(userStr)
    const userId = user._id || user.id || user.userId
    
    console.log('👤 User data from storage:', user)
    console.log('👤 Extracted userId:', userId)

    if (!userId) {
      console.error('❌ No user ID found in storage')
      setError('User not authenticated. Please login again.')
      setLoading(false)
      return
    }

    // Load initial seat data
    loadOccupiedSeats()

    // Connect to WebSocket
    socketService.connect()
    setSocketConnected(true)

    // Join schedule room
    socketService.joinSchedule(scheduleId, userId)

    // Listen for real-time seat updates
    socketService.onSeatStatusUpdate((data) => {
      console.log('📊 Real-time seat status update:', data)
      setOccupiedSeats(data.occupied_seats || [])
      setLockedSeats(data.locked_seats || [])
      setLastUpdated(new Date())
    })

    socketService.onSeatsLocked((data) => {
      console.log('🔒 Seats locked by another user:', data)
      if (data.user_id !== userId) {
        // Another user locked seats - add to locked list
        setLockedSeats(prev => [...new Set([...prev, ...data.seat_numbers])])
        // Remove from selected if user had selected them
        setSelectedSeats(prev => prev.filter(seat => !data.seat_numbers.includes(seat)))
      } else {
        // This user locked seats - add to selected list
        console.log('✅ Your seats locked successfully:', data.seat_numbers)
        setSelectedSeats(prev => [...new Set([...prev, ...data.seat_numbers])])
      }
    })

    socketService.onSeatsUnlocked((data) => {
      console.log('🔓 Seats unlocked:', data)
      setLockedSeats(prev => prev.filter(seat => !data.seat_numbers.includes(seat)))
    })

    socketService.onSeatsBooked((data) => {
      console.log('✅ Seats booked:', data)
      setOccupiedSeats(prev => [...new Set([...prev, ...data.seat_numbers])])
      setLockedSeats(prev => prev.filter(seat => !data.seat_numbers.includes(seat)))
    })

    // Cleanup on unmount
    return () => {
      socketService.leaveSchedule(scheduleId)
      socketService.removeAllListeners()
    }
  }, [scheduleId, loadOccupiedSeats])

  // Save selected seats to sessionStorage whenever they change
  useEffect(() => {
    if (selectedSeats.length > 0) {
      sessionStorage.setItem('selectedSeats', JSON.stringify(selectedSeats))
      console.log('💾 Saved selected seats to session:', selectedSeats)
    }
  }, [selectedSeats])

  const handleSeatClick = async (seatNumber) => {
    // Get user ID from sessionStorage (where auth stores it)
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user') || '{}'
    const user = JSON.parse(userStr)
    const userId = user._id || user.id || user.userId
    
    console.log('🎯 handleSeatClick - User:', user)
    console.log('🎯 handleSeatClick - userId:', userId)

    if (!userId) {
      alert('User not authenticated. Please login again.')
      return
    }

    // Prevent selecting occupied seats
    if (occupiedSeats.includes(seatNumber)) {
      alert(`Seat ${seatNumber} is already occupied. Please select another seat.`)
      return
    }

    // Check if this seat is locked by another user
    if (lockedSeats.includes(seatNumber)) {
      alert(`Seat ${seatNumber} is currently being selected by another user. Please choose a different seat.`)
      return
    }
    
    // If seat is in selectedSeats, allow deselection (even if it's locked in DB)
    // This handles the case where user's own lock wasn't properly restored
    
    // Dynamic seat selection based on passenger count
    if (selectedSeats.includes(seatNumber)) {
      // Deselect seat - unlock it
      try {
        await socketService.unlockSeats(scheduleId, [seatNumber], userId)
        setSelectedSeats(prev => prev.filter(seat => seat !== seatNumber))
      } catch (error) {
        console.error('Failed to unlock seat:', error)
        // Still allow deselection locally
        setSelectedSeats(prev => prev.filter(seat => seat !== seatNumber))
      }
    } else {
      if (selectedSeats.length >= passengerCount) {
        alert(`You can select maximum ${passengerCount} seat${passengerCount !== 1 ? 's' : ''} for ${passengerCount} passenger${passengerCount !== 1 ? 's' : ''}`)
        return
      }

      // Try to lock the seat
      try {
        await socketService.lockSeats(scheduleId, [seatNumber], userId)
        setSelectedSeats(prev => [...prev, seatNumber])
      } catch (error) {
        console.error('Failed to lock seat:', error)
        alert(error.message || 'Failed to select seat. It may have been taken by another user.')
      }
    }
  }

  const getSeatClass = (seatNumber, position) => {
    const baseClasses = 'w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 border-2 shadow-sm'
    
    if (occupiedSeats.includes(seatNumber)) {
      return `${baseClasses} bg-gradient-to-br from-red-100 to-red-200 cursor-not-allowed text-red-700 border-red-400 opacity-60`
    }
    if (lockedSeats.includes(seatNumber) && !selectedSeats.includes(seatNumber)) {
      return `${baseClasses} bg-gradient-to-br from-yellow-100 to-orange-200 cursor-not-allowed text-orange-700 border-orange-400 opacity-70`
    }
    if (selectedSeats.includes(seatNumber)) {
      return `${baseClasses} bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600 shadow-xl transform scale-110 ring-4 ring-blue-200`
    }
    return `${baseClasses} bg-gradient-to-br from-green-50 to-emerald-50 text-gray-800 border-green-400 hover:from-green-100 hover:to-emerald-100 hover:border-green-500 hover:shadow-lg hover:scale-105 cursor-pointer`
  }

  const getSeatStatus = (seatNumber) => {
    if (occupiedSeats.includes(seatNumber)) return 'occupied'
    if (selectedSeats.includes(seatNumber)) return 'selected'
    return 'available'
  }

  const handleContinue = async () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat')
      return
    }

    // Validate that exactly the required number of seats are selected
    if (selectedSeats.length !== passengerCount) {
      alert(`Please select exactly ${passengerCount} seat${passengerCount !== 1 ? 's' : ''} for ${passengerCount} passenger${passengerCount !== 1 ? 's' : ''}`)
      return
    }

    // Double-check if any selected seats are now occupied
    const freshlyOccupiedSeats = selectedSeats.filter(seat => occupiedSeats.includes(seat))
    if (freshlyOccupiedSeats.length > 0) {
      alert(`The following seats are no longer available: ${freshlyOccupiedSeats.join(', ')}. Please select different seats.`)
      setSelectedSeats(prev => prev.filter(seat => !freshlyOccupiedSeats.includes(seat)))
      await loadOccupiedSeats() // Refresh seat data
      return
    }

    // Calculate total amount using actual fare from database
    const pricePerSeat = schedule?.fareBirr || schedule?.price || 0
    const totalAmount = selectedSeats.length * pricePerSeat

    // Store data in sessionStorage for persistence
    sessionStorage.setItem('selectedSchedule', JSON.stringify(schedule))
    sessionStorage.setItem('selectedSeats', JSON.stringify(selectedSeats))
    sessionStorage.setItem('baseFare', totalAmount.toString())
    sessionStorage.setItem('passengerCount', passengerCount.toString())

    console.log('💾 Data stored in sessionStorage:', {
      schedule: schedule,
      selectedSeats: selectedSeats,
      baseFare: totalAmount,
      passengerCount: passengerCount,
      pricePerSeat: pricePerSeat
    })

    // Navigate to passenger details with all necessary data
    navigate('/booking/passenger-details', {
      state: {
        schedule: schedule,
        selectedSeats: selectedSeats,
        baseFare: totalAmount,
        passengerCount: passengerCount,
        bookingData: bookingData
      }
    })
  }

  const handleClearSelection = async () => {
    // Get user ID from sessionStorage (where auth stores it)
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user') || '{}'
    const user = JSON.parse(userStr)
    const userId = user._id || user.id || user.userId

    if (!userId) {
      console.warn('⚠️ No userId found, clearing selection locally only')
      setSelectedSeats([])
      return
    }

    // Unlock all selected seats
    if (selectedSeats.length > 0) {
      try {
        await socketService.unlockSeats(scheduleId, selectedSeats, userId)
      } catch (error) {
        console.error('Failed to unlock seats:', error)
      }
    }

    setSelectedSeats([])
  }

  const handleRetry = () => {
    setRetryCount(0)
    loadOccupiedSeats()
  }

  const handleRefreshSeats = async () => {
    // Request refresh via WebSocket
    socketService.refreshSeats(scheduleId)
    
    // Also reload from API
    await loadOccupiedSeats()
    alert('Seat availability has been refreshed!')
  }

  const handleBack = () => {
    // Go back to schedules page with search data preserved
    navigate('/schedules', {
      state: {
        schedule: schedule,
        bookingData: bookingData
      }
    })
  }

  // Extract schedule data with proper fallbacks for display
  const busName = schedule?.bus?.name || `EthioBus ${schedule?.busType}` || 'Premium Coach'
  const originCity  = schedule?.originCity || schedule?.originCity 
  const destinationCity  = schedule?.destinationCity || schedule?.destinationCity 
  const departure_date = schedule?.departure_date
  const departureTime = schedule?.departureTime
  const pricePerSeat = schedule?.fareBirr || schedule?.price || 0
  const totalSeats = schedule?.bus?.capacity || 45
  const availableSeats = totalSeats - occupiedSeats.length - selectedSeats.length

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Date not available'
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? 'Date not set' : date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return 'Date error'
    }
  }

  // Show error if no schedule data
  if (!scheduleId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Schedule Not Found</h2>
          <p className="text-gray-600 mb-6">
            No schedule information available. Please go back and select a schedule first.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/search')} className="flex-1">
              Back to Search
            </Button>
            <Button variant="outline" onClick={() => navigate('/schedules')} className="flex-1">
              View Schedules
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner text="Loading seat map..." size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Seats</h2>
          <p className="text-red-500 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRetry} className="flex items-center justify-center flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/search')} className="flex-1">
              Back to Search
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 py-8">
      {/* Elegant Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Booking Progress */}
        <BookingProgress currentStep={1} />

        {/* Header - Enhanced */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-all bg-white/90 backdrop-blur-md px-5 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-semibold">Back</span>
            </button>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Select Your Seats
            </h1>
            <div className="w-20"></div>
          </div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto font-medium">
            Choose seats for <span className="font-bold text-blue-600">{passengerCount}</span> passenger{passengerCount !== 1 ? 's' : ''}
          </p>
          
          {/* Last Updated Info & Connection Status */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-sm flex-wrap gap-2">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-gray-700">Last updated: <span className="font-semibold">{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}</span></span>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border shadow-sm ${
              socketConnected 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`font-semibold ${socketConnected ? 'text-green-700' : 'text-red-700'}`}>
                {socketConnected ? 'Live Updates' : 'Disconnected'}
              </span>
            </div>
            <button 
              onClick={handleRefreshSeats}
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-all shadow-md hover:shadow-lg"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content - Bus Layout */}
          <div className="xl:col-span-2">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border-2 border-white/60">
              {/* Schedule Info */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-8 shadow-xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                      <Bus className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold drop-shadow-md">{busName}</h2>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm opacity-95 mt-2 space-y-1 sm:space-y-0">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">{originCity } → {destinationCity }</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{formatDisplayDate(departure_date)} • {departureTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-center shadow-lg border border-white/30">
                      <div className="text-3xl font-bold">{availableSeats}</div>
                      <div className="text-xs opacity-90 font-medium">Available</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-center shadow-lg border border-white/30">
                      <div className="text-3xl font-bold">{occupiedSeats.length}</div>
                      <div className="text-xs opacity-90 font-medium">Occupied</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-center shadow-lg border border-white/30">
                      <div className="text-3xl font-bold">{passengerCount}</div>
                      <div className="text-xs opacity-90 font-medium">Passengers</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selection Progress */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 mb-6 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-900 text-lg">
                        Select {passengerCount} seat{passengerCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-blue-700 font-medium">
                        {selectedSeats.length} of {passengerCount} seat{passengerCount !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  </div>
                  {selectedSeats.length > 0 && (
                    <div className="text-right bg-white/80 px-4 py-2 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-600 mb-1">Selected Seats</p>
                      <p className="text-sm font-bold text-blue-900">
                        {selectedSeats.sort((a, b) => a - b).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                {/* Progress bar */}
                <div className="w-full bg-blue-200 rounded-full h-3 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-md"
                    style={{ width: `${(selectedSeats.length / passengerCount) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Bus Layout */}
              <div className="mb-8">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Bus Layout</h3>
                  <p className="text-gray-600">Click on available seats to select</p>
                </div>

                {/* Bus Visualization */}
                <div className="relative bg-gray-100 rounded-2xl p-8 border-2 border-gray-200">
                  {/* Driver Cabin */}
                  <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-3xl p-6 mb-8 text-center shadow-xl border-b-4 border-yellow-400">
                    <div className="text-white font-bold text-lg mb-3 flex items-center justify-center space-x-2">
                      <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-900" />
                      </div>
                      <span>Driver Cabin</span>
                    </div>
                    <div className="w-40 h-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 rounded-full mx-auto shadow-lg"></div>
                  </div>

                  {/* Realistic Bus Layout with 2+2 seating */}
                  <div className="space-y-6">
                    {seats.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex justify-center items-center space-x-8">
                        {/* Left Side Seats */}
                        <div className="flex space-x-3">
                          {row.filter(seat => seat.position === 'left').map((seat) => (
                            <button
                              key={seat.number}
                              onClick={() => handleSeatClick(seat.number)}
                              disabled={seat.isOccupied}
                              className={`relative ${getSeatClass(seat.number, seat.position)}`}
                              title={
                                seat.isOccupied 
                                  ? `Seat ${seat.label} - Occupied`
                                  : selectedSeats.includes(seat.number)
                                  ? `Seat ${seat.label} - Selected`
                                  : `Seat ${seat.label} - Available`
                              }
                            >
                              {seat.label}
                              {selectedSeats.includes(seat.number) && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                  <CheckCircle className="h-2 w-2 text-white" />
                                </div>
                              )}
                              {seat.isOccupied && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                  <X className="h-2 w-2 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Aisle */}
                        <div className="w-20 h-14 bg-gradient-to-b from-gray-300 to-gray-400 rounded-xl flex items-center justify-center shadow-inner border-2 border-gray-500">
                          <span className="text-xs text-gray-700 font-bold tracking-wider">AISLE</span>
                        </div>

                        {/* Right Side Seats */}
                        <div className="flex space-x-3">
                          {row.filter(seat => seat.position === 'right').map((seat) => (
                            <button
                              key={seat.number}
                              onClick={() => handleSeatClick(seat.number)}
                              disabled={seat.isOccupied}
                              className={`relative ${getSeatClass(seat.number, seat.position)}`}
                              title={
                                seat.isOccupied 
                                  ? `Seat ${seat.label} - Occupied`
                                  : selectedSeats.includes(seat.number)
                                  ? `Seat ${seat.label} - Selected`
                                  : `Seat ${seat.label} - Available`
                              }
                            >
                              {seat.label}
                              {selectedSeats.includes(seat.number) && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                  <CheckCircle className="h-2 w-2 text-white" />
                                </div>
                              )}
                              {seat.isOccupied && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                  <X className="h-2 w-2 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rear of Bus */}
                  <div className="mt-8 pt-6 border-t border-gray-300 text-center">
                    <div className="text-sm text-gray-500">
                      <div className="w-full h-2 bg-gray-600 rounded-full mb-2"></div>
                      Rear of Bus
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200 shadow-md">
                <h4 className="font-bold text-gray-900 mb-5 flex items-center text-lg">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  Seat Status Guide
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-green-300 shadow-sm hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-gray-800">1</span>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Available</div>
                      <div className="text-sm text-gray-600">Ready to select</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-blue-300 shadow-sm hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Selected</div>
                      <div className="text-sm text-gray-600">Your choice</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-orange-300 shadow-sm hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-orange-200 border-2 border-orange-400 rounded-xl flex items-center justify-center shadow-sm opacity-70">
                      <Clock className="h-5 w-5 text-orange-700" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Locked</div>
                      <div className="text-sm text-gray-600">Being selected</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-red-300 shadow-sm hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 border-2 border-red-400 rounded-xl flex items-center justify-center shadow-sm opacity-60">
                      <X className="h-5 w-5 text-red-700" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Occupied</div>
                      <div className="text-sm text-gray-600">Already booked</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="space-y-6">
            {/* Booking Summary */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sticky top-6 border-2 border-white/60">
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b">Booking Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Passengers:</span>
                  <span className="font-semibold text-gray-900">
                    {passengerCount} passenger{passengerCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Selected Seats:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedSeats.length > 0 
                      ? selectedSeats.sort((a, b) => a - b).join(', ')
                      : 'None selected'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Price per Seat:</span>
                  <span className="font-semibold text-gray-900">{pricePerSeat} ETB</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Number of Seats:</span>
                  <span className="font-semibold text-gray-900">{selectedSeats.length}</span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {selectedSeats.length * pricePerSeat} ETB
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                <Button
                  onClick={handleContinue}
                  disabled={selectedSeats.length !== passengerCount}
                  className="w-full justify-center py-4 text-lg font-semibold rounded-xl"
                  size="lg"
                >
                  {selectedSeats.length === passengerCount ? (
                    `Continue with ${passengerCount} Passenger${passengerCount !== 1 ? 's' : ''}`
                  ) : (
                    `Select ${passengerCount - selectedSeats.length} More Seat${passengerCount - selectedSeats.length !== 1 ? 's' : ''}`
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleClearSelection}
                  disabled={selectedSeats.length === 0}
                  className="w-full justify-center py-3 rounded-xl"
                >
                  Clear Selection
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRefreshSeats}
                  className="w-full justify-center py-3 rounded-xl"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Seat Availability
                </Button>
              </div>
            </div>

            {/* Help Information */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
              <h4 className="font-bold text-lg mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Booking Information
              </h4>
              <ul className="space-y-3 text-blue-100">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span>Select exactly {passengerCount} seat{passengerCount !== 1 ? 's' : ''} for {passengerCount} passenger{passengerCount !== 1 ? 's' : ''}</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span>Occupied seats cannot be selected</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span>Seat availability updates in real-time</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span>Locked seats are being selected by others</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span>Bring ID matching passenger name</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeatSelection
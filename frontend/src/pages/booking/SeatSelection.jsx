import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SeatSelection from '../../components/booking/SeatSelection'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-toastify'
import '../../styles/bookingBackground.css'

const SeatSelectionPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [schedule, setSchedule] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.info('Please login to continue with booking')
      navigate('/login')
      return
    }

    // Get selected schedule from session storage
    const storedSchedule = sessionStorage.getItem('selectedSchedule')
    const passengerCount = parseInt(sessionStorage.getItem('passengerCount') || '1')

    if (!storedSchedule) {
      toast.error('No schedule selected. Please select a schedule first.')
      navigate('/search')
      return
    }

    try {
      const scheduleData = JSON.parse(storedSchedule)
      setSchedule(scheduleData)
      
      // Check if there are previously selected seats (user came back from passenger details)
      const storedSeats = sessionStorage.getItem('selectedSeats')
      if (storedSeats) {
        try {
          const previousSeats = JSON.parse(storedSeats)
          console.log('📍 Restoring previously selected seats:', previousSeats)
          setSelectedSeats(previousSeats)
        } catch (e) {
          console.log('⚠️ Could not restore seats, starting fresh')
          setSelectedSeats([])
        }
      } else {
        // Initialize empty selected seats array for new booking
        setSelectedSeats([])
      }
    } catch (error) {
      toast.error('Invalid schedule data')
      navigate('/search')
    }
  }, [isAuthenticated, navigate])

  const handleSeatSelect = (seatNumber) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatNumber)) {
        // Remove seat if already selected
        return prev.filter(seat => seat !== seatNumber)
      } else {
        // Add seat if not already selected and within passenger limit
        const passengerCount = parseInt(sessionStorage.getItem('passengerCount') || '1')
        if (prev.length < passengerCount) {
          return [...prev, seatNumber]
        } else {
          toast.info(`You can only select ${passengerCount} seat(s) for ${passengerCount} passenger(s)`)
          return prev
        }
      }
    })
  }

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat')
      return
    }

    // Store selected seats in session storage
    sessionStorage.setItem('selectedSeats', JSON.stringify(selectedSeats))
    
    // Calculate base fare
    const passengerCount = selectedSeats.length
    const baseFare = (schedule.fare || schedule.fareBirr) * passengerCount
    sessionStorage.setItem('baseFare', baseFare.toString())

    navigate('/passenger-details')
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="booking-page-wrapper">
      {/* Floating decorative shapes */}
      <div className="booking-floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>

      <div className="booking-content container mx-auto px-4 py-8">
        {/* Header - Premium Design */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <button
            onClick={() => navigate('/schedules?' + new URLSearchParams({
              source: schedule.departure_city,
              destination: schedule.arrival_city,
              date: schedule.departure_date
            }).toString())}
            className="flex items-center space-x-2 text-white hover:text-blue-200 transition-all bg-white/15 backdrop-blur-md px-6 py-3 rounded-xl border-2 border-white/30 hover:bg-white/25 hover:border-white/50 shadow-xl hover:shadow-2xl transform hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Back to Schedules</span>
          </button>
          
          <div className="bg-white/15 backdrop-blur-md px-8 py-4 rounded-xl border-2 border-white/30 shadow-xl">
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg mb-2">Select Your Seats 💺</h1>
            <p className="text-blue-100 font-semibold text-lg">
              {schedule.departure_city} → {schedule.arrival_city} • {schedule.departure_time}
            </p>
          </div>
        </div>

        {/* Progress Indicator - Premium Design */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border-2 border-white/60">
          <div className="flex items-center justify-between max-w-4xl mx-auto flex-wrap gap-4">
            {['Seats', 'Passenger', 'Baggage', 'Payment', 'Confirm'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg transition-all ${
                    index === 0 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white scale-110' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`mt-2 text-sm font-semibold ${
                    index === 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {step}
                  </span>
                </div>
                {index < 4 && (
                  <div className="w-8 md:w-16 h-1 bg-gray-200 mx-2 md:mx-4 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seat Selection Component */}
        <SeatSelection
          schedule={schedule}
          selectedSeats={selectedSeats}
          onSeatSelect={handleSeatSelect}
          onContinue={handleContinue}
        />
      </div>
    </div>
  )
}

export default SeatSelectionPage
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
// Remove DriverLayout import since it will be handled by routing
import api from '../../services/api'

const DriverCheckin = () => {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (tripId) {
      fetchTripDetails()
    }
  }, [tripId])

  const fetchTripDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/driver/trips/${tripId}`)
      setTrip(response.data.trip)
    } catch (error) {
      console.error('Error fetching trip:', error)
      alert('Error loading trip details')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTrip = async () => {
    if (!window.confirm('Are you sure you want to start this trip?')) return

    try {
      setStarting(true)
      await api.post(`/driver/trips/${tripId}/start`)
      alert('Trip started successfully!')
      navigate('/driver/active-trip')
    } catch (error) {
      alert('Error starting trip: ' + (error.response?.data?.error || 'Unknown error'))
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading trip details...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip Not Found</h2>
        <p className="text-gray-600 mb-6">The requested trip could not be found</p>
        <button
          onClick={() => navigate('/driver/trips')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Trips
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trip Check-in</h1>
        <p className="text-gray-600">Review trip details before starting</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Trip Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Route</p>
            <p className="text-lg font-semibold text-gray-900">
              {trip.route?.origin || trip.origin_city} → {trip.route?.destination || trip.destination_city}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Departure Time</p>
            <p className="text-lg font-semibold text-gray-900">
              {trip.departure_time || trip.departureTime 
                ? new Date(trip.departure_time || trip.departureTime).toLocaleString() 
                : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Bus</p>
            <p className="text-lg font-semibold text-gray-900">{trip.bus?.plate_number || trip.bus?.bus_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Capacity</p>
            <p className="text-lg font-semibold text-gray-900">{trip.bus?.capacity || trip.totalSeats} seats</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Booked Passengers</p>
            <p className="text-lg font-semibold text-gray-900">{trip.booked_seats || trip.bookedSeats || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Fare</p>
            <p className="text-lg font-semibold text-gray-900">{trip.route?.base_fare || trip.route?.baseFareBirr || trip.fareBirr} ETB</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Pre-Trip Checklist</h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-center">
            <span className="mr-2">✓</span>
            <span>Vehicle inspection completed</span>
          </li>
          <li className="flex items-center">
            <span className="mr-2">✓</span>
            <span>All safety equipment checked</span>
          </li>
          <li className="flex items-center">
            <span className="mr-2">✓</span>
            <span>Fuel level adequate</span>
          </li>
          <li className="flex items-center">
            <span className="mr-2">✓</span>
            <span>Route and schedule confirmed</span>
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready to Start?</h3>
            <p className="text-gray-600">Click the button to begin your trip</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/driver/trips')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleStartTrip}
              disabled={starting}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {starting ? 'Starting...' : '🚀 Start Trip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DriverCheckin
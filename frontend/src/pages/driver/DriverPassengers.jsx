import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'

const DriverPassengers = () => {
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get('trip')
  const [passengers, setPassengers] = useState([])
  const [trips, setTrips] = useState([])
  const [selectedTrip, setSelectedTrip] = useState(tripId || '')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTrips()
  }, [])

  useEffect(() => {
    if (selectedTrip) {
      fetchPassengers()
    }
  }, [selectedTrip])

  const fetchTrips = async () => {
    try {
      const response = await api.get('/driver/trips?status=scheduled,in_progress')
      setTrips(response.data.trips || [])
      if (!selectedTrip && response.data.trips?.length > 0) {
        setSelectedTrip(response.data.trips[0].id || response.data.trips[0]._id)
      }
    } catch (error) {
      console.error('Error fetching trips:', error)
    }
  }

  const fetchPassengers = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/driver/trips/${selectedTrip}/passengers`)
      setPassengers(response.data.passengers || [])
    } catch (error) {
      console.error('Error fetching passengers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (bookingId) => {
    try {
      await api.post(`/driver/trips/${selectedTrip}/checkin`, {
        booking_id: bookingId
      })
      fetchPassengers()
      alert('Passenger checked in successfully!')
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || 'Unknown error'))
    }
  }

  const filteredPassengers = passengers.filter(p =>
    p.passenger_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.passenger_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.seat_number?.toString().includes(searchTerm)
  )

  const checkedInCount = passengers.filter(p => p.status === 'checked_in').length

  return (

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Passenger Management</h1>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Trip</label>
              <select
                value={selectedTrip}
                onChange={(e) => setSelectedTrip(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a trip</option>
                {trips.map((trip) => (
                  <option key={trip.id || trip._id} value={trip.id || trip._id}>
                    {trip.origin_city || trip.departure_city || trip.route?.origin || trip.origin || 'Unknown'} → {trip.destination_city || trip.arrival_city || trip.route?.destination || trip.destination || 'Unknown'} - {trip.departure_date || 'N/A'} {trip.departure_time || ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Passengers</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or seat..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Passengers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{passengers.length}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Checked In</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{checkedInCount}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{passengers.length - checkedInCount}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Passenger List</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading passengers...</p>
            </div>
          ) : filteredPassengers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Seat</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Passenger</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPassengers.map((passenger, index) => (
                    <tr key={passenger.id || passenger._id || `passenger-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-bold text-lg text-blue-600">{passenger.seat_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{passenger.passenger_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        {passenger.passenger_email && (
                          <p className="text-sm text-gray-600">{passenger.passenger_email}</p>
                        )}
                        {passenger.passenger_phone && (
                          <p className="text-sm text-gray-600">{passenger.passenger_phone}</p>
                        )}
                        {!passenger.passenger_email && !passenger.passenger_phone && (
                          <p className="text-sm text-gray-400 italic">No contact info</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          passenger.status === 'checked_in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {passenger.status === 'checked_in' ? '✅ Checked In' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {passenger.status !== 'checked_in' && (
                          <button
                            onClick={() => handleCheckIn(passenger._id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Check In
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-600 text-lg">No passengers found</p>
              <p className="text-gray-500 text-sm mt-2">
                {searchTerm ? 'Try a different search term' : 'No passengers booked for this trip'}
              </p>
            </div>
          )}
        </div>
      </div>
  )
}

export default DriverPassengers

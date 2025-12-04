import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Users, Search, CheckCircle, Clock, MapPin, Phone, Mail, 
  User, Navigation, Calendar, Filter, AlertCircle
} from 'lucide-react'
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

  const handleCheckIn = async (bookingId, passenger) => {
    if (!passenger.can_checkin) {
      alert(passenger.checkin_message || 'Check-in not available yet')
      return
    }

    if (passenger.checkin_status === 'late') {
      const confirmed = window.confirm(
        `${passenger.checkin_message}\n\nDo you want to proceed with check-in?`
      )
      if (!confirmed) return
    }

    try {
      await api.post(`/driver/trips/${selectedTrip}/checkin`, {
        booking_id: bookingId
      })
      fetchPassengers()
      alert('✅ Passenger checked in successfully!')
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
  const selectedTripData = trips.find(t => (t.id || t._id) === selectedTrip)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-8 h-8" />
              Passenger Management
            </h1>
            <p className="text-blue-100">Check in passengers and manage boarding</p>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
        </div>

        {/* Trip Selection & Search */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Select Trip & Search</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Route</label>
              <select
                value={selectedTrip}
                onChange={(e) => setSelectedTrip(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Select a trip</option>
                {trips.map((trip) => (
                  <option key={trip.id || trip._id} value={trip.id || trip._id}>
                    {trip.origin_city || trip.departure_city || 'Unknown'} → {trip.destination_city || trip.arrival_city || 'Unknown'} - {trip.departure_date || 'N/A'} {trip.departure_time || ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search Passengers</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, email, or seat number..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Trip Info Banner */}
          {selectedTripData && (
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedTripData.origin_city} → {selectedTripData.destination_city}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900">{selectedTripData.departure_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900">{selectedTripData.departure_time}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium uppercase">Total Passengers</p>
                <p className="text-4xl font-bold mt-1">{passengers.length}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <Users className="w-7 h-7" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium uppercase">Checked In</p>
                <p className="text-4xl font-bold mt-1">{checkedInCount}</p>
                <p className="text-green-100 text-xs mt-1">
                  {passengers.length > 0 ? ((checkedInCount / passengers.length) * 100).toFixed(0) : 0}% Complete
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <CheckCircle className="w-7 h-7" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-5 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium uppercase">Pending</p>
                <p className="text-4xl font-bold mt-1">{passengers.length - checkedInCount}</p>
                <p className="text-orange-100 text-xs mt-1">Awaiting check-in</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <Clock className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* Passenger List */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Passenger List
            </h2>
            {filteredPassengers.length > 0 && (
              <span className="text-sm text-gray-600 font-medium">
                Showing {filteredPassengers.length} of {passengers.length}
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600 font-medium">Loading passengers...</p>
            </div>
          ) : filteredPassengers.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPassengers.map((passenger, index) => (
                <div 
                  key={passenger.id || passenger._id || `passenger-${index}`}
                  className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${
                    passenger.status === 'checked_in' 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        passenger.status === 'checked_in'
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {passenger.seat_number}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <p className="font-bold text-gray-900">{passenger.passenger_name}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold mt-1 ${
                          passenger.status === 'checked_in'
                            ? 'bg-green-200 text-green-800'
                            : passenger.can_checkin
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {passenger.status === 'checked_in' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Checked In
                            </>
                          ) : passenger.can_checkin ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Ready
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {passenger.passenger_email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{passenger.passenger_email}</span>
                      </div>
                    )}
                    {passenger.passenger_phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{passenger.passenger_phone}</span>
                      </div>
                    )}
                    {!passenger.passenger_email && !passenger.passenger_phone && (
                      <p className="text-sm text-gray-400 italic">No contact information</p>
                    )}
                  </div>

                  {passenger.checkin_message && passenger.status !== 'checked_in' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-yellow-800 font-medium">{passenger.checkin_message}</p>
                    </div>
                  )}

                  {passenger.status !== 'checked_in' && (
                    <button
                      onClick={() => handleCheckIn(passenger._id, passenger)}
                      disabled={!passenger.can_checkin}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        passenger.can_checkin
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      title={passenger.can_checkin ? 'Check in passenger' : passenger.checkin_message}
                    >
                      {passenger.can_checkin ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Check In Passenger
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          Not Available Yet
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Passengers Found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try a different search term' : 'No passengers booked for this trip'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverPassengers

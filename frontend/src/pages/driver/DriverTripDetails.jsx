import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Calendar, Users, Car, Phone, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import api from '../../services/api'

const DriverTripDetails = () => {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [passengers, setPassengers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    pending: 0,
    noShow: 0
  })

  useEffect(() => {
    fetchTripDetails()
  }, [tripId])

  const fetchTripDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/driver/trips/${tripId}`)
      const tripData = response.data
      
      setTrip(tripData)
      setPassengers(tripData.passengers || [])
      setStats(tripData.stats || {
        total: tripData.passengers?.length || 0,
        checkedIn: tripData.passengers?.filter(p => p.status === 'checked_in').length || 0,
        pending: tripData.passengers?.filter(p => p.status === 'confirmed').length || 0,
        noShow: tripData.passengers?.filter(p => p.status === 'no_show').length || 0
      })
    } catch (error) {
      console.error('Error fetching trip details:', error)
      toast.error('Failed to load trip details')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async (bookingId) => {
    try {
      await api.post(`/driver/trips/${tripId}/checkin`, { booking_id: bookingId })
      toast.success('Passenger checked in successfully')
      fetchTripDetails()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check in passenger')
    }
  }

  const handleNoShow = async (bookingId) => {
    try {
      await api.post(`/driver/trips/${tripId}/no-show`, { booking_id: bookingId })
      toast.success('Passenger marked as no-show')
      fetchTripDetails()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to mark no-show')
    }
  }

  const formatTime = (time) => {
    if (!time) return '--:--'
    return time.includes(':') ? time : `${time.substring(0, 2)}:${time.substring(2)}`
  }

  const getStatusBadge = (status) => {
    const badges = {
      checked_in: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Checked In' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle, text: 'Confirmed' },
      no_show: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'No Show' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' }
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-lg font-semibold">Loading trip details...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Trip not found</h2>
          <Link to="/driver/trips" className="text-blue-600 hover:underline">
            Back to trips
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/driver/trips')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Trips
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Trip Details</h1>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{trip.route?.origin || 'Unknown'}</span>
                </div>
                <span>→</span>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="font-semibold">{trip.route?.destination || 'Unknown'}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 lg:mt-0">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-600">Status</p>
                <p className="text-xl font-bold text-blue-900 capitalize">{trip.status?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-semibold">{trip.departure_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Departure:</span>
              <span className="font-semibold">{formatTime(trip.departure_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Arrival:</span>
              <span className="font-semibold">{formatTime(trip.arrival_time)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Car className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Bus Information</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Bus Number:</span>
              <span className="font-semibold">{trip.bus?.number || trip.bus?.plate_number || 'Not Assigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-semibold capitalize">{trip.bus?.type || 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Capacity:</span>
              <span className="font-semibold">{trip.bus?.total_seats || 45} seats</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Passenger Stats</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-semibold text-blue-600">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Checked In:</span>
              <span className="font-semibold text-green-600">{stats.checkedIn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <span className="font-semibold text-yellow-600">{stats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">No Show:</span>
              <span className="font-semibold text-red-600">{stats.noShow}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Passengers List */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
          Passenger List
        </h2>

        {passengers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No passengers booked for this trip</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Seat</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {passengers.map((passenger) => (
                  <tr key={passenger._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-lg font-bold">
                        {passenger.seat_number}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900">{passenger.passenger_name}</p>
                      {passenger.special_needs && (
                        <p className="text-xs text-orange-600 mt-1">⚠️ {passenger.special_needs}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {passenger.passenger_phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            {passenger.passenger_phone}
                          </div>
                        )}
                        {passenger.passenger_email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            {passenger.passenger_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-mono text-gray-600">{passenger.booking_reference}</span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(passenger.status)}
                    </td>
                    <td className="py-4 px-4">
                      {passenger.status === 'confirmed' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCheckin(passenger._id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                          >
                            Check In
                          </button>
                          <button
                            onClick={() => handleNoShow(passenger._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                          >
                            No Show
                          </button>
                        </div>
                      )}
                      {passenger.status === 'checked_in' && (
                        <span className="text-sm text-gray-500">
                          {passenger.checked_in_at ? new Date(passenger.checked_in_at).toLocaleTimeString() : 'Checked in'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default DriverTripDetails

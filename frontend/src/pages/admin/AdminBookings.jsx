import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'

const AdminBookings = () => {
  const [bookings, setBookings] = useState([])
  const [filteredBookings, setFilteredBookings] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [routeFilter, setRouteFilter] = useState('all')
  const [scheduleFilter, setScheduleFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchSchedules()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [bookings, searchTerm, statusFilter, dateFilter, routeFilter, scheduleFilter])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const data = await adminService.getBookings()
      setBookings(data)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedules = async () => {
    try {
      const data = await adminService.getSchedules()
      setSchedules(data)
    } catch (error) {
      console.error('Error fetching schedules:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...bookings]

    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.pnr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.passenger_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.passenger_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.passenger_phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // ADDED: Filter by route (origin → destination)
    if (routeFilter !== 'all') {
      filtered = filtered.filter(booking => {
        const route = `${booking.departure_city} → ${booking.arrival_city}`
        return route === routeFilter
      })
    }

    // ADDED: Filter by specific schedule
    if (scheduleFilter !== 'all') {
      filtered = filtered.filter(booking => {
        const scheduleId = booking.schedule_id || booking.scheduleId
        return scheduleId === scheduleFilter
      })
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      filtered = filtered.filter(booking => {
        const bookingDate = (booking.travel_date || booking.created_at)?.toString().split('T')[0]
        
        if (dateFilter === 'today') return bookingDate === today
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          return bookingDate >= weekAgo
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          return bookingDate >= monthAgo
        }
        return true
      })
    }

    setFilteredBookings(filtered)
  }

  // ADDED: Get unique routes from bookings
  const getUniqueRoutes = () => {
    const routes = new Set()
    bookings.forEach(booking => {
      if (booking.departure_city && booking.arrival_city) {
        routes.add(`${booking.departure_city} → ${booking.arrival_city}`)
      }
    })
    return Array.from(routes).sort()
  }

  // ADDED: Get schedules for selected route
  const getSchedulesForRoute = () => {
    if (routeFilter === 'all') return []
    
    const [origin, destination] = routeFilter.split(' → ')
    return schedules.filter(schedule => {
      const scheduleOrigin = schedule.origin_city || schedule.originCity || schedule.departure_city
      const scheduleDestination = schedule.destination_city || schedule.destinationCity || schedule.arrival_city
      return scheduleOrigin === origin && scheduleDestination === destination
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      checked_in: 'bg-purple-100 text-purple-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return

    try {
      await adminService.updateEntity('booking', bookingId, { status: 'cancelled' })
      fetchBookings()
    } catch (error) {
      alert('Error cancelling booking')
    }
  }

  // FIXED: Make stats dynamic based on filtered bookings
  const stats = {
    total: filteredBookings.length,
    confirmed: filteredBookings.filter(b => b.status === 'confirmed').length,
    pending: filteredBookings.filter(b => b.status === 'pending').length,
    cancelled: filteredBookings.filter(b => b.status === 'cancelled').length,
    checkedIn: filteredBookings.filter(b => b.status === 'checked_in').length,
    completed: filteredBookings.filter(b => b.status === 'completed').length,
    revenue: filteredBookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0),
    totalPassengers: filteredBookings.reduce((sum, b) => {
      const seats = b.seat_numbers?.length || (b.seat_number ? 1 : 0)
      return sum + seats
    }, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Stats - Updates based on filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <p className="text-gray-600 text-xs font-medium mb-1">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.totalPassengers} passengers</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <p className="text-gray-600 text-xs font-medium mb-1">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(0) : 0}% of total</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
          <p className="text-gray-600 text-xs font-medium mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-gray-500 mt-1">awaiting payment</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <p className="text-gray-600 text-xs font-medium mb-1">Checked In</p>
          <p className="text-2xl font-bold text-purple-600">{stats.checkedIn}</p>
          <p className="text-xs text-gray-500 mt-1">ready to board</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-500">
          <p className="text-gray-600 text-xs font-medium mb-1">Completed</p>
          <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
          <p className="text-xs text-gray-500 mt-1">trips finished</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-indigo-500">
          <p className="text-gray-600 text-xs font-medium mb-1">Revenue</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.revenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">ETB collected</p>
        </div>
      </div>

      {/* Enhanced Filters with Route and Schedule */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Bookings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Search Passenger
            </label>
            <input
              type="text"
              placeholder="Search by PNR, name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Travel Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎫 Booking Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="confirmed">✅ Confirmed</option>
              <option value="pending">⏳ Pending</option>
              <option value="checked_in">🎟️ Checked In</option>
              <option value="completed">✔️ Completed</option>
              <option value="cancelled">❌ Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🗺️ Route (Origin → Destination)
            </label>
            <select
              value={routeFilter}
              onChange={(e) => {
                setRouteFilter(e.target.value)
                setScheduleFilter('all') // Reset schedule filter when route changes
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Routes</option>
              {getUniqueRoutes().map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🚌 Specific Schedule
            </label>
            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              disabled={routeFilter === 'all'}
            >
              <option value="all">
                {routeFilter === 'all' ? 'Select a route first' : 'All Schedules'}
              </option>
              {getSchedulesForRoute().map((schedule) => {
                const date = (schedule.departure_date || schedule.departure_date)?.toString().split('T')[0]
                const time = schedule.departure_time || schedule.departureTime
                const bus = schedule.bus_number || schedule.busNumber || 'N/A'
                return (
                  <option key={schedule._id} value={schedule._id}>
                    {date} at {time} - Bus {bus}
                  </option>
                )
              })}
            </select>
          </div>
          {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all' || routeFilter !== 'all' || scheduleFilter !== 'all') && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setDateFilter('all')
                  setRouteFilter('all')
                  setScheduleFilter('all')
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                🔄 Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Travel Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.pnr_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.passenger_name}</div>
                    <div className="text-sm text-gray-500">{booking.passenger_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {booking.departure_city} → {booking.arrival_city}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.seat_numbers?.join(', ') || booking.seat_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{booking.total_amount} ETB</div>
                    <div className="text-xs text-gray-500">{booking.payment_status}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setSelectedBooking(booking)
                        setShowModal(true)
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                    {booking.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancelBooking(booking._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No bookings found</p>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">PNR Number</p>
                  <p className="font-semibold text-lg">{selectedBooking.pnr_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3">Passenger Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">{selectedBooking.passenger_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold">{selectedBooking.passenger_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold">{selectedBooking.passenger_phone}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3">Trip Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Route</p>
                    <p className="font-semibold">{selectedBooking.departure_city} → {selectedBooking.arrival_city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Travel Date</p>
                    <p className="font-semibold">
                      {selectedBooking.travel_date ? new Date(selectedBooking.travel_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Departure Time</p>
                    <p className="font-semibold">{selectedBooking.departure_time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bus Number</p>
                    <p className="font-semibold">{selectedBooking.bus_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Seat Numbers</p>
                    <p className="font-semibold">{selectedBooking.seat_numbers?.join(', ') || selectedBooking.seat_number}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-semibold text-xl text-green-600">{selectedBooking.total_amount} ETB</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <p className="font-semibold capitalize">{selectedBooking.payment_status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-semibold capitalize">{selectedBooking.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booked On</p>
                    <p className="font-semibold">
                      {selectedBooking.created_at ? new Date(selectedBooking.created_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBookings

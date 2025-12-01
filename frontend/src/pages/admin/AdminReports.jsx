import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import api from '../../services/api'

const AdminReports = () => {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month') // today, week, month, year, custom
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState({
    revenue: { total: 0, breakdown: [] },
    bookings: { total: 0, byStatus: {}, byRoute: [] },
    buses: { total: 0, utilization: [] },
    routes: { total: 0, popular: [] },
    users: { total: 0, byRole: {} }
  })

  useEffect(() => {
    fetchReportData()
  }, [dateRange, startDate, endDate])

  const getDateRange = () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    switch (dateRange) {
      case 'today':
        return { start: today, end: today }
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return { start: weekAgo.toISOString().split('T')[0], end: today }
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return { start: monthAgo.toISOString().split('T')[0], end: today }
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        return { start: yearAgo.toISOString().split('T')[0], end: today }
      case 'custom':
        return { start: startDate, end: endDate }
      default:
        return { start: today, end: today }
    }
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      // Fetch all data
      const [paymentsData, bookingsData, busesData, routesData, usersData] = await Promise.all([
        adminService.getPayments().catch(() => ({ payments: [] })),
        adminService.getBookings().catch(() => ({ bookings: [] })),
        adminService.getBuses().catch(() => ({ buses: [] })),
        adminService.getRoutes().catch(() => ({ routes: [] })),
        adminService.getUsers().catch(() => [])
      ])
      
      // Extract arrays from response objects
      const payments = Array.isArray(paymentsData) ? paymentsData : (paymentsData.payments || [])
      const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || [])
      const buses = Array.isArray(busesData) ? busesData : (busesData.buses || [])
      const routes = Array.isArray(routesData) ? routesData : (routesData.routes || [])
      const users = Array.isArray(usersData) ? usersData : (usersData.users || [])

      // Filter by date range
      const filterByDate = (items, dateField = 'created_at') => {
        return items.filter(item => {
          const itemDate = item[dateField]?.toString().split('T')[0]
          return itemDate >= start && itemDate <= end
        })
      }

      const filteredPayments = filterByDate(payments)
      const filteredBookings = filterByDate(bookings)

      // Calculate revenue
      const totalRevenue = filteredPayments
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const revenueByMethod = filteredPayments
        .filter(p => p.status === 'success')
        .reduce((acc, p) => {
          const method = p.payment_method || 'unknown'
          acc[method] = (acc[method] || 0) + (p.amount || 0)
          return acc
        }, {})

      // Calculate bookings
      const bookingsByStatus = filteredBookings.reduce((acc, b) => {
        const status = b.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})

      const bookingsByRoute = filteredBookings.reduce((acc, b) => {
        const route = `${b.departure_city} → ${b.arrival_city}`
        const existing = acc.find(r => r.route === route)
        if (existing) {
          existing.count++
          existing.revenue += b.total_amount || 0
        } else {
          acc.push({ route, count: 1, revenue: b.total_amount || 0 })
        }
        return acc
      }, [])

      // Calculate bus utilization
      const busUtilization = buses.map(bus => {
        const busBookings = filteredBookings.filter(b => b.bus_number === bus.bus_number)
        const totalSeats = busBookings.reduce((sum, b) => sum + (b.seat_numbers?.length || 1), 0)
        return {
          busNumber: bus.bus_number,
          busName: bus.bus_name,
          trips: busBookings.length,
          seatsBooked: totalSeats,
          capacity: bus.capacity,
          utilization: bus.capacity ? ((totalSeats / (busBookings.length * bus.capacity)) * 100).toFixed(1) : 0
        }
      }).filter(b => b.trips > 0)

      // Popular routes
      const popularRoutes = bookingsByRoute
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Users by role
      const usersByRole = users.reduce((acc, u) => {
        const role = u.role || 'customer'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {})

      // Count only active buses (exclude maintenance, inactive, repair)
      const activeBuses = buses.filter(bus => bus.status === 'active')

      setReportData({
        revenue: {
          total: totalRevenue,
          breakdown: Object.entries(revenueByMethod).map(([method, amount]) => ({
            method,
            amount
          }))
        },
        bookings: {
          total: filteredBookings.length,
          byStatus: bookingsByStatus,
          byRoute: popularRoutes
        },
        buses: {
          total: activeBuses.length,
          totalAll: buses.length,
          utilization: busUtilization.sort((a, b) => b.utilization - a.utilization)
        },
        routes: {
          total: routes.length,
          popular: popularRoutes
        },
        users: {
          total: users.length,
          byRole: usersByRole
        }
      })

    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = (format) => {
    try {
      const { start, end } = getDateRange()
      
      // Generate CSV data from current report data
      if (format === 'csv') {
        exportToCSV()
      } else if (format === 'pdf') {
        alert('PDF export will be available soon. For now, please use CSV export or print this page.')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report')
    }
  }

  const exportToCSV = () => {
    try {
      const { start, end } = getDateRange()
      
      // Create CSV content
      let csvContent = 'EthioBus Admin Report\n'
      csvContent += `Generated: ${new Date().toLocaleString()}\n`
      csvContent += `Period: ${start} to ${end}\n\n`
      
      // Revenue Summary
      csvContent += 'REVENUE SUMMARY\n'
      csvContent += 'Payment Method,Amount (ETB)\n'
      reportData.revenue.breakdown.forEach(item => {
        csvContent += `${item.method},${item.amount}\n`
      })
      csvContent += `Total,${reportData.revenue.total}\n\n`
      
      // Bookings Summary
      csvContent += 'BOOKINGS SUMMARY\n'
      csvContent += 'Status,Count\n'
      Object.entries(reportData.bookings.byStatus).forEach(([status, count]) => {
        csvContent += `${status},${count}\n`
      })
      csvContent += `Total,${reportData.bookings.total}\n\n`
      
      // Popular Routes
      csvContent += 'TOP ROUTES\n'
      csvContent += 'Rank,Route,Bookings,Revenue (ETB),Avg per Booking (ETB)\n'
      reportData.routes.popular.forEach((route, index) => {
        csvContent += `${index + 1},${route.route},${route.count},${route.revenue},${(route.revenue / route.count).toFixed(0)}\n`
      })
      csvContent += '\n'
      
      // Bus Utilization
      csvContent += 'BUS UTILIZATION\n'
      csvContent += 'Bus Number,Bus Name,Trips,Seats Booked,Capacity,Utilization %\n'
      reportData.buses.utilization.forEach(bus => {
        csvContent += `${bus.busNumber},${bus.busName},${bus.trips},${bus.seatsBooked},${bus.capacity},${bus.utilization}\n`
      })
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `ethiobus_report_${start}_to_${end}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      alert('Report exported successfully!')
    } catch (error) {
      console.error('Error generating CSV:', error)
      alert('Failed to generate CSV export')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 text-lg">Generating reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-indigo-100 mt-1">Comprehensive business insights and statistics</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Date Range Selector */}
            <div className="flex bg-white bg-opacity-20 rounded-lg p-1">
              {['today', 'week', 'month', 'year', 'custom'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    dateRange === range
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => exportReport('csv')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg transition-all text-sm font-medium"
              >
                📊 Export CSV
              </button>
              <button
                onClick={() => exportReport('pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg transition-all text-sm font-medium"
              >
                📄 Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="mt-4 flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-white mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-white border-opacity-30 rounded-lg focus:ring-2 focus:ring-white bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-white mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-white border-opacity-30 rounded-lg focus:ring-2 focus:ring-white bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70"
              />
            </div>
          </div>
        )}
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Revenue Overview</h2>
          <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
            <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
            <p className="text-4xl font-bold text-green-600 mt-2">{reportData.revenue.total.toLocaleString()} ETB</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Payment Method</h3>
            {reportData.revenue.breakdown.map((item) => (
              <div key={item.method} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition-all border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-lg">
                      {item.method.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 capitalize">{item.method}</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{item.amount.toLocaleString()} ETB</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Quick Stats</h2>
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-700 font-medium">Total Bookings</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{reportData.bookings.total}</p>
            </div>
            <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-700 font-medium">Active Buses</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{reportData.buses.total}</p>
            </div>
            <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-700 font-medium">Total Routes</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{reportData.routes.total}</p>
            </div>
            <div className="p-5 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-700 font-medium">Total Users</p>
              <p className="text-3xl font-bold text-pink-600 mt-2">{reportData.users.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Bookings by Status</h2>
          <div className="space-y-3">
            {Object.entries(reportData.bookings.byStatus).map(([status, count]) => {
              const total = reportData.bookings.total
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
              const colors = {
                confirmed: 'bg-green-500',
                pending: 'bg-yellow-500',
                cancelled: 'bg-red-500',
                completed: 'bg-blue-500',
                checked_in: 'bg-purple-500'
              }
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-sm font-bold text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[status] || 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Users by Role</h2>
          <div className="space-y-3">
            {Object.entries(reportData.users.byRole).map(([role, count]) => {
              const total = reportData.users.total
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
              const colors = {
                admin: 'bg-purple-500',
                operator: 'bg-blue-500',
                driver: 'bg-green-500',
                ticketer: 'bg-yellow-500',
                customer: 'bg-gray-500'
              }
              return (
                <div key={role}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
                    <span className="text-sm font-bold text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[role] || 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Popular Routes */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Top 10 Popular Routes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Route</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bookings</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Revenue</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Avg per Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.routes.popular.map((route, index) => (
                <tr key={index} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold shadow-md ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                      'bg-gradient-to-br from-blue-400 to-blue-500 text-white'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{route.route}</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">{route.count}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{route.revenue.toLocaleString()} ETB</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">{(route.revenue / route.count).toFixed(0)} ETB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bus Utilization */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Bus Utilization Report</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bus Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bus Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Trips</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Seats Booked</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Capacity</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.buses.utilization.map((bus, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{bus.busNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{bus.busName}</td>
                  <td className="px-4 py-3 text-gray-600">{bus.trips}</td>
                  <td className="px-4 py-3 text-gray-600">{bus.seatsBooked}</td>
                  <td className="px-4 py-3 text-gray-600">{bus.capacity}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div
                          className={`h-2 rounded-full ${
                            bus.utilization >= 80 ? 'bg-green-500' :
                            bus.utilization >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(bus.utilization, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{bus.utilization}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminReports

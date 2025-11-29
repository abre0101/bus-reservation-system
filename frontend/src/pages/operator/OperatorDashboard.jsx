import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  RefreshCw, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bus,
  UserCheck,
  BarChart3,
  FileText,
  MapPin,
  Shield,
  Activity
} from 'lucide-react'
import operatorService from '../../services/operatorService'

const OperatorDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: {
      activeTrips: 0,
      totalDrivers: 0,
      todayBookings: 0,
      pendingCheckins: 0,
      todayRevenue: 0,
      checkinRate: 0,
      occupancyRate: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      onRouteTrips: 0,
      currency: 'ETB'
    },
    recentTrips: [],
    alerts: [],
    charts: {
      revenue_trend: { labels: [], data: [] },
      occupancy_rate: { labels: [], data: [] },
      booking_sources: { labels: [], data: [] }
    }
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeframe, setTimeframe] = useState('today')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)



  useEffect(() => {
    fetchDashboardData()
  }, [timeframe])
const fetchDashboardData = async () => {
  try {
    setLoading(true)
    setError('')
    
    console.log('🔄 Fetching dashboard data...');
    
    // Fetch all data in parallel for better performance
    const [statsData, tripsData, alertsData, chartsData] = await Promise.all([
      operatorService.getDashboardStats(timeframe).catch(err => {
        console.error('Stats fetch failed:', err);
        return null;
      }),
      operatorService.getRecentTrips(5).catch(err => {
        console.error('Trips fetch failed:', err);
        return [];
      }),
      operatorService.getAlerts().catch(err => {
        console.error('Alerts fetch failed:', err);
        return [];
      }),
      operatorService.getDashboardCharts(timeframe).catch(err => {
        console.error('Charts fetch failed:', err);
        return { revenue_trend: { labels: [], data: [] }, occupancy_rate: { labels: [], data: [] }, booking_sources: { labels: [], data: [] } };
      })
    ]);
    
    console.log('📊 Stats Data:', statsData);
    console.log('🚌 Trips Data:', tripsData);
    console.log('⚠️ Alerts Data:', alertsData);
    console.log('📈 Charts Data:', chartsData);

    // If stats failed, show error
    if (!statsData) {
      throw new Error('Failed to load dashboard statistics. Please check your connection and try again.');
    }

    const newData = {
      stats: statsData,
      recentTrips: tripsData || [],
      alerts: alertsData || [],
      charts: chartsData || { revenue_trend: { labels: [], data: [] }, occupancy_rate: { labels: [], data: [] }, booking_sources: { labels: [], data: [] } }
    }
    
    console.log('🎯 Final Dashboard Data:', newData);
    
    setDashboardData(newData)
    setLastUpdated(new Date())
    
  } catch (error) {
    console.error('❌ Failed to fetch dashboard data:', error)
    setError(error.message || 'Failed to load dashboard data')
  } finally {
    setLoading(false)
    setRefreshing(false)
  }
}

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = 'blue', 
    trend,
    formatValue = (val) => val 
  }) => {
    const colorConfig = {
      blue: { 
        bg: 'bg-blue-50', 
        iconBg: 'bg-blue-100 text-blue-600',
        text: 'text-blue-700',
        border: 'border-blue-200'
      },
      green: { 
        bg: 'bg-green-50', 
        iconBg: 'bg-green-100 text-green-600',
        text: 'text-green-700',
        border: 'border-green-200'
      },
      yellow: { 
        bg: 'bg-yellow-50', 
        iconBg: 'bg-yellow-100 text-yellow-600',
        text: 'text-yellow-700',
        border: 'border-yellow-200'
      },
      purple: { 
        bg: 'bg-purple-50', 
        iconBg: 'bg-purple-100 text-purple-600',
        text: 'text-purple-700',
        border: 'border-purple-200'
      },
      indigo: { 
        bg: 'bg-indigo-50', 
        iconBg: 'bg-indigo-100 text-indigo-600',
        text: 'text-indigo-700',
        border: 'border-indigo-200'
      },
      red: { 
        bg: 'bg-red-50', 
        iconBg: 'bg-red-100 text-red-600',
        text: 'text-red-700',
        border: 'border-red-200'
      }
    }

    const currentColor = colorConfig[color] || colorConfig.blue

    return (
      <div className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border ${currentColor.border} p-6 hover:shadow-xl transition-all duration-200 group`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className={`flex-shrink-0 p-3 rounded-xl ${currentColor.iconBg} group-hover:scale-105 transition-transform shadow-md`}>
              {icon}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatValue(value)}
              </p>
              {subtitle && (
                <p className={`text-sm ${currentColor.text} mt-1 font-medium`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {trend !== undefined && (
            <div className={`flex items-center text-sm font-medium ${
              trend > 0 ? 'text-green-600' : 
              trend < 0 ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              <TrendingUp 
                className={`h-4 w-4 ${trend < 0 ? 'rotate-180' : ''} ${
                  trend === 0 ? 'text-gray-400' : ''
                }`} 
              />
              <span className="ml-1">
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const AlertItem = ({ alert }) => {
    const getSeverityConfig = (severity) => {
      const configs = {
        high: {
          color: 'red',
          icon: <AlertTriangle className="h-4 w-4" />,
          bg: 'bg-red-50 border-red-200',
          dot: 'bg-red-500',
          text: 'text-red-800'
        },
        medium: {
          color: 'yellow',
          icon: <Clock className="h-4 w-4" />,
          bg: 'bg-yellow-50 border-yellow-200',
          dot: 'bg-yellow-500',
          text: 'text-yellow-800'
        },
        low: {
          color: 'blue',
          icon: <AlertTriangle className="h-4 w-4" />,
          bg: 'bg-blue-50 border-blue-200',
          dot: 'bg-blue-500',
          text: 'text-blue-800'
        },
        info: {
          color: 'green',
          icon: <CheckCircle className="h-4 w-4" />,
          bg: 'bg-green-50 border-green-200',
          dot: 'bg-green-500',
          text: 'text-green-800'
        }
      }
      return configs[severity] || configs.info
    }

    const config = getSeverityConfig(alert.severity)

    return (
      <div className={`${config.bg} border rounded-lg p-4 hover:shadow-sm transition-shadow`}>
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 p-1 rounded-full ${config.bg.replace('50', '100')}`}>
            <div className={`w-2 h-2 rounded-full ${config.dot}`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              {config.icon}
              <h4 className={`text-sm font-semibold ${config.text} truncate`}>
                {alert.title}
              </h4>
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {alert.description}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs font-medium ${config.text} capitalize`}>
                {alert.severity} priority
              </span>
              <span className="text-xs text-gray-500">
                {alert.time ? new Date(alert.time).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const QuickActionCard = ({ to, title, description, icon, color = 'blue' }) => {
    const colorConfig = {
      blue: {
        hover: 'hover:border-blue-500 hover:bg-blue-50',
        icon: 'bg-blue-100 text-blue-600',
        text: 'text-blue-700'
      },
      green: {
        hover: 'hover:border-green-500 hover:bg-green-50',
        icon: 'bg-green-100 text-green-600',
        text: 'text-green-700'
      },
      purple: {
        hover: 'hover:border-purple-500 hover:bg-purple-50',
        icon: 'bg-purple-100 text-purple-600',
        text: 'text-purple-700'
      },
      yellow: {
        hover: 'hover:border-yellow-500 hover:bg-yellow-50',
        icon: 'bg-yellow-100 text-yellow-600',
        text: 'text-yellow-700'
      },
      indigo: {
        hover: 'hover:border-indigo-500 hover:bg-indigo-50',
        icon: 'bg-indigo-100 text-indigo-600',
        text: 'text-indigo-700'
      }
    }

    const currentColor = colorConfig[color]

    return (
      <Link
        to={to}
        className={`flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group ${currentColor.hover} bg-white/50 backdrop-blur-sm`}
      >
        <div className={`p-3 rounded-xl ${currentColor.icon} group-hover:scale-110 transition-transform shadow-md`}>
          {icon}
        </div>
        <span className="mt-3 text-base font-semibold text-gray-900 text-center group-hover:text-gray-800">
          {title}
        </span>
        <span className={`text-sm ${currentColor.text} text-center mt-1 font-medium`}>
          {description}
        </span>
      </Link>
    )
  }

  const TripStatusBadge = ({ status }) => {
    const statusConfig = {
      scheduled: { color: 'bg-green-100 text-green-800', label: 'Scheduled' },
      boarding: { color: 'bg-yellow-100 text-yellow-800', label: 'Boarding' },
      departed: { color: 'bg-blue-100 text-blue-800', label: 'Departed' },
      active: { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      delayed: { color: 'bg-red-100 text-red-800', label: 'Delayed' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    }

    const config = statusConfig[status] || statusConfig.scheduled

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  const { stats, recentTrips, alerts } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">Operator Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome to EthioBus Operator Panel
            {lastUpdated && (
              <span className="text-sm text-gray-500 ml-2">
                • Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-indigo-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white/80 backdrop-blur-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button 
                onClick={fetchDashboardData}
                className="text-sm text-red-800 font-medium mt-2 hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={timeframe === 'today' ? "Today's Active Trips" : timeframe === 'week' ? "This Week's Active Trips" : "This Month's Active Trips"}
          value={stats.activeTrips}
          subtitle={`Scheduled + Boarding + On Route`}
          icon={<Bus className="w-6 h-6" />}
          color="blue"
          trend={stats.activeTripsTrend}
        />
        <StatCard
          title={timeframe === 'today' ? "Today's Bookings" : timeframe === 'week' ? "This Week's Bookings" : "This Month's Bookings"}
          value={stats.periodBookings}
          subtitle={`${stats.pendingCheckins || 0} pending check-ins`}
          icon={<UserCheck className="w-6 h-6" />}
          color="green"
          trend={stats.bookingsTrend}
        />
        <StatCard
          title={timeframe === 'today' ? "Today's Revenue" : timeframe === 'week' ? "This Week's Revenue" : "This Month's Revenue"}
          value={stats.periodRevenue}
          subtitle={`${stats.checkinRate || 0}% check-in rate`}
          icon={<DollarSign className="w-6 h-6" />}
          color="yellow"
          trend={stats.revenueTrend}
          formatValue={(val) => `${stats.currency || 'ETB'} ${(val || 0).toLocaleString()}`}
        />
        <StatCard
          title="Occupancy Rate"
          value={stats.occupancyRate}
          subtitle={`${stats.totalDrivers || 0} active drivers`}
          icon={<Users className="w-6 h-6" />}
          color="purple"
          trend={stats.occupancyTrend}
          formatValue={(val) => `${val}%`}
        />
      </div>

      {/* Secondary Stats Row - Trip Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Scheduled"
          value={stats.scheduledTrips || 0}
          subtitle="Awaiting departure"
          icon={<Clock className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Boarding"
          value={stats.boardingTrips || 0}
          subtitle="Loading passengers"
          icon={<Users className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="On Route"
          value={stats.onRouteTrips || 0}
          subtitle="Currently traveling"
          icon={<Activity className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Completed"
          value={stats.completedTrips || 0}
          subtitle={timeframe === 'today' ? 'Today' : timeframe === 'week' ? 'This week' : 'This month'}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Cancelled"
          value={stats.cancelledTrips || 0}
          subtitle={timeframe === 'today' ? 'Today' : timeframe === 'week' ? 'This week' : 'This month'}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Recent Trips */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-100">
        <div className="px-6 py-4 border-b border-indigo-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Trips</h2>
            <MapPin className="h-5 w-5 text-indigo-400" />
          </div>
        </div>
        <div className="p-6">
          {recentTrips.length > 0 ? (
            <div className="space-y-4">
              {recentTrips.slice(0, 5).map((trip, index) => (
                  <div 
                    key={trip.id || index} 
                    className="flex items-center justify-between p-4 border border-indigo-100 rounded-xl hover:bg-indigo-50/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Bus className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 truncate">
                          {trip.route || 'Unknown Route'}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>{trip.departure_time || 'N/A'}</span>
                        <span>•</span>
                        <span>{trip.bus || 'Unknown Bus'}</span>
                      </p>
                      <div className="flex items-center space-x-3 mt-2">
                        <TripStatusBadge status={trip.status} />
                        <span className="text-xs text-gray-500">
                          {trip.booked_seats || 0}/{trip.available_seats || trip.total_seats || 0} seats
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="font-semibold text-gray-900">
                        {stats.currency || 'ETB'} {trip.fare_birr || '0'}
                      </p>
                      <p className="text-sm text-gray-600 truncate max-w-[120px]">
                        {trip.driver_name || 'No driver'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent trips found</p>
                <p className="text-sm text-gray-400 mt-1">Trips will appear here as they are scheduled</p>
              </div>
            )}
            <div className="mt-6">
              <Link 
                to="/operator/schedules"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
              >
                View all schedules
                <TrendingUp className="h-4 w-4 ml-1" />
              </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-100">
        <div className="px-6 py-4 border-b border-indigo-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <BarChart3 className="h-5 w-5 text-indigo-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionCard
              to="/operator/checkin"
              title="Passenger Check-in"
              description="Manage check-ins"
              icon={<UserCheck className="w-6 h-6" />}
              color="green"
            />
            
            <QuickActionCard
              to="/operator/schedules"
              title="Trip Schedules"
              description="Manage trips & routes"
              icon={<Calendar className="w-6 h-6" />}
              color="blue"
            />
            
            <QuickActionCard
              to="/operator/drivers"
              title="Driver Management"
              description="Staff & assignments"
              icon={<Users className="w-6 h-6" />}
              color="purple"
            />
            
            <QuickActionCard
              to="/operator/reports"
              title="Reports & Analytics"
              description="View insights"
              icon={<FileText className="w-6 h-6" />}
              color="yellow"
            />
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
            <p className="text-gray-600 mt-1">
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">All Systems Operational</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OperatorDashboard
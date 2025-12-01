import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Ticket, TrendingUp, Bus, RefreshCw, AlertCircle, Users, Star, Navigation, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, formatCurrency } from '../../utils/helpers'
import { getDashboardData, getUpcomingTrips, getRecentActivity, getUserStats } from '../../services/dashboardService'

const CustomerDashboard = () => {
  const { user } = useAuth()
  const [upcomingTrips, setUpcomingTrips] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [userStats, setUserStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user?.id) {
        throw new Error('Please log in to view your dashboard')
      }

      console.log('🚀 Starting dashboard data load...')
      
      const [upcoming, recent, stats] = await Promise.all([
        getUpcomingTrips(),
        getRecentActivity(),
        getUserStats()
      ])

      setUpcomingTrips(upcoming)
      setRecentActivity(recent)
      setUserStats(stats)
      
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error)
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load dashboard data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const recentBookings = recentActivity.slice(0, 3)
  const upcomingBookings = upcomingTrips.slice(0, 2)

  const statCards = [
    {
      title: "Total Bookings",
      value: userStats.totalBookings || 0,
      icon: Ticket,
      color: "text-blue-600",
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
      borderColor: "border-l-blue-500"
    },
    {
      title: "Upcoming Trips",
      value: userStats.upcomingTrips || 0,
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-gradient-to-br from-green-50 to-green-100",
      borderColor: "border-l-green-500"
    },
    {
      title: "Total Spent",
      value: formatCurrency(userStats.totalSpent || 0),
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100",
      borderColor: "border-l-purple-500"
    },
    {
      title: "Loyalty Points",
      value: userStats.loyaltyPoints || 0,
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-gradient-to-br from-yellow-50 to-yellow-100",
      borderColor: "border-l-yellow-500"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="h-8 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            
            {/* Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-8 bg-gray-300 rounded w-12"></div>
                    </div>
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6 h-64"></div>
                <div className="bg-white rounded-xl shadow-lg p-6 h-96"></div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-lg p-6 h-96"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 animate-pulse" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)`,
          backgroundSize: '50% 50%',
          animationDuration: '8s'
        }}></div>
      </div>

      {/* Floating shapes for depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-40 left-1/4 w-36 h-36 bg-purple-200/20 rounded-full blur-3xl animate-float"></div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(-15px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
      `}</style>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Welcome Header */}
        <div className="mb-12 text-center lg:text-left">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-blue-200/60 shadow-lg mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-sm font-semibold text-gray-700">Welcome back!</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              Hello, {user?.full_name || user?.name || 'Traveler'}!
            </h1>
            <Sparkles className="h-10 w-10 text-yellow-500 animate-pulse" />
          </div>
          <p className="text-xl text-gray-700 mt-3 max-w-2xl flex items-center gap-2">
            <Navigation className="h-6 w-6 text-blue-600" />
            Ready for your next adventure? Here's your travel overview.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-6 bg-white/95 backdrop-blur-lg border border-red-300 rounded-2xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-red-800">
                    Oops! Something went wrong
                  </h3>
                  <p className="text-red-700 mt-1">
                    {error}
                  </p>
                </div>
              </div>
              <button
                onClick={loadDashboardData}
                className="ml-3 flex items-center text-sm bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-full transition-colors duration-200 shadow-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div 
                key={index} 
                className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-l-4 ${stat.borderColor} transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl group`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2 group-hover:scale-110 transition-transform duration-300">{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.bgColor} shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
                    <IconComponent className={`h-7 w-7 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500 flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    Updated just now
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Loyalty Status Banner */}
        {user?.loyalty_tier && user.loyalty_tier !== 'member' && (
          <div className={`mb-8 rounded-2xl shadow-2xl p-6 text-white transform hover:scale-[1.02] transition-all duration-300 ${
            user.loyalty_tier === 'gold' ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500' :
            user.loyalty_tier === 'silver' ? 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500' :
            user.loyalty_tier === 'bronze' ? 'bg-gradient-to-r from-orange-400 via-amber-500 to-orange-600' :
            'bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <Star className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">
                    {user.loyalty_tier === 'bronze' && '🥉 Bronze Member'}
                    {user.loyalty_tier === 'silver' && '🥈 Silver Member'}
                    {user.loyalty_tier === 'gold' && '🥇 Gold Member'}
                    {user.loyalty_tier === 'platinum' && '💎 Platinum Member'}
                  </h3>
                  <p className="text-white/90">
                    {user.loyalty_points || 0} points • 
                    {user.loyalty_tier === 'bronze' && ' 5% discount on all bookings'}
                    {user.loyalty_tier === 'silver' && ' 10% discount + Priority boarding'}
                    {user.loyalty_tier === 'gold' && ' 15% discount + VIP benefits'}
                    {user.loyalty_tier === 'platinum' && ' 20% discount + Premium perks'}
                  </p>
                </div>
              </div>
              <Link
                to="/customer/profile"
                className={`px-6 py-3 bg-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  user.loyalty_tier === 'gold' ? 'text-yellow-600 hover:bg-yellow-50' :
                  user.loyalty_tier === 'silver' ? 'text-gray-600 hover:bg-gray-50' :
                  user.loyalty_tier === 'bronze' ? 'text-orange-600 hover:bg-orange-50' :
                  'text-purple-600 hover:bg-purple-50'
                }`}
              >
                View Benefits
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions & Upcoming Trips */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/60">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Navigation className="h-6 w-6 text-blue-600 mr-3" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Link
                  to="/search"
                  className="group relative overflow-hidden p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300 backdrop-blur-sm shadow-lg">
                        <Bus className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          Book New Trip
                        </h3>
                        <p className="text-white/90 mt-1 text-sm">Find and book buses</p>
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </Link>

                <Link
                  to="/customer/my-bookings"
                  className="group relative overflow-hidden p-6 bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300 backdrop-blur-sm shadow-lg">
                        <Ticket className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          My Bookings
                        </h3>
                        <p className="text-white/90 mt-1 text-sm">View all bookings</p>
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Upcoming Trips */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Calendar className="h-6 w-6 text-green-600 mr-3" />
                  Upcoming Trips
                </h2>
                <Link 
                  to="/customer/my-bookings" 
                  className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl hover:from-green-700 hover:to-emerald-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div>

              {upcomingBookings.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bus className="h-10 w-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">No Upcoming Trips</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    You don't have any upcoming trips. Start planning your next journey!
                  </p>
                  <Link 
                    to="/search" 
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-800 hover:shadow-xl transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    <Bus className="h-5 w-5 mr-2" />
                    Book Your First Trip
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingBookings.map((booking, index) => (
                    <div 
                      key={booking.id || booking._id || index} 
                      className="bg-gradient-to-r from-white to-blue-50 border-2 border-blue-100 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <MapPin className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                              {booking.departure_city} → {booking.arrival_city}
                            </h3>
                            <p className="text-gray-600 flex items-center mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(booking.travel_date || booking.departure_date)} 
                              <Clock className="h-4 w-4 ml-3 mr-1" />
                              {booking.departure_time}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-xl">
                            {formatCurrency(booking.total_amount)}
                          </p>
                          <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full mt-1">
                            PNR: {booking.pnr_number || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Bus className="h-4 w-4" />
                            <span className="font-medium">{booking.bus_type || 'Standard'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>Seats: {booking.seat_numbers?.join(', ') || booking.seat_count || 'N/A'}</span>
                          </div>
                        </div>
                        <Link
                          to={`/customer/booking/${booking.id || booking._id || booking.pnr_number}`}
                          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-sm font-semibold rounded-xl text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          View Details
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Loyalty & Recent Bookings */}
          <div className="lg:col-span-1 space-y-8">
            {/* Loyalty Status Card */}
            <div className={`rounded-2xl shadow-2xl p-6 text-white ${
              userStats.loyaltyTier === 'gold' ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500' :
              userStats.loyaltyTier === 'silver' ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500' :
              userStats.loyaltyTier === 'bronze' ? 'bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600' :
              'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Loyalty Status</h3>
                <Star className="h-8 w-8" />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-white/80">Current Tier</p>
                  <p className="text-3xl font-bold capitalize">
                    {userStats.loyaltyTier === 'bronze' && '🥉 Bronze'}
                    {userStats.loyaltyTier === 'silver' && '🥈 Silver'}
                    {userStats.loyaltyTier === 'gold' && '🥇 Gold'}
                    {userStats.loyaltyTier === 'platinum' && '💎 Platinum'}
                    {(!userStats.loyaltyTier || userStats.loyaltyTier === 'member') && '👤 Member'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/80">Total Points</p>
                  <p className="text-4xl font-bold">{userStats.loyaltyPoints || 0}</p>
                </div>
                <div className="pt-3 border-t border-white/30">
                  <p className="text-xs text-white/80 mb-2">
                    {userStats.loyaltyTier === 'member' && 'Next Tier: Bronze (500 pts)'}
                    {userStats.loyaltyTier === 'bronze' && 'Next Tier: Silver (2,000 pts)'}
                    {userStats.loyaltyTier === 'silver' && 'Next Tier: Gold (5,000 pts)'}
                    {userStats.loyaltyTier === 'gold' && 'Highest Tier Achieved! 🎉'}
                  </p>
                  <div className="w-full bg-white/30 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${
                          userStats.loyaltyTier === 'member' ? Math.min(((userStats.loyaltyPoints || 0) / 500) * 100, 100) :
                          userStats.loyaltyTier === 'bronze' ? Math.min((((userStats.loyaltyPoints || 0) - 500) / 1500) * 100, 100) :
                          userStats.loyaltyTier === 'silver' ? Math.min((((userStats.loyaltyPoints || 0) - 2000) / 3000) * 100, 100) :
                          100
                        }%` 
                      }}
                    ></div>
                  </div>
                </div>
                <Link
                  to="/customer/profile"
                  className={`block w-full text-center mt-4 px-4 py-3 bg-white font-bold rounded-xl transition-all duration-200 shadow-lg ${
                    userStats.loyaltyTier === 'gold' ? 'text-yellow-600 hover:bg-yellow-50' :
                    userStats.loyaltyTier === 'silver' ? 'text-gray-600 hover:bg-gray-50' :
                    userStats.loyaltyTier === 'bronze' ? 'text-orange-600 hover:bg-orange-50' :
                    'text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  View Full Benefits
                </Link>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Ticket className="h-6 w-6 text-purple-600 mr-3" />
                  Recent Bookings
                </h2>
                <RefreshCw 
                  className={`h-5 w-5 text-gray-400 cursor-pointer hover:text-purple-600 transition-all duration-200 hover:rotate-180 hover:scale-110 ${
                    loading ? 'animate-spin' : ''
                  }`}
                  onClick={loadDashboardData}
                />
              </div>
              
              {recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ticket className="h-8 w-8 text-purple-400" />
                  </div>
                  <p className="text-gray-600 mb-4">No recent bookings found</p>
                  <Link 
                    to="/search" 
                    className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    Book your first trip
                    <MapPin className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking, index) => (
                    <div 
                      key={booking.id || booking._id || index} 
                      className="bg-gradient-to-r from-white to-purple-50 border-l-4 border-purple-500 pl-5 py-4 rounded-r-lg hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {booking.departure_city} → {booking.arrival_city}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(booking.travel_date || booking.departure_date)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800 border border-green-200' :
                          booking.status === 'checked_in' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>{(booking.seat_numbers?.length || booking.seat_count || 0)} seat(s)</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(booking.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link
                to="/customer/my-bookings"
                className="inline-flex items-center justify-center w-full mt-6 px-6 py-3 border-2 border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                View All Bookings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDashboard
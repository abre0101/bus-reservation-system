import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Bus, MapPin, Clock, Shield, Users, CheckCircle, 
  Star, ArrowRight, Heart, Wifi, 
  ThumbsUp, Luggage, Award
} from 'lucide-react'
import { getPopularRoutes } from '../../services/dashboardService'

const Home = () => {
  console.log('🏠 Home: Component rendering...');
  
  const [routes, setRoutes] = useState([])
  const [todaySchedules, setTodaySchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentBus, setCurrentBus] = useState(0)
  const busRef = useRef(null)

  // Bus animation data
  const buses = [
    { type: 'deluxe', color: 'text-purple-500', size: 'h-16 w-16' },
    { type: 'premium', color: 'text-yellow-500', size: 'h-20 w-20' },
    { type: 'standard', color: 'text-blue-500', size: 'h-14 w-14' },
    { type: 'express', color: 'text-blue-600', size: 'h-18 w-18' }
  ]

  // Fetch data from your actual backend API
  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true)
        console.log('🔄 Home: Fetching public route data...')

        // Only fetch public routes data (not protected endpoints)
        try {
          const routesData = await getPopularRoutes()
          console.log('✅ Home: Routes data loaded:', routesData?.popularRoutes?.length || 0)

          // Set routes data - use real data only
          if (routesData?.success && Array.isArray(routesData.popularRoutes)) {
            setRoutes(routesData.popularRoutes)
          } else if (routesData && Array.isArray(routesData)) {
            setRoutes(routesData)
          }
        } catch (routesError) {
          console.log('ℹ️ Home: Could not fetch routes (this is okay for public view):', routesError.message)
          // Don't fail the page load if routes can't be fetched
          setRoutes([])
        }

        // Skip fetching today's schedules for public view (requires auth)
        // This endpoint returns 401 for unauthenticated users
        console.log('ℹ️ Home: Skipping today\'s schedules (requires authentication)')
        setTodaySchedules([])

      } catch (error) {
        console.error('❌ Home: Error fetching page data:', error)
        // Ensure page still loads even if API fails
        setRoutes([])
        setTodaySchedules([])
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [])

  // Bus animation effect
  useEffect(() => {
    const animateBus = () => {
      if (busRef.current) {
        busRef.current.style.transition = 'none'
        busRef.current.style.transform = 'translateX(-100px)'
        
        setTimeout(() => {
          if (busRef.current) {
            busRef.current.style.transition = 'transform 15s linear'
            busRef.current.style.transform = 'translateX(calc(100vw + 100px))'
          }
        }, 100)
      }
    }

    const busInterval = setInterval(() => {
      setCurrentBus(prev => (prev + 1) % buses.length)
      setTimeout(animateBus, 500)
    }, 16000)

    // Initial animation
    setTimeout(animateBus, 1000)

    return () => clearInterval(busInterval)
  }, [])

  // Format price for display
  const formatPrice = (price) => {
    return typeof price === 'number' ? `ETB ${price}` : `ETB ${parseInt(price) || 0}`
  }

  // Get bus type badge color
  const getBusTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'deluxe': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'premium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'standard': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'express': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get route image based on destination city
  const getRouteImage = (destinationCity) => {
    const cityImages = {
      'Bahir Dar': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Hawassa': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Dire Dawa': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Mekele': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Gonder': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
      'Jimma': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'
    }
    return cityImages[destinationCity] || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section with Bus Background and Moving Bus */}
      <section 
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")'
        }}
      >
        {/* Moving Bus Animation */}
        <div className="absolute bottom-20 left-0 right-0 h-20 z-10">
          <div
            ref={busRef}
            className={`absolute ${buses[currentBus].color} ${buses[currentBus].size} transform -translate-x-32`}
            style={{ transition: 'transform 15s linear' }}
          >
            <Bus className="w-full h-full" fill="currentColor" />
            {/* Bus windows effect */}
            <div className="absolute inset-0 flex justify-between px-2 pt-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-3 h-2 bg-blue-200 rounded-sm opacity-60"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Road for the bus */}
        <div className="absolute bottom-16 left-0 right-0 h-2 bg-gray-600/80 z-0">
          {/* Road markings */}
          <div className="absolute inset-0 flex space-x-8 items-center">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-16 h-1 bg-yellow-400 rounded-full"></div>
            ))}
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white z-20">
          {/* Logo/Brand */}
          <div className="inline-flex items-center bg-indigo-600/20 backdrop-blur-sm border border-indigo-400/30 rounded-full px-6 py-3 mb-8">
            <Bus className="h-6 w-6 text-indigo-300 mr-2" />
            <span className="text-lg font-bold text-indigo-100">EthioBus</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Journey Across
            <br />
            <span className="text-indigo-300 animate-pulse">Beautiful Ethiopia</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl mb-8 text-gray-200 leading-relaxed max-w-3xl mx-auto">
            Experience comfortable, safe, and reliable bus travel with Ethiopia's most trusted bus company. 
            Book your tickets in seconds and explore our beautiful country.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-8 mb-12 max-w-2xl mx-auto">
            <div className="text-center transform hover:scale-110 transition-transform duration-300">
              <div className="text-3xl font-bold text-indigo-300">{routes.length || '20+'}</div>
              <div className="text-sm text-gray-300">Destinations</div>
            </div>
            <div className="text-center transform hover:scale-110 transition-transform duration-300">
              <div className="text-3xl font-bold text-indigo-300">{buses.length || '3+'}</div>
              <div className="text-sm text-gray-300">Modern Buses</div>
            </div>
            <div className="text-center transform hover:scale-110 transition-transform duration-300">
              <div className="text-3xl font-bold text-indigo-300">98%</div>
              <div className="text-sm text-gray-300">On-Time Rate</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/search"
              className="inline-flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl group"
            >
              <Bus className="mr-3 h-6 w-6" />
              Book Your Journey
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/routes"
              className="inline-flex items-center px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold text-lg border-2 border-white/50 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              View All Schedules
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
          </div>
        </div>
      </section>

      {/* Why Travel With Us Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Travel With <span className="text-indigo-600">EthioBus</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're committed to providing the best travel experience across Ethiopia with safety, comfort, and reliability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Shield className="h-12 w-12 text-indigo-600" />,
                title: "Safety First",
                description: "Your safety is our top priority with modern buses and professional drivers",
                features: ["Regular maintenance", "Trained drivers", "24/7 monitoring"]
              },
              {
                icon: <Clock className="h-12 w-12 text-indigo-600" />,
                title: "On-Time Guarantee",
                description: "98% on-time departure record with real-time tracking",
                features: ["Live tracking", "SMS updates", "Accurate ETAs"]
              },
              {
                icon: <Users className="h-12 w-12 text-indigo-600" />,
                title: "Comfortable Travel",
                description: "Spacious seats and modern amenities for your journey",
                features: ["Air conditioning", "Comfortable seats", "Onboard restroom"]
              },
              {
                icon: <Award className="h-12 w-12 text-indigo-600" />,
                title: "Award Winning",
                description: "Recognized as Ethiopia's best bus service provider",
                features: ["Quality service", "Customer satisfaction", "Industry awards"]
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-indigo-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
              >
                <div className="bg-indigo-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-3">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-indigo-500 mr-3 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Additional Features */}
          <div className="mt-16 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-indigo-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Premium Amenities Included
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: <Wifi className="h-8 w-8 text-indigo-600" />, name: 'Free WiFi' },
                { icon: <Luggage className="h-8 w-8 text-indigo-600" />, name: 'Luggage Space' },
                { icon: <ThumbsUp className="h-8 w-8 text-indigo-600" />, name: 'Friendly Staff' },
                { icon: <Bus className="h-8 w-8 text-indigo-600" />, name: 'Modern Fleet' }
              ].map((amenity, index) => (
                <div key={index} className="text-center group">
                  <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 transform group-hover:scale-110 transition-all duration-300">
                    {amenity.icon}
                  </div>
                  <span className="font-semibold text-gray-800">{amenity.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Routes Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Popular Routes
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover Ethiopia's most traveled routes with competitive prices and comfortable buses
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading popular routes...</p>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <Bus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Routes Available</h3>
                <p className="text-gray-600">Check back later for available routes</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {routes.slice(0, 6).map((route) => {
                const bookingCount = route.bookingCount || route.dailyTrips * 30 || Math.floor(Math.random() * 1000) + 100
                
                return (
                  <div 
                    key={route._id} 
                    className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group border border-indigo-100"
                  >
                    {/* Route Image */}
                    <div 
                      className="h-48 bg-cover bg-center relative overflow-hidden"
                      style={{ backgroundImage: `url(${getRouteImage(route.destination_city)})` }}
                    >
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Popular
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getBusTypeColor(route.bus_type)}`}>
                          {route.bus_type || 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Route Content */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
                            {route.origin_city} → {route.destination_city}
                          </h3>
                          <div className="flex items-center text-gray-600 text-sm mb-2">
                            <Clock className="h-4 w-4 mr-1" />
                            {route.estimated_duration_hours} hours • 
                            <MapPin className="h-4 w-4 ml-2 mr-1" />
                            {route.distance_km} km
                          </div>
                          
                          {/* Rating */}
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              4.5 ({(bookingCount / 10).toFixed(0)} reviews)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-2xl font-bold text-indigo-600">
                            {formatPrice(route.fare_birr || route.base_fare_birr || 0)}
                          </span>
                          <span className="text-sm text-gray-500 block">Starting from</span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-indigo-600 text-sm">
                            <Heart className="h-4 w-4 mr-1" fill="currentColor" />
                            <span>{bookingCount} bookings</span>
                          </div>
                        </div>
                      </div>

                      <Link
                        to={`/search?from=${route.origin_city}&to=${route.destination_city}`}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center group/btn"
                      >
                        View Schedule & Book
                        <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* View All Routes Button */}
          {routes.length > 0 && (
            <div className="text-center mt-12">
              <Link
                to="/routes"
                className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                View All Routes
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Home
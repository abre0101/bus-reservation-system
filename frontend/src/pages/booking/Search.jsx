import { useNavigate } from 'react-router-dom'
import SearchForm from '../../components/booking/SearchForm'
import { ETHIOPIAN_CITIES } from '../../utils/constants'
import '../../styles/bookingBackground.css'

const Search = () => {
  const navigate = useNavigate()

  const popularDestinations = [
    { from: "Addis Ababa", to: "Bahir Dar", description: "Scenic route to Lake Tana", duration: "10-11 hours", price: "450 ETB" },
    { from: "Addis Ababa", to: "Hawassa", description: "Beautiful lakeside city", duration: "4-5 hours", price: "325 ETB" },
    { from: "Addis Ababa", to: "Dire Dawa", description: "Historic railway city", duration: "9-10 hours", price: "520 ETB" },
    { from: "Addis Ababa", to: "Mekele", description: "Gateway to Northern Ethiopia", duration: "12-13 hours", price: "1020 ETB" },
    { from: "Addis Ababa", to: "Gondar", description: "Ancient imperial capital", duration: "11-12 hours", price: "480 ETB" },
    { from: "Addis Ababa", to: "Jimma", description: "Coffee region exploration", duration: "6-7 hours", price: "450 ETB" }
  ]

  const handlePopularRouteClick = (from, to) => {
    navigate(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
  }

  const handleCityClick = (city) => {
    navigate(`/search?from=Addis Ababa&to=${encodeURIComponent(city)}`)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      {/* Elegant Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Hero Header */}
        <div className="text-center mb-12 space-y-6">
          <div className="inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl">
              <span className="text-5xl">🚌</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Discover Ethiopia
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full"></div>
              <span className="text-3xl">🇪🇹</span>
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full"></div>
            </div>
          </div>

          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">
            Book comfortable bus journeys to amazing destinations across the country
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
            <div className="text-center px-4">
              <div className="text-2xl font-bold text-blue-600">50+</div>
              <div className="text-sm text-gray-600">Cities</div>
            </div>
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="text-center px-4">
              <div className="text-2xl font-bold text-indigo-600">100+</div>
              <div className="text-sm text-gray-600">Daily Trips</div>
            </div>
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="text-center px-4">
              <div className="text-2xl font-bold text-purple-600">24/7</div>
              <div className="text-sm text-gray-600">Support</div>
            </div>
          </div>
        </div>

        {/* Main Search Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 mb-12 max-w-6xl mx-auto border border-white/50 hover:shadow-blue-200/50 transition-all duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Find Your Perfect Journey ✨
            </h2>
            <p className="text-gray-600 text-base">
              Search from hundreds of daily departures to cities across Ethiopia
            </p>
          </div>
          <SearchForm />
        </div>

        {/* Popular Destinations */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Popular Destinations 🌟</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our most booked routes with comfortable buses and great service
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularDestinations.map((destination, index) => (
              <button
                key={index}
                onClick={() => handlePopularRouteClick(destination.from, destination.to)}
                className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 hover:border-blue-300 border-2 border-white/50 group text-left hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {destination.from} → {destination.to}
                    </h3>
                    <p className="text-gray-600 mt-1 text-sm">{destination.description}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-all">
                    <span className="text-blue-600 text-lg font-bold">→</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 mt-4 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="font-medium">{destination.duration}</span>
                  </div>
                  <span className="font-bold text-green-600">{destination.price}</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-blue-600 font-semibold flex items-center justify-between">
                    <span>Search Buses</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All Cities Section */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Explore All Destinations 🗺️</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Travel from Addis Ababa to any of these amazing Ethiopian cities
            </p>
          </div>
          
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg p-6 md:p-8 border border-white/50">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {ETHIOPIAN_CITIES.filter(city => city !== "Addis Ababa").map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className="text-gray-700 hover:text-blue-700 hover:bg-blue-50 p-3 rounded-lg transition-all text-left group border-2 border-gray-200 hover:border-blue-300 hover:shadow-md bg-white/80"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{city}</span>
                    <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all text-sm">→</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">From Addis Ababa</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Safe & Secure</h3>
              <p className="text-gray-600 text-sm">Your safety is our priority with certified drivers and modern buses</p>
            </div>
            
            <div className="text-center p-6 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💺</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Comfortable Seats</h3>
              <p className="text-gray-600 text-sm">Enjoy comfortable seating with ample legroom and amenities</p>
            </div>
            
            <div className="text-center p-6 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Easy Booking</h3>
              <p className="text-gray-600 text-sm">Simple and fast booking process with instant confirmation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Search
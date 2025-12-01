import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bus, MapPin, Clock, ArrowRight, 
  Filter, Search, ChevronDown,
  Users, Calendar,
  Shield, X, Loader2
} from 'lucide-react';
import { scheduleService } from '../../services/scheduleService';
import PublicPageLayout from '../../components/common/PublicPageLayout';

const AvailableRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [searchParams, setSearchParams] = useState({
    origin_city: '',
    destination_city: '',
    date: ''
  });
  const [filters, setFilters] = useState({
    busType: 'all',
    priceRange: 'all',
    sortBy: 'price_low'
  });
  const [availableDates, setAvailableDates] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');

  // Fetch available cities and all routes on component mount
  useEffect(() => {
    fetchAvailableCities();
    fetchAllRoutes();
  }, []);

  // Fetch routes when search parameters change
  useEffect(() => {
    if (searchParams.origin_city && searchParams.destination_city) {
      fetchRoutes();
      fetchAvailableDates();
    }
  }, [searchParams.origin_city, searchParams.destination_city, searchParams.date]);

  // Apply filters when routes or filters change
  useEffect(() => {
    applyFilters();
  }, [routes, filters]);

  const fetchAvailableCities = async () => {
    try {
      const response = await scheduleService.getAvailableCities();
      if (response.success) {
        setCities(response.cities || []);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setError('Failed to load cities. Please try again.');
    }
  };

  const fetchAllRoutes = async () => {
    try {
      setInitialLoading(true);
      setError('');
      
      // Get all cities first
      const citiesResponse = await scheduleService.getAvailableCities();
      if (!citiesResponse.success || !citiesResponse.cities || citiesResponse.cities.length === 0) {
        setError('No cities available.');
        setInitialLoading(false);
        return;
      }

      const allCities = citiesResponse.cities;
      let allRoutes = [];

      // Fetch routes for all city combinations
      const cityPairs = [];
      
      // Create all possible city pairs
      for (let i = 0; i < allCities.length; i++) {
        for (let j = 0; j < allCities.length; j++) {
          if (i !== j) {
            cityPairs.push([allCities[i], allCities[j]]);
          }
        }
      }

      console.log(`🔍 Checking ${cityPairs.length} city combinations for routes...`);

      // Fetch routes for each city pair
      for (const [origin, destination] of cityPairs) {
        try {
          const response = await scheduleService.searchSchedules({
            origin_city: origin,
            destination_city: destination,
            include_completed: false,
            include_maintenance: false
          });
          
          if (response.success && response.schedules && response.schedules.length > 0) {
            console.log(`✅ Found ${response.schedules.length} schedules for ${origin} → ${destination}`);
            const transformedRoutes = transformSchedulesToRoutes(response.schedules);
            allRoutes = [...allRoutes, ...transformedRoutes];
          }
        } catch (error) {
          console.error(`Error fetching routes for ${origin} -> ${destination}:`, error);
        }
      }

      // Remove duplicates based on origin-destination pair
      const uniqueRoutes = allRoutes.filter((route, index, self) =>
        index === self.findIndex(r => 
          r.origin_city === route.origin_city && r.destination_city === route.destination_city
        )
      );

      console.log(`📊 Total unique routes found: ${uniqueRoutes.length}`);
      setRoutes(uniqueRoutes);
      
      if (uniqueRoutes.length === 0) {
        setError('No routes available at the moment. Please try again later.');
      }
    } catch (error) {
      console.error('Error fetching all routes:', error);
      setError('Failed to load routes. Please check your connection and try again.');
      setRoutes([]);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        origin_city: searchParams.origin_city,
        destination_city: searchParams.destination_city,
        date: searchParams.date,
        include_completed: false,
        include_maintenance: false
      };

      const response = await scheduleService.searchSchedules(params);
      
      if (response.success) {
        const transformedRoutes = transformSchedulesToRoutes(response.schedules);
        setRoutes(transformedRoutes);
        if (transformedRoutes.length === 0) {
          setError('No routes found for your search criteria.');
        }
      } else {
        setRoutes([]);
        setError('No routes available for the selected cities.');
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to load routes. Please check your connection and try again.');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      const response = await scheduleService.getAvailableDates({
        origin_city: searchParams.origin_city,
        destination_city: searchParams.destination_city
      });
      
      if (response.success) {
        setAvailableDates(response.dates || []);
      }
    } catch (error) {
      console.error('Error fetching dates:', error);
      setAvailableDates([]);
    }
  };

  const transformSchedulesToRoutes = (schedules) => {
    const routeMap = new Map();

    schedules.forEach(schedule => {
      const routeKey = `${schedule.origin_city}-${schedule.destination_city}`;
      
      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, {
          id: schedule.route_id || schedule._id,
          origin_city: schedule.origin_city,
          destination_city: schedule.destination_city,
          distance_km: schedule.distance_km || 0,
          estimated_duration_hours: schedule.estimated_duration_hours || 0,
          base_fare_birr: schedule.fare_birr || 0,
          schedules: [],
          features: schedule.amenities || schedule.bus_amenities || [],
          bus_type: schedule.bus_type || 'standard',
          total_available_seats: 0
        });
      }

      const route = routeMap.get(routeKey);
      route.schedules.push({
        id: schedule._id,
        departure_time: schedule.departure_time,
        departure_date: schedule.departure_date,
        available_seats: schedule.available_seats || 0,
        fare_birr: schedule.fare_birr || 0,
        bus: schedule.bus,
        is_available: schedule.is_available !== false
      });

      // Update lowest price and total seats
      if (schedule.fare_birr && schedule.fare_birr < route.base_fare_birr) {
        route.base_fare_birr = schedule.fare_birr;
      }
      route.total_available_seats += schedule.available_seats || 0;
      
      // Update distance and duration if not set
      if (!route.distance_km && schedule.distance_km) {
        route.distance_km = schedule.distance_km;
      }
      if (!route.estimated_duration_hours && schedule.estimated_duration_hours) {
        route.estimated_duration_hours = schedule.estimated_duration_hours;
      }
    });

    return Array.from(routeMap.values());
  };

  const applyFilters = () => {
    let filtered = [...routes];

    // Apply bus type filter
    if (filters.busType !== 'all') {
      filtered = filtered.filter(route => 
        route.bus_type?.toLowerCase() === filters.busType.toLowerCase()
      );
    }

    // Apply price range filter
    if (filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (max) {
        filtered = filtered.filter(route => route.base_fare_birr >= min && route.base_fare_birr <= max);
      } else {
        filtered = filtered.filter(route => route.base_fare_birr >= min);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_low':
          return a.base_fare_birr - b.base_fare_birr;
        case 'price_high':
          return b.base_fare_birr - a.base_fare_birr;
        case 'duration':
          return a.estimated_duration_hours - b.estimated_duration_hours;
        case 'distance':
          return a.distance_km - b.distance_km;
        case 'seats':
          return b.total_available_seats - a.total_available_seats;
        default:
          return 0;
      }
    });

    setFilteredRoutes(filtered);
  };

  const handleSearch = (field, value) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      busType: 'all',
      priceRange: 'all',
      sortBy: 'price_low'
    });
  };

  const clearSearch = () => {
    setSearchParams({
      origin_city: '',
      destination_city: '',
      date: ''
    });
    fetchAllRoutes();
  };

  const getBusTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'deluxe': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'premium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'standard': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'express': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBusTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deluxe': return '🚌';
      case 'premium': return '⭐';
      case 'express': return '⚡';
      default: return '🚐';
    }
  };

  const getRouteImage = (destinationCity) => {
    const cityImages = {
      'Bahir Dar':'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Hawassa': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Dire Dawa': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Mekele':'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Gonder': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Jimma': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      'Addis Ababa': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
    };
    return cityImages[destinationCity] || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400';
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? `ETB ${price.toLocaleString()}` : `ETB ${parseInt(price) || 0}`;
  };

  const getAvailableSchedulesCount = (route) => {
    return route.schedules?.filter(schedule => schedule.is_available).length || 0;
  };

  const getNextDeparture = (route) => {
    const availableSchedules = route.schedules?.filter(schedule => schedule.is_available) || [];
    if (availableSchedules.length === 0) return null;
    
    return availableSchedules.sort((a, b) => {
      const dateA = new Date(`${a.departure_date} ${a.departure_time}`);
      const dateB = new Date(`${b.departure_date} ${b.departure_time}`);
      return dateA - dateB;
    })[0];
  };

  const getSeatAvailabilityColor = (count) => {
    if (count === 0) return 'text-red-600 bg-red-50';
    if (count < 10) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };


const buildSearchUrl = (route) => {
  const params = new URLSearchParams();
  
  // Add origin and destination - these should pre-fill the search form
  params.append('from', route.origin_city);
  params.append('to', route.destination_city);
  
  // Add date if selected in the current search
  if (searchParams.date) {
    params.append('date', searchParams.date);
  }
  
  // Add passengers count (default to 1)
  params.append('passengers', '1');
  
  // Add source identifier
  params.append('source', 'available-routes');
  
  return `/search?${params.toString()}`;
};



  const isSearching = searchParams.origin_city && searchParams.destination_city;

  return (
    <PublicPageLayout>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                Available Schedules
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {isSearching 
                  ? `Searching: ${searchParams.origin_city} → ${searchParams.destination_city}`
                  : 'Discover all available bus routes across Ethiopia'
                }
              </p>
            </div>
            <div className="flex gap-3">
              {isSearching && (
                <button
                  onClick={clearSearch}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-medium"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Search
                </button>
              )}
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Origin City */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  From City
                </label>
                <select
                  value={searchParams.origin_city}
                  onChange={(e) => handleSearch('origin_city', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                >
                  <option value="">All departure cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Destination City */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  To City
                </label>
                <select
                  value={searchParams.destination_city}
                  onChange={(e) => handleSearch('destination_city', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                >
                  <option value="">All destination cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Travel Date
                </label>
                <select
                  value={searchParams.date}
                  onChange={(e) => handleSearch('date', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                >
                  <option value="">Any date</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  onClick={fetchRoutes}
                  disabled={(!searchParams.origin_city && !searchParams.destination_city) || loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-[1.02] disabled:scale-100"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5 mr-2" />
                  )}
                  {loading ? 'Searching...' : (isSearching ? 'Search Routes' : 'Show All Routes')}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
                <X className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Filters Toggle */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-all duration-200 font-medium"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {(filteredRoutes.length > 0 || routes.length > 0) && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">
                    <span className="font-semibold text-blue-600">
                      {filteredRoutes.length > 0 ? filteredRoutes.length : routes.length}
                    </span> routes found
                  </span>
                  {(filters.busType !== 'all' || filters.priceRange !== 'all') && (
                    <button
                      onClick={clearFilters}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                      Clear filters
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Bus Type Filter */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Bus Type
                    </label>
                    <select
                      value={filters.busType}
                      onChange={(e) => handleFilterChange('busType', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="all">All Bus Types</option>
                      <option value="standard">Standard 🚐</option>
                      <option value="premium">Premium ⭐</option>
                      <option value="deluxe">Deluxe 🚌</option>
                      <option value="express">Express ⚡</option>
                    </select>
                  </div>

                  {/* Price Range Filter */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Price Range
                    </label>
                    <select
                      value={filters.priceRange}
                      onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="all">Any Price</option>
                      <option value="0-300">Under ETB 300</option>
                      <option value="300-500">ETB 300 - 500</option>
                      <option value="500-800">ETB 500 - 800</option>
                      <option value="800-1200">ETB 800 - 1,200</option>
                      <option value="1200-9999">Over ETB 1,200</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="duration">Shortest Duration</option>
                      <option value="distance">Shortest Distance</option>
                      <option value="seats">Most Seats Available</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {initialLoading ? (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 text-lg font-medium">Loading all available routes...</p>
              <p className="text-gray-500 text-sm mt-2">Discovering bus routes across Ethiopia</p>
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 text-lg font-medium">Searching for routes...</p>
              <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
            </div>
          </div>
        ) : (filteredRoutes.length === 0 && routes.length === 0) && !error ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-gray-200/60">
            <div className="max-w-md mx-auto">
              <Bus className="h-20 w-20 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Routes Available
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {isSearching 
                  ? 'No routes found for your search criteria. Try different cities or dates.'
                  : 'No bus routes are currently available. Please check back later.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {isSearching && (
                  <button
                    onClick={clearSearch}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    Show All Schedules
                  </button>
                )}
                <Link
                  to="/"
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Results Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {isSearching 
                  ? `Routes from ${searchParams.origin_city} to ${searchParams.destination_city}`
                  : 'All Available Schedules'
                }
              </h2>
              <p className="text-gray-600 mt-2">
                {filteredRoutes.length > 0 ? filteredRoutes.length : routes.length} routes found
                {isSearching && searchParams.date && ` for ${searchParams.date}`}
              </p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
              {(filteredRoutes.length > 0 ? filteredRoutes : routes).map((route) => {
                const availableSchedulesCount = getAvailableSchedulesCount(route);
                const nextDeparture = getNextDeparture(route);

                return (
                  <div 
                    key={`${route.id}-${route.origin_city}-${route.destination_city}`} 
                    className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/60 overflow-hidden"
                  >
                    {/* Route Image */}
                    <div 
                      className="h-52 bg-cover bg-center relative overflow-hidden"
                      style={{ backgroundImage: `url(${getRouteImage(route.destination_city)})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/50 transition-all duration-300"></div>
                      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${getBusTypeColor(route.bus_type)}`}>
                            {getBusTypeIcon(route.bus_type)} {route.bus_type || 'Standard'}
                          </span>
                        </div>
                        <span className="px-3 py-1.5 bg-green-500/90 text-white rounded-full text-xs font-semibold backdrop-blur-sm shadow-lg">
                          {availableSchedulesCount} Trips
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm font-medium">{route.origin_city}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            <span className="text-lg font-bold">{route.destination_city}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Route Content */}
                    <div className="p-6">
                      <div className="mb-5">
                        {/* Route Info Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <div className="bg-blue-50 p-2 rounded-lg">
                              <Clock className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Duration</div>
                              <div className="text-sm font-semibold">{route.estimated_duration_hours || 'N/A'} hrs</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <div className="bg-purple-50 p-2 rounded-lg">
                              <MapPin className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Distance</div>
                              <div className="text-sm font-semibold">{route.distance_km?.toLocaleString() || 'N/A'} km</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Next Departure */}
                        {nextDeparture && (
                          <div className="flex items-center justify-between text-sm mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="text-gray-700 font-medium">Next Departure</span>
                            </div>
                            <div className="text-right">
                              <div className="text-blue-700 font-bold">{nextDeparture.departure_time}</div>
                              <div className="text-xs text-gray-600">{new Date(nextDeparture.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            </div>
                          </div>
                        )}

                        {/* Features */}
                        {route.features && route.features.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {route.features.slice(0, 4).map((feature, index) => (
                              <span key={index} className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs rounded-lg font-medium border border-blue-100">
                                {feature}
                              </span>
                            ))}
                            {route.features.length > 4 && (
                              <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium">
                                +{route.features.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Price and Seats */}
                      <div className="flex items-end justify-between mb-4 pb-4 border-b border-gray-100">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Starting from</div>
                          <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                            {formatPrice(route.base_fare_birr)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${getSeatAvailabilityColor(route.total_available_seats)} border-2`}>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{route.total_available_seats} seats</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    
<Link
  to={buildSearchUrl(route)}
  className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center group/btn shadow-lg hover:shadow-xl"
>
  View Schedules & Book
  <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
</Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Features Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-gray-200/60">
              <h3 className="text-3xl font-bold text-center text-gray-900 mb-12 bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                Why Travel With EthioBus?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    icon: <Shield className="h-8 w-8 text-blue-600" />,
                    title: 'Safe & Secure',
                    description: 'Your safety is our top priority with modern buses and professional drivers'
                  },
                  {
                    icon: <Clock className="h-8 w-8 text-blue-600" />,
                    title: 'On-Time Guarantee',
                    description: '98% on-time departure record with real-time tracking'
                  },
                  {
                    icon: <Users className="h-8 w-8 text-blue-600" />,
                    title: '24/7 Support',
                    description: 'Round-the-clock customer support for all your travel needs'
                  }
                ].map((feature, index) => (
                  <div key={index} className="text-center group hover:transform hover:scale-105 transition-all duration-200">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-all duration-200">
                      {feature.icon}
                    </div>
                    <h4 className="font-bold text-gray-900 mb-3 text-lg">{feature.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PublicPageLayout>
  );
};

export default AvailableRoutes;
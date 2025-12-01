import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MapPin, Bus, Navigation, Clock, Users, RefreshCw, 
  AlertCircle, CheckCircle, Phone, Activity, TrendingUp, MapPinned
} from 'lucide-react';
import { toast } from 'react-toastify';

const BusTracking = () => {
  const [activeBuses, setActiveBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBus, setSelectedBus] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    delayed: 0
  });
  const refreshInterval = useRef(null);

  useEffect(() => {
    fetchBuses();
    
    if (autoRefresh) {
      refreshInterval.current = setInterval(fetchBuses, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [autoRefresh, filterStatus]);

  const getAuthToken = () => {
    return sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('operatorToken');
  };

  const fetchBuses = async () => {
    try {
      const token = getAuthToken();
      
      // Use the real-time tracking endpoint that includes driver check-ins
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/tracking/active-buses`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const buses = response.data.active_buses || [];
      
      // Debug: Log first bus to see data structure
      if (buses.length > 0) {
        console.log('📊 Sample bus data:', buses[0]);
      }
      
      // Calculate stats from ALL buses (not filtered)
      const statsData = {
        total: buses.length,
        active: buses.filter(b => b.journey_status === 'in_progress').length,
        completed: buses.filter(b => b.journey_status === 'completed').length,
        delayed: buses.filter(b => b.is_delayed).length
      };
      setStats(statsData);
      
      // Filter based on status for display
      let filtered = buses;
      if (filterStatus !== 'all') {
        if (filterStatus === 'active') {
          filtered = buses.filter(b => b.journey_status === 'in_progress');
        } else if (filterStatus === 'completed') {
          filtered = buses.filter(b => b.journey_status === 'completed');
        } else if (filterStatus === 'scheduled') {
          filtered = buses.filter(b => b.journey_status === 'not_started');
        } else if (filterStatus === 'delayed') {
          filtered = buses.filter(b => b.is_delayed);
        }
      }
      
      setActiveBuses(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching buses:', error);
      toast.error('Failed to fetch bus tracking data');
      setLoading(false);
    }
  };

  const getBusStatus = (bus) => {
    // Use journey_status from tracking data
    if (bus.journey_status === 'completed') {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' };
    }
    
    if (bus.status === 'cancelled') {
      return { status: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' };
    }
    
    if (bus.is_delayed) {
      return { status: 'delayed', label: 'Delayed', color: 'bg-orange-100 text-orange-800' };
    }
    
    if (bus.journey_status === 'in_progress') {
      return { status: 'active', label: 'On Route', color: 'bg-green-100 text-green-800' };
    }
    
    if (bus.journey_status === 'not_started') {
      const now = new Date();
      const depDate = bus.departure_date || new Date().toISOString().split('T')[0];
      const depTime = bus.departure_time || '00:00';
      const departureTime = new Date(`${depDate} ${depTime}`);
      
      const minutesUntilDeparture = Math.floor((departureTime - now) / (1000 * 60));
      if (minutesUntilDeparture <= 30 && minutesUntilDeparture >= 0) {
        return { status: 'boarding', label: 'Boarding', color: 'bg-yellow-100 text-yellow-800' };
      }
      return { status: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
    }
    
    return { status: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
  };

  const getProgressPercentage = (bus) => {
    // Use real tracking data from driver check-ins
    if (bus.progress_percentage !== undefined) {
      return bus.progress_percentage;
    }
    
    // Fallback to time-based calculation
    const now = new Date();
    const depDate = bus.departure_date || new Date().toISOString().split('T')[0];
    const depTime = bus.departure_time || '00:00';
    const arrTime = bus.arrival_time;
    
    const departureTime = new Date(`${depDate} ${depTime}`);
    const arrivalTime = arrTime ? new Date(`${depDate} ${arrTime}`) : null;
    
    if (!arrivalTime || now < departureTime) return 0;
    if (now > arrivalTime) return 100;
    
    const totalDuration = arrivalTime - departureTime;
    const elapsed = now - departureTime;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  const getTimeRemaining = (bus) => {
    const now = new Date();
    const depDate = bus.departure_date || new Date().toISOString().split('T')[0];
    const arrTime = bus.arrival_time;
    const arrivalTime = arrTime ? new Date(`${depDate} ${arrTime}`) : null;
    
    if (!arrivalTime) return 'N/A';
    
    const diff = arrivalTime - now;
    if (diff <= 0) return 'Arrived';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const filteredBuses = activeBuses.filter(bus => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      bus.bus_number?.toLowerCase().includes(query) ||
      bus.plate_number?.toLowerCase().includes(query) ||
      bus.origin_city?.toLowerCase().includes(query) ||
      bus.destination_city?.toLowerCase().includes(query) ||
      bus.driver_name?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bus Tracking</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of all active buses</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold ${
              autoRefresh 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={fetchBuses}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Total Buses</p>
              <p className="text-4xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-xl p-3">
              <Bus className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wide">On Route</p>
              <p className="text-4xl font-bold mt-2">{stats.active}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-xl p-3">
              <Activity className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm font-medium uppercase tracking-wide">Completed</p>
              <p className="text-4xl font-bold mt-2">{stats.completed}</p>
            </div>
            <div className="bg-gray-400 bg-opacity-30 rounded-xl p-3">
              <CheckCircle className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium uppercase tracking-wide">Delayed</p>
              <p className="text-4xl font-bold mt-2">{stats.delayed}</p>
            </div>
            <div className="bg-orange-400 bg-opacity-30 rounded-xl p-3">
              <AlertCircle className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900">Search & Filter</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bus number, plate, route, or driver..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-semibold"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bus List */}
      {filteredBuses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-200">
          <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <Bus className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Buses Found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery ? 'Try adjusting your search criteria' : 'There are no buses matching the selected filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBuses.map((bus) => {
            const busStatus = getBusStatus(bus);
            const progress = getProgressPercentage(bus);
            const timeRemaining = getTimeRemaining(bus);
            const occupancyRate = Math.round(((bus.booked_seats || 0) / (bus.total_seats || 45)) * 100);

            return (
              <div 
                key={bus._id || bus.schedule_id} 
                className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1"
                onClick={() => setSelectedBus(bus)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Bus className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">
                          {bus.bus_number || 'N/A'}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">{bus.plate_number || 'N/A'}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm ${busStatus.color}`}>
                      {busStatus.label}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-500 rounded-lg p-1.5">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {bus.origin_city || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-7">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 to-green-500"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500 rounded-lg p-1.5">
                        <MapPinned className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {bus.destination_city || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Current Location - Real Tracking */}
                  {(bus.current_location || bus.journey_status === 'completed') && (
                    <div className={`mb-4 p-3 rounded-lg border ${
                      bus.journey_status === 'completed' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className={`w-4 h-4 ${
                          bus.journey_status === 'completed' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                        <span className={`text-xs font-medium ${
                          bus.journey_status === 'completed' ? 'text-green-900' : 'text-blue-900'
                        }`}>
                          {bus.journey_status === 'completed' ? 'Final Location' : 'Current Location'}
                        </span>
                      </div>
                      <p className={`text-sm font-semibold ml-6 ${
                        bus.journey_status === 'completed' ? 'text-green-900' : 'text-blue-900'
                      }`}>
                        {bus.journey_status === 'completed' 
                          ? bus.destination_city 
                          : (bus.current_location || bus.destination_city)
                        }
                      </p>
                      {bus.journey_status !== 'completed' && bus.minutes_since_checkin !== null && (
                        <p className="text-xs text-blue-600 ml-6 mt-1">
                          {bus.minutes_since_checkin < 1 ? 'Just now' : `${bus.minutes_since_checkin} min ago`}
                        </p>
                      )}
                      {bus.journey_status === 'completed' && (
                        <p className="text-xs text-green-600 ml-6 mt-1">
                          Journey completed
                        </p>
                      )}
                    </div>
                  )}

                  {/* Progress Bar - Based on Stop Check-ins */}
                  {busStatus.status === 'active' && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-2">
                        <span>Journey Progress</span>
                        <span>{Math.round(progress)}% ({bus.checked_stops_count || 0}/{bus.total_stops || 0} stops)</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-blue-500 via-indigo-500 to-green-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="bg-indigo-100 rounded-lg p-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Departure</p>
                        <p className="text-sm font-bold text-gray-900">
                          {bus.departure_time || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="bg-purple-100 rounded-lg p-2">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Passengers</p>
                        <p className="text-sm font-bold text-gray-900">
                          {bus.booked_seats || 0}/{bus.total_seats || 45}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl col-span-2">
                      <div className="bg-green-100 rounded-lg p-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500 font-medium">Occupancy Rate</p>
                          <p className="text-sm font-bold text-gray-900">{occupancyRate}%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              occupancyRate >= 90 ? 'bg-red-500' :
                              occupancyRate >= 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${occupancyRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Driver Info */}
                  {bus.driver_name && (
                    <div className="pt-4 border-t-2 border-gray-100">
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-500 rounded-lg p-2">
                            <Navigation className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Driver</p>
                            <p className="text-sm font-bold text-gray-900">{bus.driver_name}</p>
                          </div>
                        </div>
                        {bus.driver_phone && (
                          <a 
                            href={`tel:${bus.driver_phone}`}
                            className="p-3 bg-white hover:bg-indigo-100 rounded-xl transition-colors shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-5 h-5 text-indigo-600" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bus Details Modal */}
      {selectedBus && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Bus className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Bus Details</h2>
                    <p className="text-sm text-gray-500">Complete information</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBus(null)}
                  className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <span className="text-3xl text-gray-400 hover:text-gray-600">&times;</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Bus Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wide">Bus Number</p>
                    <p className="font-bold text-xl text-gray-900">
                      {selectedBus.bus_number || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <p className="text-xs text-purple-600 font-semibold mb-1 uppercase tracking-wide">Plate Number</p>
                    <p className="font-bold text-xl text-gray-900">
                      {selectedBus.plate_number || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-2 uppercase tracking-wide">Status</p>
                    <span className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm ${getBusStatus(selectedBus).color}`}>
                      {getBusStatus(selectedBus).label}
                    </span>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border border-orange-200">
                    <p className="text-xs text-orange-600 font-semibold mb-1 uppercase tracking-wide">Travel Date</p>
                    <p className="font-bold text-lg text-gray-900">
                      {(() => {
                        const date = selectedBus.departure_date;
                        if (!date) return 'N/A';
                        try {
                          return new Date(date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        } catch {
                          return date;
                        }
                      })()}
                    </p>
                  </div>
                </div>

                {/* Route Details */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-inner">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    Route Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                      <div className="bg-blue-500 rounded-lg p-2">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Origin</p>
                        <p className="text-sm font-bold text-gray-900">{selectedBus.origin_city || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                      <div className="bg-green-500 rounded-lg p-2">
                        <MapPinned className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Destination</p>
                        <p className="text-sm font-bold text-gray-900">{selectedBus.destination_city || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                        <div className="bg-indigo-500 rounded-lg p-2">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Departure</p>
                          <p className="text-sm font-bold text-gray-900">{selectedBus.departure_time || 'N/A'}</p>
                        </div>
                      </div>
                      {selectedBus.arrival_time && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                          <div className="bg-purple-500 rounded-lg p-2">
                            <Clock className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Arrival</p>
                            <p className="text-sm font-bold text-gray-900">{selectedBus.arrival_time}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Passenger Info */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-inner">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Passenger Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl text-center">
                      <p className="text-sm text-gray-600 font-medium mb-2">Booked Seats</p>
                      <p className="text-4xl font-bold text-blue-600">{selectedBus.booked_seats || 0}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl text-center">
                      <p className="text-sm text-gray-600 font-medium mb-2">Available Seats</p>
                      <p className="text-4xl font-bold text-green-600">
                        {(selectedBus.total_seats || 45) - (selectedBus.booked_seats || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Driver Info */}
                {selectedBus.driver_name && (
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-inner">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-green-600" />
                      Driver Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                        <div className="bg-green-500 rounded-lg p-2">
                          <Navigation className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Name</p>
                          <p className="text-sm font-bold text-gray-900">{selectedBus.driver_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                        <div className="bg-blue-500 rounded-lg p-2">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Phone</p>
                          <p className="text-sm font-bold text-gray-900">{selectedBus.driver_phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedBus(null)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  Close
                </button>
                {selectedBus.driver_phone && (
                  <a
                    href={`tel:${selectedBus.driver_phone}`}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl text-center font-semibold flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    Call Driver
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusTracking;

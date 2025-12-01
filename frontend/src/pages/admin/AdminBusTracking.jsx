import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MapPin, Bus, Navigation, Clock, Users, RefreshCw, 
  AlertCircle, CheckCircle, Phone, Activity, TrendingUp, MapPinned
} from 'lucide-react';
import { toast } from 'react-toastify';

const AdminBusTracking = () => {
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
    return sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('adminToken');
  };

  const fetchBuses = async () => {
    try {
      console.log('🔄 Fetching bus tracking data...');
      const token = getAuthToken();
      
      if (!token) {
        console.error('❌ No auth token found');
        toast.error('Authentication required');
        setLoading(false);
        return;
      }
      
      // Try to get active buses first, if empty, fall back to all schedules
      let response;
      let buses = [];
      
      try {
        response = await axios.get(
          `${import.meta.env.VITE_API_URL}/tracking/active-buses`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        buses = response.data.active_buses || [];
        console.log('✅ Active buses API response:', response.data);
      } catch (err) {
        console.warn('⚠️ Active buses endpoint failed, trying schedules:', err.message);
      }
      
      // If no active buses, fetch all schedules
      if (buses.length === 0) {
        console.log('📅 No active buses, fetching all schedules...');
        response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/schedules`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        buses = response.data.schedules || response.data || [];
        console.log('✅ Schedules API response:', buses.length, 'schedules found');
      }
      console.log(`📊 Found ${buses.length} buses`);
      
      // Debug: Log first bus to see data structure
      if (buses.length > 0) {
        console.log('📊 Sample bus data:', buses[0]);
      } else {
        console.warn('⚠️ No buses found in response');
      }
      
      // Calculate stats from ALL buses (not filtered)
      const statsData = {
        total: buses.length,
        active: buses.filter(b => b.journey_status === 'in_progress' || b.status === 'active' || b.status === 'in_progress').length,
        completed: buses.filter(b => b.journey_status === 'completed' || b.status === 'completed').length,
        delayed: buses.filter(b => b.is_delayed || b.delayed).length
      };
      console.log('📈 Stats calculated:', statsData);
      setStats(statsData);
      
      // Filter based on status for display
      let filtered = buses;
      if (filterStatus !== 'all') {
        if (filterStatus === 'active') {
          filtered = buses.filter(b => b.journey_status === 'in_progress' || b.status === 'active' || b.status === 'in_progress');
        } else if (filterStatus === 'completed') {
          filtered = buses.filter(b => b.journey_status === 'completed' || b.status === 'completed');
        } else if (filterStatus === 'scheduled') {
          filtered = buses.filter(b => b.journey_status === 'not_started' || b.status === 'scheduled');
        } else if (filterStatus === 'delayed') {
          filtered = buses.filter(b => b.is_delayed || b.delayed);
        }
      }
      
      console.log(`✅ Filtered to ${filtered.length} buses for display`);
      setActiveBuses(filtered);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching buses:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      toast.error('Failed to fetch bus tracking data: ' + (error.response?.data?.error || error.message));
      setActiveBuses([]);
      setStats({ total: 0, active: 0, completed: 0, delayed: 0 });
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
      bus.driver_name?.toLowerCase().includes(query) ||
      bus.operator_name?.toLowerCase().includes(query)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bus Tracking</h1>
            <p className="text-indigo-100 mt-1">Real-time monitoring of all buses across operators</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-5 py-3 rounded-xl transition-all flex items-center gap-2 font-semibold shadow-md ${
                autoRefresh 
                  ? 'bg-white bg-opacity-20 text-white hover:bg-opacity-30' 
                  : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={fetchBuses}
              className="px-5 py-3 bg-white text-indigo-600 rounded-xl hover:shadow-xl transition-all flex items-center gap-2 font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Buses</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by bus number, plate, route, driver, or operator..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="md:w-64">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status Filter</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bus className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Buses Found</h3>
          <p className="text-gray-600">
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
                className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all cursor-pointer overflow-hidden transform hover:scale-105"
                onClick={() => setSelectedBus(bus)}
              >
                {/* Status Header Bar */}
                <div className={`h-2 ${
                  busStatus.status === 'active' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  busStatus.status === 'delayed' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                  busStatus.status === 'completed' ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                  'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}></div>

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
                        busStatus.status === 'active' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                        busStatus.status === 'delayed' ? 'bg-gradient-to-br from-orange-400 to-orange-500' :
                        busStatus.status === 'completed' ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                        'bg-gradient-to-br from-blue-400 to-blue-500'
                      }`}>
                        <Bus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {bus.bus_number || 'N/A'}
                        </h3>
                        <p className="text-xs text-gray-500">{bus.plate_number || 'N/A'}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${busStatus.color}`}>
                      {busStatus.label}
                    </span>
                  </div>

                  {/* Route - Compact */}
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-900">
                          {bus.origin_city || 'N/A'}
                        </span>
                      </div>
                      <div className="text-gray-400 font-bold">→</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {bus.destination_city || 'N/A'}
                        </span>
                        <MapPinned className="w-4 h-4 text-green-600 flex-shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Current Location */}
                  {(bus.current_location || bus.journey_status === 'completed') && (
                    <div className={`mb-4 p-3 rounded-lg border ${
                      bus.journey_status === 'completed' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className={`w-4 h-4 ${
                            bus.journey_status === 'completed' ? 'text-green-600' : 'text-blue-600'
                          }`} />
                          <div>
                            <p className={`text-xs font-medium ${
                              bus.journey_status === 'completed' ? 'text-green-700' : 'text-blue-700'
                            }`}>
                              {bus.journey_status === 'completed' ? 'Arrived' : 'Current Location'}
                            </p>
                            <p className={`text-sm font-bold ${
                              bus.journey_status === 'completed' ? 'text-green-900' : 'text-blue-900'
                            }`}>
                              {bus.journey_status === 'completed' 
                                ? bus.destination_city 
                                : (bus.current_location || 'Not started')
                              }
                            </p>
                          </div>
                        </div>
                        {bus.journey_status !== 'completed' && bus.minutes_since_checkin !== null && (
                          <span className="text-xs text-blue-600 font-medium">
                            {bus.minutes_since_checkin < 1 ? 'Now' : `${bus.minutes_since_checkin}m ago`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {busStatus.status === 'active' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span className="font-medium">Progress</span>
                        <span className="font-semibold">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <p className="text-xs text-gray-600 font-medium">Departure</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 ml-5">
                        {bus.departure_time || 'N/A'}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        <p className="text-xs text-gray-600 font-medium">Passengers</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 ml-5">
                        {bus.booked_seats || 0}/{bus.total_seats || 52}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                          <p className="text-xs text-gray-600 font-medium">Occupancy</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{occupancyRate}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            occupancyRate >= 90 ? 'bg-red-500' :
                            occupancyRate >= 70 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${occupancyRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Driver Info */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Navigation className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Driver</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {bus.driver_name || bus.driverName || (bus.driver_id ? 'Assigned' : 'Not assigned')}
                          </p>
                        </div>
                      </div>
                      {(bus.driver_phone || bus.driverPhone) && (
                        <a 
                          href={`tel:${bus.driver_phone || bus.driverPhone}`}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-4 h-4 text-blue-600" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bus Details Modal */}
      {selectedBus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Bus Details</h2>
                <button
                  onClick={() => setSelectedBus(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-gray-500 hover:text-gray-700">&times;</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Bus Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bus Number</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBus.bus_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Plate Number</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBus.plate_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBusStatus(selectedBus).color}`}>
                      {getBusStatus(selectedBus).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                    <p className="font-semibold text-gray-900">
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

                {/* Operator Info - Admin Only */}
                {selectedBus.operator_name && (
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Bus className="w-4 h-4 text-purple-600" />
                      Operator Information
                    </h3>
                    <p className="text-sm">
                      <strong>{selectedBus.operator_name}</strong>
                    </p>
                  </div>
                )}

                {/* Route Details */}
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Route Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Origin: <strong>
                        {selectedBus.origin_city || 'N/A'}
                      </strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinned className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Destination: <strong>
                        {selectedBus.destination_city || 'N/A'}
                      </strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">Departure: <strong>
                        {selectedBus.departure_time || 'N/A'}
                      </strong></span>
                    </div>
                    {selectedBus.arrival_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">Arrival: <strong>
                          {selectedBus.arrival_time}
                        </strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Passenger Info */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Passenger Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Booked Seats</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedBus.booked_seats || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Available Seats</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(selectedBus.total_seats || 45) - (selectedBus.booked_seats || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Driver Info */}
                {(selectedBus.driver_name || selectedBus.driverName || selectedBus.driver_id) && (
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-green-600" />
                      Driver Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">Name: <strong>{selectedBus.driver_name || selectedBus.driverName || 'Assigned'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">Phone: <strong>{selectedBus.driver_phone || selectedBus.driverPhone || 'N/A'}</strong></span>
                      </div>
                      {selectedBus.driver_id && !selectedBus.driver_name && (
                        <p className="text-xs text-gray-500 mt-2">Driver ID: {selectedBus.driver_id}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedBus(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                >
                  Close
                </button>
                {selectedBus.driver_phone && (
                  <a
                    href={`tel:${selectedBus.driver_phone}`}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-center font-medium shadow-md hover:shadow-lg"
                  >
                    📞 Call Driver
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

export default AdminBusTracking;

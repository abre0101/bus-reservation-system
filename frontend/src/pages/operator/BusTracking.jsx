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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bus Tracking</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of all buses</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
              autoRefresh 
                ? 'bg-green-50 border-green-300 text-green-700' 
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-Refresh
          </button>
          <button
            onClick={fetchBuses}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Total Buses</p>
            <Bus className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">On Route</p>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Completed</p>
            <CheckCircle className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Delayed</p>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.delayed}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bus number, plate, route, or driver..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Bus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Buses Found</h3>
          <p className="text-gray-500">
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
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedBus(bus)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Bus className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {bus.bus_number || 'N/A'}
                        </h3>
                        <p className="text-xs text-gray-500">{bus.plate_number || 'N/A'}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${busStatus.color}`}>
                      {busStatus.label}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {bus.origin_city || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      <div className="w-px h-4 bg-gray-300"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinned className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">
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
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Journey Progress</span>
                        <span>{Math.round(progress)}% ({bus.checked_stops_count || 0}/{bus.total_stops || 0} stops)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Departure</p>
                        <p className="text-sm font-medium text-gray-900">
                          {bus.departure_time || 'N/A'}
                        </p>
                      </div>
                    </div>

                   

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Passengers</p>
                        <p className="text-sm font-medium text-gray-900">
                          {bus.booked_seats || 0}/{bus.total_seats || 45}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Occupancy</p>
                        <p className="text-sm font-medium text-gray-900">{occupancyRate}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Driver Info */}
                  {bus.driver_name && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Driver: <span className="font-medium text-gray-900">{bus.driver_name}</span>
                          </span>
                        </div>
                        {bus.driver_phone && (
                          <a 
                            href={`tel:${bus.driver_phone}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-4 h-4 text-blue-600" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Occupancy Bar */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
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
            );
          })}
        </div>
      )}

      {/* Bus Details Modal */}
      {selectedBus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Bus Details</h2>
                <button
                  onClick={() => setSelectedBus(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl">&times;</span>
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

                {/* Route Details */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Route Information</h3>
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
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Passenger Information</h3>
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
                {selectedBus.driver_name && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Driver Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">Name: <strong>{selectedBus.driver_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">Phone: <strong>{selectedBus.driver_phone || 'N/A'}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedBus(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                {selectedBus.driver_phone && (
                  <a
                    href={`tel:${selectedBus.driver_phone}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
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

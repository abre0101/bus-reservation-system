import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Filter,
  RefreshCw,
  Eye,
  TrendingUp,
  AlertCircle,
  Bus
} from 'lucide-react';
import ticketerService from '../../services/ticketerService';
import { toast } from 'react-toastify';

const ScheduleBrowser = () => {
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: '', // Don't filter by date initially - show all upcoming schedules
    status: 'all',
    route: 'all'
  });
  const [routes, setRoutes] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  useEffect(() => {
    fetchSchedules();
    fetchRoutes();
  }, [filters.date]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching schedules with filters:', filters);
      const response = await ticketerService.getSchedules({
        date: filters.date,
        status: filters.status === 'all' ? undefined : filters.status
      });
      console.log('📅 Schedules response:', response);
      
      if (response?.success && Array.isArray(response?.schedules)) {
        console.log(`✅ Loaded ${response.schedules.length} schedules`);
        if (response.schedules.length > 0) {
          console.log('📊 Sample schedule:', response.schedules[0]);
        }
        setSchedules(response.schedules);
        setFilteredSchedules(response.schedules);
      } else {
        console.error('Invalid response format:', response);
        toast.error('Failed to load schedules');
        setSchedules([]);
        setFilteredSchedules([]);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      toast.error(error.message || 'Failed to load schedules');
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await ticketerService.getRoutes();
      if (response?.success && Array.isArray(response?.routes)) {
        setRoutes(response.routes);
      } else {
        console.error('Invalid routes response:', response);
        setRoutes([]);
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      toast.error(error.message || 'Failed to load routes');
      setRoutes([]);
    }
  };

  const applyFilters = () => {
    let filtered = [...schedules];

    if (filters.status !== 'all') {
      filtered = filtered.filter(schedule => schedule.status === filters.status);
    }

    if (filters.route !== 'all') {
      filtered = filtered.filter(schedule => {
        // Check multiple possible route identifiers
        return schedule.route_id === filters.route || 
               schedule.route_id?.toString() === filters.route ||
               schedule._id === filters.route ||
               schedule.route_name === filters.route
      });
    }

    console.log(`🔍 Filtered ${filtered.length} schedules from ${schedules.length} total`);
    setFilteredSchedules(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters.status, filters.route, schedules]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      departed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || colors.scheduled;
  };

  const getOccupancyPercentage = (schedule) => {
    const totalSeats = schedule.total_seats || schedule.bus?.capacity || 45;
    const bookedSeats = schedule.booked_seats || 0;
    return Math.round((bookedSeats / totalSeats) * 100);
  };

  const getOccupancyColor = (percentage) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleViewDetails = (schedule) => {
    setSelectedSchedule(schedule);
  };

  const handleCloseDetails = () => {
    setSelectedSchedule(null);
  };

  const handleRefresh = () => {
    fetchSchedules();
    toast.info('Schedules refreshed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Browser</h1>
          <p className="text-gray-600 mt-1">View bus schedules and seat availability (Read-only)</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="departed">Departed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Route</label>
            <select
              value={filters.route}
              onChange={(e) => handleFilterChange('route', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Routes</option>
              {routes.map(route => (
                <option key={route._id} value={route._id}>
                  {route.origin_city} → {route.destination_city}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing {filteredSchedules.length} of {schedules.length} schedules
            </div>
          </div>
        </div>
      </div>

      {/* Schedules Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSchedules.map((schedule) => (
            <div key={schedule._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bus className="h-6 w-6 text-white" />
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {schedule.origin_city} → {schedule.destination_city}
                      </h3>
                      <p className="text-blue-100 text-sm">{schedule.bus_number}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                    {schedule.status}
                  </span>
                </div>
              </div>

              {/* Schedule Details */}
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Departure</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{schedule.departure_time}</p>
                      <p className="text-sm text-gray-600">{schedule.departure_date}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Route</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {schedule.origin_city} → {schedule.destination_city}
                      </p>
                      {schedule.distance_km && (
                        <p className="text-sm text-gray-600">{schedule.distance_km} km</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Occupancy</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getOccupancyColor(getOccupancyPercentage(schedule))}`}
                            style={{ width: `${getOccupancyPercentage(schedule)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {getOccupancyPercentage(schedule)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {schedule.booked_seats} / {schedule.total_seats} seats
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Fare</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">ETB {schedule.fare_birr}</p>
                      <p className="text-sm text-gray-600">per seat</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => handleViewDetails(schedule)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredSchedules.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedules Found</h3>
          <p className="text-gray-600 mb-4">
            {schedules.length === 0 
              ? 'No schedules available in the system. Operators need to create schedules first.'
              : 'Try adjusting your filters or select a different date.'}
          </p>
          {schedules.length === 0 && (
            <p className="text-sm text-gray-500">
              Total schedules in database: {schedules.length}
            </p>
          )}
        </div>
      )}

      {/* Schedule Details Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Schedule Details</h2>
                <button
                  onClick={handleCloseDetails}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <AlertCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Journey Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route:</span>
                      <span className="font-medium">
                        {selectedSchedule.origin_city} → {selectedSchedule.destination_city}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{selectedSchedule.departure_date || selectedSchedule.departure_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{selectedSchedule.departure_time}</span>
                    </div>
                    {selectedSchedule.duration && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{selectedSchedule.duration}</span>
                      </div>
                    )}
                    {(selectedSchedule.distance_km || selectedSchedule.distanceKm) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Distance:</span>
                        <span className="font-medium">{selectedSchedule.distance_km || selectedSchedule.distanceKm} km</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bus Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Bus Information</h3>
                  <div className="space-y-3">
                    {(selectedSchedule.bus_name || selectedSchedule.bus?.name) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bus Name:</span>
                        <span className="font-medium">{selectedSchedule.bus_name || selectedSchedule.bus?.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bus Number:</span>
                      <span className="font-medium">{selectedSchedule.bus_number || selectedSchedule.bus?.number || selectedSchedule.plate_number || 'Not Assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{selectedSchedule.bus_type || selectedSchedule.bus?.type || 'standard'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium">{selectedSchedule.total_seats || selectedSchedule.bus?.capacity || 45} seats</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedSchedule.status)}`}>
                        {selectedSchedule.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Occupancy Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Occupancy</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Seats:</span>
                      <span className="font-medium">{selectedSchedule.total_seats || selectedSchedule.bus?.capacity || 45}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booked Seats:</span>
                      <span className="font-medium">
                        {selectedSchedule.booked_seats || selectedSchedule.occupiedSeats?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available Seats:</span>
                      <span className="font-medium text-green-600">
                        {selectedSchedule.available_seats || ((selectedSchedule.total_seats || selectedSchedule.bus?.capacity || 45) - (selectedSchedule.booked_seats || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Occupancy Rate:</span>
                      <span className="font-medium">{getOccupancyPercentage(selectedSchedule)}%</span>
                    </div>
                  </div>
                </div>

                {/* Fare Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Fare Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Fare:</span>
                      <span className="font-medium">ETB {selectedSchedule.fare_birr || selectedSchedule.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Revenue:</span>
                      <span className="font-bold text-green-600">
                        ETB {(selectedSchedule.fare_birr || selectedSchedule.price) * (selectedSchedule.booked_seats || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleCloseDetails}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleBrowser;
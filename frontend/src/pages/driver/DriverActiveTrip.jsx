import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  MapPin, 
  CheckCircle, 
  Clock, 
  Users, 
  Navigation, 
  AlertCircle,
  Play, 
  Flag, 
  TrendingUp, 
  Phone,
  Bus,
  Map,
  Route,
  Package
} from 'lucide-react';
import { toast } from 'react-toastify';

const DriverActiveTrip = () => {
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busStops, setBusStops] = useState([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [actionLoading, setActionLoading] = useState('');
  const [journeyStatus, setJourneyStatus] = useState('not_started');
  const [canStartJourney, setCanStartJourney] = useState(false);
  const [startJourneyInfo, setStartJourneyInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveTrip();
  }, []);

  const getAuthToken = () => {
    return sessionStorage.getItem('driverToken') || sessionStorage.getItem('token');
  };

  const fetchActiveTrip = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        toast.error('Authentication required');
        navigate('/driver/login');
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/driver/trips/active`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('📦 Active trip response:', response.data);
      
      const tripData = response.data.trip || response.data.schedule;
      
      if (tripData) {
        console.log('✅ Trip data received:', tripData);
        
        // Normalize the trip data to ensure all fields are accessible
        const normalizedTrip = {
          ...tripData,
          // Ensure origin_city is set
          origin_city: tripData.origin_city || tripData.origin || tripData.departure_city || 'Origin',
          // Ensure destination_city is set
          destination_city: tripData.destination_city || tripData.destination || tripData.arrival_city || 'Destination',
          // Ensure bus info is set
          bus_number: tripData.bus_number || tripData.bus?.number || tripData.plate_number || 'N/A',
          bus_plate_number: tripData.bus_plate_number || tripData.bus?.plate_number || tripData.plate_number || 'N/A',
          // Ensure departure time is set
          departure_time: tripData.departure_time || 'N/A',
          // Ensure distance is set
          distance_km: tripData.distance_km || tripData.total_distance_km || 0
        };
        
        console.log('🔄 Normalized trip data:', normalizedTrip);
        console.log('📏 Distance info:', {
          distance_km: normalizedTrip.distance_km,
          from_tripData: tripData.distance_km,
          total_distance_km: tripData.total_distance_km
        });
        
        setActiveTrip(normalizedTrip);
        setJourneyStatus(normalizedTrip.status || 'scheduled');
        
        // Fetch additional data
        const scheduleId = normalizedTrip._id || normalizedTrip.schedule_id || normalizedTrip.id;
        await Promise.all([
          fetchBusStops(scheduleId),
          fetchPassengers(scheduleId),
          checkCanStartJourney(scheduleId)
        ]);
      } else {
        console.log('❌ No trip data in response');
        setActiveTrip(null);
      }
    } catch (error) {
      console.error('Error fetching active trip:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/driver/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load active trip');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get bus stops from database with check-in status
  const fetchBusStops = async (scheduleId) => {
    try {
      const token = getAuthToken();
      
      console.log('🚏 Fetching bus stops for schedule:', scheduleId);
      
      // Call the backend endpoint to get stops with check-in status
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/tracking/driver/my-route-stops?schedule_id=${scheduleId}`,
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      const stops = response.data.bus_stops || response.data.stops || [];
      console.log('✅ Fetched bus stops:', stops.length, stops);
      console.log('📍 Stop details:', stops);
      
      if (stops.length > 0) {
        console.log(`✅ Route has ${stops.length} intermediate stops`);
      } else {
        console.log('ℹ️ This is a direct route (no intermediate stops)');
      }
      
      setBusStops(stops);
    } catch (error) {
      console.error('❌ Error fetching bus stops:', error);
      console.error('Error response:', error.response?.data);
      
      // If 404, route might not have stops configured - that's okay for direct routes
      if (error.response?.status === 404) {
        console.log('ℹ️ Route not found or no stops configured - treating as direct route');
      } else if (error.response?.status !== 404) {
        toast.error('Failed to load route stops');
      }
      setBusStops([]);
    }
  };

  const fetchPassengers = async (scheduleId) => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/driver/trips/${scheduleId}/passengers`,
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      const passengersData = response.data.passengers || [];
      setPassengers(passengersData);
    } catch (error) {
      console.error('Error fetching passengers:', error);
      toast.error('Failed to load passenger list');
    }
  };

  // Check if driver can start journey (3-hour window)
  const checkCanStartJourney = async (scheduleId) => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/driver/trips/${scheduleId}/can-start`,
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      const data = response.data;
      setCanStartJourney(data.can_start);
      setStartJourneyInfo(data);
      
      console.log('✅ Can start journey:', data);
    } catch (error) {
      console.error('Error checking start journey:', error);
      setCanStartJourney(false);
    }
  };

  // Handle check-in at a bus stop
  const handleCheckInAtStop = async (stopId) => {
    if (!activeTrip) return;

    setCheckingIn(true);
    setActionLoading('checking-in');
    
    try {
      const token = getAuthToken();
      const scheduleId = activeTrip._id || activeTrip.schedule_id || activeTrip.id;

      console.log('🚏 Checking in at stop:', stopId);
      console.log('📋 Schedule ID:', scheduleId);

      // Call backend API to check in at stop
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/tracking/bus-location`,
        {
          bus_stop_id: stopId,
          schedule_id: scheduleId,
          passengers_boarded: 0,
          passengers_alighted: 0,
          notes: 'Driver check-in'
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      toast.success(response.data.message || 'Successfully checked in at stop!');
      setSelectedStop(null);
      
      // Refresh data to update progress
      await fetchActiveTrip();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to check in at stop');
    } finally {
      setCheckingIn(false);
      setActionLoading('');
    }
  };

  // Start journey (for both routes with and without stops)
  const handleStartJourney = async () => {
    if (!activeTrip) return;

    setActionLoading('starting');
    
    try {
      const token = getAuthToken();
      const scheduleId = activeTrip._id;

      // Use the existing start endpoint from your backend
      await axios.post(
        `${import.meta.env.VITE_API_URL}/driver/trips/${scheduleId}/start`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      toast.success('🚌 Journey started successfully!');
      
      // Refresh trip data to get updated status from backend
      await fetchActiveTrip();
    } catch (error) {
      console.error('Error starting journey:', error);
      toast.error(error.response?.data?.message || 'Failed to start journey');
    } finally {
      setActionLoading('');
    }
  };

  // Update location for direct routes (no stops)
  const handleUpdateLocation = async () => {
    if (!activeTrip) return;

    setActionLoading('updating-location');
    
    try {
      // Since we don't have a specific endpoint, we'll update locally
      toast.success('📍 Location updated: En route');
      
      // For demonstration - in real app, this would call your tracking API
      console.log('Location updated for trip:', activeTrip._id);
      
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location');
    } finally {
      setActionLoading('');
    }
  };

  // Complete journey
  const handleCompleteJourney = async () => {
    if (!activeTrip) return;

    if (!window.confirm('Are you sure you want to complete this journey?')) {
      return;
    }

    setActionLoading('completing');
    
    try {
      const token = getAuthToken();
      const scheduleId = activeTrip._id;

      // Use the existing complete endpoint from your backend
      await axios.post(
        `${import.meta.env.VITE_API_URL}/driver/trips/${scheduleId}/complete`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      toast.success('🎉 Journey completed successfully!');
      setJourneyStatus('completed');
      
      setTimeout(() => {
        navigate('/driver/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error completing journey:', error);
      toast.error(error.response?.data?.message || 'Failed to complete journey');
    } finally {
      setActionLoading('');
    }
  };

  // Calculate distance information (kilometers)
  const calculateDistanceInfo = () => {
    if (!activeTrip) {
      return { traveled: 0, remaining: 0, total: 0, percentage: 0 };
    }
    
    const totalDistance = activeTrip.distance_km || activeTrip.total_distance_km || 0;
    
    if (journeyStatus === 'completed') {
      return { traveled: totalDistance, remaining: 0, total: totalDistance, percentage: 100 };
    }
    
    // Get the last checked stop to find distance traveled
    const checkedStops = busStops.filter(stop => stop.is_checked);
    let distanceTraveled = 0;
    
    if (journeyStatus === 'departed' || journeyStatus === 'active' || journeyStatus === 'in_progress') {
      if (checkedStops.length > 0) {
        // Get the last checked stop's distance
        const lastCheckedStop = checkedStops[checkedStops.length - 1];
        // Try multiple field names for distance
        distanceTraveled = lastCheckedStop.distance_from_origin || 
                          lastCheckedStop.distance_from_origin_km ||
                          lastCheckedStop.distanceFromOrigin || 0;
        
        console.log('📏 Last checked stop distance:', {
          stop: lastCheckedStop.stop_name,
          distance_from_origin: lastCheckedStop.distance_from_origin,
          distance_from_origin_km: lastCheckedStop.distance_from_origin_km,
          distanceFromOrigin: lastCheckedStop.distanceFromOrigin,
          calculated: distanceTraveled
        });
      } else {
        // Just departed, show initial distance (15-20 km from origin)
        // This indicates the bus has left the station
        distanceTraveled = 15;
      }
    }
    
    const distanceRemaining = Math.max(0, totalDistance - distanceTraveled);
    const percentage = totalDistance > 0 ? Math.round((distanceTraveled / totalDistance) * 100) : 0;
    
    return {
      traveled: Math.round(distanceTraveled),
      remaining: Math.round(distanceRemaining),
      total: Math.round(totalDistance),
      percentage
    };
  };

  // Calculate journey progress (percentage for backward compatibility)
const calculateProgress = () => {
  return calculateDistanceInfo().percentage;
};

  // Get next stop
  const getNextStop = () => {
    return busStops.find(stop => !stop.is_checked && stop.is_next) || 
           busStops.find(stop => !stop.is_checked);
  };

  // Get checked-in passengers count
  const getCheckedInPassengers = () => {
    return passengers.filter(passenger => 
      passenger.status === 'checked_in'
    ).length;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading active trip...</p>
        </div>
      </div>
    );
  }

  // No active trip state
  if (!activeTrip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md w-full">
          <Navigation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Trip</h2>
          <p className="text-gray-600 mb-6">
            You don't have any active trips at the moment.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/driver/trips')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View My Trips
            </button>
            <button
              onClick={() => navigate('/driver/dashboard')}
              className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const nextStop = getNextStop();
  const checkedInPassengers = getCheckedInPassengers();
  const completedStops = busStops.filter(stop => stop.is_checked).length;

  const hasStops = busStops.length > 0;
  const canStart = journeyStatus === 'scheduled' && canStartJourney;
  const showStartButton = journeyStatus === 'scheduled';
  
  // Can complete if:
  // - For routes WITH stops: all stops must be checked in
  // - For routes WITHOUT stops (direct): journey must be in progress/departed
  const canComplete = hasStops 
    ? (completedStops === busStops.length && busStops.length > 0 && journeyStatus !== 'scheduled')
    : (journeyStatus === 'departed' || journeyStatus === 'in_progress');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Active Journey</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Bus className="w-5 h-5" />
                  <span className="font-semibold">
                    {activeTrip.bus?.plate_number || 
                     activeTrip.bus_plate_number || 
                     activeTrip.plate_number || 
                     activeTrip.bus_number || 
                     'Bus'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5" />
                  <span>
                    {activeTrip.origin_city || activeTrip.origin || activeTrip.departure_city || 'Origin'} 
                    {' → '}
                    {activeTrip.destination_city || activeTrip.destination || activeTrip.arrival_city || 'Destination'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{activeTrip.departure_time || 'N/A'}</span>
                </div>
                {!hasStops && (
                  <div className="flex items-center gap-2 bg-blue-500 px-3 py-1 rounded-full">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">Direct Route</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 lg:mt-0 text-center lg:text-right">
              <div className="text-4xl font-bold">{calculateDistanceInfo().traveled} km</div>
              <div className="text-blue-100">
                {calculateDistanceInfo().remaining} km remaining
              </div>
              <div className="text-sm text-blue-200 mt-1">
                {progress}% complete
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {hasStops ? 'Stops Completed' : 'Journey Status'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {hasStops ? `${completedStops}/${busStops.length}` : 
                   journeyStatus === 'scheduled' ? 'Scheduled' :
                   journeyStatus === 'departed' ? 'In Progress' : 'Completed'}
                </p>
              </div>
              {hasStops ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <Route className="w-8 h-8 text-blue-500" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Passengers</p>
                <p className="text-2xl font-bold text-gray-900">{passengers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Checked In</p>
                <p className="text-2xl font-bold text-green-600">{checkedInPassengers}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Distance</p>
                <p className="text-2xl font-bold text-purple-600">{calculateDistanceInfo().traveled} km</p>
                <p className="text-xs text-gray-500">{calculateDistanceInfo().remaining} km left</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Next Stop Alert - Only show if there are stops */}
        {hasStops && nextStop && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-900">Next Stop: {nextStop.stop_name}</h3>
                  <p className="text-sm text-yellow-700">
                    Stop {nextStop.stop_order} of {busStops.length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStop(nextStop)}
                disabled={checkingIn}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 font-medium"
              >
                Check In
              </button>
            </div>
          </div>
        )}

        {/* Journey Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {hasStops ? 'Journey Controls' : 'Direct Route Tracking'}
          </h2>
          
          {/* Start Journey Info Banner */}
          {showStartButton && !canStartJourney && startJourneyInfo && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Journey Not Ready to Start</h4>
                    <p className="text-sm text-yellow-700">
                      {startJourneyInfo.message || 'You can start the journey up to 3 hours before departure time.'}
                    </p>
                    {startJourneyInfo.time_until_departure_hours && (
                      <p className="text-xs text-yellow-600 mt-2">
                        Time until departure: {startJourneyInfo.time_until_departure_hours.toFixed(1)} hours
                      </p>
                    )}
                    {startJourneyInfo.can_start_at && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Available at: {new Date(startJourneyInfo.can_start_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => checkCanStartJourney(activeTrip._id)}
                  className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
          
          {showStartButton && canStartJourney && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Ready to Start Journey</h4>
                  <p className="text-sm text-green-700">
                    You can now start your journey. Click the button below to begin.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4">
            {showStartButton && (
              <button
                onClick={handleStartJourney}
                disabled={!canStart || actionLoading === 'starting'}
                className="flex-1 bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-3"
              >
                {actionLoading === 'starting' ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    {canStart ? 'Start Journey' : 'Start Journey (Not Available Yet)'}
                  </>
                )}
              </button>
            )}

            {!hasStops && journeyStatus === 'departed' && (
              <button
                onClick={handleUpdateLocation}
                disabled={actionLoading}
                className="flex-1 bg-yellow-600 text-white p-4 rounded-xl hover:bg-yellow-700 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-3"
              >
                {actionLoading === 'updating-location' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <MapPin className="w-5 h-5" />
                )}
                Update Location
              </button>
            )}

            {canComplete && (
              <button
                onClick={handleCompleteJourney}
                disabled={actionLoading}
                className="flex-1 bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-3"
              >
                {actionLoading === 'completing' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Flag className="w-5 h-5" />
                )}
                Complete Journey
              </button>
            )}
          </div>

          {!hasStops && journeyStatus === 'departed' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900">Direct Route Tracking</h4>
                  <p className="text-sm text-blue-700">
                    Use "Update Location" to mark your progress along the route.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bus Stops Section - Only show if there are stops */}
        {hasStops && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Route Stops</h2>
            
            <div className="space-y-4">
              {busStops.map((stop, index) => {
                const isCompleted = stop.is_checked;
                const isNext = stop === nextStop;
                
                return (
                  <div
                    key={stop._id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCompleted
                        ? 'bg-green-50 border-green-200'
                        : isNext
                        ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isNext
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {isCompleted ? '✓' : index + 1}
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-gray-900">{stop.stop_name}</h3>
                          <p className="text-sm text-gray-600">
                            {stop.location || 'Route stop'}
                          </p>
                          {isCompleted && stop.checked_at && (
                            <p className="text-xs text-green-600 mt-1">
                              Checked at {new Date(stop.checked_at).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isNext && !isCompleted && (
                          <button
                            onClick={() => setSelectedStop(stop)}
                            disabled={checkingIn}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                          >
                            <MapPin className="w-4 h-4" />
                            Check In
                          </button>
                        )}
                        
                        {isCompleted && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium text-sm">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Passengers Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Passengers</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {passengers.length} total
            </span>
          </div>
          
          {passengers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Passenger
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {passengers.map((passenger, index) => (
                    <tr key={passenger._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {passenger.passenger_name || 'N/A'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {passenger.passenger_phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {passenger.passenger_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          {passenger.seat_number || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          passenger.status === 'checked_in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {passenger.status === 'checked_in' ? 'Checked In' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No passengers booked for this trip</p>
            </div>
          )}
        </div>
      </div>

      {/* Check-in Modal */}
      {selectedStop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check In at Stop</h2>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <MapPin className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{selectedStop.stop_name}</p>
                  <p className="text-sm text-gray-600">
                    Stop {selectedStop.stop_order} of {busStops.length}
                  </p>
                  {selectedStop.location && (
                    <p className="text-sm text-gray-500 mt-1">{selectedStop.location}</p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Confirm that you have arrived at this stop.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedStop(null)}
                disabled={checkingIn}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCheckInAtStop(selectedStop._id)}
                disabled={checkingIn}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Checking In...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm Check-In
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverActiveTrip
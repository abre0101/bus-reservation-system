// src/components/booking/SchedulesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { scheduleService } from '../../services/scheduleService';
import ScheduleList from './ScheduleList';
import { ArrowLeft, MapPin, Calendar, Users, Loader, AlertCircle, Shield, CheckCircle, Bus } from 'lucide-react';

const SchedulesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const busRef = useRef(null);
  const [currentBus, setCurrentBus] = useState(0);

  // Bus animation data
  const buses = [
    { color: 'text-purple-500', size: 'h-16 w-16' },
    { color: 'text-yellow-500', size: 'h-20 w-20' },
    { color: 'text-blue-500', size: 'h-14 w-14' },
    { color: 'text-indigo-600', size: 'h-18 w-18' }
  ];
  
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schedulesCount, setSchedulesCount] = useState(0);

  // Get booking data from multiple sources
  useEffect(() => {
    const loadBookingData = async () => {
      try {
        console.log('🔍 Loading booking data from:', {
          locationState: location.state?.bookingData,
          hasPendingData: !!localStorage.getItem('pendingBookingData'),
          hasBookingData: !!localStorage.getItem('bookingFormData')
        });

        let data = null;

        // Priority 1: Location state (from SearchForm or Login)
        if (location.state?.bookingData) {
          console.log('📋 Using booking data from location state');
          data = location.state.bookingData;
        }
        // Priority 2: Pending booking data (from non-logged in user)
        else if (localStorage.getItem('pendingBookingData')) {
          console.log('📋 Using pending booking data from localStorage');
          data = JSON.parse(localStorage.getItem('pendingBookingData'));
          // Move to active booking data
          localStorage.setItem('bookingFormData', JSON.stringify(data));
          localStorage.removeItem('pendingBookingData');
        }
        // Priority 3: Active booking data
        else if (localStorage.getItem('bookingFormData')) {
          console.log('📋 Using active booking data from localStorage');
          data = JSON.parse(localStorage.getItem('bookingFormData'));
        }
        // Priority 4: URL parameters (fallback)
        else {
          const searchParams = new URLSearchParams(location.search);
          const originCity = searchParams.get('originCity');
          const destinationCity = searchParams.get('destinationCity');
          const date = searchParams.get('date');
          const passengers = parseInt(searchParams.get('passengers')) || 1;

          if (originCity && destinationCity && date) {
            console.log('📋 Using booking data from URL parameters');
            data = { originCity, destinationCity, date, passengers };
            localStorage.setItem('bookingFormData', JSON.stringify(data));
          }
        }

        if (data) {
          console.log('✅ Booking data loaded successfully:', data);
          setBookingData(data);
          
          // Validate the booking data
          if (!data.originCity || !data.destinationCity || !data.date) {
            throw new Error('Incomplete booking data');
          }
          
          return data;
        } else {
          console.log('❌ No booking data found anywhere');
          setError('No booking information found. Please start a new search.');
          return null;
        }

      } catch (error) {
        console.error('❌ Error loading booking data:', error);
        setError('Failed to load booking information. Please try again.');
        return null;
      } finally {
        setLoading(false);
      }
    };

    loadBookingData();
  }, [location]);

  const handleBackToSearch = () => {
    // Clear any existing booking data
    localStorage.removeItem('bookingFormData');
    localStorage.removeItem('pendingBookingData');
    navigate('/search');
  };

  // FIXED: This function is called when user selects a schedule
  const handleScheduleSelect = (schedule) => {
    if (!bookingData) {
      console.error('❌ No booking data available');
      alert('Booking data is missing. Please start a new search.');
      return;
    }

    console.log('🎯 Schedule selected, navigating to seat selection:', {
      schedule,
      bookingData,
      passengerCount: bookingData.passengers
    });

    // Store passenger count in sessionStorage for redundancy
    sessionStorage.setItem('passengerCount', (bookingData.passengers || 1).toString());

    // Navigate to seat selection with ALL necessary data
    navigate('/booking/seats', {
      state: {
        schedule: schedule,
        bookingData: bookingData, // Pass the complete booking data
        passengerCount: bookingData.passengers || 1 // Explicitly pass passenger count
      }
    });
  };

  const handleSchedulesLoaded = (count) => {
    setSchedulesCount(count);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'No date selected';
    
    try {
      const dateObj = new Date(dateString);
      return isNaN(dateObj.getTime()) 
        ? 'Invalid date format' 
        : dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
    } catch (error) {
      return 'Date error';
    }
  };

  const getTimeUntilTravel = (dateString) => {
    if (!dateString) return null;
    
    try {
      const travelDate = new Date(dateString);
      const now = new Date();
      const diffTime = travelDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Past date';
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      return `In ${diffDays} days`;
    } catch (error) {
      return null;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Your Search</h3>
          <p className="text-gray-600">Preparing available schedules...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Booking Information Missing</h2>
          <p className="text-gray-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            It seems your search session expired or wasn't properly saved.
          </p>
          <button
            onClick={handleBackToSearch}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
          >
            Start New Search
          </button>
        </div>
      </div>
    );
  }

  const timeUntilTravel = bookingData ? getTimeUntilTravel(bookingData.date) : null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      {/* Gradient Overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-transparent to-purple-100/30"></div>
      </div>

      {/* Floating Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
      </div>
      
      <div className="relative z-10">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToSearch}
              className="flex items-center text-gray-700 hover:text-blue-600 transition-all bg-white/90 backdrop-blur-md px-5 py-3 rounded-xl shadow-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-xl font-semibold"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Modify Search
            </button>
          </div>
          
          <div className="text-center lg:text-right">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
              Available Schedules
            </h1>
            <p className="text-gray-700 mt-2 text-lg font-medium">
              Choose your preferred bus and timing
            </p>
          </div>
        </div>

        {/* Booking Summary Card */}
        {bookingData && (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 mb-8 border border-white/50 hover:shadow-blue-200/50 transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                Your Journey Details
              </h2>
              {timeUntilTravel && (
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold mt-2 lg:mt-0 shadow-md ${
                  timeUntilTravel === 'Today' 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                    : timeUntilTravel === 'Tomorrow'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                }`}>
                  {timeUntilTravel}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Route */}
              <div className="flex items-center space-x-3 p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 shadow-md hover:shadow-lg transition-all">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-md">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">Route</p>
                  <p className="text-base font-bold text-gray-900 leading-tight mt-1">
                    {bookingData.originCity} 
                    <span className="text-blue-600 mx-1">→</span>
                    {bookingData.destinationCity}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center space-x-3 p-5 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border-2 border-green-200 shadow-md hover:shadow-lg transition-all">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-md">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-green-700 font-bold uppercase tracking-wide">Travel Date</p>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {formatDisplayDate(bookingData.date)}
                  </p>
                </div>
              </div>

              {/* Passengers */}
              <div className="flex items-center space-x-3 p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 shadow-md hover:shadow-lg transition-all">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-purple-700 font-bold uppercase tracking-wide">Passengers</p>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {bookingData.passengers || 1} {bookingData.passengers === 1 ? 'passenger' : 'passengers'}
                  </p>
                </div>
              </div>

              {/* Booking Status */}
              <div className={`flex items-center space-x-3 p-5 rounded-xl border-2 shadow-md hover:shadow-lg transition-all ${
                isAuthenticated 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200' 
                  : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'
              }`}>
                <div className={`p-3 rounded-xl shadow-md ${
                  isAuthenticated ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                }`}>
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold uppercase tracking-wide ${
                    isAuthenticated ? 'text-green-700' : 'text-yellow-700'
                  }`}>Status</p>
                  <p className={`text-base font-bold mt-1 ${
                    isAuthenticated ? 'text-green-900' : 'text-yellow-900'
                  }`}>
                    {isAuthenticated ? 'Ready to Book' : 'Login Required'}
                  </p>
                  {isAuthenticated && user && (
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      {user.name || user.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200 flex flex-wrap gap-3">
              <button
                onClick={handleBackToSearch}
                className="px-5 py-2.5 text-sm font-semibold text-blue-600 hover:text-white bg-white hover:bg-blue-600 border-2 border-blue-300 rounded-xl hover:border-blue-600 transition-all shadow-sm hover:shadow-md"
              >
                Change Dates
              </button>
              <button
                onClick={handleBackToSearch}
                className="px-5 py-2.5 text-sm font-semibold text-blue-600 hover:text-white bg-white hover:bg-blue-600 border-2 border-blue-300 rounded-xl hover:border-blue-600 transition-all shadow-sm hover:shadow-md"
              >
                Modify Passengers
              </button>
              <button
                onClick={handleBackToSearch}
                className="px-5 py-2.5 text-sm font-semibold text-blue-600 hover:text-white bg-white hover:bg-blue-600 border-2 border-blue-300 rounded-xl hover:border-blue-600 transition-all shadow-sm hover:shadow-md"
              >
                Different Route
              </button>
            </div>
          </div>
        )}

        {/* Results Header */}
        {bookingData && (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Available Buses
                {schedulesCount > 0 && (
                  <span className="ml-2 text-xl font-semibold text-blue-600">
                    ({schedulesCount} found)
                  </span>
                )}
              </h3>
              <p className="text-gray-600 mt-2 font-medium">
                Select your preferred schedule to continue to seat selection
              </p>
            </div>
            
            {!isAuthenticated && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 shadow-md">
                <p className="text-sm text-yellow-900 flex items-center font-semibold">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  You'll need to login before selecting seats
                </p>
              </div>
            )}
          </div>
        )}

        {/* Schedule List - FIXED: Pass the handleScheduleSelect function */}
        {bookingData && (
          <ScheduleList 
            originCity={bookingData.originCity}
            destinationCity={bookingData.destinationCity}
            date={bookingData.date}
            passengers={bookingData.passengers || 1}
            onSchedulesLoaded={handleSchedulesLoaded}
            onScheduleSelect={handleScheduleSelect} // ADD THIS PROP
          />
        )}

        {/* No Booking Data Fallback */}
        {!bookingData && !loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <AlertCircle className="h-20 w-20 text-gray-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Start Your Journey</h2>
              <p className="text-gray-600 mb-2">
                Begin by searching for available bus schedules.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Enter your departure city, destination, and travel date to see available options.
              </p>
              <button
                onClick={handleBackToSearch}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                Start New Search
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        {bookingData && (
          <div className="mt-12 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
            <h4 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                <Shield className="h-5 w-5 text-white" />
              </div>
              Need Help Choosing?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all">
                <p className="font-bold text-blue-900 mb-2 text-base">Morning Departures</p>
                <p className="text-gray-700 text-sm">Best for full-day travel, better road conditions</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-200 shadow-sm hover:shadow-md transition-all">
                <p className="font-bold text-indigo-900 mb-2 text-base">Luxury Buses</p>
                <p className="text-gray-700 text-sm">More comfort with reclining seats and AC</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-all">
                <p className="font-bold text-purple-900 mb-2 text-base">Popular Operators</p>
                <p className="text-gray-700 text-sm">Trusted companies with good safety records</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SchedulesPage;
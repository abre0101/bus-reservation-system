
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, Search, Loader, AlertCircle, ArrowRight, Users, RotateCw, Shield } from 'lucide-react';
import { scheduleService } from '../../services/scheduleService';
import { useAuth } from '../../hooks/useAuth.jsx';

const SearchForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  
  // Get pre-filled values from URL parameters
  const preFilledFrom = searchParams.get('from');
  const preFilledTo = searchParams.get('to');
  const preFilledDate = searchParams.get('date');
  const preFilledPassengers = searchParams.get('passengers') || '1';

  const [formData, setFormData] = useState({
    originCity: preFilledFrom || '',
    destinationCity: preFilledTo || '',
    date: preFilledDate || '',
    passengers: parseInt(preFilledPassengers) || 1
  });

  const [availableCities, setAvailableCities] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingDates, setLoadingDates] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [citiesError, setCitiesError] = useState('');

  // Fetch available cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        setCitiesError('');
        
        const response = await scheduleService.getAvailableCities();
        const cities = response.cities || [];
        setAvailableCities(cities);
        
        // If we have pre-filled values from URL, use them
        if (preFilledFrom && preFilledTo) {
          setFormData(prev => ({
            ...prev,
            originCity: preFilledFrom,
            destinationCity: preFilledTo,
            date: preFilledDate || prev.date,
            passengers: parseInt(preFilledPassengers) || prev.passengers
          }));
        } else if (cities.length > 0 && !formData.originCity) {
          setFormData(prev => ({
            ...prev,
            originCity: cities[0]
          }));
        }
      } catch (error) {
        console.error('❌ Error fetching cities:', error);
        setCitiesError('Failed to load cities. Using default options.');
        
        const fallbackCities = [
          'Addis Ababa', 'Hawassa', 'Dire Dawa', 'Jimma', 'Adama', 
          'Mekele', 'Bahir Dar', 'Gondar'
        ];
        setAvailableCities(fallbackCities);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [preFilledFrom, preFilledTo, preFilledDate, preFilledPassengers]);

  // Fetch available dates when cities are selected
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (formData.originCity && formData.destinationCity && formData.originCity !== formData.destinationCity) {
        setLoadingDates(true);
        try {
          const response = await scheduleService.getAvailableDates({
            originCity: formData.originCity,
            destinationCity: formData.destinationCity
          });
          
          // Filter out past dates
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const allDates = response.dates || [];
          const futureDates = allDates.filter(dateStr => {
            const date = new Date(dateStr);
            return date >= today;
          });
          
          setAvailableDates(futureDates);
          
          // If we have a pre-filled date and it's available, use it
          if (preFilledDate && futureDates.includes(preFilledDate)) {
            setFormData(prev => ({ ...prev, date: preFilledDate }));
          } else if (!formData.date && futureDates.length > 0) {
            setFormData(prev => ({ ...prev, date: futureDates[0] }));
          }
        } catch (error) {
          console.error('❌ Error fetching dates:', error);
          setAvailableDates([]);
        } finally {
          setLoadingDates(false);
        }
      } else {
        setAvailableDates([]);
        if (!preFilledDate) {
          setFormData(prev => ({ ...prev, date: '' }));
        }
      }
    };

    const timeoutId = setTimeout(fetchAvailableDates, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.originCity, formData.destinationCity, preFilledDate]);

  const validateForm = () => {
    if (!formData.originCity || !formData.destinationCity) {
      setValidationError('Please select both departure and destination cities');
      return false;
    }

    if (formData.originCity === formData.destinationCity) {
      setValidationError('Departure and destination cities cannot be the same');
      return false;
    }

    if (!formData.date) {
      setValidationError('Please select a travel date');
      return false;
    }

    if (availableDates.length === 0) {
      setValidationError('No available dates for the selected route. Please try a different route.');
      return false;
    }

    if (!availableDates.includes(formData.date)) {
      setValidationError('Please select a valid date from the available options');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setIsSubmitting(true);

    try {
      if (!validateForm()) {
        return;
      }

      const bookingData = {
        originCity: formData.originCity,
        destinationCity: formData.destinationCity,
        date: formData.date,
        passengers: formData.passengers,
        searchTimestamp: new Date().toISOString()
      };

      localStorage.removeItem('pendingBookingData');
      localStorage.removeItem('bookingFormData');

      if (isAuthenticated) {
        localStorage.setItem('bookingFormData', JSON.stringify(bookingData));
        navigate('/schedules', { 
          state: { 
            bookingData: bookingData,
            redirectFrom: 'search'
          }
        });
      } else {
        localStorage.setItem('pendingBookingData', JSON.stringify(bookingData));
        navigate('/login', { 
          state: { 
            returnUrl: '/schedules',
            message: 'Please login to view available schedules and book your trip',
            bookingData: bookingData
          }
        });
      }
    } catch (error) {
      console.error('❌ Form submission error:', error);
      setValidationError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwapCities = () => {
    setFormData(prev => ({
      ...prev,
      originCity: prev.destinationCity,
      destinationCity: prev.originCity
    }));
    setValidationError('');
  };

  const destinationCities = availableCities.filter(city => city !== formData.originCity);
  const isFormValid = formData.originCity && 
                     formData.destinationCity && 
                     formData.date && 
                     formData.originCity !== formData.destinationCity &&
                     availableDates.length > 0 &&
                     availableDates.includes(formData.date);

  const hasNoDates = formData.originCity && 
                    formData.destinationCity && 
                    formData.originCity !== formData.destinationCity && 
                    !loadingDates && 
                    availableDates.length === 0;

  return (
    <div className="space-y-6">
      {/* Authentication Status */}
      <div className={`p-5 rounded-xl border-2 shadow-md ${
        isAuthenticated 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
      }`}>
        <div className="flex items-center">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl mr-3 flex items-center justify-center shadow-md ${
            isAuthenticated ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className={`font-bold text-lg ${isAuthenticated ? 'text-green-900' : 'text-blue-900'}`}>
              {isAuthenticated ? `✅ Welcome back, ${user?.name || 'User'}!` : '🔐 Authentication Required'}
            </p>
            <p className={`text-sm mt-1 font-medium ${isAuthenticated ? 'text-green-700' : 'text-blue-700'}`}>
              {isAuthenticated 
                ? 'You can proceed directly to view schedules.' 
                : 'You will need to login after search to view schedules and complete booking.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-5 shadow-md">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-md">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-base font-bold text-red-900">Validation Error</h4>
              <p className="text-sm text-red-700 mt-1 font-medium">{validationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Dates Warning */}
      {hasNoDates && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-5 shadow-md">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-md">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-base font-bold text-yellow-900">No Schedules Available</h4>
              <p className="text-sm text-yellow-700 mt-1 font-medium">
                There are no available schedules for <strong>{formData.originCity} → {formData.destinationCity}</strong>. 
                Try selecting a different route.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cities Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Origin City */}
          <div className="lg:col-span-5">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-blue-600" />
              From City
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              {loadingCities ? (
                <div className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg flex items-center text-gray-500 bg-gray-50">
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Loading cities...
                </div>
              ) : (
                <select
                  value={formData.originCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, originCity: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  required
                >
                  <option value="">Select departure city</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <div className="lg:col-span-2 flex items-center justify-center">
            <button
              type="button"
              onClick={handleSwapCities}
              disabled={!formData.originCity || !formData.destinationCity}
              className="bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 p-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              title="Swap departure and destination"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Destination City */}
          <div className="lg:col-span-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              To City
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              {loadingCities ? (
                <div className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg flex items-center text-gray-500 bg-gray-50">
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Loading cities...
                </div>
              ) : (
                <select
                  value={formData.destinationCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationCity: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  required
                >
                  <option value="">Select destination city</option>
                  {destinationCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Date and Passengers Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Travel Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              {loadingDates ? (
                <div className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg flex items-center text-gray-500 bg-gray-50">
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Loading available dates...
                </div>
              ) : availableDates.length > 0 ? (
                <select
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border-2 border-green-200 bg-green-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  required
                >
                  <option value="">Select travel date</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg flex items-center ${
                  formData.originCity && formData.destinationCity 
                    ? 'border-red-200 bg-red-50 text-red-700' 
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}>
                  {formData.originCity && formData.destinationCity 
                    ? 'No available dates for this route'
                    : 'Select cities to see available dates'
                  }
                </div>
              )}
            </div>
            {availableDates.length > 0 && (
              <p className="text-sm text-green-600 mt-2 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {availableDates.length} available date{availableDates.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* Passengers */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Passengers
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={formData.passengers}
                onChange={(e) => setFormData(prev => ({ ...prev, passengers: parseInt(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Passenger' : 'Passengers'}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Maximum 6 passengers per booking
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={!isFormValid || loadingDates || isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-lg font-bold text-lg transition-all flex items-center justify-center disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {isSubmitting ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                {isAuthenticated ? 'View Available Schedules' : 'Search & Continue'}
                <ArrowRight className="h-5 w-5 ml-auto" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
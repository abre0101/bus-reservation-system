import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  Printer,
  CheckCircle,
  MapPin,
  Clock,
  Users,
  Loader,
  DollarSign,
  Calendar,
  Bus,
  ArrowRight,
  Info
} from 'lucide-react';
import ticketerService from '../../services/ticketerService';
import { toast } from 'react-toastify';
import { printTicket } from '../../utils/exportUtils';

const QuickBooking = () => {
  const [step, setStep] = useState(1);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [availableSeats, setAvailableSeats] = useState([]);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  
  const [bookingData, setBookingData] = useState({
    schedule_id: '',
    passenger_name: '',
    passenger_phone: '',
    passenger_email: '',
    seat_numbers: [],
    total_amount: 0,
    payment_method: 'cash',
    payment_status: 'pending'
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async (selectedDate = null) => {
    try {
      setLoading(true);
      // Fetch all upcoming schedules (don't filter by date initially)
      const response = await ticketerService.getSchedules({
        date: selectedDate || undefined // Only filter if date is selected
      });
      
      if (response?.success && Array.isArray(response?.schedules)) {
        setSchedules(response.schedules);
        console.log(`📅 Loaded ${response.schedules.length} schedules`);
      } else {
        console.error('Invalid response format:', response);
        toast.error('Failed to load schedules');
        setSchedules([]);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      toast.error(error.message || 'Failed to load schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSelect = async (schedule) => {
    try {
      setSelectedSchedule(schedule);
      setBookingData(prev => ({ 
        ...prev, 
        schedule_id: schedule._id,
        total_amount: schedule.fare_birr || 0
      }));
      
      // Fetch occupied seats for this schedule
      const occupiedResponse = await ticketerService.getOccupiedSeats(schedule._id);
      if (occupiedResponse?.success && Array.isArray(occupiedResponse?.occupiedSeats)) {
        setOccupiedSeats(occupiedResponse.occupiedSeats);
        
        // Generate available seats using bus capacity
        const totalSeats = schedule.total_seats || schedule.bus?.capacity || 45;
        const occupied = occupiedResponse.occupiedSeats;
        const available = [];
        for (let i = 1; i <= totalSeats; i++) {
          if (!occupied.includes(i)) {
            available.push(i);
          }
        }
        setAvailableSeats(available);
        setStep(2);
      } else {
        console.error('Invalid occupied seats response:', occupiedResponse);
        toast.error('Failed to load seat information');
      }
    } catch (error) {
      console.error('Failed to fetch seat data:', error);
      toast.error(error.message || 'Failed to load seat information');
    }
  };

  const handleSeatSelect = (seatNumber) => {
    setBookingData(prev => ({
      ...prev,
      seat_numbers: [seatNumber]
    }));
    setStep(3);
  };

  const handleInputChange = (field, value) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setProcessing(true);
      
      // Validate required fields
      if (!bookingData.passenger_name || !bookingData.passenger_phone) {
        toast.error('Please fill in passenger name and phone');
        return;
      }

      if (!bookingData.seat_numbers || bookingData.seat_numbers.length === 0) {
        toast.error('Please select a seat');
        return;
      }

      const bookingPayload = {
        ...bookingData,
        booking_type: 'counter',
        booked_by: 'operator',
        payment_status: bookingData.payment_method === 'cash' ? 'paid' : 'pending'
      };

      if (bookingData.payment_method === 'chapa') {
        // Handle Chapa payment integration
        const paymentResult = await ticketerService.processChapaPayment({
          ...bookingPayload,
          amount: bookingData.total_amount,
          currency: 'ETB',
          return_url: `${window.location.origin}/ticketer/booking-confirmation`
        });
        
        if (paymentResult.success && paymentResult.data?.checkout_url) {
          // Redirect to Chapa checkout
          window.location.href = paymentResult.data.checkout_url;
          return;
        } else {
          throw new Error('Failed to initialize Chapa payment');
        }
      }

      // For cash payments, create booking directly
      const result = await ticketerService.createBooking(bookingPayload);
      
      if (result?.success && result?.booking) {
        toast.success('Booking created successfully!');
        setStep(4);
        
        // Auto-print ticket if printer is available
        setTimeout(() => {
          handlePrintTicket(result.booking);
        }, 1000);
      } else {
        throw new Error(result?.message || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintTicket = (booking) => {
    try {
      // Prepare complete booking data for printing
      const ticketData = {
        ...booking,
        departure_city: selectedSchedule?.origin_city || booking.departure_city,
        arrival_city: selectedSchedule?.destination_city || booking.arrival_city,
        travel_date: selectedSchedule?.departure_date || booking.travel_date,
        departure_time: selectedSchedule?.departure_time || booking.departure_time,
        bus_number: selectedSchedule?.bus_number || booking.bus_number,
        bus_type: selectedSchedule?.bus_type || booking.bus_type,
        seat_numbers: booking.seat_numbers || bookingData.seat_numbers,
        payment_method: bookingData.payment_method
      };
      
      printTicket(ticketData);
      toast.success('Ticket sent to printer');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print ticket');
    }
  };

  const handleNewBooking = () => {
    setStep(1);
    setSelectedSchedule(null);
    setBookingData({
      schedule_id: '',
      passenger_name: '',
      passenger_phone: '',
      passenger_email: '',
      seat_numbers: [],
      total_amount: 0,
      payment_method: 'cash',
      payment_status: 'pending'
    });
  };

  const steps = [
    { number: 1, title: 'Select Schedule', icon: <Clock className="h-4 w-4" /> },
    { number: 2, title: 'Choose Seat', icon: <Users className="h-4 w-4" /> },
    { number: 3, title: 'Passenger Info', icon: <User className="h-4 w-4" /> },
    { number: 4, title: 'Confirmation', icon: <CheckCircle className="h-4 w-4" /> }
  ];

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    return dateString;
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Walk in Booking</h1>
              <p className="text-lg text-gray-600">Book tickets in just a few clicks</p>
            </div>
            <div className="hidden md:flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex items-center justify-between relative">
            {steps.map((stepItem, index) => (
              <React.Fragment key={stepItem.number}>
                <div className={`flex flex-col items-center space-y-2 relative z-10 ${
                  step >= stepItem.number ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  <div className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ${
                    step >= stepItem.number 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-110' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step > stepItem.number ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <span className="text-lg font-bold">{stepItem.number}</span>
                    )}
                  </div>
                  <span className={`font-semibold text-sm ${
                    step >= stepItem.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {stepItem.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-4 relative" style={{ top: '-28px' }}>
                    <div className="absolute inset-0 bg-gray-200 rounded-full" />
                    <div 
                      className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ${
                        step > stepItem.number ? 'w-full' : 'w-0'
                      }`} 
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Schedule Selection */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white mb-2">Select Your Journey</h2>
              <p className="text-blue-100">Choose from available schedules</p>
            </div>
            
            <div className="p-8">
              {/* Date Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Info className="h-5 w-5" />
                  <span className="text-sm">Showing {schedules.length} available schedules</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      fetchSchedules(e.target.value || null);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => {
                        setSelectedDate('');
                        fetchSchedules(null);
                      }}
                      className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                  <p className="text-gray-600">Loading schedules...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule._id}
                      className="group border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                      onClick={() => handleScheduleSelect(schedule)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                              <Bus className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {schedule.origin_city}
                              <ArrowRight className="inline-block h-5 w-5 mx-2 text-gray-400" />
                              {schedule.destination_city}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center space-x-2 text-gray-600">
                              <Clock className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">{schedule.departure_time}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-600">
                              <Calendar className="h-4 w-4 text-purple-500" />
                              <span className="font-medium">{formatDate(schedule.departure_date)}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-600">
                              <MapPin className="h-4 w-4 text-green-500" />
                              <span className="font-medium">{schedule.bus_number}</span>
                            </div>
                          </div>
                          <div className="mt-3 inline-flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">
                              {schedule.available_seats} seats available
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center lg:flex-col lg:items-end justify-between lg:justify-center gap-2">
                          <div className="text-right">
                            <p className="text-3xl font-bold text-green-600">ETB {schedule.fare_birr}</p>
                            <p className="text-sm text-gray-500">per seat</p>
                          </div>
                          <button className="lg:mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {schedules.length === 0 && (
                    <div className="text-center py-16">
                      <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bus className="h-10 w-10 text-gray-400" />
                      </div>
                      <p className="text-xl font-semibold text-gray-700 mb-2">No schedules available</p>
                      <p className="text-gray-500">Try selecting a different date or check back later</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Seat Selection */}
        {step === 2 && selectedSchedule && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Seat</h2>
              <p className="text-purple-100">Select your preferred seat from the available options</p>
            </div>
            
            <div className="p-8">
              {/* Journey Info Card */}
              <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedSchedule.origin_city} → {selectedSchedule.destination_city}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{selectedSchedule.departure_time}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Bus className="h-4 w-4" />
                        <span>{selectedSchedule.bus_number}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Fare per seat</p>
                    <p className="text-2xl font-bold text-green-600">ETB {selectedSchedule.fare_birr}</p>
                  </div>
                </div>
              </div>

              {/* Bus Layout */}
              <div className="max-w-2xl mx-auto mb-8">
                {/* Driver Section */}
                <div className="flex justify-end mb-4">
                  <div className="bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700">
                    🚗 Driver
                  </div>
                </div>

                {/* Seats Grid */}
                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                  <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: selectedSchedule.total_seats || selectedSchedule.bus?.capacity || 45 }, (_, i) => i + 1).map((seat) => {
                      const isOccupied = occupiedSeats.includes(seat);
                      const isSelected = bookingData.seat_numbers.includes(seat);
                      
                      return (
                        <button
                          key={seat}
                          disabled={isOccupied}
                          className={`relative p-4 rounded-xl border-2 text-center font-bold transition-all duration-200 transform ${
                            isSelected
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-700 shadow-lg scale-105'
                              : isOccupied
                              ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:bg-green-50 hover:scale-105 hover:shadow-md'
                          }`}
                          onClick={() => !isOccupied && handleSeatSelect(seat)}
                        >
                          <div className="text-lg">{seat}</div>
                          {isSelected && (
                            <CheckCircle className="absolute top-1 right-1 h-4 w-4" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-6 mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white border-2 border-gray-300 rounded-lg"></div>
                  <span className="text-sm font-medium text-gray-700">Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 border-2 border-gray-300 rounded-lg opacity-50"></div>
                  <span className="text-sm font-medium text-gray-700">Occupied</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-700 rounded-lg"></div>
                  <span className="text-sm font-medium text-gray-700">Your Selection</span>
                </div>
              </div>

              {/* Back Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  ← Back to Schedules
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Passenger Information */}
        {step === 3 && selectedSchedule && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white mb-2">Passenger Details</h2>
              <p className="text-green-100">Enter passenger information and payment method</p>
            </div>
            
            <div className="p-8">
              {/* Passenger Information Form */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={bookingData.passenger_name}
                        onChange={(e) => handleInputChange('passenger_name', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={bookingData.passenger_phone}
                        onChange={(e) => handleInputChange('passenger_phone', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="+251 XXX XXX XXX"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={bookingData.passenger_email}
                        onChange={(e) => handleInputChange('passenger_email', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
                  Payment Method
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`relative flex items-center space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    bookingData.payment_method === 'cash'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash"
                      checked={bookingData.payment_method === 'cash'}
                      onChange={(e) => handleInputChange('payment_method', e.target.value)}
                      className="text-green-600 focus:ring-green-500 w-5 h-5"
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Cash Payment</p>
                        <p className="text-sm text-gray-600">Pay at counter</p>
                      </div>
                    </div>
                    {bookingData.payment_method === 'cash' && (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    )}
                  </label>
                  
                  <label className={`relative flex items-center space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    bookingData.payment_method === 'chapa'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-300 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="chapa"
                      checked={bookingData.payment_method === 'chapa'}
                      onChange={(e) => handleInputChange('payment_method', e.target.value)}
                      className="text-purple-600 focus:ring-purple-500 w-5 h-5"
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <CreditCard className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Chapa Payment</p>
                        <p className="text-sm text-gray-600">Online payment</p>
                      </div>
                    </div>
                    {bookingData.payment_method === 'chapa' && (
                      <CheckCircle className="h-6 w-6 text-purple-600" />
                    )}
                  </label>
                </div>
              </div>

              {/* Booking Summary */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 mb-8 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Route
                    </span>
                    <span className="font-semibold text-gray-900">
                      {selectedSchedule.origin_city} → {selectedSchedule.destination_city}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Date & Time
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatDate(selectedSchedule.departure_date)} at {selectedSchedule.departure_time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <Bus className="h-4 w-4 mr-2" />
                      Bus Number
                    </span>
                    <span className="font-semibold text-gray-900">{selectedSchedule.bus_number}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Seat Number
                    </span>
                    <span className="font-semibold text-gray-900">Seat {bookingData.seat_numbers.join(', ')}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 mt-3 bg-white rounded-lg px-4">
                    <span className="text-lg font-bold text-gray-900">Total Amount</span>
                    <span className="text-2xl font-bold text-green-600">ETB {bookingData.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={processing}
                  className="flex items-center justify-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                >
                  {processing ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Complete Booking</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-12 text-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce">
                <CheckCircle className="h-14 w-14 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Booking Confirmed!</h2>
              <p className="text-green-100 text-lg">
                Your ticket has been successfully booked
              </p>
            </div>
            
            <div className="p-8">
              {/* Success Message */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-8 text-center">
                <p className="text-green-800 font-medium">
                  ✓ Ticket sent to printer automatically
                </p>
              </div>

              {/* Booking Details Card */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 mb-8 border-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Booking Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <User className="h-5 w-5 mr-2 text-blue-600" />
                      Passenger
                    </span>
                    <span className="font-bold text-gray-900">{bookingData.passenger_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <Phone className="h-5 w-5 mr-2 text-green-600" />
                      Phone
                    </span>
                    <span className="font-bold text-gray-900">{bookingData.passenger_phone}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                      Route
                    </span>
                    <span className="font-bold text-gray-900">
                      {selectedSchedule.origin_city} → {selectedSchedule.destination_city}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <Users className="h-5 w-5 mr-2 text-orange-600" />
                      Seat
                    </span>
                    <span className="font-bold text-gray-900">Seat {bookingData.seat_numbers.join(', ')}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-pink-600" />
                      Payment
                    </span>
                    <span className="font-bold text-gray-900 capitalize">{bookingData.payment_method}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 mt-4 bg-white rounded-lg px-4">
                    <span className="text-lg font-bold text-gray-900">Total Paid</span>
                    <span className="text-3xl font-bold text-green-600">ETB {bookingData.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleNewBooking}
                  className="flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                >
                  <User className="h-5 w-5" />
                  <span>New Booking</span>
                </button>
                
                <button
                  onClick={() => handlePrintTicket({
                    pnr_number: 'PNR' + Date.now(),
                    passenger_name: bookingData.passenger_name,
                    passenger_phone: bookingData.passenger_phone,
                    seat_numbers: bookingData.seat_numbers,
                    total_amount: bookingData.total_amount
                  })}
                  className="flex items-center justify-center space-x-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  <Printer className="h-5 w-5" />
                  <span>Print Again</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickBooking;
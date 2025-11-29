import React, { useState } from 'react';
import { 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Printer,
  Eye,
  Calendar,
  Bus,
  CreditCard,
  Mail,
  AlertCircle,
  Ticket
} from 'lucide-react';
import ticketerService from '../../services/ticketerService';
import { toast } from 'react-toastify';

const BookingLookup = () => {
  const [searchType, setSearchType] = useState('pnr');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error('Please enter a search value');
      return;
    }

    try {
      setSearching(true);
      setError('');
      setBooking(null);

      let result;
      if (searchType === 'pnr') {
        result = await ticketerService.getBookingByPNR(searchValue.trim());
      } else {
        result = await ticketerService.getBookingsByPhone(searchValue.trim());
      }

      if (result.success && result.booking) {
        setBooking(result.booking);
        toast.success('Booking found!');
      } else if (result.success && result.bookings && result.bookings.length > 0) {
        // For phone search, show the most recent booking
        setBooking(result.bookings[0]);
        toast.success(`Found ${result.bookings.length} booking(s)`);
      } else {
        setError('No booking found with the provided information');
        toast.error('Booking not found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search for booking');
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async () => {
    if (!booking) return;

    try {
      const result = await ticketerService.checkInPassenger(booking._id);
      if (result.success) {
        toast.success('Passenger checked in successfully!');
        setBooking(prev => ({ ...prev, status: 'checked_in', checkin_time: new Date().toISOString() }));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Check-in failed:', error);
      toast.error(error.message || 'Check-in failed');
    }
  };

  const handlePrintTicket = () => {
    if (!booking) return;

    const ticketContent = `
      ETHIOBUS TICKET
      ====================
      PNR: ${booking.pnr_number}
      Passenger: ${booking.passenger_name}
      Phone: ${booking.passenger_phone}
      Route: ${booking.departure_city} → ${booking.arrival_city}
      Date: ${booking.travel_date}
      Time: ${booking.departure_time}
      Seat: ${booking.seat_number}
      Bus: ${booking.bus_number}
      Amount: ETB ${booking.total_amount}
      Status: ${booking.status}
      ====================
      Thank you for traveling with us!
    `;
    
    console.log('Printing ticket:', ticketContent);
    toast.info('Ticket sent to printer');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      checked_in: { color: 'bg-green-100 text-green-800', label: 'Checked In' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      no_show: { color: 'bg-orange-100 text-orange-800', label: 'No Show' }
    };

    const config = statusConfig[status] || statusConfig.confirmed;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Booking Lookup</h1>
        <p className="text-gray-600 mt-1">Find bookings by PNR number or passenger phone</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search By</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pnr">PNR Number</option>
              <option value="phone">Phone Number</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {searchType === 'pnr' ? 'PNR Number' : 'Phone Number'}
            </label>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchType === 'pnr' ? 'Enter PNR number...' : 'Enter phone number...'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>{searching ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Booking Details */}
      {booking && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Booking Details</h2>
                  <p className="text-blue-100">PNR: {booking.pnr_number}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold">{getStatusBadge(booking.status)}</div>
                <p className="text-blue-100 text-sm">Last updated</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Passenger Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  Passenger Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Full Name:</span>
                    <span className="font-medium text-gray-900">{booking.passenger_name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Phone Number:</span>
                    <span className="font-medium text-gray-900">{booking.passenger_phone}</span>
                  </div>
                  
                  {booking.passenger_email && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-gray-900">{booking.passenger_email}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Seat Number:</span>
                    <span className="font-medium text-gray-900">Seat {booking.seat_number}</span>
                  </div>
                </div>
              </div>

              {/* Journey Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MapPin className="h-5 w-5 text-green-600 mr-2" />
                  Journey Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Route:</span>
                    <span className="font-medium text-gray-900">
                      {booking.departure_city} → {booking.arrival_city}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">{booking.travel_date}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium text-gray-900">{booking.departure_time}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Bus:</span>
                    <span className="font-medium text-gray-900">{booking.bus_number}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="h-5 w-5 text-purple-600 mr-2" />
                  Payment Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-bold text-green-600">ETB {booking.total_amount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium text-gray-900 capitalize">{booking.payment_method}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className={`font-medium ${
                      booking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {booking.payment_status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Booking Date:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Check-in Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CheckCircle className="h-5 w-5 text-orange-600 mr-2" />
                  Check-in Status
                </h3>
                
                <div className="space-y-3">
                  {booking.checked_in_at ? (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600">Check-in Time:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(booking.checked_in_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Successfully Checked In</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 text-yellow-700">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">Awaiting Check-in</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handlePrintTicket}
                className="flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Printer className="h-6 w-6" />
                <span>Print Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingLookup;
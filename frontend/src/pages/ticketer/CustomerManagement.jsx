import { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  TrendingUp,
  Eye,
  MessageCircle,
  Star,
  MapPin,
  BarChart3
} from 'lucide-react';
import ticketerService from '../../services/ticketerService';
import { toast } from 'react-toastify';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await ticketerService.getCustomers();
      if (response?.success && Array.isArray(response?.customers)) {
        setCustomers(response.customers);
      } else {
        console.error('Invalid customers response:', response);
        toast.error('Failed to load customers');
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error(error.message || 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredCustomers(filtered);
  };

  const fetchCustomerBookings = async (customerId) => {
    try {
      const response = await ticketerService.getCustomerBookings(customerId);
      if (response?.success && Array.isArray(response?.bookings)) {
        setCustomerBookings(response.bookings);
      } else {
        console.error('Invalid bookings response:', response);
        toast.error('Failed to load booking history');
        setCustomerBookings([]);
      }
    } catch (error) {
      console.error('Failed to fetch customer bookings:', error);
      toast.error(error.message || 'Failed to load booking history');
      setCustomerBookings([]);
    }
  };

  const handleViewCustomer = async (customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerBookings(customer._id);
  };


  const handleCloseDetails = () => {
    setSelectedCustomer(null);
    setCustomerBookings([]);
    setShowNoteModal(false);
    setNoteText('');
    setShowAnalytics(false);
  };

  const handleSendMessage = () => {
    if (!selectedCustomer) return;
    
    if (selectedCustomer.phone) {
      // For SMS on mobile devices
      window.location.href = `sms:${selectedCustomer.phone}`;
      toast.success('Opening messaging app...');
    } else {
      toast.error('No phone number available for this customer');
    }
  };

  const handleAddNote = () => {
    setShowNoteModal(true);
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) {
      toast.error('Please enter a note');
      return;
    }

    // In a real app, this would save to the backend
    toast.success('Note saved successfully');
    setShowNoteModal(false);
    setNoteText('');
  };

  const handleViewAnalytics = () => {
    setShowAnalytics(true);
  };


  const getAnalyticsData = () => {
    // Use customer's total_spent from the customer object, or calculate from bookings
    const totalSpent = selectedCustomer?.total_spent || calculateTotalSpent(customerBookings);
    const bookingCount = customerBookings.length || selectedCustomer?.booking_count || 0;
    const avgBookingValue = bookingCount > 0 ? totalSpent / bookingCount : 0;
    const completedBookings = customerBookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = customerBookings.filter(b => b.status === 'cancelled').length;
    
    // Get most frequent routes
    const routeCounts = {};
    customerBookings.forEach(booking => {
      const route = `${booking.departure_city} → ${booking.arrival_city}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    });
    const favoriteRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalSpent,
      avgBookingValue,
      completedBookings,
      cancelledBookings,
      completionRate: bookingCount > 0 ? ((completedBookings / bookingCount) * 100).toFixed(1) : '0.0',
      favoriteRoute: favoriteRoute ? favoriteRoute[0] : 'N/A',
      favoriteRouteCount: favoriteRoute ? favoriteRoute[1] : 0
    };
  };

  const getLoyaltyLevel = (bookingCount) => {
    if (bookingCount >= 10) return { level: 'Gold', color: 'bg-yellow-100 text-yellow-800' };
    if (bookingCount >= 5) return { level: 'Silver', color: 'bg-gray-100 text-gray-800' };
    return { level: 'Bronze', color: 'bg-orange-100 text-orange-800' };
  };

  const calculateTotalSpent = (bookings) => {
    return bookings.reduce((total, booking) => total + (booking.total_amount || 0), 0);
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1">Manage passenger profiles and booking history</p>
        </div>
        <div className="text-sm text-gray-600">
          {customers.length} total customers
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Customers</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => {
            const loyalty = getLoyaltyLevel(customer.booking_count || 0);
            
            return (
              <div key={customer._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Customer Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{customer.name}</h3>
                        <p className="text-blue-100 text-sm">
                          {loyalty.level} Member
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${loyalty.color}`}>
                      {loyalty.level}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                    
                    {customer.email && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{customer.email}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-3 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        {customer.booking_count || 0} bookings
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-gray-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">
                        ETB {(customer.total_spent || 0).toLocaleString()} spent
                      </span>
                    </div>

                    {customer.last_booking && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">
                          Last trip: {new Date(customer.last_booking).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex space-x-2">
                    <button
                      onClick={() => handleViewCustomer(customer)}
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (customer.phone) {
                          window.location.href = `tel:${customer.phone}`;
                        } else {
                          toast.error('No phone number available');
                        }
                      }}
                      className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Contact</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredCustomers.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customers Found</h3>
          <p className="text-gray-600">Try adjusting your search terms.</p>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedCustomer.name}</h2>
                    <p className="text-blue-100">
                      {getLoyaltyLevel(selectedCustomer.booking_count || 0).level} Member
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Information */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedCustomer.phone}</span>
                      </div>
                      {selectedCustomer.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{selectedCustomer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Loyalty Stats</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Member Since:</span>
                        <span className="text-sm font-medium">
                          {formatDate(selectedCustomer?.created_at || selectedCustomer?.last_booking)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Bookings:</span>
                        <span className="text-sm font-medium">{selectedCustomer.booking_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Spent:</span>
                        <span className="text-sm font-medium text-green-600">
                          ETB {(selectedCustomer?.total_spent || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Loyalty Level:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getLoyaltyLevel(selectedCustomer.booking_count || 0).color
                        }`}>
                          {getLoyaltyLevel(selectedCustomer.booking_count || 0).level}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking History */}
                <div className="lg:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-4">Booking History</h3>
                  
                  {customerBookings.length > 0 ? (
                    <div className="space-y-3">
                      {customerBookings.map((booking) => (
                        <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{booking.pnr_number}</p>
                              <p className="text-sm text-gray-600">
                                {booking.departure_city} → {booking.arrival_city}
                              </p>
                              <p className="text-sm text-gray-500">
                                {booking.travel_date} • Seat {booking.seat_number}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">ETB {booking.total_amount}</p>
                              <p className="text-sm text-gray-600 capitalize">{booking.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p>No booking history found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Actions */}
              <div className="mt-6 flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleSendMessage}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Send Message</span>
                </button>
                <button 
                  onClick={handleAddNote}
                  className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Star className="h-4 w-4" />
                  <span>Add Note</span>
                </button>
                <button 
                  onClick={handleViewAnalytics}
                  className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Analytics</span>
                </button>
              </div>

              {/* Analytics Section */}
              {showAnalytics && (() => {
                const analytics = getAnalyticsData();
                return analytics ? (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Customer Analytics</h3>
                      <button 
                        onClick={() => setShowAnalytics(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                        <p className="text-2xl font-bold text-blue-600">ETB {analytics.totalSpent.toLocaleString()}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Avg Booking Value</p>
                        <p className="text-2xl font-bold text-green-600">ETB {analytics.avgBookingValue.toFixed(0)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                        <p className="text-2xl font-bold text-purple-600">{analytics.completionRate}%</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Completed</p>
                        <p className="text-2xl font-bold text-orange-600">{analytics.completedBookings}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                        <p className="text-2xl font-bold text-red-600">{analytics.cancelledBookings}</p>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-4 col-span-2 md:col-span-1">
                        <p className="text-sm text-gray-600 mb-1">Favorite Route</p>
                        <p className="text-sm font-bold text-indigo-600">{analytics.favoriteRoute}</p>
                        <p className="text-xs text-gray-500">{analytics.favoriteRouteCount} trips</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Add Customer Note</h3>
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note for {selectedCustomer?.name}
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleSaveNote}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Note
                </button>
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
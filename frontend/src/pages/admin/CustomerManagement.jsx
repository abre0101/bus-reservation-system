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
import { adminService } from '../../services/adminService';
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
      const response = await adminService.getCustomers();
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
      const response = await adminService.getCustomerBookings(customerId);
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

  const getLoyaltyLevel = (customer) => {
    // Calculate loyalty points if not provided
    const points = customer.loyalty_points || 
      ((customer.booking_count || 0) * 100) + ((customer.completed_trips || 0) * 50);
    
    if (points >= 5000) return { level: 'Gold', color: 'bg-yellow-100 text-yellow-800' };
    if (points >= 2000) return { level: 'Silver', color: 'bg-gray-200 text-gray-800' };
    if (points >= 500) return { level: 'Bronze', color: 'bg-orange-100 text-orange-800' };
    return { level: 'Member', color: 'bg-blue-100 text-blue-800' };
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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Customer Management</h1>
            <p className="text-indigo-100 mt-1">Manage passenger profiles, loyalty points, and booking history</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Total Customers</p>
              <p className="text-4xl font-bold mt-2">{customers.length}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-xl p-3">
              <User className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wide">Active Bookings</p>
              <p className="text-4xl font-bold mt-2">{customers.reduce((sum, c) => sum + (c.booking_count || 0), 0)}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-xl p-3">
              <Calendar className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">Total Revenue</p>
              <p className="text-4xl font-bold mt-2">{customers.reduce((sum, c) => sum + (c.total_spent || 0), 0).toLocaleString()}</p>
              <p className="text-purple-100 text-sm mt-1">ETB</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-xl p-3">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium uppercase tracking-wide">Gold Members</p>
              <p className="text-4xl font-bold mt-2">{customers.filter(c => (c.booking_count || 0) >= 10).length}</p>
            </div>
            <div className="bg-yellow-400 bg-opacity-30 rounded-xl p-3">
              <Star className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900">Search Customers</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search by Name, Phone, or Email</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => {
            const loyalty = getLoyaltyLevel(customer);
            
            return (
              <div key={customer._id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all transform hover:scale-105">
                {/* Customer Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shadow-md">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{customer.name}</h3>
                        <p className="text-indigo-100 text-sm">
                          {loyalty.level} Member
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${loyalty.color}`}>
                      {loyalty.level}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                      <Phone className="h-5 w-5 text-indigo-600" />
                      <span className="text-sm font-medium">{customer.phone}</span>
                    </div>
                    
                    {customer.email && (
                      <div className="flex items-center space-x-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                        <Mail className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-medium">{customer.email}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-blue-700 font-semibold uppercase">Bookings</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{customer.booking_count || 0}</p>
                      </div>

                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-700 font-semibold uppercase">Spent</span>
                        </div>
                        <p className="text-lg font-bold text-green-900">{(customer.total_spent || 0).toLocaleString()}</p>
                        <p className="text-xs text-green-700">ETB</p>
                      </div>
                    </div>

                    {/* Loyalty Points */}
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-yellow-300 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg shadow-md">
                            <Star className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-yellow-800 font-semibold uppercase">Loyalty Points</p>
                            <p className="text-2xl font-bold text-yellow-900">
                              {(() => {
                                const points = customer.loyalty_points || 
                                  ((customer.booking_count || 0) * 100) + ((customer.completed_trips || 0) * 50);
                                return points.toLocaleString();
                              })()}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {customer.booking_count || 0} bookings × 100 + {customer.completed_trips || 0} trips × 50
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            (() => {
                              const points = customer.loyalty_points || 
                                ((customer.booking_count || 0) * 100) + ((customer.completed_trips || 0) * 50);
                              return points >= 5000 ? 'bg-yellow-100 text-yellow-800' :
                                     points >= 2000 ? 'bg-gray-200 text-gray-800' :
                                     points >= 500 ? 'bg-orange-100 text-orange-800' :
                                     'bg-blue-100 text-blue-800';
                            })()
                          }`}>
                            {(() => {
                              const points = customer.loyalty_points || 
                                ((customer.booking_count || 0) * 100) + ((customer.completed_trips || 0) * 50);
                              return points >= 5000 ? '🥇 Gold' :
                                     points >= 2000 ? '🥈 Silver' :
                                     points >= 500 ? '🥉 Bronze' :
                                     '👤 Member';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {customer.last_booking && (
                      <div className="flex items-center space-x-3 text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <MapPin className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-xs text-purple-700 font-semibold uppercase">Last Trip</p>
                          <p className="text-sm font-medium text-purple-900">
                            {new Date(customer.last_booking).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex space-x-2">
                    <button
                      onClick={() => handleViewCustomer(customer)}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold"
                    >
                      <Eye className="h-5 w-5" />
                      <span>View Details</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (customer.phone) {
                          window.location.href = `tel:${customer.phone}`;
                        } else {
                          toast.error('No phone number available');
                        }
                      }}
                      className="flex items-center justify-center space-x-2 border-2 border-indigo-600 text-indigo-600 px-4 py-3 rounded-xl hover:bg-indigo-50 transition-all font-semibold"
                    >
                      <MessageCircle className="h-5 w-5" />
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
        <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-gray-200">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Customers Found</h3>
          <p className="text-gray-600">Try adjusting your search terms or check back later.</p>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shadow-lg">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedCustomer.name}</h2>
                    <p className="text-indigo-100 text-lg">
                      {getLoyaltyLevel(selectedCustomer).level} Member
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Information */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-md">
                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center text-lg">
                      <Phone className="h-5 w-5 mr-2" />
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                        <Phone className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-semibold text-gray-900">{selectedCustomer.phone}</span>
                      </div>
                      {selectedCustomer.email && (
                        <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                          <Mail className="h-5 w-5 text-indigo-600" />
                          <span className="text-sm font-semibold text-gray-900">{selectedCustomer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                      <Star className="h-5 w-5 mr-2 text-yellow-500" />
                      Loyalty Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Member Since:</span>
                        <span className="text-sm font-bold text-gray-900">
                          {formatDate(selectedCustomer?.created_at || selectedCustomer?.last_booking)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Total Bookings:</span>
                        <span className="text-sm font-bold text-indigo-600">{selectedCustomer.booking_count || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Total Spent:</span>
                        <span className="text-sm font-bold text-green-600">
                          ETB {(selectedCustomer?.total_spent || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Loyalty Tier:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                          (() => {
                            const points = selectedCustomer.loyalty_points || 
                              ((selectedCustomer.booking_count || 0) * 100) + ((selectedCustomer.completed_trips || 0) * 50);
                            return points >= 5000 ? 'bg-yellow-100 text-yellow-800' :
                                   points >= 2000 ? 'bg-gray-200 text-gray-800' :
                                   points >= 500 ? 'bg-orange-100 text-orange-800' :
                                   'bg-blue-100 text-blue-800';
                          })()
                        }`}>
                          {(() => {
                            const points = selectedCustomer.loyalty_points || 
                              ((selectedCustomer.booking_count || 0) * 100) + ((selectedCustomer.completed_trips || 0) * 50);
                            return points >= 5000 ? '🥇 Gold (5000+)' :
                                   points >= 2000 ? '🥈 Silver (2000+)' :
                                   points >= 500 ? '🥉 Bronze (500+)' :
                                   '👤 Member';
                          })()}
                        </span>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-yellow-300 mt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg shadow-md">
                              <Star className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-yellow-800 font-semibold uppercase">Loyalty Points</p>
                              <p className="text-3xl font-bold text-yellow-900">
                                {(() => {
                                  const points = selectedCustomer.loyalty_points || 
                                    ((selectedCustomer.booking_count || 0) * 100) + ((selectedCustomer.completed_trips || 0) * 50);
                                  return points.toLocaleString();
                                })()}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {selectedCustomer.booking_count || 0} bookings × 100 + {selectedCustomer.completed_trips || 0} completed trips × 50
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-yellow-200">
                          <p className="text-xs text-yellow-700">
                            <strong>Earn 100 points</strong> per booking • <strong>50 bonus points</strong> per completed trip
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            🥇 Gold: 5000+ pts • 🥈 Silver: 2000+ pts • 🥉 Bronze: 500+ pts
                          </p>
                        </div>
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
              <div className="mt-6 flex flex-wrap gap-3 pt-6 border-t-2 border-gray-200">
                <button 
                  onClick={handleSendMessage}
                  className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Send Message</span>
                </button>
                <button 
                  onClick={handleAddNote}
                  className="flex items-center space-x-2 border-2 border-indigo-600 text-indigo-600 px-6 py-3 rounded-xl hover:bg-indigo-50 transition-all font-semibold"
                >
                  <Star className="h-5 w-5" />
                  <span>Add Note</span>
                </button>
                <button 
                  onClick={handleViewAnalytics}
                  className="flex items-center space-x-2 border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-xl hover:bg-purple-50 transition-all font-semibold"
                >
                  <BarChart3 className="h-5 w-5" />
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
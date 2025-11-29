import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, CheckCircle, XCircle, User, Bus, MapPin, Clock, Ticket, 
  AlertCircle, QrCode, RefreshCw, Calendar, Users, Filter, Download,
  Shield, Bell, Wifi, WifiOff, Camera, X
} from 'lucide-react';
import { toast } from 'react-toastify';

const CheckIn = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('pnr');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [pendingCheckins, setPendingCheckins] = useState([]);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0, pending: 0, cancelled: 0, unpaid: 0, completed: 0 });
  const [selectedSchedule, setSelectedSchedule] = useState('all');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [idVerification, setIdVerification] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const autoRefreshInterval = useRef(null);

  useEffect(() => {
    fetchTodaySchedules();
    fetchRecentCheckins();
    fetchPendingCheckins();
    fetchStats();
    loadOfflineQueue();
    
    // Online/Offline detection
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
    };
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshInterval.current = setInterval(() => {
        fetchRecentCheckins();
        fetchPendingCheckins();
        fetchStats();
      }, 30000); // Refresh every 30 seconds
    } else {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
    }
    return () => {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
    };
  }, [autoRefresh]);

  const handleOnline = () => {
    setIsOffline(false);
    toast.success('Connection restored');
    syncOfflineQueue();
  };

  const handleOffline = () => {
    setIsOffline(true);
    toast.warning('You are offline. Check-ins will be queued.');
  };

  const loadOfflineQueue = () => {
    const queue = localStorage.getItem('checkinQueue');
    if (queue) {
      setOfflineQueue(JSON.parse(queue));
    }
  };

  const saveOfflineQueue = (queue) => {
    localStorage.setItem('checkinQueue', JSON.stringify(queue));
    setOfflineQueue(queue);
  };

  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('checkinQueue') || '[]');
    if (queue.length === 0) return;

    toast.info(`Syncing ${queue.length} offline check-ins...`);
    let successCount = 0;

    for (const item of queue) {
      try {
        const token = getAuthToken();
        await axios.post(
          `${import.meta.env.VITE_API_URL}/operator/bookings/${item.bookingId}/checkin`,
          item.data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        successCount++;
      } catch (error) {
        console.error('Failed to sync check-in:', error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} check-ins synced successfully`);
      localStorage.removeItem('checkinQueue');
      setOfflineQueue([]);
      fetchRecentCheckins();
      fetchPendingCheckins();
      fetchStats();
    }
  };

  const getAuthToken = () => {
    return sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('operatorToken');
  };

  const fetchTodaySchedules = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/operator/schedules?status=active&timeframe=today`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTodaySchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      if (!isOffline) toast.error('Failed to load today\'s schedules');
    }
  };

  const fetchRecentCheckins = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/operator/checkins/recent`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecentCheckins(response.data.checkins || []);
    } catch (error) {
      console.error('Error fetching recent check-ins:', error);
    }
  };

  const fetchPendingCheckins = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/operator/checkins/pending`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingCheckins(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching pending check-ins:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/operator/checkins/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data.stats || { total: 0, checkedIn: 0, pending: 0, cancelled: 0, unpaid: 0, completed: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const searchBooking = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search value');
      return;
    }

    setLoading(true);
    setBookingDetails(null);

    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/operator/bookings/search`,
        {
          params: { [searchType]: searchQuery },
          headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.booking) {
        setBookingDetails(response.data.booking);
        toast.success('Booking found!');
      } else {
        toast.error('No booking found');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to search booking');
    } finally {
      setLoading(false);
    }
  };

  // Calculate time remaining until check-in closes or opens
  const getTimeRemaining = (booking) => {
    try {
      // Use backend-provided time info if available
      if (booking.checkin_message) {
        return booking.checkin_message;
      }
      
      const travelDate = new Date(booking.travel_date);
      const departureTime = booking.departure_time;
      
      if (departureTime) {
        const [hours, minutes] = departureTime.split(':');
        travelDate.setHours(parseInt(hours), parseInt(minutes), 0);
        
        const now = new Date();
        const checkinOpensAt = new Date(travelDate.getTime() - 24 * 60 * 60 * 1000);
        const diffToDeparture = travelDate - now;
        const diffToCheckinOpen = checkinOpensAt - now;
        
        // Check-in hasn't opened yet
        if (diffToCheckinOpen > 0) {
          const hours = Math.floor(diffToCheckinOpen / (1000 * 60 * 60));
          const minutes = Math.floor((diffToCheckinOpen % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `Opens in ${days}d ${hours % 24}h`;
          } else if (hours > 0) {
            return `Opens in ${hours}h ${minutes}m`;
          } else {
            return `Opens in ${minutes}m`;
          }
        }
        
        // Check-in is open, show time until departure
        if (diffToDeparture > 0) {
          const hours = Math.floor(diffToDeparture / (1000 * 60 * 60));
          const minutes = Math.floor((diffToDeparture % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `Departs in ${days}d ${hours % 24}h`;
          } else if (hours > 0) {
            return `Departs in ${hours}h ${minutes}m`;
          } else {
            return `Departs in ${minutes}m`;
          }
        }
        
        return 'Departed';
      }
    } catch (error) {
      console.error('Time calculation error:', error);
    }
    return 'N/A';
  };

  // Enhanced validation with time-based restrictions
  const validateCheckIn = (booking) => {
    // Check if cancelled
    if (booking.status === 'cancelled') {
      return { valid: false, message: 'Cannot check in a cancelled booking' };
    }

    // Check if already checked in or completed
    if (booking.status === 'checked_in' || booking.status === 'completed') {
      return { valid: false, message: 'Passenger already checked in' };
    }

    // Check payment status
    if (booking.payment_status !== 'paid') {
      return { valid: false, message: 'Payment must be completed before check-in' };
    }

    // Use backend-provided check-in availability if available
    if (booking.checkin_availability) {
      if (booking.checkin_availability === 'too_early') {
        return { 
          valid: false, 
          message: `Check-in not open yet. ${booking.checkin_message || 'Opens 24 hours before departure'}` 
        };
      } else if (booking.checkin_availability === 'departed') {
        return { 
          valid: true, 
          message: '⚠️ Warning: Bus has departed. Late check-in.',
          warning: true
        };
      } else if (booking.checkin_availability === 'available') {
        return { 
          valid: true, 
          message: '✓ Ready to check in' 
        };
      }
    }

    // Fallback: Time-based validation
    try {
      const travelDate = new Date(booking.travel_date);
      const departureTime = booking.departure_time;
      
      if (departureTime) {
        const [hours, minutes] = departureTime.split(':');
        travelDate.setHours(parseInt(hours), parseInt(minutes), 0);
        
        const now = new Date();
        const twentyFourHoursBefore = new Date(travelDate.getTime() - 24 * 60 * 60 * 1000);

        // Block if too early (more than 24 hours before departure)
        if (now < twentyFourHoursBefore) {
          return { 
            valid: false, 
            message: `Check-in opens 24 hours before departure` 
          };
        }

        // Warning if bus has already departed
        if (now > travelDate) {
          return { 
            valid: true, 
            message: '⚠️ Warning: Bus departure time has passed.',
            warning: true
          };
        }
      }
    } catch (error) {
      console.error('Date validation error:', error);
    }

    return { valid: true, message: '✓ Ready to check in' };
  };

  const handleCheckIn = async () => {
    if (!bookingDetails) return;

    // Enhanced validation
    const validation = validateCheckIn(bookingDetails);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setLoading(true);

    const checkinData = {
      checked_in_at: new Date().toISOString(),
      checked_in_by: 'operator',
      id_verified: idVerification || null,
      operator_notes: `Checked in via ${isOffline ? 'offline' : 'online'} mode`
    };

    try {
      if (isOffline) {
        // Queue for offline sync
        const queue = [...offlineQueue, {
          bookingId: bookingDetails._id || bookingDetails.booking_id,
          data: checkinData,
          timestamp: new Date().toISOString()
        }];
        saveOfflineQueue(queue);
        toast.success('✅ Check-in queued (offline mode)');
      } else {
        const token = getAuthToken();
        await axios.post(
          `${import.meta.env.VITE_API_URL}/operator/bookings/${bookingDetails._id || bookingDetails.booking_id}/checkin`,
          checkinData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        toast.success('✅ Passenger checked in successfully!');
        
        // Send notification if enabled
        if (notificationEnabled) {
          sendCheckInNotification(bookingDetails);
        }
      }

      setBookingDetails({ ...bookingDetails, check_in_status: 'checked_in', checked_in_at: new Date() });
      
      // Refresh data
      fetchTodaySchedules();
      fetchRecentCheckins();
      fetchPendingCheckins();
      fetchStats();
      
      // Clear form
      setTimeout(() => {
        setSearchQuery('');
        setBookingDetails(null);
        setIdVerification('');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check in passenger');
    } finally {
      setLoading(false);
    }
  };

  // Bulk check-in functionality
  const handleBulkCheckIn = async () => {
    if (selectedBookings.length === 0) {
      toast.error('No bookings selected');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const bookingId of selectedBookings) {
      const booking = pendingCheckins.find(b => (b._id || b.booking_id) === bookingId);
      if (!booking) continue;

      const validation = validateCheckIn(booking);
      if (!validation.valid) {
        failCount++;
        continue;
      }

      try {
        const token = getAuthToken();
        await axios.post(
          `${import.meta.env.VITE_API_URL}/operator/bookings/${bookingId}/checkin`,
          {
            checked_in_at: new Date().toISOString(),
            checked_in_by: 'operator',
            bulk_checkin: true
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    toast.success(`✅ ${successCount} passengers checked in successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
    
    setSelectedBookings([]);
    setBulkMode(false);
    fetchRecentCheckins();
    fetchPendingCheckins();
    fetchStats();
    setLoading(false);
  };

  const toggleBookingSelection = (bookingId) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  // Send notification (SMS/Email)
  const sendCheckInNotification = async (booking) => {
    try {
      const token = getAuthToken();
      await axios.post(
        `${import.meta.env.VITE_API_URL}/operator/notifications/checkin`,
        {
          booking_id: booking._id || booking.booking_id,
          passenger_phone: booking.passenger_phone || booking.phone_number,
          passenger_email: booking.passenger_email,
          pnr: booking.pnr_number
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  // QR Code Scanner
  const startQRScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanQRCode();
      }
    } catch (error) {
      toast.error('Camera access denied');
      setShowQRScanner(false);
    }
  };

  const stopQRScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowQRScanner(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Here you would integrate a QR code library like jsQR
    // For now, we'll simulate it
    setTimeout(() => scanQRCode(), 100);
  };

  useEffect(() => {
    if (showQRScanner) {
      startQRScanner();
    } else {
      stopQRScanner();
    }
    return () => stopQRScanner();
  }, [showQRScanner]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      searchBooking();
    }
  };

  const exportCheckins = () => {
    const csvContent = [
      ['PNR', 'Passenger Name', 'Phone', 'Route', 'Seats', 'Status', 'Check-in Time', 'ID Verified'].join(','),
      ...recentCheckins.map(checkin => [
        checkin.pnr_number,
        checkin.passenger_name,
        checkin.passenger_phone,
        `${checkin.departure_city} → ${checkin.arrival_city}`,
        checkin.seat_numbers?.join(';') || '',
        checkin.check_in_status,
        new Date(checkin.checked_in_at).toLocaleString(),
        checkin.id_verified || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checkins_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Check-ins exported successfully!');
  };

  const filteredSchedules = selectedSchedule === 'all' 
    ? todaySchedules 
    : todaySchedules.filter(s => s._id === selectedSchedule);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            Passenger Check-in
            {isOffline && (
              <span className="flex items-center gap-1 text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                <WifiOff className="w-4 h-4" />
                Offline Mode
              </span>
            )}
            {offlineQueue.length > 0 && (
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {offlineQueue.length} Queued
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">Manage passenger check-ins for today's trips</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              fetchTodaySchedules();
              fetchRecentCheckins();
              fetchPendingCheckins();
              fetchStats();
              toast.info('Data refreshed');
            }}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
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
            onClick={() => setNotificationEnabled(!notificationEnabled)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
              notificationEnabled 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
              bulkMode 
                ? 'bg-purple-50 border-purple-300 text-purple-700' 
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Bulk Mode
          </button>
          {recentCheckins.length > 0 && (
            <button
              onClick={exportCheckins}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-800">Pending Check-ins</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{stats.pending}</p>
              <p className="text-sm text-orange-700 mt-1">Need attention</p>
            </div>
            <Clock className="h-10 w-10 text-orange-600" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800">Checked-in Today</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.checkedIn}</p>
              <p className="text-sm text-green-700 mt-1">Successfully checked in</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">Active Schedules</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{todaySchedules.length}</p>
              <p className="text-sm text-blue-700 mt-1">Running today</p>
            </div>
            <Calendar className="h-10 w-10 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by PNR, name, or phone..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Schedule</label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Schedules</option>
              {todaySchedules.map(schedule => (
                <option key={schedule._id} value={schedule._id}>
                  {schedule.departure_city} → {schedule.arrival_city} ({schedule.departure_time})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Connection Status Banner */}
      {isOffline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-900">Offline Mode</p>
            <p className="text-sm text-yellow-700">Check-ins will be queued and synced when connection is restored</p>
          </div>
        </div>
      )}

      {offlineQueue.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">{offlineQueue.length} Check-ins Queued</p>
            <p className="text-sm text-blue-700">Waiting to sync with server</p>
          </div>
        </div>
      )}

      {/* Bulk Check-in Actions */}
      {bulkMode && selectedBookings.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-900">
                {selectedBookings.length} passenger{selectedBookings.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkCheckIn}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Check In All
              </button>
              <button
                onClick={() => setSelectedBookings([])}
                className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search Booking
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pnr">PNR Number</option>
              <option value="booking_id">Booking ID</option>
              <option value="phone">Phone Number</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'pnr' ? 'PNR Number' :
               searchType === 'booking_id' ? 'Booking ID' : 
               searchType === 'phone' ? 'Phone Number' : 'Email Address'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  searchType === 'pnr' ? 'Enter PNR number' :
                  searchType === 'booking_id' ? 'Enter booking ID' :
                  searchType === 'phone' ? 'Enter phone number' :
                  'Enter email address'
                }
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={searchBooking}
                disabled={loading || isOffline}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button
                onClick={() => setShowQRScanner(!showQRScanner)}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                title="Scan QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Scan QR Code
              </h3>
              <button
                onClick={() => setShowQRScanner(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-64 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-4 border-blue-500 opacity-50 pointer-events-none" 
                   style={{ margin: '20%' }} />
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Position the QR code within the frame
            </p>
          </div>
        </div>
      )}

      {/* Booking Details */}
      {bookingDetails && (
        <div id="booking-details" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Booking Details</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              bookingDetails.check_in_status === 'checked_in' 
                ? 'bg-green-100 text-green-800'
                : bookingDetails.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {bookingDetails.check_in_status === 'checked_in' ? '✓ Checked In' : 
               bookingDetails.status === 'cancelled' ? '✗ Cancelled' :
               '⏳ Pending Check-in'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Passenger Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Passenger Information
              </h3>
              <div className="space-y-3 pl-7">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium text-gray-900">{bookingDetails.passenger_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Phone:</span>
                  <p className="font-medium text-gray-900">{bookingDetails.passenger_phone || bookingDetails.phone_number}</p>
                </div>
                {bookingDetails.passenger_email && (
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <p className="font-medium text-gray-900 text-sm">{bookingDetails.passenger_email}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600">Seats:</span>
                  <p className="font-medium text-gray-900">
                    {bookingDetails.seat_numbers?.join(', ') || bookingDetails.number_of_seats + ' seat(s)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Trip Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Bus className="w-5 h-5 text-green-600" />
                Trip Information
              </h3>
              <div className="space-y-3 pl-7">
                <div>
                  <span className="text-sm text-gray-600">Route:</span>
                  <p className="font-medium text-gray-900">
                    {bookingDetails.departure_city || bookingDetails.origin} → {bookingDetails.arrival_city || bookingDetails.destination}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Travel Date:</span>
                  <p className="font-medium text-gray-900">{bookingDetails.travel_date}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Departure Time:</span>
                  <p className="font-medium text-gray-900">{bookingDetails.departure_time}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Bus:</span>
                  <p className="font-medium text-gray-900">{bookingDetails.bus_number || bookingDetails.bus_plate_number || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Booking Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-purple-600" />
                Booking Information
              </h3>
              <div className="space-y-3 pl-7">
                <div>
                  <span className="text-sm text-gray-600">PNR:</span>
                  <p className="font-medium font-mono text-gray-900">{bookingDetails.pnr_number}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Booking Date:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(bookingDetails.created_at || bookingDetails.booking_date).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Total Fare:</span>
                  <p className="font-medium text-gray-900">ETB {bookingDetails.total_amount || bookingDetails.total_fare}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Payment Status:</span>
                  <p className={`font-medium ${
                    bookingDetails.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {bookingDetails.payment_status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ID Verification Section */}
          {bookingDetails.check_in_status !== 'checked_in' && bookingDetails.status !== 'cancelled' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  ID Verification (Optional)
                </label>
                <input
                  type="text"
                  value={idVerification}
                  onChange={(e) => setIdVerification(e.target.value)}
                  placeholder="Enter passenger ID number for verification"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Validation Warnings */}
              {(() => {
                const validation = validateCheckIn(bookingDetails);
                if (!validation.valid) {
                  return (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">Check-in Blocked</p>
                        <p className="text-sm text-red-700 mt-1">{validation.message}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCheckIn}
                  disabled={loading || !validateCheckIn(bookingDetails).valid}
                  className="flex-1 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                  {loading ? 'Processing...' : isOffline ? 'Queue Check-In (Offline)' : 'Check In Passenger'}
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setBookingDetails(null);
                    setIdVerification('');
                  }}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Check-ins List */}
      {pendingCheckins.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending Check-ins ({pendingCheckins.length})
            </h2>
            {bulkMode && (
              <button
                onClick={() => {
                  const allIds = pendingCheckins.map(b => b._id || b.booking_id);
                  setSelectedBookings(allIds);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {bulkMode && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departure</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingCheckins.slice(0, 10).map((booking) => {
                  const bookingId = booking._id || booking.booking_id;
                  const validation = validateCheckIn(booking);
                  
                  return (
                    <tr key={bookingId} className="hover:bg-gray-50">
                      {bulkMode && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedBookings.includes(bookingId)}
                            onChange={() => toggleBookingSelection(bookingId)}
                            disabled={!validation.valid}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono text-sm">{booking.pnr_number}</td>
                      <td className="px-4 py-3 text-sm font-medium">{booking.passenger_name}</td>
                      <td className="px-4 py-3 text-sm">{booking.passenger_phone || booking.phone_number}</td>
                      <td className="px-4 py-3 text-sm">
                        {booking.departure_city || booking.origin} → {booking.arrival_city || booking.destination}
                      </td>
                      <td className="px-4 py-3 text-sm">{booking.departure_time}</td>
                      <td className="px-4 py-3 text-sm">{booking.seat_numbers?.join(', ') || booking.number_of_seats}</td>
                      <td className="px-4 py-3">
                        {validation.valid ? (
                          validation.warning ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center gap-1 w-fit">
                              <AlertCircle className="w-3 h-3" />
                              Warning
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" />
                              Ready
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            Blocked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs">
                        {validation.valid ? (
                          <div className="flex flex-col gap-1">
                            <span className={`font-medium ${validation.warning ? 'text-yellow-600' : 'text-green-600'}`}>
                              {validation.message}
                            </span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getTimeRemaining(booking)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-red-600">{validation.message}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={async () => {
                            // Block if check-in is not available
                            if (!validation.valid) {
                              toast.warning(validation.message);
                              return;
                            }
                            
                            // Directly search with PNR instead of using state
                            setLoading(true);
                            setBookingDetails(null);
                            
                            try {
                              const token = getAuthToken();
                              const response = await axios.get(
                                `${import.meta.env.VITE_API_URL}/operator/bookings/search`,
                                {
                                  params: { pnr: booking.pnr_number },
                                  headers: { Authorization: `Bearer ${token}` }
                                }
                              );
                              
                              if (response.data.success && response.data.booking) {
                                setBookingDetails(response.data.booking);
                                setSearchQuery(booking.pnr_number);
                                toast.success('Booking found! Ready for check-in');
                                
                                // Scroll to booking details
                                setTimeout(() => {
                                  document.getElementById('booking-details')?.scrollIntoView({ 
                                    behavior: 'smooth', 
                                    block: 'start' 
                                  });
                                }, 100);
                              } else {
                                toast.error('Booking not found');
                              }
                            } catch (error) {
                              console.error('Search error:', error);
                              toast.error(error.response?.data?.error || 'Failed to search booking');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={!validation.valid || loading}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                            validation.valid && !loading
                              ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                          }`}
                          title={validation.valid ? 'Check in passenger' : validation.message}
                        >
                          {!validation.valid ? (
                            <>
                              <XCircle className="w-4 h-4" />
                              Not Available
                            </>
                          ) : loading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Check In
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      {recentCheckins.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Recent Check-ins ({recentCheckins.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentCheckins.slice(0, 10).map((checkin) => (
                  <tr key={checkin._id || checkin.booking_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{checkin.pnr_number}</td>
                    <td className="px-4 py-3 text-sm font-medium">{checkin.passenger_name}</td>
                    <td className="px-4 py-3 text-sm">{checkin.passenger_phone}</td>
                    <td className="px-4 py-3 text-sm">
                      {checkin.departure_city} → {checkin.arrival_city}
                    </td>
                    <td className="px-4 py-3 text-sm">{checkin.seat_numbers?.join(', ')}</td>
                    <td className="px-4 py-3 text-sm">{new Date(checkin.checked_in_at).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 text-sm">
                      {checkin.id_verified ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Shield className="w-4 h-4" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's Schedules */}
      {todaySchedules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Today's Schedules ({todaySchedules.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySchedules.map((schedule) => (
              <div key={schedule._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bus className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">{schedule.bus_number || schedule.bus_plate_number}</span>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {schedule.departure_time}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{schedule.departure_city} → {schedule.arrival_city}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-medium">{schedule.booked_seats || 0}/{schedule.total_seats || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckIn;

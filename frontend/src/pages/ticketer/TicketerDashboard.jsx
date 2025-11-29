import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  BookOpen, 
  Clock,
  Plus,
  Search,
  CheckCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ticketerService from '../../services/ticketerService';

const TicketerDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingCheckins: 0,
    todayRevenue: 0,
    todayBookings: 0,
    activeSchedules: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await ticketerService.getDashboardStats();
      if (statsResponse?.success && statsResponse?.stats) {
        setStats(statsResponse.stats);
      } else {
        console.error('Invalid stats response:', statsResponse);
      }

      // Fetch recent bookings
      const bookingsResponse = await ticketerService.getBookings({ 
        status: 'all',
        date: new Date().toISOString().split('T')[0]
      });
      if (bookingsResponse?.success && Array.isArray(bookingsResponse?.bookings)) {
        setRecentBookings(bookingsResponse.bookings.slice(0, 5));
      } else {
        console.error('Invalid bookings response:', bookingsResponse);
        setRecentBookings([]);
      }

      // Fetch upcoming schedules (not just today - show all upcoming)
      const schedulesResponse = await ticketerService.getSchedules({
        // Don't pass date to get all upcoming schedules
      });
      if (schedulesResponse?.success && Array.isArray(schedulesResponse?.schedules)) {
        // Show first 3 upcoming schedules
        setTodaySchedules(schedulesResponse.schedules.slice(0, 3));
      } else {
        console.error('Invalid schedules response:', schedulesResponse);
        setTodaySchedules([]);
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'blue', onClick }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700'
    };

    return (
      <div 
        className={`p-6 rounded-xl border-2 ${colorClasses[color]} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold opacity-80">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-sm opacity-75 mt-1">{subtitle}</p>
          </div>
          <div className="p-3 bg-white rounded-lg">
            {icon}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Clock className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ticketer Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's today's overview.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/ticketer/quick-booking')} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            <span>Quick Booking</span>
          </button>
          <button onClick={() => navigate('/ticketer/booking-lookup')} className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            <Search className="h-4 w-4" />
            <span>Lookup Booking</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pending Check-ins"
          value={stats.pendingCheckins}
          subtitle="Need attention"
          icon={<Users className="h-6 w-6" />}
          color="orange"
          onClick={() => navigate('/ticketer/point-of-sale')}
        />
        
        <StatCard
          title="Today's Revenue"
          value={`ETB ${stats.todayRevenue?.toLocaleString() || '0'}`}
          subtitle="Total sales"
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
          onClick={() => navigate('/ticketer/point-of-sale')}
        />
        
        <StatCard
          title="Today's Bookings"
          value={stats.todayBookings}
          subtitle="New reservations"
          icon={<BookOpen className="h-6 w-6" />}
          color="blue"
          onClick={() => navigate('/ticketer/booking-lookup')}
        />
        
        <StatCard
          title="Active Schedules"
          value={stats.activeSchedules}
          subtitle="Running today"
          icon={<Calendar className="h-6 w-6" />}
          color="purple"
          onClick={() => navigate('/ticketer/schedule-browser')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Schedules</h2>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {todaySchedules.map((schedule) => (
              <div key={schedule._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">{schedule.origin_city} → {schedule.destination_city}</p>
                  <p className="text-sm text-gray-600">{schedule.departure_date} • {schedule.departure_time} • {schedule.bus_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{schedule.booked_seats}/{schedule.total_seats}</p>
                  <p className="text-sm text-gray-600">seats booked</p>
                </div>
              </div>
            ))}
            {todaySchedules.length === 0 && (
              <p className="text-center text-gray-500 py-4">No upcoming schedules</p>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">{booking.passenger_name}</p>
                  <p className="text-sm text-gray-600">{booking.pnr_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">ETB {booking.total_amount}</p>
                  <p className={`text-sm ${
                    booking.status === 'confirmed' ? 'text-green-600' : 
                    booking.status === 'checked_in' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {booking.status}
                  </p>
                </div>
              </div>
            ))}
            {recentBookings.length === 0 && (
              <p className="text-center text-gray-500 py-4">No recent bookings</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => navigate('/ticketer/quick-booking')} className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <Plus className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">New Booking</span>
          </button>
          
          <button onClick={() => navigate('/ticketer/point-of-sale')} className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
            <CheckCircle className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">point-of-sale</span>
          </button>
          
          <button onClick={() => navigate('/ticketer/booking-lookup')} className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <Search className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">Lookup</span>
          </button>
          
          <button onClick={() => navigate('/ticketer/point-of-sale')} className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
            <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketerDashboard;
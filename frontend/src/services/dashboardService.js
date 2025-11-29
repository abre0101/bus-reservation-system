// src/services/dashboardService.js
import api from './api';

export const getDashboardData = async () => {
  try {
    console.log('🔄 Fetching dashboard overview...');
    const response = await api.get('/dashboard/');
    console.log('✅ Dashboard overview loaded');
    return response.data;
  } catch (error) {
    console.error('❌ Dashboard overview error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - redirecting to login');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    
    throw new Error('Failed to load dashboard data');
  }
};

export const getUpcomingTrips = async () => {
  try {
    console.log('🔄 Fetching upcoming trips...');
    const response = await api.get('/dashboard/upcoming-trips');
    const data = response.data;
    
    // Handle real backend response format
    if (data.success && data.upcoming_trips) {
      console.log(`✅ Found ${data.upcoming_trips.length} upcoming trips`);
      return data.upcoming_trips;
    }
    
    // Fallback to direct array if structure is different
    const trips = Array.isArray(data) ? data : [];
    console.log(`✅ Found ${trips.length} upcoming trips`);
    return trips;
  } catch (error) {
    console.error('❌ Upcoming trips error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    
    // Return empty array - let the frontend handle no data state
    return [];
  }
};

export const getRecentActivity = async () => {
  try {
    console.log('🔄 Fetching recent activity...');
    const response = await api.get('/dashboard/recent-bookings');
    const data = response.data;
    
    // Handle real backend response format
    if (data.success && data.bookings) {
      const recent = data.bookings.slice(0, 5);
      console.log(`✅ Found ${recent.length} recent activities`);
      return recent;
    }
    
    // Fallback to direct array if structure is different
    const bookings = Array.isArray(data) ? data : [];
    const recent = bookings.slice(0, 5);
    console.log(`✅ Found ${recent.length} recent activities`);
    return recent;
  } catch (error) {
    console.error('❌ Recent activity error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    
    // Return empty array - real data will show when available
    return [];
  }
};

export const getUserStats = async () => {
  try {
    console.log('🔄 Fetching user statistics...');
    const response = await api.get('/dashboard/stats');
    console.log('✅ User statistics loaded');
    
    // Return the actual data from your backend
    return response.data;
  } catch (error) {
    console.error('❌ User statistics error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    
    // Return minimal fallback - frontend will show zeros
    return {
      totalBookings: 0,
      monthlyBookings: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      loyaltyTier: 'Bronze',
      upcomingTrips: 0,
      completedTrips: 0
    };
  }
};

// Additional dashboard service functions for complete coverage
export const getPopularRoutes = async () => {
  try {
    console.log('🔄 Fetching popular routes...');
    const response = await api.get('/dashboard/routes');
    const data = response.data;
    
    if (data.success && data.popularRoutes) {
      console.log(`✅ Found ${data.popularRoutes.length} popular routes`);
      return data.popularRoutes;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Popular routes error:', error.response?.data || error.message);
    return [];
  }
};

export const getTodaySchedules = async () => {
  try {
    console.log('🔄 Fetching today\'s schedules...');
    const response = await api.get('/dashboard/schedules/today');
    const data = response.data;
    
    if (data.success && data.schedules) {
      console.log(`✅ Found ${data.schedules.length} today's schedules`);
      return data.schedules;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Today schedules error:', error.response?.data || error.message);
    return [];
  }
};

// Comprehensive dashboard data fetcher
export const getAllDashboardData = async () => {
  try {
    console.log('🔄 Fetching all dashboard data...');
    
    const [dashboard, upcoming, recent, stats, routes, schedules] = await Promise.all([
      getDashboardData(),
      getUpcomingTrips(),
      getRecentActivity(),
      getUserStats(),
      getPopularRoutes(),
      getTodaySchedules()
    ]);

    console.log('✅ All dashboard data loaded successfully');
    
    return {
      dashboardOverview: dashboard,
      upcomingTrips: upcoming,
      recentActivity: recent,
      userStats: stats,
      popularRoutes: routes,
      todaySchedules: schedules
    };
  } catch (error) {
    console.error('❌ Failed to load all dashboard data:', error);
    throw error;
  }
};

// Health check for dashboard service
export const checkDashboardHealth = async () => {
  try {
    const response = await api.get('/dashboard/health');
    return response.data;
  } catch (error) {
    console.error('❌ Dashboard health check failed:', error);
    return {
      status: 'unhealthy',
      service: 'dashboard',
      error: error.message
    };
  }
};
// Add this function to your dashboardService.js
export const debugUpcomingTrips = async () => {
  try {
    console.log('🔍 Debugging upcoming trips...');
    const response = await api.get('/dashboard/upcoming-trips');
    console.log('📡 Upcoming trips raw response:', response.data);
    
    // Also check recent bookings to see all bookings
    const recentResponse = await api.get('/dashboard/recent-bookings');
    console.log('📡 Recent bookings raw response:', recentResponse.data);
    
    // Check stats too
    const statsResponse = await api.get('/dashboard/stats');
    console.log('📡 Stats raw response:', statsResponse.data);
    
    return {
      upcoming: response.data,
      recent: recentResponse.data,
      stats: statsResponse.data
    };
  } catch (error) {
    console.error('❌ Debug error:', error);
    return null;
  }
};

export default {
  getDashboardData,
  getUpcomingTrips,
  getRecentActivity,
  getUserStats,
  getPopularRoutes,
  getTodaySchedules,
  getAllDashboardData,
  checkDashboardHealth
};
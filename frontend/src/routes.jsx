import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import PublicPageLayout from './components/common/PublicPageLayout'

// Layout Components
import AdminLayout from './pages/admin/AdminLayout'
import TicketerLayout from './pages/ticketer/TicketerLayout'
import OperatorLayout from './pages/operator/OperatorLayout'
import DriverLayout from './pages/driver/DriverLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import OperatorLogin from './pages/operator/OperatorLogin'
import DriverLogin from './pages/driver/DriverLogin'

// Home Pages
import Home from './pages/home/Home'
import Contact from './pages/home/Contact'
import FAQ from './pages/home/FAQ'
import AvailableRoutes from './pages/home/AvailableRoutes'

// Booking Pages
import SearchForm from './components/booking/SearchForm'
import SchedulesPage from './components/booking/SchedulesPage'
import SeatSelection from './components/booking/SeatSelection'
import PassengerForm from './components/booking/PassengerForm'
import BaggagePage from './pages/booking/BaggagePage'
import PaymentPage from './pages/booking/PaymentPage'
import BookingConfirmation from './pages/booking/BookingConfirmation'
import ChapaCallbackHandler from './components/booking/ChapaCallbackHandler'

// Customer Pages
import Dashboard from './pages/customer/Dashboard'
import MyBookings from './pages/customer/MyBookings'
import Profile from './pages/customer/Profile'
import BookingDetails from './pages/customer/BookingDetails'
import CustomerCheckin from './pages/customer/CustomerCheckin'

// Shared Pages
import Settings from './pages/shared/Settings'
import TermsAndPolicies from './pages/shared/TermsAndPolicies'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminDrivers from './pages/admin/AdminDrivers'
import AdminBuses from './pages/admin/AdminBuses'
import AdminRoutes from './pages/admin/AdminRoutes'
import AdminSchedules from './pages/admin/AdminSchedules'
import AdminBookings from './pages/admin/AdminBookings'
import AdminPayments from './pages/admin/AdminPayments'
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'
import AdminBusTracking from './pages/admin/AdminBusTracking'
import TariffManagement from './pages/admin/TariffManagement'
import AdminCustomerManagement from './pages/admin/CustomerManagement'
import LoyaltyManagement from './pages/admin/LoyaltyManagement'

// Driver Pages - IMPORTANT: Remove DriverLayout from these components
import {
  DriverDashboard,
  DriverTrips,
  DriverTripDetails,
  DriverActiveTrip,
  DriverCheckin,
  DriverPassengers,
  DriverSchedules,
  DriverProfile
} from './pages/driver'
import BusReport from './pages/driver/BusReport'

// Operator Pages
import OperatorDashboard from './pages/operator/OperatorDashboard'
import OperatorSchedules from './pages/operator/Schedules'
import CheckinPage from './pages/operator/CheckinPage'
import OperatorReports from './pages/operator/OperatorReports'
import CancellationRequests from './pages/operator/CancellationRequests'
import BusTracking from './pages/operator/BusTracking'
import BusReports from './pages/operator/BusReports'

// Ticketer Pages (New Components)
import TicketerDashboard from './pages/ticketer/TicketerDashboard'
import QuickBooking from './pages/ticketer/QuickBooking'
import BookingLookup from './pages/ticketer/BookingLookup'
import CustomerManagement from './pages/ticketer/CustomerManagement'
import PointOfSale from './pages/ticketer/PointOfSale'
import ScheduleBrowser from './pages/ticketer/ScheduleBrowser'

// Error Pages
import NotFound from './pages/shared/NotFound'
import Unauthorized from './pages/shared/Unauthorized'

// Simple role-based redirect component
const RoleBasedRedirect = () => {
  const getUserFromStorage = () => {
    try {
      const userData = localStorage.getItem('user')
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      console.error('Error parsing user data:', error)
      return null
    }
  }

  const user = getUserFromStorage()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />
    case 'operator':
      return <Navigate to="/operator/dashboard" replace />
    case 'ticketer':
      return <Navigate to="/ticketer/dashboard" replace />
    case 'driver':
      return <Navigate to="/driver/dashboard" replace />
    default:
      return <Navigate to="/customer/dashboard" replace />
  }
}

// Page Wrappers
const SearchPage = () => (
  <PublicPageLayout>
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-4">
            Book Your Journey
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Find and book bus tickets to destinations across Ethiopia
          </p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 p-8 max-w-4xl mx-auto">
          <SearchForm />
        </div>
      </div>
    </div>
  </PublicPageLayout>
)

const PassengerDetailsPage = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="container mx-auto px-4">
      <PassengerForm />
    </div>
  </div>
)

const PaymentFailedPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        <span className="text-red-600 text-2xl">✕</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
      <p className="text-gray-600 mb-4">Your payment was not successful. Please try again.</p>
      <button 
        onClick={() => window.history.back()}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
)

// Route Wrappers for different user roles
const AdminRoutesWrapper = () => (
  <ProtectedRoute requiredRole="admin" fallbackPath="/unauthorized">
    <AdminLayout>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="buses" element={<AdminBuses />} />
        <Route path="routes" element={<AdminRoutes />} />
        <Route path="schedules" element={<AdminSchedules />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="customers" element={<AdminCustomerManagement />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="tracking" element={<AdminBusTracking />} />
        <Route path="tariff-management" element={<TariffManagement />} />
        <Route path="loyalty" element={<LoyaltyManagement />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="profile-settings" element={<Settings />} />
      </Routes>
    </AdminLayout>
  </ProtectedRoute>
)

const TicketerRoutesWrapper = () => (
  <ProtectedRoute requiredRole="ticketer" fallbackPath="/unauthorized">
    <TicketerLayout>
      <Routes>
        <Route index element={<TicketerDashboard />} />
        <Route path="dashboard" element={<TicketerDashboard />} />
        <Route path="quick-booking" element={<QuickBooking />} />
        <Route path="booking-lookup" element={<BookingLookup />} />
        <Route path="customer-management" element={<CustomerManagement />} />
        <Route path="point-of-sale" element={<PointOfSale />} />
        <Route path="schedule-browser" element={<ScheduleBrowser />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </TicketerLayout>
  </ProtectedRoute>
)

const OperatorRoutesWrapper = () => (
  <ProtectedRoute requiredRole="operator" fallbackPath="/unauthorized">
    <OperatorLayout>
      <Routes>
        <Route index element={<OperatorDashboard />} />
        <Route path="dashboard" element={<OperatorDashboard />} />
        <Route path="schedules" element={<OperatorSchedules />} />
        <Route path="checkin" element={<CheckinPage />} />
        <Route path="bus-reports" element={<BusReports />} />
        <Route path="reports" element={<OperatorReports />} />
        <Route path="tracking" element={<BusTracking />} />
        <Route path="cancellation-requests" element={<CancellationRequests />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </OperatorLayout>
  </ProtectedRoute>
)

// FIXED: Driver Routes - Remove DriverLayout from individual components
const DriverRoutesWrapper = () => (
  <ProtectedRoute requiredRole="driver" fallbackPath="/unauthorized">
    <DriverLayout>
      <Routes>
        <Route index element={<DriverDashboard />} />
        <Route path="dashboard" element={<DriverDashboard />} />
        <Route path="trips" element={<DriverTrips />} />
        <Route path="trips/:tripId" element={<DriverTripDetails />} />
        <Route path="active-trip" element={<DriverActiveTrip />} />
        <Route path="checkin/:tripId" element={<DriverCheckin />} />
        <Route path="passengers" element={<DriverPassengers />} />
        <Route path="schedules" element={<DriverSchedules />} />
        <Route path="bus-report" element={<BusReport />} />
        <Route path="profile" element={<DriverProfile />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </DriverLayout>
  </ProtectedRoute>
)

// Customer Routes
const CustomerRoutesWrapper = () => (
  <ProtectedRoute fallbackPath="/login">
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="my-bookings" element={<MyBookings />} />
      <Route path="profile" element={<Profile />} />
      <Route path="booking/:bookingId" element={<BookingDetails />} />
      <Route path="checkin" element={<CustomerCheckin />} />
      <Route path="settings" element={<Settings />} />
    </Routes>
  </ProtectedRoute>
)

const BookingFlowRoutesWrapper = () => (
  <ProtectedRoute fallbackPath="/login">
    <Routes>
      <Route path="seats" element={<SeatSelection />} />
      <Route path="passenger-details" element={<PassengerDetailsPage />} />
      <Route path="baggage" element={<BaggagePage />} />
      <Route path="payment" element={<PaymentPage />} />
      <Route path="booking-confirmation" element={<BookingConfirmation />} />
    </Routes>
  </ProtectedRoute>
)

const AppRoutes = () => {
  // Debug: Log when routes are rendered
  console.log('🔄 AppRoutes: Rendering routes...');
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/routes" element={<AvailableRoutes />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/schedules" element={<SchedulesPage />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/terms-and-policies" element={<TermsAndPolicies />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/operator/login" element={<OperatorLogin />} />
      <Route path="/driver/login" element={<DriverLogin />} />
      <Route path="/payment-callback" element={<ChapaCallbackHandler />} />
      <Route path="/payment-failed" element={<PaymentFailedPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Role-based redirect after login */}
      <Route path="/redirect-by-role" element={<RoleBasedRedirect />} />

      {/* Protected Routes */}
      <Route path="/customer/*" element={<CustomerRoutesWrapper />} />
      <Route path="/ticketer/*" element={<TicketerRoutesWrapper />} />
      <Route path="/operator/*" element={<OperatorRoutesWrapper />} />
      <Route path="/booking/*" element={<BookingFlowRoutesWrapper />} />
      <Route path="/admin/*" element={<AdminRoutesWrapper />} />
      <Route path="/driver/*" element={<DriverRoutesWrapper />} />

      {/* Settings Route - Accessible to all authenticated users */}
      <Route path="/settings" element={
        <ProtectedRoute fallbackPath="/login">
          <Settings />
        </ProtectedRoute>
      } />

      {/* Legacy Redirects */}
      <Route path="/dashboard" element={<Navigate to="/customer/dashboard" replace />} />
      <Route path="/my-bookings" element={<Navigate to="/customer/my-bookings" replace />} />
      <Route path="/profile" element={<Navigate to="/customer/profile" replace />} />
      <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="/operator/dashboard" element={<Navigate to="/operator" replace />} />
      <Route path="/ticketer/dashboard" element={<Navigate to="/ticketer" replace />} />
      <Route path="/operator-login" element={<Navigate to="/operator/login" replace />} />
      <Route path="/driver-login" element={<Navigate to="/driver/login" replace />} />
      
      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default AppRoutes
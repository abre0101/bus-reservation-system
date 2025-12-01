import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/admin/users', icon: '👥', label: 'Users' },
    { path: '/admin/customers', icon: '👤', label: 'Customers' },
    { path: '/admin/drivers', icon: '🚗', label: 'Drivers' },
    { path: '/admin/buses', icon: '🚌', label: 'Buses' },
    { path: '/admin/routes', icon: '🗺️', label: 'Routes' },
    { path: '/admin/schedules', icon: '📅', label: 'Schedules' },
    { path: '/admin/bookings', icon: '🎫', label: 'Bookings' },
    { path: '/admin/payments', icon: '💳', label: 'Payments' },
    { path: '/admin/tracking', icon: '📍', label: 'Bus Tracking' },
    { path: '/admin/tariff-management', icon: '💰', label: 'Tariff Management' },
    { path: '/admin/loyalty', icon: '🎁', label: 'Loyalty Management' },
    { path: '/admin/reports', icon: '📈', label: 'Reports' },
    { path: '/admin/settings', icon: '⚙️', label: 'Settings' },
  ]

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-indigo-800 transition-all duration-200 hover:scale-105"
                aria-label="Toggle sidebar"
              >
                <span className="text-2xl">☰</span>
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🚌</span>
                <h1 className="text-2xl font-bold tracking-tight">EthioBus Admin</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <button className="p-2 rounded-lg hover:bg-indigo-700 transition-colors relative">
                    <span className="text-xl">🔔</span>
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{user?.full_name || user?.name || 'Admin'}</p>
                  <p className="text-sm text-indigo-200">Administrator</p>
                </div>
                <div className="w-10 h-10 bg-indigo-800 rounded-full flex items-center justify-center font-bold text-lg">
                  {(user?.full_name || user?.name || 'A').charAt(0).toUpperCase()}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 font-medium hover:shadow-lg hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-72' : 'w-0'
          } bg-white shadow-xl transition-all duration-300 overflow-hidden border-r border-gray-200`}
        >
          <nav className="p-4 space-y-1">
            <div className="px-4 py-3 mb-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</h2>
            </div>
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md transform scale-105'
                    : 'text-gray-700 hover:bg-gray-50 hover:translate-x-1'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout

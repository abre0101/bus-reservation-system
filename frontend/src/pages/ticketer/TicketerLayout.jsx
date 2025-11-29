import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const TicketerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/ticketer/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/ticketer/quick-booking', icon: '⚡', label: 'Walk_in Booking' },
    { path: '/ticketer/booking-lookup', icon: '🔍', label: 'Booking Lookup' },
    { path: '/ticketer/customer-management', icon: '👥', label: 'Customers' },
    { path: '/ticketer/point-of-sale', icon: '💳', label: 'Point of Sale' },
    { path: '/ticketer/schedule-browser', icon: '📅', label: 'Schedules' },
  ]

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-green-600 text-white shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <span className="text-2xl">☰</span>
              </button>
              <h1 className="text-2xl font-bold">EthioBus Ticketer</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-semibold">{user?.full_name || user?.name || 'Ticketer'}</p>
                <p className="text-sm text-green-200">{user?.station || 'Ticketer'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
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
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white shadow-lg transition-all duration-300 overflow-hidden`}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default TicketerLayout

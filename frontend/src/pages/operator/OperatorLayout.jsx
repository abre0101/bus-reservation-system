import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const OperatorLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/operator/login');
  };

  const menuItems = [
    { path: '/operator/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/operator/schedules', icon: '📅', label: 'Schedules' },
    { path: '/operator/tracking', icon: '📍', label: 'Bus Tracking' },
    { path: '/operator/checkin', icon: '✅', label: 'Check-in' },
    { path: '/operator/bus-reports', icon: '📋', label: 'Bus Reports' },
    { path: '/operator/reports', icon: '📈', label: 'Reports' },
    { path: '/operator/cancellation-requests', icon: '❌', label: 'Cancellations' },
  ]

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='60' viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236366f1' fill-opacity='1'%3E%3Crect x='10' y='15' width='80' height='30' rx='3' stroke='%236366f1' stroke-width='2' fill='none'/%3E%3Ccircle cx='10' cy='30' r='4' fill='%236366f1'/%3E%3Ccircle cx='90' cy='30' r='4' fill='%236366f1'/%3E%3Cline x1='20' y1='22' x2='40' y2='22' stroke='%236366f1' stroke-width='2'/%3E%3Cline x1='20' y1='30' x2='50' y2='30' stroke='%236366f1' stroke-width='2'/%3E%3Cline x1='20' y1='38' x2='35' y2='38' stroke='%236366f1' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '120px 80px'
        }}
      ></div>

      {/* Floating Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
      </div>

      {/* Top Navigation */}
      <nav className="relative z-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl border-b border-indigo-500/20">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
              >
                <span className="text-2xl">☰</span>
              </button>
              <h1 className="text-2xl font-bold">EthioBus Operator</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-semibold">{user?.full_name || user?.name || 'Operator'}</p>
                <p className="text-sm text-indigo-200">Operator</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex relative z-10">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white/80 backdrop-blur-sm shadow-xl border-r border-indigo-100 transition-all duration-300 overflow-hidden`}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
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

export default OperatorLayout

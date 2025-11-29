// components/common/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { 
  ChevronDown, 
  User, 
  LogOut, 
  Settings, 
  Bus, 
  MapPin, 
  Calendar,
  Users,
  BarChart3,
  Menu,
  X,
  Ticket,
  Search,
  CreditCard,
  ShoppingCart
} from 'lucide-react';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [operatorDropdownOpen, setOperatorDropdownOpen] = useState(false);
  const [ticketerDropdownOpen, setTicketerDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const adminDropdownRef = useRef(null);
  const driverDropdownRef = useRef(null);
  const operatorDropdownRef = useRef(null);
  const ticketerDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false);
      }
      if (driverDropdownRef.current && !driverDropdownRef.current.contains(event.target)) {
        setDriverDropdownOpen(false);
      }
      if (operatorDropdownRef.current && !operatorDropdownRef.current.contains(event.target)) {
        setOperatorDropdownOpen(false);
      }
      if (ticketerDropdownRef.current && !ticketerDropdownRef.current.contains(event.target)) {
        setTicketerDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
  };

  const adminMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/drivers', label: 'Drivers', icon: User },
    { path: '/admin/buses', label: 'Buses', icon: Bus },
    { path: '/admin/routes', label: 'Routes', icon: MapPin },
    { path: '/admin/schedules', label: 'Schedules', icon: Calendar },
    { path: '/admin/bookings', label: 'Bookings', icon: Ticket },
    { path: '/admin/payments', label: 'Payments', icon: CreditCard },
    { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const driverMenuItems = [
    { path: '/driver/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/driver/trips', label: 'My Trips', icon: Bus },
    { path: '/driver/active-trip', label: 'Active Trip', icon: MapPin },
    { path: '/driver/passengers', label: 'Passengers', icon: Users },
    { path: '/driver/schedules', label: 'Schedules', icon: Calendar },
    { path: '/driver/profile', label: 'Profile', icon: User },
  ];

  const operatorMenuItems = [
    { path: '/operator/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/operator/schedules', label: 'Schedules', icon: Calendar },
    { path: '/operator/checkin', label: 'Check-in', icon: Users },
    { path: '/operator/tracking', label: 'Bus Tracking', icon: MapPin },
    { path: '/operator/reports', label: 'Reports', icon: BarChart3 },
    { path: '/operator/cancellation-requests', label: 'Cancellations', icon: Settings },
  ];

  const ticketerMenuItems = [
    { path: '/ticketer/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/ticketer/quick-booking', label: 'Quick Booking', icon: Ticket },
    { path: '/ticketer/booking-lookup', label: 'Booking Lookup', icon: Search },
    { path: '/ticketer/customer-management', label: 'Customers', icon: User },
    { path: '/ticketer/point-of-sale', label: 'Point of Sale', icon: ShoppingCart },
    { path: '/ticketer/schedule-browser', label: 'Schedules', icon: Calendar },
  ];

  const userMenuItems = [
    { path: '/profile', label: 'My Profile', icon: User },
    { path: '/my-bookings', label: 'My Bookings', icon: Calendar },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const getBaseLinks = () => {
    if (!isAuthenticated) {
      return [
        { path: '/', label: 'Home' },
        { path: '/search', label: 'Book Tickets' },
        { path: '/contact', label: 'Contact' },
        { path: '/faq', label: 'FAQ' }
      ];
    }

    return [
      { path: '/', label: 'Home' },
      { path: '/search', label: 'Book Tickets' },
      { path: '/customer/my-bookings', label: 'My Bookings' },
      { path: '/customer/dashboard', label: 'Dashboard' },
    ];
  };

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'driver': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'operator': return 'bg-green-100 text-green-800 border-green-200';
      case 'ticketer': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const DropdownMenu = ({ items, isOpen, onClose }) => (
    <div className={`absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/60 py-2 z-50 transition-all duration-200 ${
      isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
    }`}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Link
            key={index}
            to={item.path}
            onClick={onClose}
            className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 mx-2 rounded-lg ${
              isActivePath(item.path)
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  const RoleDropdown = ({ role, menuItems, isOpen, setIsOpen, dropdownRef }) => {
    const roleConfig = {
      admin: { label: 'Admin', color: 'text-red-600 hover:text-red-700', bgColor: 'hover:bg-red-50' },
      driver: { label: 'Driver', color: 'text-blue-600 hover:text-blue-700', bgColor: 'hover:bg-blue-50' },
      operator: { label: 'Operator', color: 'text-green-600 hover:text-green-700', bgColor: 'hover:bg-green-50' },
      ticketer: { label: 'Ticketer', color: 'text-purple-600 hover:text-purple-700', bgColor: 'hover:bg-purple-50' }
    };

    const config = roleConfig[role];

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            isActivePath(`/${role}`) 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg' 
              : `${config.color} ${config.bgColor}`
          }`}
        >
          <span>{config.label}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <DropdownMenu 
          items={menuItems} 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)} 
        />
      </div>
    );
  };

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/60 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">EthioBus</span>
              <p className="text-xs text-gray-600 -mt-1">Travel with Confidence</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {getBaseLinks().map((link) => {
              const LinkIcon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActivePath(link.path)
                      ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-700 font-semibold shadow-lg'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {LinkIcon && <LinkIcon className="h-4 w-4" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
            
            {/* Role-specific dropdowns */}
            {isAuthenticated && user?.role === 'admin' && (
              <RoleDropdown
                role="admin"
                menuItems={adminMenuItems}
                isOpen={adminDropdownOpen}
                setIsOpen={setAdminDropdownOpen}
                dropdownRef={adminDropdownRef}
              />
            )}
            
            {isAuthenticated && user?.role === 'driver' && (
              <RoleDropdown
                role="driver"
                menuItems={driverMenuItems}
                isOpen={driverDropdownOpen}
                setIsOpen={setDriverDropdownOpen}
                dropdownRef={driverDropdownRef}
              />
            )}
            
            {isAuthenticated && user?.role === 'operator' && (
              <RoleDropdown
                role="operator"
                menuItems={operatorMenuItems}
                isOpen={operatorDropdownOpen}
                setIsOpen={setOperatorDropdownOpen}
                dropdownRef={operatorDropdownRef}
              />
            )}

            {/* NEW: Ticketer dropdown */}
            {isAuthenticated && user?.role === 'ticketer' && (
              <RoleDropdown
                role="ticketer"
                menuItems={ticketerMenuItems}
                isOpen={ticketerDropdownOpen}
                setIsOpen={setTicketerDropdownOpen}
                dropdownRef={ticketerDropdownRef}
              />
            )}
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden lg:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-4 py-2 border border-blue-200/60">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-32">
                      {user?.name || user?.email}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user?.role)}`}>
                      {user?.role}
                    </span>
                  </div>
                  
                  {/* User Dropdown */}
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center space-x-1 p-2 rounded-xl hover:bg-white transition-all duration-200"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* User Dropdown Menu */}
                    <div className={`absolute top-full right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/60 py-2 z-50 transition-all duration-200 ${
                      userDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}>
                      <div className="px-4 py-3 border-b border-gray-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                      </div>
                      
                      {userMenuItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={index}
                            to={item.path}
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mx-2"
                          >
                            <Icon className="h-4 w-4 mr-3 text-gray-600" />
                            {item.label}
                          </Link>
                        );
                      })}
                      
                      <div className="border-t border-gray-200/60 pt-2 mt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 rounded-lg mx-2 font-medium"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 bg-white">
            <div className="space-y-2">
              {getBaseLinks().map((link) => {
                const LinkIcon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                      isActivePath(link.path)
                        ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {LinkIcon && <LinkIcon className="h-5 w-5" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              
              {/* Mobile role-specific menus */}
              {isAuthenticated && user?.role === 'admin' && (
                <div className="border-t border-gray-200/60 pt-4 mt-4">
                  <p className="px-4 py-2 text-xs font-bold text-red-600 uppercase tracking-wider">Admin Portal</p>
                  {adminMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 mx-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActivePath(item.path)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {isAuthenticated && user?.role === 'ticketer' && (
                <div className="border-t border-gray-200/60 pt-4 mt-4">
                  <p className="px-4 py-2 text-xs font-bold text-purple-600 uppercase tracking-wider">Ticketer Portal</p>
                  {ticketerMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 mx-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActivePath(item.path)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {isAuthenticated && user?.role === 'operator' && (
                <div className="border-t border-gray-200/60 pt-4 mt-4">
                  <p className="px-4 py-2 text-xs font-bold text-green-600 uppercase tracking-wider">Operator Portal</p>
                  {operatorMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 mx-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActivePath(item.path)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {isAuthenticated && user?.role === 'driver' && (
                <div className="border-t border-gray-200/60 pt-4 mt-4">
                  <p className="px-4 py-2 text-xs font-bold text-blue-600 uppercase tracking-wider">Driver Portal</p>
                  {driverMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 mx-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActivePath(item.path)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Mobile auth section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              {isAuthenticated ? (
                <div className="px-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user?.role)}`}>
                        {user?.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all duration-200 font-medium"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="px-4 space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg font-medium"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
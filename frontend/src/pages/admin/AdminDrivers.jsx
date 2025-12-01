import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState([])
  const [filteredDrivers, setFilteredDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    license_number: '',
    license_expiry: '',
    experience_years: 0
  })

  useEffect(() => {
    fetchDrivers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [drivers, searchTerm, statusFilter])

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      const data = await adminService.getDrivers()
      console.log('👨‍✈️ Drivers data:', data)
      setDrivers(data.drivers || [])
    } catch (error) {
      console.error('Error fetching drivers:', error)
      setDrivers([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...drivers]

    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.license_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active'
      filtered = filtered.filter(driver => driver.is_active === isActive)
    }

    setFilteredDrivers(filtered)
  }

  const handleToggleStatus = async (driverId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this driver?`)) {
      return
    }

    try {
      await adminService.updateEntity('driver', driverId, { is_active: !currentStatus })
      fetchDrivers()
    } catch (error) {
      alert('Error updating driver status')
    }
  }

  const handleAddDriver = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      license_number: '',
      license_expiry: '',
      experience_years: 0
    })
    setShowAddModal(true)
  }

  const handleEditDriver = (driver) => {
    setFormData({
      name: driver.name || driver.full_name,
      email: driver.email,
      phone: driver.phone || driver.phone_number,
      password: '',
      license_number: driver.license_number || '',
      license_expiry: driver.license_expiry || '',
      experience_years: driver.experience_years || 0
    })
    setSelectedDriver(driver)
    setShowEditModal(true)
  }

  const handleSaveDriver = async () => {
    try {
      const driverData = {
        ...formData,
        role: 'driver',
        is_active: true
      }

      if (showEditModal && selectedDriver) {
        // Update existing driver
        if (!formData.password) {
          delete driverData.password
        }
        await adminService.updateEntity('driver', selectedDriver._id, driverData)
        alert('Driver updated successfully!')
      } else {
        // Create new driver
        if (!formData.password) {
          alert('Password is required for new drivers')
          return
        }
        await adminService.createEntity('driver', driverData)
        alert('Driver created successfully!')
      }

      setShowAddModal(false)
      setShowEditModal(false)
      fetchDrivers()
    } catch (error) {
      alert('Error saving driver: ' + (error.message || 'Unknown error'))
    }
  }

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
      return
    }

    try {
      await adminService.deleteEntity('driver', driverId)
      alert('Driver deleted successfully!')
      fetchDrivers()
    } catch (error) {
      alert('Error deleting driver')
    }
  }

  const stats = {
    total: Array.isArray(drivers) ? drivers.length : 0,
    active: Array.isArray(drivers) ? drivers.filter(d => d.is_active).length : 0,
    avgExperience: Array.isArray(drivers) && drivers.length > 0 
      ? (drivers.reduce((sum, d) => sum + (d.experience_years || 0), 0) / drivers.length).toFixed(1)
      : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-gray-600 mt-1">Manage drivers, licenses, and assignments</p>
        </div>
        <button
          onClick={handleAddDriver}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Driver
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Total Drivers</p>
              <p className="text-4xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wide">Active Drivers</p>
              <p className="text-4xl font-bold mt-2">{stats.active}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">Avg Experience</p>
              <p className="text-4xl font-bold mt-2">{stats.avgExperience}</p>
              <p className="text-purple-100 text-sm mt-1">years</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Drivers</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, email, or license..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.map((driver) => (
          <div key={driver._id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-xl font-bold text-white">
                      {(driver.name || driver.email)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{driver.name || driver.full_name}</h3>
                    <p className="text-indigo-100 text-sm">{driver.experience_years || 0} years exp.</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                  driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {driver.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">{driver.email}</p>

              <div className="space-y-3 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-blue-700 font-semibold uppercase">License</span>
                  </div>
                  <p className="text-sm font-bold text-blue-900">{driver.license_number || 'N/A'}</p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-xs text-green-700 font-semibold uppercase">Phone</span>
                  </div>
                  <p className="text-sm font-bold text-green-900">{driver.phone || driver.phone_number || 'N/A'}</p>
                </div>

                {driver.license_expiry && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-purple-700 font-semibold uppercase">Expires</span>
                    </div>
                    <p className="text-sm font-bold text-purple-900">
                      {new Date(driver.license_expiry).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t-2 border-gray-200">
                <button
                  onClick={() => {
                    setSelectedDriver(driver)
                    setShowModal(true)
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
                <button
                  onClick={() => handleEditDriver(driver)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteDriver(driver._id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Drivers Found</h3>
          <p className="text-gray-600">Try adjusting your filters or add a new driver.</p>
        </div>
      )}

      {/* Driver Detail Modal */}
      {showModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Driver Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {(selectedDriver.name || selectedDriver.email)?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedDriver.name || selectedDriver.full_name}</h3>
                  <p className="text-gray-600">{selectedDriver.email}</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedDriver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedDriver.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">License Number</p>
                  <p className="font-semibold">{selectedDriver.license_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedDriver.phone || selectedDriver.phone_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Experience</p>
                  <p className="font-semibold">{selectedDriver.experience_years || 0} years</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">License Expiry</p>
                  <p className="font-semibold">
                    {selectedDriver.license_expiry 
                      ? new Date(selectedDriver.license_expiry).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Joined</p>
                  <p className="font-semibold">
                    {selectedDriver.created_at 
                      ? new Date(selectedDriver.created_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-semibold">
                    {selectedDriver.updated_at 
                      ? new Date(selectedDriver.updated_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Driver Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {showEditModal ? 'Edit Driver' : 'Add New Driver'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password {showEditModal && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder={showEditModal ? 'Leave blank to keep current' : 'Enter password'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Number *</label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Expiry</label>
                  <input
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) => setFormData({...formData, license_expiry: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience (years)</label>
                  <input
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDriver}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {showEditModal ? 'Update Driver' : 'Create Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDrivers

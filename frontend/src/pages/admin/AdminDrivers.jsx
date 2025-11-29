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
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total Drivers</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm font-medium">Active Drivers</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Avg Experience</p>
          <p className="text-3xl font-bold text-purple-600">{stats.avgExperience} years</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button
            onClick={handleAddDriver}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            + Add Driver
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name, email, or license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.map((driver) => (
          <div key={driver._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {(driver.name || driver.email)?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {driver.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">{driver.name || driver.full_name}</h3>
              <p className="text-sm text-gray-600 mb-4">{driver.email}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                  <span className="text-gray-600 w-24">License:</span>
                  <span className="font-semibold text-gray-900">{driver.license_number || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-gray-600 w-24">Phone:</span>
                  <span className="font-semibold text-gray-900">{driver.phone || driver.phone_number || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-gray-600 w-24">Experience:</span>
                  <span className="font-semibold text-gray-900">{driver.experience_years || 0} years</span>
                </div>
                {driver.license_expiry && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Expires:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(driver.license_expiry).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setSelectedDriver(driver)
                    setShowModal(true)
                  }}
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  View
                </button>
                <button
                  onClick={() => handleEditDriver(driver)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteDriver(driver._id)}
                  className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">🚗</div>
          <p className="text-gray-500 text-lg">No drivers found</p>
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

import React, { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import { 
  Plus, Search, Edit, Trash2, Car, Users, Wifi, Snowflake, 
  Power, RefreshCw, Fuel, Settings, Eye, X, MapPin, 
  Calendar, Clock, Star, Shield, Zap, Droplets
} from 'lucide-react'
import { toast } from 'react-toastify'

const Buses = () => {
  const [buses, setBuses] = useState([])
  const [filteredBuses, setFilteredBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedBus, setSelectedBus] = useState(null)
  const [showBusModal, setShowBusModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBus, setEditingBus] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    maintenance: 0,
    inactive: 0
  })

  useEffect(() => {
    loadBuses()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [buses, searchTerm, filterStatus, filterType])

  const loadBuses = async () => {
    try {
      setLoading(true)
      
      const busesData = await adminService.getEntities('bus')
      console.log('🚌 Raw buses data:', busesData)
      setBuses(busesData || [])
      calculateStats(busesData || [])
      
    } catch (error) {
      console.error('Failed to load buses:', error)
      toast.error('Failed to load buses')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateStats = (busesData) => {
    const statsData = {
      total: busesData.length,
      active: busesData.filter(bus => bus.status === 'active').length,
      maintenance: busesData.filter(bus => bus.status === 'maintenance').length,
      inactive: busesData.filter(bus => bus.status === 'inactive').length
    }
    setStats(statsData)
  }

  const applyFilters = () => {
    let filtered = [...buses]

    if (searchTerm) {
      filtered = filtered.filter(bus => 
        bus.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.bus_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.bus_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(bus => bus.status === filterStatus)
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(bus => bus.type === filterType)
    }

    setFilteredBuses(filtered)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadBuses()
    toast.success('Buses data updated')
  }

  const handleDelete = async (busId) => {
    if (!window.confirm('Are you sure you want to delete this bus? This action cannot be undone.')) {
      return
    }

    try {
      await adminService.deleteEntity('bus', busId)
      toast.success('Bus deleted successfully')
      loadBuses()
    } catch (error) {
      console.error('Failed to delete bus:', error)
      toast.error('Failed to delete bus. Please try again.')
    }
  }

  const handleStatusUpdate = async (busId, newStatus) => {
    if (!newStatus) return; // Don't proceed if no status selected
    
    try {
      await adminService.updateEntity('bus', busId, { status: newStatus })
      toast.success(`Bus status updated to ${newStatus}`)
      loadBuses()
    } catch (error) {
      console.error('Status update failed:', error)
      toast.error('Failed to update bus status')
    }
  }

  const handleShowBus = (bus) => {
    setSelectedBus(bus)
    setShowBusModal(true)
  }

  const handleEditBus = (bus) => {
    setEditingBus(bus)
    setShowEditModal(true)
  }

  const handleAddBus = () => {
    setShowAddModal(true)
  }

  const handleSaveBus = async (busData, isEdit = false) => {
    try {
      if (isEdit) {
        await adminService.updateEntity('bus', editingBus._id, busData)
        toast.success('Bus updated successfully')
      } else {
        await adminService.createEntity('bus', busData)
        toast.success('Bus created successfully')
      }
      
      setShowAddModal(false)
      setShowEditModal(false)
      setEditingBus(null)
      loadBuses()
    } catch (error) {
      console.error('Failed to save bus:', error)
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} bus`)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      inactive: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || colors.active
  }

  const getBusTypeColor = (type) => {
    const colors = {
      standard: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      luxury: 'bg-orange-100 text-orange-800',
      sleeper: 'bg-indigo-100 text-indigo-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getCapacityColor = (capacity) => {
    if (capacity >= 50) return 'text-green-600'
    if (capacity >= 30) return 'text-blue-600'
    return 'text-gray-600'
  }

  const getMaintenanceStatus = (bus) => {
    if (!bus.last_maintenance_date) {
      return { status: 'unknown', color: 'text-gray-500', text: 'No record' }
    }
    
    const lastMaintenanceDate = new Date(bus.last_maintenance_date)
    const today = new Date()
    const diffTime = today - lastMaintenanceDate
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 30) return { status: 'good', color: 'text-green-600', text: 'Recent' }
    if (diffDays < 90) return { status: 'warning', color: 'text-yellow-600', text: 'Due soon' }
    return { status: 'overdue', color: 'text-red-600', text: 'Overdue' }
  }

  const getBusTypes = () => {
    const types = [...new Set(buses.map(bus => bus.type).filter(Boolean))]
    return types
  }

  const formatAmenities = (amenities) => {
    if (!amenities || !Array.isArray(amenities)) return []
    
    return amenities.map(amenity => {
      const amenityMap = {
        'wifi': { name: 'WiFi', icon: Wifi, color: 'blue' },
        'air_conditioning': { name: 'AC', icon: Snowflake, color: 'green' },
        'charging_ports': { name: 'Charging', icon: Power, color: 'purple' },
        'entertainment': { name: 'Entertainment', icon: Users, color: 'orange' },
        'restroom': { name: 'Restroom', icon: null, color: 'indigo' },
        'reclining_seats': { name: 'Reclining', icon: null, color: 'teal' },
        'reading_light': { name: 'Reading Light', icon: null, color: 'yellow' },
        'blanket': { name: 'Blanket', icon: null, color: 'pink' },
        'tv': { name: 'TV', icon: null, color: 'red' },
        'usb_ports': { name: 'USB Ports', icon: Zap, color: 'blue' }
      }
      
      return amenityMap[amenity] || { name: amenity, icon: null, color: 'gray' }
    })
  }

  const getBusImage = (bus) => {
    const busImages = {
      luxury: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&h=300&fit=crop',
      premium: 'https://images.unsplash.com/photo-1502872362448-2c2cee83dba8?w=500&h=300&fit=crop',
      standard: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&h=300&fit=crop',
      sleeper: 'https://images.unsplash.com/photo-1502872362448-2c2cee83dba8?w=500&h=300&fit=crop'
    }
    
    return bus.image_url || busImages[bus.type] || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&h=300&fit=crop'
  }

  // Bus Detail Modal Component
  const BusDetailModal = ({ bus, onClose, onEdit }) => {
    if (!bus) return null

    const maintenanceStatus = getMaintenanceStatus(bus)
    const formattedAmenities = formatAmenities(bus.amenities)
    const busImage = getBusImage(bus)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{bus.bus_name || 'Bus Details'}</h2>
              <p className="text-gray-600">{bus.plate_number} • {bus.bus_number}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Bus Image and Basic Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <img
                  src={busImage}
                  alt={bus.bus_name || 'Bus'}
                  className="w-full h-64 object-cover rounded-lg shadow-md"
                />
                <div className="mt-4 flex space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bus.status)}`}>
                    {bus.status}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getBusTypeColor(bus.type)}`}>
                    {bus.type}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Plate Number</p>
                    <p className="font-medium text-gray-900">{bus.plate_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bus Number</p>
                    <p className="font-medium text-gray-900">{bus.bus_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Capacity</p>
                    <p className={`font-medium ${getCapacityColor(bus.capacity)}`}>
                      {bus.capacity || 'Unknown'} seats
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium text-gray-900 capitalize">{bus.type || 'standard'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Manufacturer</p>
                    <p className="font-medium text-gray-900">{bus.manufacturer || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Model Year</p>
                    <p className="font-medium text-gray-900">{bus.model_year || 'N/A'}</p>
                  </div>
                </div>

                {/* Maintenance Info */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Maintenance Status</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${maintenanceStatus.color}`}>
                        {maintenanceStatus.text}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last Maintenance: {bus.last_maintenance_date ? 
                          new Date(bus.last_maintenance_date).toLocaleDateString() : 'No record'
                        }
                      </p>
                    </div>
                    {bus.next_maintenance_date && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Next Maintenance</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(bus.next_maintenance_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amenities */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Amenities & Features
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {formattedAmenities.length > 0 ? (
                    formattedAmenities.map((amenity, index) => {
                      const IconComponent = amenity.icon
                      const colorClasses = {
                        blue: 'bg-blue-50 text-blue-700 border-blue-200',
                        green: 'bg-green-50 text-green-700 border-green-200',
                        purple: 'bg-purple-50 text-purple-700 border-purple-200',
                        orange: 'bg-orange-50 text-orange-700 border-orange-200',
                        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        teal: 'bg-teal-50 text-teal-700 border-teal-200',
                        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                        pink: 'bg-pink-50 text-pink-700 border-pink-200',
                        gray: 'bg-gray-50 text-gray-700 border-gray-200'
                      }
                      
                      return (
                        <div key={index} className={`flex items-center text-sm p-2 rounded border ${colorClasses[amenity.color] || colorClasses.gray}`}>
                          {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                          {amenity.name}
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">No amenities listed</p>
                  )}
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-gray-600" />
                  Technical Specifications
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Fuel Type</span>
                    <span className="text-sm font-medium text-gray-900">{bus.fuel_type || 'Diesel'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Engine Capacity</span>
                    <span className="text-sm font-medium text-gray-900">{bus.engine_capacity || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Transmission</span>
                    <span className="text-sm font-medium text-gray-900">{bus.transmission || 'Manual'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Mileage</span>
                    <span className="text-sm font-medium text-gray-900">{bus.mileage || 'N/A'} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Insurance</span>
                    <span className="text-sm font-medium text-gray-900">
                      {bus.insurance_valid_until ? 
                        `Valid until ${new Date(bus.insurance_valid_until).toLocaleDateString()}` : 
                        'No info'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {(bus.notes || bus.special_features) && (
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-blue-600" />
                  Additional Information
                </h4>
                {bus.notes && (
                  <p className="text-sm text-gray-700 mb-2">{bus.notes}</p>
                )}
                {bus.special_features && (
                  <p className="text-sm text-gray-700">
                    <strong>Special Features:</strong> {bus.special_features}
                  </p>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="mt-6 border-t pt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">
                    {bus.created_at ? new Date(bus.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="font-medium">
                    {bus.updated_at ? new Date(bus.updated_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button 
              onClick={() => {
                onEdit(bus)
                onClose()
              }}
              className="px-4 py-2 bg-ethio-green text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2 inline" />
              Edit Bus
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Add/Edit Bus Modal Component
  const BusFormModal = ({ bus, onClose, onSave }) => {
    const [formData, setFormData] = useState({
      plate_number: bus?.plate_number || '',
      bus_name: bus?.bus_name || '',
      bus_number: bus?.bus_number || '',
      capacity: bus?.capacity || 45,
      type: bus?.type || 'standard',
      status: bus?.status || 'active',
      manufacturer: bus?.manufacturer || '',
      model_year: bus?.model_year || new Date().getFullYear(),
      fuel_type: bus?.fuel_type || 'diesel',
      amenities: bus?.amenities || ['wifi', 'air_conditioning'],
      notes: bus?.notes || ''
    })

    const handleSubmit = (e) => {
      e.preventDefault()
      onSave(formData, !!bus)
    }

    const handleAmenityToggle = (amenity) => {
      setFormData(prev => ({
        ...prev,
        amenities: prev.amenities.includes(amenity)
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      }))
    }

    const amenitiesList = [
      { value: 'wifi', label: 'WiFi', icon: Wifi },
      { value: 'air_conditioning', label: 'Air Conditioning', icon: Snowflake },
      { value: 'charging_ports', label: 'Charging Ports', icon: Power },
      { value: 'entertainment', label: 'Entertainment System', icon: Users },
      { value: 'restroom', label: 'Restroom', icon: null },
      { value: 'reclining_seats', label: 'Reclining Seats', icon: null },
      { value: 'usb_ports', label: 'USB Ports', icon: Zap }
    ]

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {bus ? 'Edit Bus' : 'Add New Bus'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plate Number *</label>
                <input
                  type="text"
                  value={formData.plate_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, plate_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethio-green focus:border-ethio-green"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bus Name *</label>
                <input
                  type="text"
                  value={formData.bus_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, bus_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethio-green focus:border-ethio-green"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bus Number</label>
                <input
                  type="text"
                  value={formData.bus_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, bus_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethio-green focus:border-ethio-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethio-green focus:border-ethio-green"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethio-green focus:border-ethio-green"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                  <option value="sleeper">Sleeper</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethio-green focus:border-ethio-green"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Amenities</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenitiesList.map((amenity) => {
                  const IconComponent = amenity.icon
                  return (
                    <label key={amenity.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity.value)}
                        onChange={() => handleAmenityToggle(amenity.value)}
                        className="rounded border-gray-300 text-ethio-green focus:ring-ethio-green"
                      />
                      {IconComponent && <IconComponent className="h-4 w-4 text-gray-600" />}
                      <span className="text-sm text-gray-700">{amenity.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethio-green focus:border-ethio-green"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-ethio-green text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {bus ? 'Update Bus' : 'Add Bus'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ethio-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bus Fleet Management</h1>
          <p className="text-gray-600 mt-1">Manage your bus fleet, maintenance, and assignments</p>
        </div>
        <button
          onClick={handleAddBus}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
        >
          <Plus className="w-5 h-5" />
          Add New Bus
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Total Buses</p>
              <p className="text-4xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-xl p-3">
              <Car className="w-8 h-8" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wide">Active Buses</p>
              <p className="text-4xl font-bold mt-2">{stats.active}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium uppercase tracking-wide">Maintenance</p>
              <p className="text-4xl font-bold mt-2">{stats.maintenance}</p>
            </div>
            <div className="bg-yellow-400 bg-opacity-30 rounded-xl p-3">
              <Settings className="w-8 h-8" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium uppercase tracking-wide">Inactive</p>
              <p className="text-4xl font-bold mt-2">{stats.inactive}</p>
            </div>
            <div className="bg-red-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Buses</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by plate number, name, or bus number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status Filter</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="maintenance">Maintenance Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Type Filter</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All Types</option>
              {getBusTypes().map(type => (
                <option key={type} value={type} className="capitalize">{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bus List/Grid */}
      {filteredBuses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Buses Found</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by adding your first bus to the fleet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuses.map((bus) => {
            const maintenanceStatus = getMaintenanceStatus(bus)
            const formattedAmenities = formatAmenities(bus.amenities)
            
            return (
              <div key={bus._id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shadow-md">
                        <Car className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{bus.bus_name || 'Unnamed Bus'}</h3>
                        <p className="text-indigo-100 text-sm">{bus.plate_number}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${getStatusColor(bus.status)}`}>
                      {bus.status}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-blue-700 font-semibold uppercase">Type</span>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getBusTypeColor(bus.type)}`}>
                        {bus.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2 mb-1">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-700 font-semibold uppercase">Capacity</span>
                        </div>
                        <p className={`text-lg font-bold ${getCapacityColor(bus.capacity)}`}>
                          {bus.capacity || 0}
                        </p>
                        <p className="text-xs text-green-700">seats</p>
                      </div>

                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="flex items-center space-x-2 mb-1">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          <span className="text-xs text-purple-700 font-semibold uppercase">Number</span>
                        </div>
                        <p className="text-sm font-bold text-purple-900">{bus.bus_number || 'N/A'}</p>
                      </div>
                    </div>

                    {formattedAmenities.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs text-gray-700 font-semibold uppercase">Amenities</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formattedAmenities.slice(0, 4).map((amenity, index) => {
                            const IconComponent = amenity.icon
                            return (
                              <span key={index} className="inline-flex items-center gap-1 text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200" title={amenity.name}>
                                {IconComponent && <IconComponent className="h-3 w-3" />}
                                {amenity.name}
                              </span>
                            )
                          })}
                          {formattedAmenities.length > 4 && (
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">+{formattedAmenities.length - 4} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t-2 border-gray-200">
                    <button
                      onClick={() => handleShowBus(bus)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleEditBus(bus)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(bus._id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showBusModal && (
        <BusDetailModal 
          bus={selectedBus} 
          onClose={() => setShowBusModal(false)}
          onEdit={handleEditBus}
        />
      )}

      {showAddModal && (
        <BusFormModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveBus}
        />
      )}

      {showEditModal && (
        <BusFormModal
          bus={editingBus}
          onClose={() => {
            setShowEditModal(false)
            setEditingBus(null)
          }}
          onSave={handleSaveBus}
        />
      )}
    </div>
  )
}

export default Buses
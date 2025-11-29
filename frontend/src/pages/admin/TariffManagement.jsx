import { useState, useEffect } from 'react'
import operatorService from '../../services/operatorService'

const TariffManagement = () => {
  const [tariffRates, setTariffRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRate, setSelectedRate] = useState(null)
  const [formData, setFormData] = useState({
    bus_type: 'Standard',
    rate_per_km: 2.5,
    minimum_fare: 50,
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
    notes: '',
    replace_existing: true
  })

  useEffect(() => {
    fetchTariffRates()
  }, [])

  const fetchTariffRates = async () => {
    try {
      setLoading(true)
      const response = await operatorService.getTariffRates(false) // Get all including inactive
      setTariffRates(response.tariff_rates || [])
    } catch (error) {
      console.error('Error fetching tariff rates:', error)
      alert('Failed to fetch tariff rates')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRate = () => {
    setFormData({
      bus_type: 'Standard',
      rate_per_km: 2.5,
      minimum_fare: 50,
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: '',
      notes: '',
      replace_existing: true
    })
    setShowAddModal(true)
  }

  const handleEditRate = (rate) => {
    setFormData({
      bus_type: rate.bus_type,
      rate_per_km: rate.rate_per_km,
      minimum_fare: rate.minimum_fare,
      effective_from: rate.effective_from?.split('T')[0] || '',
      effective_until: rate.effective_until?.split('T')[0] || '',
      notes: rate.notes || '',
      replace_existing: false
    })
    setSelectedRate(rate)
    setShowEditModal(true)
  }

  const handleSaveRate = async () => {
    try {
      if (showEditModal && selectedRate) {
        await operatorService.updateTariffRate(selectedRate._id, formData)
        alert('Tariff rate updated successfully!')
      } else {
        await operatorService.createTariffRate(formData)
        alert('Tariff rate created successfully!')
      }
      setShowAddModal(false)
      setShowEditModal(false)
      fetchTariffRates()
    } catch (error) {
      alert('Error saving tariff rate: ' + (error.message || 'Unknown error'))
    }
  }

  const handleDeleteRate = async (rateId) => {
    if (!window.confirm('Are you sure you want to deactivate this tariff rate?')) {
      return
    }

    try {
      await operatorService.deleteTariffRate(rateId)
      alert('Tariff rate deactivated successfully!')
      fetchTariffRates()
    } catch (error) {
      alert('Error deactivating tariff rate')
    }
  }

  const busTypes = ['Standard', 'Luxury', 'Premium', 'VIP', 'Sleeper']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tariff Management</h1>
          <p className="text-gray-600 mt-1">Manage government-regulated maximum tariff rates</p>
        </div>
        <button
          onClick={handleAddRate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Add Tariff Rate
        </button>
      </div>

      {/* Current Rates */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Current Tariff Rates</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate per KM</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Minimum Fare</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Until</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tariffRates.map((rate) => (
                <tr key={rate._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{rate.bus_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{rate.rate_per_km} ETB/km</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{rate.minimum_fare} ETB</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {rate.effective_from ? new Date(rate.effective_from).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {rate.effective_until ? new Date(rate.effective_until).toLocaleDateString() : 'Indefinite'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      rate.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rate.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditRate(rate)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    {rate.is_active && (
                      <button
                        onClick={() => handleDeleteRate(rate._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tariffRates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tariff rates configured</p>
            <p className="text-gray-400 text-sm mt-2">Add tariff rates to enable fare validation</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {showEditModal ? 'Edit Tariff Rate' : 'Add New Tariff Rate'}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bus Type *</label>
                <select
                  value={formData.bus_type}
                  onChange={(e) => setFormData({...formData, bus_type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={showEditModal}
                  required
                >
                  {busTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rate per KM (ETB) *</label>
                <input
                  type="number"
                  value={formData.rate_per_km}
                  onChange={(e) => setFormData({...formData, rate_per_km: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Fare (ETB) *</label>
                <input
                  type="number"
                  value={formData.minimum_fare}
                  onChange={(e) => setFormData({...formData, minimum_fare: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  step="10"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Effective From *</label>
                <input
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({...formData, effective_from: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Effective Until (Optional)</label>
                <input
                  type="date"
                  value={formData.effective_until}
                  onChange={(e) => setFormData({...formData, effective_until: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for indefinite period</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  placeholder="e.g., Updated due to fuel price increase"
                />
              </div>

              {showAddModal && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.replace_existing}
                    onChange={(e) => setFormData({...formData, replace_existing: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Replace existing active rates for this bus type
                  </label>
                </div>
              )}
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
                onClick={handleSaveRate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {showEditModal ? 'Update Rate' : 'Create Rate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TariffManagement

import { useState, useEffect } from 'react'
import api from '../../services/api'
import { Star, Award, TrendingUp, Users, Gift, Crown, X, Save, Edit2 } from 'lucide-react'

const LoyaltyManagement = () => {
  const [stats, setStats] = useState(null)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [policyData, setPolicyData] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLoyaltyData()
    fetchPolicy()
  }, [filter])

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true)
      
      // Fetch loyalty statistics
      const statsResponse = await api.get('/api/loyalty/admin/stats')
      console.log('📊 Stats response:', statsResponse.data)
      setStats(statsResponse.data)
      
      // Fetch customers with loyalty data
      const customersResponse = await api.get('/api/loyalty/admin/customers', {
        params: { tier: filter !== 'all' ? filter : undefined }
      })
      console.log('👥 Customers response:', customersResponse.data)
      
      // Extract customers array from response
      const customersData = customersResponse.data?.customers || customersResponse.data || []
      console.log('👥 Customers array:', customersData)
      setCustomers(Array.isArray(customersData) ? customersData : [])
      
    } catch (error) {
      console.error('Error fetching loyalty data:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPolicy = async () => {
    try {
      const response = await api.get('/api/loyalty/admin/policy')
      console.log('📋 Policy response:', response.data)
      setPolicyData(response.data.policy)
    } catch (error) {
      console.error('Error fetching policy:', error)
    }
  }

  const handlePolicyChange = (tier, field, value) => {
    setPolicyData(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: parseFloat(value) || 0
      }
    }))
  }

  const handleSavePolicy = async () => {
    try {
      setSaving(true)
      await api.put('/api/loyalty/admin/policy', { policy: policyData })
      alert('✅ Policy updated successfully!')
      setEditMode(false)
    } catch (error) {
      console.error('Error saving policy:', error)
      alert('❌ Failed to update policy')
    } finally {
      setSaving(false)
    }
  }

  const getTierColor = (tier) => {
    const colors = {
      member: 'bg-gray-100 text-gray-700 border-gray-300',
      bronze: 'bg-amber-100 text-amber-700 border-amber-300',
      silver: 'bg-slate-200 text-slate-700 border-slate-400',
      gold: 'bg-yellow-100 text-yellow-700 border-yellow-400',
      platinum: 'bg-purple-100 text-purple-700 border-purple-400'
    }
    return colors[tier] || colors.member
  }

  const getTierIcon = (tier) => {
    const icons = {
      member: '👤',
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎'
    }
    return icons[tier] || icons.member
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading loyalty data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Policy Modal */}
      {showPolicyModal && policyData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Loyalty Program Policy</h2>
                  <p className="text-indigo-100 text-sm">View and manage tier benefits</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all flex items-center gap-2 font-semibold"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Policy
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSavePolicy}
                      disabled={saving}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center gap-2 font-semibold disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false)
                        fetchPolicy()
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all font-semibold"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowPolicyModal(false)
                    setEditMode(false)
                    fetchPolicy()
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Member Tier */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-4xl">👤</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Member</h3>
                      <p className="text-sm text-gray-600">Starting tier (0 points)</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">Points Required</p>
                      <p className="text-lg font-bold text-gray-900">{policyData.member?.threshold || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">Discount</p>
                      <p className="text-lg font-bold text-gray-900">{policyData.member?.discount || 0}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">Free Trips/Year</p>
                      <p className="text-lg font-bold text-gray-900">{policyData.member?.freeTrips || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Bronze Tier */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-6 border-2 border-amber-400">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-4xl">🥉</div>
                    <div>
                      <h3 className="text-xl font-bold text-amber-800">Bronze</h3>
                      <p className="text-sm text-amber-700">Entry premium tier</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Points Required</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.bronze?.threshold || 0}
                          onChange={(e) => handlePolicyChange('bronze', 'threshold', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-amber-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.bronze?.threshold || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Discount %</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.bronze?.discount || 0}
                          onChange={(e) => handlePolicyChange('bronze', 'discount', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-amber-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.bronze?.discount || 0}%</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Free Trips/Year</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.bronze?.freeTrips || 0}
                          onChange={(e) => handlePolicyChange('bronze', 'freeTrips', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-amber-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.bronze?.freeTrips || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Max Free Trip Value (ETB)</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.bronze?.maxValue || 0}
                          onChange={(e) => handlePolicyChange('bronze', 'maxValue', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-amber-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.bronze?.maxValue || 0} ETB</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Birthday Bonus Points</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.bronze?.birthdayBonus || 0}
                          onChange={(e) => handlePolicyChange('bronze', 'birthdayBonus', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-amber-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.bronze?.birthdayBonus || 0}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Silver Tier */}
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-6 border-2 border-slate-400">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-4xl">🥈</div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Silver</h3>
                      <p className="text-sm text-slate-700">Mid-tier benefits</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Points Required</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.silver?.threshold || 0}
                          onChange={(e) => handlePolicyChange('silver', 'threshold', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-slate-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.silver?.threshold || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Discount %</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.silver?.discount || 0}
                          onChange={(e) => handlePolicyChange('silver', 'discount', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-slate-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.silver?.discount || 0}%</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Free Trips/Year</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.silver?.freeTrips || 0}
                          onChange={(e) => handlePolicyChange('silver', 'freeTrips', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-slate-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.silver?.freeTrips || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Max Free Trip Value (ETB)</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.silver?.maxValue || 0}
                          onChange={(e) => handlePolicyChange('silver', 'maxValue', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-slate-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.silver?.maxValue || 0} ETB</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Birthday Bonus Points</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.silver?.birthdayBonus || 0}
                          onChange={(e) => handlePolicyChange('silver', 'birthdayBonus', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-slate-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.silver?.birthdayBonus || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Referral Bonus Points</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.silver?.referralBonus || 0}
                          onChange={(e) => handlePolicyChange('silver', 'referralBonus', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-slate-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.silver?.referralBonus || 0}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gold Tier */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-200 rounded-xl p-6 border-2 border-yellow-400">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-4xl">🥇</div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-800">Gold</h3>
                      <p className="text-sm text-yellow-700">Premium elite tier</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Points Required</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.gold?.threshold || 0}
                          onChange={(e) => handlePolicyChange('gold', 'threshold', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-yellow-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.gold?.threshold || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Discount %</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.gold?.discount || 0}
                          onChange={(e) => handlePolicyChange('gold', 'discount', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-yellow-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.gold?.discount || 0}%</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Free Trips/Year</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.gold?.freeTrips || 0}
                          onChange={(e) => handlePolicyChange('gold', 'freeTrips', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-yellow-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.gold?.freeTrips || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Max Free Trip Value (ETB)</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.gold?.maxValue || 0}
                          onChange={(e) => handlePolicyChange('gold', 'maxValue', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-yellow-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.gold?.maxValue || 0} ETB</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Birthday Bonus Points</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.gold?.birthdayBonus || 0}
                          onChange={(e) => handlePolicyChange('gold', 'birthdayBonus', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-yellow-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.gold?.birthdayBonus || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Referral Bonus Points</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.gold?.referralBonus || 0}
                          onChange={(e) => handlePolicyChange('gold', 'referralBonus', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-yellow-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.gold?.referralBonus || 0}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="text-sm text-gray-600 block mb-1">Extra Baggage (kg)</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={policyData.gold?.extraBaggage || 0}
                          onChange={(e) => handlePolicyChange('gold', 'extraBaggage', e.target.value)}
                          className="w-full text-lg font-bold text-gray-900 border-2 border-yellow-300 rounded px-2 py-1"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900">{policyData.gold?.extraBaggage || 0} kg</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Benefits Info */}
              <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Additional Benefits by Tier
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700 mb-2">Member</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Basic booking</li>
                      <li>• Standard support</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-700 mb-2">Bronze</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>• {policyData.bronze?.discount}% discount</li>
                      <li>• {policyData.bronze?.freeTrips} free trip/year</li>
                      <li>• Birthday bonus</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-2">Silver</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>• {policyData.silver?.discount}% discount</li>
                      <li>• {policyData.silver?.freeTrips} free trips/year</li>
                      <li>• Priority boarding</li>
                      <li>• Referral bonuses</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-700 mb-2">Gold</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>• {policyData.gold?.discount}% discount</li>
                      <li>• {policyData.gold?.freeTrips} free trips/year</li>
                      <li>• Priority boarding</li>
                      <li>• Free seat selection</li>
                      <li>• Extra baggage</li>
                      <li>• Dedicated support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🎁 Loyalty Management</h1>
              <p className="text-indigo-100">Manage customer loyalty program and rewards</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  fetchPolicy()
                  setShowPolicyModal(true)
                }}
                className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-all duration-200 shadow-lg flex items-center gap-2"
              >
                <Crown className="w-5 h-5" />
                View & Edit Policy
              </button>
              <Award className="w-16 h-16 opacity-50" />
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 font-medium">Total Customers</h3>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total_customers?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Active loyalty members</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 font-medium">Total Points</h3>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total_points?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Points in circulation</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 font-medium">Free Trips Used</h3>
                <Gift className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.free_trips_used || 0}</p>
              <p className="text-sm text-gray-500 mt-1">This year</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 font-medium">Referrals</h3>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total_referrals || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Total referrals</p>
            </div>
          </div>
        )}

        {/* Tier Distribution */}
        {stats?.tier_distribution && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Crown className="w-6 h-6 text-indigo-600" />
              Tier Distribution
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.tier_distribution).map(([tier, count]) => (
                <div key={tier} className={`p-4 rounded-lg border-2 ${getTierColor(tier)}`}>
                  <div className="text-3xl mb-2 text-center">{getTierIcon(tier)}</div>
                  <p className="text-sm font-semibold text-center capitalize">{tier}</p>
                  <p className="text-2xl font-bold text-center">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'member', 'bronze', 'silver', 'gold', 'platinum'].map((tier) => (
              <button
                key={tier}
                onClick={() => setFilter(tier)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === tier
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tier === 'all' ? 'All Customers' : `${getTierIcon(tier)} ${tier.charAt(0).toUpperCase() + tier.slice(1)}`}
              </button>
            ))}
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Customer Loyalty Details</h2>
            <p className="text-gray-600 text-sm mt-1">
              {filter === 'all' ? 'All customers' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} tier customers`}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Free Trips</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border-2 ${getTierColor(customer.loyalty_tier)}`}>
                          <span className="mr-1">{getTierIcon(customer.loyalty_tier)}</span>
                          {customer.loyalty_tier?.toUpperCase() || 'MEMBER'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          <span className="font-semibold text-gray-900">{customer.loyalty_points?.toLocaleString() || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {customer.total_bookings || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="text-green-600 font-semibold">{customer.free_trips_remaining || 0}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-gray-600">{customer.free_trips_used || 0} used</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {customer.total_referrals || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  
  )
}

export default LoyaltyManagement

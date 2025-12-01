import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'

const AdminPayments = () => {
  const [payments, setPayments] = useState([])
  const [filteredPayments, setFilteredPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchPayments()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [payments, searchTerm, statusFilter, methodFilter, dateFilter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const data = await adminService.getPayments()
      setPayments(data)
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...payments]

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.tx_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.booking_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter)
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_method === methodFilter)
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      filtered = filtered.filter(payment => {
        const paymentDate = payment.created_at?.toString().split('T')[0]
        
        if (dateFilter === 'today') return paymentDate === today
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          return paymentDate >= weekAgo
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          return paymentDate >= monthAgo
        }
        return true
      })
    }

    setFilteredPayments(filtered)
  }

  const getStatusColor = (status) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getMethodIcon = (method) => {
    const icons = {
      chapa: '💳',
      telebirr: '📱',
   
    }
    return icons[method] || '💰'
  }

  const stats = {
    total: filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    success: filteredPayments.filter(p => p.status === 'success').reduce((sum, p) => sum + (p.amount || 0), 0),
    pending: filteredPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0),
    failed: filteredPayments.filter(p => p.status === 'failed').length
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
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-1">Track and manage all payment transactions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Total Transactions</p>
              <p className="text-4xl font-bold mt-2">{filteredPayments.length}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wide">Successful</p>
              <p className="text-4xl font-bold mt-2">{stats.success.toLocaleString()}</p>
              <p className="text-green-100 text-sm mt-1">ETB</p>
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
              <p className="text-yellow-100 text-sm font-medium uppercase tracking-wide">Pending</p>
              <p className="text-4xl font-bold mt-2">{stats.pending.toLocaleString()}</p>
              <p className="text-yellow-100 text-sm mt-1">ETB</p>
            </div>
            <div className="bg-yellow-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium uppercase tracking-wide">Failed</p>
              <p className="text-4xl font-bold mt-2">{stats.failed}</p>
            </div>
            <div className="bg-red-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Payments</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by transaction ref or booking ID..."
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
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Method Filter</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              
              <option value="all">All Methods</option>
              <option value="chapa">Chapa</option>
              <option value="telebirr">Telebirr</option>
        
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date Filter</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction Ref</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{payment.tx_ref}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{payment.booking_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{payment.amount} {payment.currency || 'ETB'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getMethodIcon(payment.payment_method)}</span>
                      <span className="text-sm text-gray-900 capitalize">{payment.payment_method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedPayment(payment)
                        setShowModal(true)
                      }}
                      className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No payments found</p>
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-2">Payment Details</h2>
                  <p className="text-indigo-100">Transaction Reference: {selectedPayment.tx_ref}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-center">
                <span className={`px-6 py-3 inline-flex text-lg leading-5 font-bold rounded-full ${getStatusColor(selectedPayment.status)}`}>
                  {selectedPayment.status?.toUpperCase()}
                </span>
              </div>

              {/* Payment Information */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-md p-6 border-2 border-indigo-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Payment Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Amount</p>
                    <p className="text-2xl font-bold text-indigo-900">{selectedPayment.amount} {selectedPayment.currency || 'ETB'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Payment Method</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize flex items-center">
                      <span className="text-2xl mr-2">{getMethodIcon(selectedPayment.payment_method)}</span>
                      {selectedPayment.payment_method}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Transaction Ref</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{selectedPayment.tx_ref}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Booking ID</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{selectedPayment.booking_id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Booking Data */}
              {selectedPayment.booking_data && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Booking Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Passenger Name</p>
                      <p className="text-base font-semibold text-gray-900">{selectedPayment.booking_data.passenger_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Passenger Phone</p>
                      <p className="text-base font-semibold text-gray-900">{selectedPayment.booking_data.passenger_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Seat Numbers</p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedPayment.booking_data.seat_numbers?.join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Base Fare</p>
                      <p className="text-base font-semibold text-gray-900">{selectedPayment.booking_data.base_fare || 0} ETB</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Timeline
                </h3>
                <div className="space-y-3">
                  {selectedPayment.created_at && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Created At</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(selectedPayment.created_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedPayment.paid_at && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Paid At</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(selectedPayment.paid_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedPayment.updated_at && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-600">Last Updated</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(selectedPayment.updated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Additional Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Booking Source:</span>
                    <span className="ml-2 font-semibold text-gray-900 capitalize">{selectedPayment.booking_source || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Payment Status:</span>
                    <span className="ml-2 font-semibold text-gray-900 capitalize">{selectedPayment.payment_status || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Booking Created:</span>
                    <span className="ml-2 font-semibold text-gray-900">{selectedPayment.booking_created ? 'Yes' : 'No'}</span>
                  </div>
                  {selectedPayment.migrated && (
                    <div>
                      <span className="text-gray-600 font-medium">Migrated:</span>
                      <span className="ml-2 font-semibold text-yellow-600">Yes</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 border-t-2 border-gray-200 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPayments

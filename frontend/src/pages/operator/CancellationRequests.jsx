import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, XCircle, Clock, User, Phone, MapPin, Calendar, DollarSign, RefreshCw, Search, ChevronDown, ChevronUp, Bus, Ticket, Download, FileText, Filter } from 'lucide-react'
import { bookingService } from '../../services/bookingService'
import { toast } from 'react-toastify'

const CancellationRequests = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionModal, setActionModal] = useState({ show: false, type: null, request: null })
  const [expandedRequest, setExpandedRequest] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [routeFilter, setRouteFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [timeframeFilter, setTimeframeFilter] = useState('all')

  useEffect(() => {
    loadCancellationRequests()
  }, [statusFilter, timeframeFilter])

  const loadCancellationRequests = async () => {
    try {
      setLoading(true)
      const response = await bookingService.getCancellationRequests({
        status: statusFilter,
        timeframe: timeframeFilter
      })
      setRequests(response.requests || [])
    } catch (error) {
      console.error('Error loading cancellation requests:', error)
      toast.error(error.message || 'Failed to load cancellation requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request) => {
    // Prevent action if already processed
    if (request.cancellation_status === 'approved' || request.cancellation_status === 'rejected') {
      toast.warning(`This request has already been ${request.cancellation_status}`)
      return
    }
    setActionModal({ show: true, type: 'approve', request })
  }

  const handleReject = async (request) => {
    // Prevent action if already processed
    if (request.cancellation_status === 'approved' || request.cancellation_status === 'rejected') {
      toast.warning(`This request has already been ${request.cancellation_status}`)
      return
    }
    setActionModal({ show: true, type: 'reject', request })
  }

  const confirmApprove = async (refundMethod, notes) => {
    try {
      setProcessing(actionModal.request._id)
      const response = await bookingService.approveCancellation(actionModal.request._id, {
        refund_method: refundMethod,
        notes
      })
      const refundAmount = response.refund_amount || 0
      const refundPercentage = response.refund_percentage || 60
      
      // Immediately update the local state to reflect the approval
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req._id === actionModal.request._id 
            ? { 
                ...req, 
                cancellation_status: 'approved',
                refund_amount: refundAmount,
                cancellation_approved_at: new Date().toISOString()
              }
            : req
        )
      )
      
      toast.success(`Cancellation approved! Refund: ETB ${refundAmount.toLocaleString()} (${refundPercentage}%)`)
      setActionModal({ show: false, type: null, request: null })
      
      // Reload to get fresh data from server
      loadCancellationRequests()
    } catch (error) {
      toast.error(error.message || 'Failed to approve cancellation')
    } finally {
      setProcessing(null)
    }
  }

  const confirmReject = async (reason) => {
    try {
      setProcessing(actionModal.request._id)
      await bookingService.rejectCancellation(actionModal.request._id, reason)
      
      // Immediately update the local state to reflect the rejection
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req._id === actionModal.request._id 
            ? { 
                ...req, 
                cancellation_status: 'rejected',
                rejection_reason: reason,
                cancellation_rejected_at: new Date().toISOString()
              }
            : req
        )
      )
      
      toast.success('Cancellation request rejected')
      setActionModal({ show: false, type: null, request: null })
      
      // Reload to get fresh data from server
      loadCancellationRequests()
    } catch (error) {
      toast.error(error.message || 'Failed to reject cancellation')
    } finally {
      setProcessing(null)
    }
  }

  const toggleRequestExpansion = (requestId) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId)
  }

  const filteredRequests = requests.filter(request => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || (
      request.pnr_number?.toLowerCase().includes(search) ||
      request.passenger_name?.toLowerCase().includes(search) ||
      request.passenger_phone?.includes(search) ||
      request.departure_city?.toLowerCase().includes(search) ||
      request.arrival_city?.toLowerCase().includes(search)
    )
    const matchesUrgency = urgencyFilter === 'all' || (
      urgencyFilter === 'urgent' && request.days_until_departure < 3 ||
      urgencyFilter === 'moderate' && request.days_until_departure >= 3 && request.days_until_departure < 7 ||
      urgencyFilter === 'normal' && request.days_until_departure >= 7
    )
    const matchesRoute = routeFilter === 'all' || `${request.departure_city} → ${request.arrival_city}` === routeFilter
    const matchesDate = dateFilter === 'all' || (() => {
      const requestDate = new Date(request.cancellation_request_date)
      const today = new Date()
      const daysDiff = Math.floor((today - requestDate) / (1000 * 60 * 60 * 24))
      if (dateFilter === 'today') return daysDiff === 0
      if (dateFilter === 'week') return daysDiff <= 7
      if (dateFilter === 'month') return daysDiff <= 30
      return true
    })()
    return matchesSearch && matchesUrgency && matchesRoute && matchesDate
  })

  const uniqueRoutes = [...new Set(requests.map(r => `${r.departure_city} → ${r.arrival_city}`))]

  const getStats = () => {
    const total = filteredRequests.length
    const urgent = filteredRequests.filter(r => r.days_until_departure && r.days_until_departure < 3).length
    const moderate = filteredRequests.filter(r => r.days_until_departure && r.days_until_departure >= 3 && r.days_until_departure < 7).length
    const normal = filteredRequests.filter(r => r.days_until_departure && r.days_until_departure >= 7).length
    const totalRefund = filteredRequests.reduce((sum, r) => sum + ((r.total_amount || 0) * 0.60), 0)
    const totalOriginal = filteredRequests.reduce((sum, r) => sum + (r.total_amount || 0), 0)
    const totalFees = filteredRequests.reduce((sum, r) => sum + ((r.total_amount || 0) * 0.40), 0)
    return { total, urgent, moderate, normal, totalRefund, totalOriginal, totalFees }
  }

  const exportToCSV = () => {
    const headers = ['PNR','Passenger','Phone','Route','Travel Date','Amount','Refund (60%)','Fee (40%)','Days Left','Request Date','Status','Approved/Rejected Date','Reason']
    const rows = filteredRequests.map(req => [
      req.pnr_number, 
      req.passenger_name, 
      req.passenger_phone,
      `${req.departure_city} → ${req.arrival_city}`, 
      req.travel_date,
      req.total_amount, 
      (req.total_amount * 0.60).toFixed(2), 
      (req.total_amount * 0.40).toFixed(2),
      req.days_until_departure?.toFixed(1) || 'N/A',
      new Date(req.cancellation_request_date).toLocaleString(),
      req.cancellation_status || 'pending',
      req.cancellation_approved_at ? new Date(req.cancellation_approved_at).toLocaleString() : 'N/A',
      req.cancellation_reason || 'N/A'
    ])
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const timeframe = timeframeFilter === 'all' ? 'all_time' : timeframeFilter
    const status = statusFilter === 'all' ? 'all_status' : statusFilter
    link.download = `cancellation_requests_${status}_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('CSV exported successfully!')
  }

  const getUrgencyColor = (days) => {
    if (days < 3) return 'text-red-600 bg-red-50 border-red-200'
    if (days < 7) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading cancellation requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cancellation Requests</h1>
              <p className="text-sm text-gray-600">60% refund policy • {stats.total} total requests ({filteredRequests.filter(r => r.cancellation_status === 'pending').length} pending)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="font-medium">Export CSV</span>
            </button>
            <button
              onClick={loadCancellationRequests}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
              <select
                value={timeframeFilter}
                onChange={(e) => setTimeframeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search PNR, name, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.urgent}</p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Moderate</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.moderate}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Refund</p>
                <p className="text-xl font-bold text-green-600 mt-1">{stats.totalRefund.toFixed(0)} ETB</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[300px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by PNR, passenger, phone, or route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Urgency</option>
                <option value="urgent">🔴 Urgent (&lt; 3 days)</option>
                <option value="moderate">🟠 Moderate (3-7 days)</option>
                <option value="normal">🟢 Normal (&gt; 7 days)</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  showFilters ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200">
                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Routes</option>
                  {uniqueRoutes.map(route => (
                    <option key={route} value={route}>{route}</option>
                  ))}
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>

                <button
                  onClick={() => {
                    setSearchTerm('')
                    setUrgencyFilter('all')
                    setRouteFilter('all')
                    setDateFilter('all')
                    toast.info('Filters cleared')
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Requests Found</h3>
            <p className="text-gray-600">
              {searchTerm || urgencyFilter !== 'all' 
                ? 'No requests match your filters. Try adjusting your search.'
                : 'All caught up! No pending cancellation requests.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const isExpanded = expandedRequest === request._id
              const urgencyColor = getUrgencyColor(request.days_until_departure)

              return (
                <div key={request._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Request Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleRequestExpansion(request._id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Ticket className="h-5 w-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">PNR: {request.pnr_number}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${urgencyColor}`}>
                              <Clock className="h-3 w-3" />
                              {request.days_until_departure ? request.days_until_departure.toFixed(1) : 'N/A'} days
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {request.passenger_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {request.passenger_phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {request.departure_city} → {request.arrival_city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {request.travel_date}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">{(request.total_amount * 0.60).toFixed(0)} ETB</p>
                          <p className="text-xs text-gray-500">Refund (60%)</p>
                          <p className="text-xs text-gray-400 line-through">{request.total_amount} ETB</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3">Passenger Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Name</span>
                                <span className="font-medium">{request.passenger_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Phone</span>
                                <span className="font-medium">{request.passenger_phone}</span>
                              </div>
                              {request.passenger_email && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Email</span>
                                  <span className="font-medium text-xs">{request.passenger_email}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3">Journey Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Route</span>
                                <span className="font-medium">{request.departure_city} → {request.arrival_city}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Date</span>
                                <span className="font-medium">{request.travel_date}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Time</span>
                                <span className="font-medium">{request.departure_time}</span>
                              </div>
                              {request.seat_numbers && request.seat_numbers.length > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Seats</span>
                                  <span className="font-medium">{request.seat_numbers.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          {request.cancellation_reason && (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-amber-600" />
                                Cancellation Reason
                              </h4>
                              <p className="text-sm text-gray-800 bg-white/80 p-4 rounded-lg border border-amber-100 leading-relaxed italic">
                                "{request.cancellation_reason}"
                              </p>
                            </div>
                          )}

                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3">
                              Actions 
                              <span className="text-xs text-gray-500 ml-2">
                                (Status: {request.cancellation_status || 'pending'})
                              </span>
                            </h4>
                            
                            {/* Show status if already processed - NO BUTTONS */}
                            {request.cancellation_status === 'approved' ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p className="font-semibold text-green-900">Already Approved</p>
                                <p className="text-xs text-green-700 mt-1">
                                  Refund: ETB {request.refund_amount?.toLocaleString() || 'N/A'}
                                </p>
                                {request.cancellation_approved_at && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(request.cancellation_approved_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ) : request.cancellation_status === 'rejected' ? (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                                <p className="font-semibold text-red-900">Already Rejected</p>
                                {request.rejection_reason && (
                                  <p className="text-xs text-red-700 mt-1">
                                    Reason: {request.rejection_reason}
                                  </p>
                                )}
                                {request.cancellation_rejected_at && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(request.cancellation_rejected_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ) : (
                              /* Show action buttons ONLY for pending requests */
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleApprove(request)
                                  }}
                                  disabled={processing === request._id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleReject(request)
                                  }}
                                  disabled={processing === request._id}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </button>
                              </div>
                            )}
                            
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Requested: {new Date(request.cancellation_request_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {filteredRequests.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-gray-600">
                Showing {filteredRequests.length} of {requests.length} requests
                {stats.urgent > 0 && ` • ${stats.urgent} urgent`}
              </p>
              <p className="text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal.show && (
        <ActionModal
          type={actionModal.type}
          request={actionModal.request}
          onConfirm={actionModal.type === 'approve' ? confirmApprove : confirmReject}
          onCancel={() => setActionModal({ show: false, type: null, request: null })}
          processing={processing === actionModal.request._id}
        />
      )}
    </div>
  )
}

// Action Modal Component
const ActionModal = ({ type, request, onConfirm, onCancel, processing }) => {
  const [refundMethod, setRefundMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (type === 'approve') {
      onConfirm(refundMethod, notes)
    } else {
      if (!reason.trim()) {
        toast.error('Please provide a reason for rejection')
        return
      }
      onConfirm(reason)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 ${type === 'approve' ? 'bg-green-600' : 'bg-red-600'} text-white rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              {type === 'approve' ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{type === 'approve' ? 'Approve Cancellation' : 'Reject Cancellation'}</h2>
              <p className="text-white/90 text-sm">PNR: {request.pnr_number} • {request.passenger_name}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Booking Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Bus className="h-5 w-5 text-blue-600" />
              Booking Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <p className="text-gray-600">Passenger</p>
                <p className="font-semibold">{request.passenger_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone</p>
                <p className="font-semibold">{request.passenger_phone}</p>
              </div>
              <div>
                <p className="text-gray-600">Route</p>
                <p className="font-semibold">{request.departure_city} → {request.arrival_city}</p>
              </div>
              <div>
                <p className="text-gray-600">Travel Date</p>
                <p className="font-semibold">{request.travel_date}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-blue-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold">{request.total_amount} ETB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-semibold">Refund (60%)</span>
                <span className="text-xl font-bold text-green-600">{(request.total_amount * 0.60).toFixed(2)} ETB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cancellation Fee (40%)</span>
                <span className="text-gray-700">{(request.total_amount * 0.40).toFixed(2)} ETB</span>
              </div>
            </div>
          </div>

          {type === 'approve' ? (
            <>
              {/* Refund Method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Refund Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'cash', label: 'Cash', icon: '💵' },
                    { value: 'chapa', label: 'Chapa', icon: '📱' }
                  ].map((method) => (
                    <label
                      key={method.value}
                      className={`flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        refundMethod === method.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={method.value}
                        checked={refundMethod === method.value}
                        onChange={(e) => setRefundMethod(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-2xl mb-1">{method.icon}</span>
                      <span className="text-sm font-medium text-center">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Rejection *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a clear reason for rejection..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={4}
                required
              />
              <p className="text-xs text-gray-500 mt-1">This will be communicated to the passenger</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className={`flex-1 px-6 py-3 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${
                type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {type === 'approve' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  {type === 'approve' ? 'Approve & Process' : 'Reject Request'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CancellationRequests

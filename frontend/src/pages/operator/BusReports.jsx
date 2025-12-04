import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  FileText,
  Bus,
  Calendar,
  User,
  MessageSquare,
  TrendingUp,
  Wrench,
  Fuel,
  Download
} from 'lucide-react'
import { toast } from 'react-toastify'
import api from '../../services/api'

const BusReports = () => {
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    reportType: 'all',
    searchTerm: ''
  })

  const [updateData, setUpdateData] = useState({
    status: '',
    operator_notes: ''
  })

  useEffect(() => {
    fetchReports()
    fetchStats()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [reports, filters])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await api.get('/operator/bus-reports')
      setReports(response.data.reports || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to load bus reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/operator/bus-reports/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...reports]

    if (filters.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filters.status)
    }

    if (filters.severity !== 'all') {
      filtered = filtered.filter((r) => r.severity === filters.severity)
    }

    if (filters.reportType !== 'all') {
      filtered = filtered.filter((r) => r.report_type === filters.reportType)
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(term) ||
          r.bus_number?.toLowerCase().includes(term) ||
          r.driver_name?.toLowerCase().includes(term)
      )
    }

    setFilteredReports(filtered)
  }

  const handleViewReport = (report) => {
    setSelectedReport(report)
    setUpdateData({
      status: report.status,
      operator_notes: report.operator_notes || ''
    })
    setShowModal(true)
  }

  const handleUpdateReport = async () => {
    if (!selectedReport) return

    try {
      await api.patch(`/operator/bus-reports/${selectedReport._id}`, updateData)
      toast.success('Report updated successfully')
      setShowModal(false)
      fetchReports()
      fetchStats()
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error(error.response?.data?.error || 'Failed to update report')
    }
  }

  const exportToCSV = () => {
    if (filteredReports.length === 0) {
      toast.warning('No reports to export')
      return
    }

    // CSV Headers
    const headers = [
      'Report ID',
      'Date',
      'Time',
      'Bus Number',
      'Driver Name',
      'Report Type',
      'Severity',
      'Status',
      'Title',
      'Description',
      'Issue Category',
      'Fuel Level',
      'Mileage',
      'Operator Notes'
    ]

    // Convert reports to CSV rows
    const rows = filteredReports.map((report) => {
      const date = new Date(report.created_at)
      return [
        report._id,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        report.bus_number || 'N/A',
        report.driver_name || 'N/A',
        report.report_type || 'N/A',
        report.severity || 'N/A',
        report.status || 'N/A',
        `"${report.title || ''}"`,
        `"${report.description || ''}"`,
        report.issue_category || 'N/A',
        report.fuel_level || 'N/A',
        report.mileage || 'N/A',
        `"${report.operator_notes || ''}"`
      ]
    })

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `bus_reports_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(`Exported ${filteredReports.length} reports to CSV`)
  }

  const exportToExcel = () => {
    if (filteredReports.length === 0) {
      toast.warning('No reports to export')
      return
    }

    // Create HTML table for Excel
    const headers = [
      'Report ID',
      'Date',
      'Time',
      'Bus Number',
      'Driver Name',
      'Report Type',
      'Severity',
      'Status',
      'Title',
      'Description',
      'Issue Category',
      'Fuel Level',
      'Mileage',
      'Operator Notes'
    ]

    const rows = filteredReports.map((report) => {
      const date = new Date(report.created_at)
      return `
        <tr>
          <td>${report._id}</td>
          <td>${date.toLocaleDateString()}</td>
          <td>${date.toLocaleTimeString()}</td>
          <td>${report.bus_number || 'N/A'}</td>
          <td>${report.driver_name || 'N/A'}</td>
          <td>${report.report_type || 'N/A'}</td>
          <td>${report.severity || 'N/A'}</td>
          <td>${report.status || 'N/A'}</td>
          <td>${report.title || ''}</td>
          <td>${report.description || ''}</td>
          <td>${report.issue_category || 'N/A'}</td>
          <td>${report.fuel_level || 'N/A'}</td>
          <td>${report.mileage || 'N/A'}</td>
          <td>${report.operator_notes || ''}</td>
        </tr>
      `
    }).join('')

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4F46E5; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `bus_reports_${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(`Exported ${filteredReports.length} reports to Excel`)
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getReportTypeIcon = (type) => {
    switch (type) {
      case 'maintenance':
        return <Wrench className="w-5 h-5" />
      case 'issue':
        return <AlertTriangle className="w-5 h-5" />
      case 'fuel':
        return <Fuel className="w-5 h-5" />
      case 'status':
        return <CheckCircle className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <FileText className="w-8 h-8" />
            Bus Reports Management
          </h1>
          <p className="text-blue-100">
            Monitor and manage bus reports from drivers
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">
                    Total Reports
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-yellow-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Pending</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.by_status.pending}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Critical</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.by_severity.critical}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Resolved</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.by_status.resolved}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-bold text-gray-900">Filters & Export</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) =>
                  setFilters({ ...filters, severity: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={filters.reportType}
                onChange={(e) =>
                  setFilters({ ...filters, reportType: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="maintenance">Maintenance</option>
                <option value="issue">Issue</option>
                <option value="fuel">Fuel</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) =>
                    setFilters({ ...filters, searchTerm: e.target.value })
                  }
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Reports ({filteredReports.length})
          </h2>

          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No reports found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <div
                  key={report._id}
                  className={`border-2 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer ${getSeverityColor(
                    report.severity
                  )}`}
                  onClick={() => handleViewReport(report)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white p-2 rounded-lg">
                          {getReportTypeIcon(report.report_type)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {report.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {report.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 mt-3">
                        <span className="flex items-center gap-1">
                          <Bus className="w-4 h-4" />
                          {report.bus_number || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {report.driver_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                        {report.mileage && (
                          <span className="flex items-center gap-1">
                            📍 {report.mileage} km
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                          report.status
                        )}`}
                      >
                        {report.status?.toUpperCase()}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(
                          report.severity
                        )}`}
                      >
                        {report.severity?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Report Details
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Report Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Title</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedReport.title}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-semibold">
                    Description
                  </p>
                  <p className="text-gray-900">{selectedReport.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">
                      Bus Number
                    </p>
                    <p className="text-gray-900">
                      {selectedReport.bus_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">
                      Driver
                    </p>
                    <p className="text-gray-900">{selectedReport.driver_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">
                      Report Type
                    </p>
                    <p className="text-gray-900 capitalize">
                      {selectedReport.report_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">
                      Severity
                    </p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(
                        selectedReport.severity
                      )}`}
                    >
                      {selectedReport.severity?.toUpperCase()}
                    </span>
                  </div>
                  {selectedReport.mileage && (
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">
                        Mileage
                      </p>
                      <p className="text-gray-900">{selectedReport.mileage} km</p>
                    </div>
                  )}
                  {selectedReport.fuel_level && (
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">
                        Fuel Level
                      </p>
                      <p className="text-gray-900">{selectedReport.fuel_level}%</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Update Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Update Status
                  </label>
                  <select
                    value={updateData.status}
                    onChange={(e) =>
                      setUpdateData({ ...updateData, status: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Operator Notes
                  </label>
                  <textarea
                    value={updateData.operator_notes}
                    onChange={(e) =>
                      setUpdateData({
                        ...updateData,
                        operator_notes: e.target.value
                      })
                    }
                    placeholder="Add notes about actions taken..."
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Existing Notes */}
              {selectedReport.operator_notes && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">
                      Previous Notes
                    </p>
                  </div>
                  <p className="text-gray-700">{selectedReport.operator_notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateReport}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  Update Report
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BusReports

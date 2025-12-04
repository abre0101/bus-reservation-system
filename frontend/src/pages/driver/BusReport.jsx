import { useState, useEffect } from 'react'
import { 
  Bus, AlertTriangle, Wrench, Fuel, CheckCircle, 
  Send, FileText, Clock, Calendar
} from 'lucide-react'
import { toast } from 'react-toastify'
import api from '../../services/api'

const BusReport = () => {
  const [trips, setTrips] = useState([])
  const [selectedTrip, setSelectedTrip] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reports, setReports] = useState([])
  
  const [reportData, setReportData] = useState({
    reportType: 'maintenance',
    severity: 'medium',
    title: '',
    description: '',
    fuelLevel: '',
    mileage: '',
    issueCategory: 'engine'
  })

  useEffect(() => {
    fetchTrips()
    fetchReports()
  }, [])

  const fetchTrips = async () => {
    try {
      const response = await api.get('/driver/trips?status=scheduled,in_progress,departed')
      setTrips(response.data.trips || [])
      if (response.data.trips?.length > 0) {
        setSelectedTrip(response.data.trips[0].id || response.data.trips[0]._id)
      }
    } catch (error) {
      console.error('Error fetching trips:', error)
    }
  }

  const fetchReports = async () => {
    try {
      const response = await api.get('/driver/bus-reports')
      setReports(response.data.reports || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedTrip) {
      toast.error('Please select a trip')
      return
    }

    if (!reportData.title.trim()) {
      toast.error('Please enter a report title')
      return
    }

    if (!reportData.description.trim()) {
      toast.error('Please enter a description')
      return
    }

    try {
      setSubmitting(true)
      await api.post('/driver/bus-reports', {
        trip_id: selectedTrip,
        ...reportData
      })
      
      toast.success('✅ Report submitted successfully!')
      
      // Reset form
      setReportData({
        reportType: 'maintenance',
        severity: 'medium',
        title: '',
        description: '',
        fuelLevel: '',
        mileage: '',
        issueCategory: 'engine'
      })
      
      fetchReports()
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error(error.response?.data?.error || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedTripData = trips.find(t => (t.id || t._id) === selectedTrip)

  const reportTypes = [
    { value: 'maintenance', label: 'Maintenance Required', icon: Wrench, color: 'orange' },
    { value: 'issue', label: 'Bus Issue', icon: AlertTriangle, color: 'red' },
    { value: 'fuel', label: 'Fuel Report', icon: Fuel, color: 'blue' },
    { value: 'status', label: 'Status Update', icon: CheckCircle, color: 'green' }
  ]

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ]

  const issueCategories = [
    'Engine', 'Brakes', 'Tires', 'Lights', 'AC/Heating', 
    'Seats', 'Windows', 'Doors', 'Suspension', 'Other'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              <FileText className="w-8 h-8" />
              Bus Report
            </h1>
            <p className="text-blue-100">Report bus status, issues, and maintenance needs</p>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Send className="w-6 h-6 text-blue-600" />
                Submit New Report
              </h2>

              {/* Trip Selection */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Trip</label>
                <select
                  value={selectedTrip}
                  onChange={(e) => setSelectedTrip(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a trip...</option>
                  {trips.map((trip) => (
                    <option key={trip.id || trip._id} value={trip.id || trip._id}>
                      {trip.origin_city || 'Unknown'} → {trip.destination_city || 'Unknown'} - {trip.departure_date} ({trip.bus_number || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Bus Info */}
              {selectedTripData && (
                <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <Bus className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-600 font-semibold">Selected Trip</p>
                      <p className="font-bold text-gray-900">
                        {selectedTripData.bus_number || 'N/A'}
                        {selectedTripData.bus_name && (
                          <span className="text-gray-600 font-normal"> - {selectedTripData.bus_name}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-700">
                        {selectedTripData.origin_city || 'Unknown'} → {selectedTripData.destination_city || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Report Type */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Report Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {reportTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setReportData({ ...reportData, reportType: type.value })}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        reportData.reportType === type.value
                          ? `border-${type.color}-500 bg-${type.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className={`w-5 h-5 ${reportData.reportType === type.value ? `text-${type.color}-600` : 'text-gray-400'}`} />
                      <span className={`font-semibold text-sm ${reportData.reportType === type.value ? 'text-gray-900' : 'text-gray-600'}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Severity Level</label>
                <div className="flex gap-2">
                  {severityLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setReportData({ ...reportData, severity: level.value })}
                      className={`flex-1 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                        reportData.severity === level.value
                          ? level.color + ' border-2 border-current'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Issue Category (for maintenance/issue reports) */}
              {(reportData.reportType === 'maintenance' || reportData.reportType === 'issue') && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Category</label>
                  <select
                    value={reportData.issueCategory}
                    onChange={(e) => setReportData({ ...reportData, issueCategory: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    {issueCategories.map((category) => (
                      <option key={category} value={category.toLowerCase()}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fuel Level (for fuel reports) */}
              {reportData.reportType === 'fuel' && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel Level (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={reportData.fuelLevel}
                    onChange={(e) => setReportData({ ...reportData, fuelLevel: e.target.value })}
                    placeholder="Enter fuel percentage (0-100)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Mileage */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Mileage (km)</label>
                <input
                  type="number"
                  value={reportData.mileage}
                  onChange={(e) => setReportData({ ...reportData, mileage: e.target.value })}
                  placeholder="Enter current mileage"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Title */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Report Title *</label>
                <input
                  type="text"
                  value={reportData.title}
                  onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                  placeholder="Brief summary of the report"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea
                  value={reportData.description}
                  onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                  placeholder="Provide detailed information about the issue or status..."
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedTrip}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                  submitting || !selectedTrip
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Report
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Report Templates */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Quick Templates
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setReportData({
                    ...reportData,
                    reportType: 'fuel',
                    severity: 'medium',
                    title: 'Low Fuel Alert',
                    description: 'Fuel level is running low and needs refueling soon.'
                  })}
                  className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all"
                >
                  <p className="font-semibold text-sm text-gray-900">⛽ Low Fuel</p>
                  <p className="text-xs text-gray-600">Quick fuel alert</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setReportData({
                    ...reportData,
                    reportType: 'maintenance',
                    severity: 'high',
                    title: 'Brake Issue Detected',
                    description: 'Brakes are making unusual noise and need immediate inspection.',
                    issueCategory: 'brakes'
                  })}
                  className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition-all"
                >
                  <p className="font-semibold text-sm text-gray-900">🔧 Brake Issue</p>
                  <p className="text-xs text-gray-600">Urgent maintenance</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setReportData({
                    ...reportData,
                    reportType: 'issue',
                    severity: 'medium',
                    title: 'AC Not Working',
                    description: 'Air conditioning system is not functioning properly.',
                    issueCategory: 'ac/heating'
                  })}
                  className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-all"
                >
                  <p className="font-semibold text-sm text-gray-900">❄️ AC Problem</p>
                  <p className="text-xs text-gray-600">Comfort issue</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setReportData({
                    ...reportData,
                    reportType: 'status',
                    severity: 'low',
                    title: 'Bus in Good Condition',
                    description: 'All systems are functioning normally. No issues to report.'
                  })}
                  className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-all"
                >
                  <p className="font-semibold text-sm text-gray-900">✅ All Good</p>
                  <p className="text-xs text-gray-600">Positive status</p>
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-lg p-5 border border-yellow-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Reporting Tips
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span>Report issues immediately for safety</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span>Be specific and detailed in descriptions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span>Include mileage for maintenance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span>Mark critical issues as high priority</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Your Recent Reports
          </h2>

          {reports.length > 0 ? (
            <div className="space-y-3">
              {reports.slice(0, 5).map((report, index) => {
                const severityColor = severityLevels.find(s => s.value === report.severity)?.color || 'bg-gray-100 text-gray-800'
                
                return (
                  <div key={report._id || index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">{report.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${severityColor}`}>
                            {report.severity?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Bus className="w-3 h-3" />
                            {report.bus_number || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(report.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        report.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No reports submitted yet</p>
              <p className="text-sm text-gray-500 mt-1">Your submitted reports will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BusReport

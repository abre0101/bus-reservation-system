import React, { useState, useEffect } from 'react'
import { X, MapPin, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { trackingService } from '../../services/trackingService'
import { toast } from 'react-toastify'

const DriverCheckinModal = ({ schedule, onClose, onSuccess }) => {
  const [stops, setStops] = useState([])
  const [selectedStop, setSelectedStop] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [location, setLocation] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    loadRouteStops()
    getCurrentLocation()
  }, [])

  const loadRouteStops = async () => {
    try {
      setLoading(true)
      console.log('🗺️ Loading route stops for schedule:', schedule._id)
      
      const response = await trackingService.getRouteStops(schedule._id)
      
      if (response && response.stops) {
        setStops(response.stops)
        
        // Auto-select next pending stop
        const nextStop = response.stops.find(stop => stop.status === 'pending')
        if (nextStop) {
          setSelectedStop(nextStop)
        }
      }
    } catch (error) {
      console.error('❌ Error loading stops:', error)
      toast.error('Failed to load route stops')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true)
      const coords = await trackingService.getCurrentLocation()
      setLocation(coords)
      console.log('📍 Current location obtained:', coords)
    } catch (error) {
      console.warn('⚠️ Could not get location:', error.message)
      toast.warning('Could not get your location. You can still check in manually.')
    } finally {
      setGettingLocation(false)
    }
  }

  const handleCheckin = async () => {
    if (!selectedStop) {
      toast.error('Please select a stop to check in')
      return
    }

    try {
      setSubmitting(true)
      console.log('📍 Checking in at stop:', selectedStop)
      
      const checkinData = {
        schedule_id: schedule._id,
        stop_id: selectedStop.stop_id,
        coordinates: location || { lat: 0, lng: 0 },
        notes: notes.trim()
      }

      const response = await trackingService.driverCheckin(checkinData)
      
      if (response && response.success) {
        toast.success(response.message || 'Check-in successful!')
        
        if (onSuccess) {
          onSuccess(response)
        }
        
        onClose()
      } else {
        throw new Error(response?.error || 'Check-in failed')
      }
    } catch (error) {
      console.error('❌ Check-in error:', error)
      toast.error(error.message || 'Check-in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStopStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStopStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'pending':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading route stops...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Driver Check-in</h2>
            <p className="text-blue-100 mt-1">
              {schedule.bus_number} - {schedule.route_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Location Status */}
          <div className={`border-2 rounded-xl p-4 ${
            location 
              ? 'bg-green-50 border-green-300' 
              : 'bg-yellow-50 border-yellow-300'
          }`}>
            <div className="flex items-center space-x-3">
              <MapPin className={`h-5 w-5 ${
                location ? 'text-green-600' : 'text-yellow-600'
              }`} />
              <div>
                <h3 className={`font-semibold ${
                  location ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  Location Status
                </h3>
                <p className={`text-sm ${
                  location ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {gettingLocation 
                    ? 'Getting your location...' 
                    : location 
                    ? `Location obtained (±${Math.round(location.accuracy || 0)}m accuracy)`
                    : 'Location not available - you can still check in'
                  }
                </p>
              </div>
              {gettingLocation && (
                <Loader className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>
            {!location && !gettingLocation && (
              <button
                onClick={getCurrentLocation}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Try Again
              </button>
            )}
          </div>

          {/* Route Stops */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Stop to Check In</h3>
            <div className="space-y-3">
              {stops.map((stop, index) => (
                <div
                  key={stop.stop_id}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    selectedStop?.stop_id === stop.stop_id
                      ? 'border-blue-500 bg-blue-50'
                      : stop.status === 'completed'
                      ? 'border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (stop.status !== 'completed') {
                      setSelectedStop(stop)
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStopStatusIcon(stop.status)}
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {index + 1}. {stop.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Estimated: {stop.estimated_time}
                        </p>
                        {stop.actual_time && (
                          <p className="text-sm text-green-600">
                            Checked in: {new Date(stop.actual_time).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        getStopStatusColor(stop.status)
                      }`}>
                        {stop.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                      
                      {selectedStop?.stop_id === stop.stop_id && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  {stop.checked_by && (
                    <p className="text-xs text-gray-500 mt-2">
                      Checked in by: {stop.checked_by}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this check-in (traffic, delays, etc.)..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckin}
              disabled={!selectedStop || selectedStop.status === 'completed' || submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Checking In...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Check In at {selectedStop?.name || 'Stop'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DriverCheckinModal

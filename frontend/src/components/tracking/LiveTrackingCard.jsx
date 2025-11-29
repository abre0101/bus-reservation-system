import React, { useState, useEffect } from 'react'
import { MapPin, Clock, CheckCircle, Loader, RefreshCw, Bus, AlertCircle } from 'lucide-react'
import { trackingService } from '../../services/trackingService'

const LiveTrackingCard = ({ scheduleId, bookingData }) => {
  const [trackingData, setTrackingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    let cleanup = null

    if (scheduleId && autoRefresh) {
      // Start real-time tracking
      cleanup = trackingService.startRealTimeTracking(
        scheduleId,
        (data) => {
          if (data && data.tracking) {
            setTrackingData(data.tracking)
            setLastUpdate(new Date())
            setError(null)
          }
          setLoading(false)
        },
        30000 // Update every 30 seconds
      )
    } else if (scheduleId) {
      // Single update
      loadTrackingData()
    }

    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [scheduleId, autoRefresh])

  const loadTrackingData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await trackingService.getLiveTracking(scheduleId)
      
      if (response && response.tracking) {
        setTrackingData(response.tracking)
        setLastUpdate(new Date())
      } else {
        throw new Error('No tracking data available')
      }
    } catch (err) {
      console.error('❌ Error loading tracking data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadTrackingData()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'departed':
      case 'en_route':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-5 w-5" />
      case 'departed':
      case 'en_route':
        return <Bus className="h-5 w-5" />
      case 'completed':
        return <CheckCircle className="h-5 w-5" />
      default:
        return <AlertCircle className="h-5 w-5" />
    }
  }

  if (loading && !trackingData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading tracking information...</span>
        </div>
      </div>
    )
  }

  if (error && !trackingData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-red-200">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tracking Unavailable</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!trackingData) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">Live Bus Tracking</h3>
            <p className="text-blue-100">
              {trackingData.bus_number} - {trackingData.route}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Refresh tracking"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                autoRefresh 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {autoRefresh ? 'Auto' : 'Manual'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(trackingData.current_status)}
            <div>
              <h4 className="font-semibold text-gray-900">Current Status</h4>
              <p className="text-gray-600">{trackingData.message}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
            getStatusColor(trackingData.current_status)
          }`}>
            {trackingData.current_status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Current Location */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <MapPin className="h-5 w-5 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Current Location</h4>
          </div>
          <p className="text-lg font-medium text-gray-800">
            {trackingData.current_location}
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Journey Progress</h4>
            <span className="text-sm font-medium text-gray-600">
              {trackingData.progress}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: trackingData.progress }}
            ></div>
          </div>
        </div>

        {/* Estimated Arrival - Only show when bus has departed */}
        {trackingData.estimated_arrival && 
         trackingData.current_status !== 'scheduled' && 
         trackingData.current_status !== 'boarding' && (
          <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Estimated Arrival</span>
            </div>
            <span className="text-lg font-bold text-blue-700">
              {trackingData.estimated_arrival === 'Delayed' 
                ? '⚠️ Delayed' 
                : trackingData.estimated_arrival
              }
            </span>
          </div>
        )}

        {/* Last Update */}
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            {trackingData.last_update 
              ? `Last updated: ${new Date(trackingData.last_update).toLocaleString()}`
              : lastUpdate 
              ? `Refreshed: ${lastUpdate.toLocaleTimeString()}`
              : 'No recent updates'
            }
          </p>
          {autoRefresh && (
            <p className="text-xs text-gray-400 mt-1">
              Auto-refreshing every 30 seconds
            </p>
          )}
        </div>
      </div>

      {/* Booking Info (if provided) */}
      {bookingData && (
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Your Booking:</span>
            <span className="font-semibold text-gray-900">
              PNR: {bookingData.pnr_number}
            </span>
          </div>
          {bookingData.seat_numbers && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">Seats:</span>
              <span className="font-semibold text-gray-900">
                {bookingData.seat_numbers.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LiveTrackingCard

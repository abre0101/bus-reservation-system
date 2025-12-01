import React, { useState, useEffect } from 'react'
import { X, AlertCircle, DollarSign, Clock, Info } from 'lucide-react'
import { 
  calculateHoursUntilDeparture, 
  getRefundTier, 
  calculateRefundAmount,
  getAllRefundTiers 
} from '../../utils/cancellationPolicy'
import { formatCurrency } from '../../utils/helpers'

const CancellationModal = ({ booking, onClose, onConfirm, isSubmitting }) => {
  const [reason, setReason] = useState('')
  const [refundInfo, setRefundInfo] = useState(null)
  const [showPolicy, setShowPolicy] = useState(false)

  useEffect(() => {
    if (booking) {
      const hoursUntil = calculateHoursUntilDeparture(
        booking.travel_date,
        booking.departure_time
      )
      const tier = getRefundTier(hoursUntil)
      const refund = calculateRefundAmount(booking.total_amount, tier.percentage)
      
      setRefundInfo({
        ...tier,
        ...refund,
        hoursUntil
      })
    }
  }, [booking])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (refundInfo?.canCancel) {
      onConfirm(reason)
    }
  }

  if (!booking || !refundInfo) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Request Cancellation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Booking Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">PNR Number:</span>
              <span className="font-semibold">{booking.pnr_number}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Route:</span>
              <span className="font-semibold">
                {booking.departure_city} → {booking.arrival_city}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold">{formatCurrency(booking.total_amount)}</span>
            </div>
          </div>

          {/* Refund Information */}
          {refundInfo.canCancel ? (
            <div className={`rounded-xl p-6 mb-6 border-2 ${refundInfo.bgColor} ${refundInfo.borderColor}`}>
              <div className="flex items-start space-x-3 mb-4">
                <div className={`p-2 rounded-full ${refundInfo.bgColor}`}>
                  <DollarSign className={`h-6 w-6 ${refundInfo.textColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${refundInfo.textColor} mb-1`}>
                    {refundInfo.percentage}% Refund Available
                  </h3>
                  <p className="text-gray-600 text-sm">{refundInfo.message}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-600">Refund Amount:</span>
                  <span className="font-bold text-green-600 text-lg">
                    {formatCurrency(refundInfo.refundAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Cancellation Fee:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(refundInfo.cancellationFee)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 pt-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {Math.floor(refundInfo.hoursUntil)}h {Math.round((refundInfo.hoursUntil % 1) * 60)}m until departure
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-red-700 mb-2">
                    Cancellation Not Allowed
                  </h3>
                  <p className="text-red-600 mb-2">
                    Cancellations are not permitted less than 3 hours before departure.
                  </p>
                  <p className="text-sm text-red-500">
                    Time until departure: {Math.floor(refundInfo.hoursUntil)}h {Math.round((refundInfo.hoursUntil % 1) * 60)}m
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Policy Toggle */}
          <button
            onClick={() => setShowPolicy(!showPolicy)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-4 text-sm font-medium"
          >
            <Info className="h-4 w-4" />
            <span>{showPolicy ? 'Hide' : 'View'} Cancellation Policy</span>
          </button>

          {/* Cancellation Policy Details */}
          {showPolicy && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Refund Policy</h4>
              <div className="space-y-2">
                {getAllRefundTiers().map((tier, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{tier.timeRange} before departure:</span>
                    <span className={`font-semibold ${
                      tier.percentage === 100 ? 'text-green-600' :
                      tier.percentage >= 50 ? 'text-blue-600' :
                      tier.percentage > 0 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {tier.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason Input */}
          {refundInfo.canCancel && (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Please provide a reason for cancellation..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          )}

          {!refundInfo.canCancel && (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CancellationModal

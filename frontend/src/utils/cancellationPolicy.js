/**
 * Cancellation Policy Utilities
 * Tiered refund system based on time until departure
 */

/**
 * Calculate refund percentage based on hours until departure
 * @param {number} hoursUntilDeparture - Hours until departure
 * @returns {number} Refund percentage (0-100)
 */
export const calculateRefundPercentage = (hoursUntilDeparture) => {
  if (hoursUntilDeparture >= 48) {
    return 100
  } else if (hoursUntilDeparture >= 24) {
    return 70
  } else if (hoursUntilDeparture >= 6) {
    return 50
  } else if (hoursUntilDeparture >= 3) {
    return 30
  } else {
    return 0 // Cannot cancel
  }
}

/**
 * Get refund tier information
 * @param {number} hoursUntilDeparture - Hours until departure
 * @returns {object} Tier information with percentage, message, color, etc.
 */
export const getRefundTier = (hoursUntilDeparture) => {
  const percentage = calculateRefundPercentage(hoursUntilDeparture)
  
  if (percentage === 100) {
    return {
      percentage: 100,
      tier: 'full',
      message: '48+ hours before departure',
      description: 'Full refund available',
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      canCancel: true
    }
  } else if (percentage === 70) {
    return {
      percentage: 70,
      tier: 'high',
      message: '24-48 hours before departure',
      description: '70% refund available',
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      canCancel: true
    }
  } else if (percentage === 50) {
    return {
      percentage: 50,
      tier: 'medium',
      message: '6-24 hours before departure',
      description: '50% refund available',
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      canCancel: true
    }
  } else if (percentage === 30) {
    return {
      percentage: 30,
      tier: 'low',
      message: '3-6 hours before departure',
      description: '30% refund available',
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      canCancel: true
    }
  } else {
    return {
      percentage: 0,
      tier: 'none',
      message: 'Less than 3 hours before departure',
      description: 'Cancellation not allowed',
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      canCancel: false
    }
  }
}

/**
 * Calculate hours until departure
 * @param {string} travelDate - Travel date (YYYY-MM-DD)
 * @param {string} departureTime - Departure time (HH:MM)
 * @returns {number} Hours until departure
 */
export const calculateHoursUntilDeparture = (travelDate, departureTime) => {
  try {
    const now = new Date()
    const departure = new Date(travelDate)
    const [hours, minutes] = departureTime.split(':').map(Number)
    departure.setHours(hours, minutes, 0, 0)
    
    const diffMs = departure - now
    const diffHours = diffMs / (1000 * 60 * 60)
    
    return Math.max(0, diffHours)
  } catch (error) {
    console.error('Error calculating hours until departure:', error)
    return 0
  }
}

/**
 * Calculate refund amount
 * @param {number} totalAmount - Total booking amount
 * @param {number} refundPercentage - Refund percentage
 * @returns {object} Refund details
 */
export const calculateRefundAmount = (totalAmount, refundPercentage) => {
  const refundAmount = (totalAmount * refundPercentage) / 100
  const cancellationFee = totalAmount - refundAmount
  
  return {
    totalAmount,
    refundPercentage,
    refundAmount: Math.round(refundAmount * 100) / 100,
    cancellationFee: Math.round(cancellationFee * 100) / 100
  }
}

/**
 * Get all refund tiers for display
 * @returns {array} Array of all refund tiers
 */
export const getAllRefundTiers = () => {
  return [
    {
      timeRange: '48+ hours',
      percentage: 100,
      description: 'Full refund',
      color: 'green'
    },
    {
      timeRange: '24-48 hours',
      percentage: 70,
      description: '70% refund',
      color: 'blue'
    },
    {
      timeRange: '6-24 hours',
      percentage: 50,
      description: '50% refund',
      color: 'yellow'
    },
    {
      timeRange: '3-6 hours',
      percentage: 30,
      description: '30% refund',
      color: 'orange'
    },
    {
      timeRange: 'Less than 3 hours',
      percentage: 0,
      description: 'No cancellation',
      color: 'red'
    }
  ]
}

export const formatName = (name) => {
  if (!name) return ''
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const formatPhone = (phone) => {
  if (!phone) return ''
  
  // Convert 0xxxxxxxxx to +251xxxxxxxxx
  if (phone.startsWith('0')) {
    return '+251' + phone.slice(1)
  }
  
  return phone
}

export const truncateText = (text, maxLength = 50) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatBookingStatus = (status) => {
  const statusMap = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    cancelled: 'Cancelled',
    completed: 'Completed'
  }
  
  return statusMap[status] || status
}

export const formatBusType = (type) => {
  const typeMap = {
    standard: 'Standard',
    premium: 'Premium',
    luxury: 'Luxury'
  }
  
  return typeMap[type] || type
}
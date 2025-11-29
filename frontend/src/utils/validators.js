export const validateRequired = (value) => {
  if (!value || value.toString().trim() === '') {
    return 'This field is required'
  }
  return true
}

export const validateEmail = (email) => {
  if (!email) return true // Email is optional in some forms
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
  return true
}

export const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required'
  
  // Clean the phone number - remove spaces, dashes, etc.
  const cleanPhone = phone.toString().replace(/\s+/g, '').replace(/-/g, '')
  
  // Ethiopian phone number patterns:
  // +2519XXXXXXXX, 2519XXXXXXXX, 09XXXXXXXX
  const ethiopianPhoneRegex = /^(\+251|251|0)(9\d{8})$/
  
  if (!ethiopianPhoneRegex.test(cleanPhone)) {
    return 'Please enter a valid Ethiopian phone number (e.g., +251911223344, 0911223344)'
  }
  return true
}

export const validatePassword = (password) => {
  if (!password) return 'Password is required'
  if (password.length < 6) {
    return 'Password must be at least 6 characters long'
  }
  
  // Optional: Add more password strength requirements
  if (!/(?=.*[a-z])/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/(?=.*\d)/.test(password)) {
    return 'Password must contain at least one number'
  }
  
  return true
}

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password'
  if (password !== confirmPassword) {
    return 'Passwords do not match'
  }
  return true
}

export const validateSeatSelection = (seats) => {
  if (!seats || seats.length === 0) {
    return 'Please select at least one seat'
  }
  if (seats.length > 5) {
    return 'You can select maximum 5 seats per booking'
  }
  return true
}

export const validateBaggageWeight = (weight) => {
  if (weight === null || weight === undefined || weight === '') {
    return 'Please enter baggage weight'
  }
  
  const numWeight = parseFloat(weight)
  if (isNaN(numWeight)) {
    return 'Please enter a valid weight'
  }
  if (numWeight < 0) return 'Weight cannot be negative'
  if (numWeight > 40) return 'Maximum baggage weight is 40kg'
  if (numWeight === 0) return 'Weight must be greater than 0'
  
  return true
}

export const validateName = (name) => {
  if (!name) return 'Name is required'
  
  const nameRegex = /^[a-zA-Z\s\u1200-\u137F]+$/ // Allows English and Amharic characters
  if (!nameRegex.test(name.trim())) {
    return 'Name can only contain letters and spaces'
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters long'
  }
  if (name.trim().length > 50) {
    return 'Name cannot exceed 50 characters'
  }
  return true
}

export const validateAge = (age) => {
  if (!age) return 'Age is required'
  
  const numAge = parseInt(age)
  if (isNaN(numAge)) {
    return 'Please enter a valid age'
  }
  if (numAge < 5) return 'Passenger must be at least 5 years old'
  if (numAge > 120) return 'Please enter a valid age'
  
  return true
}

export const validateIDNumber = (idNumber) => {
  if (!idNumber) return true // Optional field
  
  // Basic ID validation - adjust based on your country's ID format
  const idRegex = /^[A-Z0-9]{6,20}$/
  if (!idRegex.test(idNumber.trim())) {
    return 'Please enter a valid ID number'
  }
  return true
}

export const validatePositiveNumber = (value, fieldName = 'Value') => {
  if (!value && value !== 0) return `${fieldName} is required`
  
  const numValue = parseFloat(value)
  if (isNaN(numValue)) {
    return `Please enter a valid ${fieldName.toLowerCase()}`
  }
  if (numValue < 0) {
    return `${fieldName} cannot be negative`
  }
  return true
}

export const validateFutureDate = (date) => {
  if (!date) return 'Date is required'
  
  const selectedDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (selectedDate < today) {
    return 'Please select a future date'
  }
  return true
}

// Helper function to format phone number for display
export const formatPhoneNumber = (phone) => {
  if (!phone) return ''
  
  const cleanPhone = phone.toString().replace(/\s+/g, '').replace(/-/g, '')
  
  // Convert to +251 format for consistency
  if (cleanPhone.startsWith('0')) {
    return '+251' + cleanPhone.slice(1)
  } else if (cleanPhone.startsWith('251')) {
    return '+' + cleanPhone
  }
  
  return cleanPhone
}

// Helper function to normalize phone number for storage
export const normalizePhoneNumber = (phone) => {
  const formatted = formatPhoneNumber(phone)
  return formatted.replace(/\s+/g, '') // Remove any spaces
}
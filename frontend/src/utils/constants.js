export const USER_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  DRIVER: 'driver',
  CUSTOMER: 'customer'
}

export const BUS_TYPES = {
  STANDARD: 'standard',
  PREMIUM: 'premium',
  LUXURY: 'luxury'
}

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
}

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
}

export const SCHEDULE_STATUS = {
  SCHEDULED: 'scheduled',
  DEPARTED: 'departed',
  ARRIVED: 'arrived',
  CANCELLED: 'cancelled'
}

export const ETHIOPIAN_CITIES = [
  'Addis Ababa',
  'Bahir Dar',
  'Hawassa',
  'Dire Dawa',
  'Mekele',
  'Gondar',
  'Adama',
  'Jimma',
  'Harar',
  'Arba Minch',
  'Dessie',
  'Jijiga',
  'Shashamane',
  'Debre Markos',
  'Asosa',
  'Gambela',
  'Semera'
]

export const PAYMENT_METHODS = {
  TELEBIRR: 'telebirr',
  CBE_BIRR: 'cbebirr',
  HELLO_CASH: 'hello-cash',
  BANK_TRANSFER: 'bank-transfer',
  CASH: 'cash',
  STRIPE: 'stripe'
}

export const BAGGAGE_FEE_STRUCTURE = {
  FREE_ALLOWANCE: 15,
  STANDARD_FEE: 50,
  HEAVY_FEE: 100,
  EXTRA_HEAVY_FEE: 150,
  MAX_WEIGHT: 40
}
from enum import Enum

class UserRole(Enum):
    ADMIN = 'admin'
    DRIVER = 'driver'
    CUSTOMER = 'customer'
    OPERATOR = 'operator'  # Added for bus station operators

class BusType(Enum):
    STANDARD = 'standard'
    PREMIUM = 'premium' 
    LUXURY = 'luxury'
    MINIBUS = 'minibus'  # Added for smaller buses
    SLEEPER = 'sleeper'  # Added for overnight buses

class BookingStatus(Enum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    CHECKED_IN = 'checked_in'
    CANCELLED = 'cancelled'
    COMPLETED = 'completed'
    NO_SHOW = 'no_show'  # Added for missed bookings

class PaymentStatus(Enum):
    PENDING = 'pending'
    PAID = 'paid'
    FAILED = 'failed'
    REFUNDED = 'refunded'
    PARTIALLY_REFUNDED = 'partially_refunded'

class PaymentMethod(Enum):  # NEW: Payment methods specific to Ethiopia
    CASH = 'cash'
    TELEBIRR = 'telebirr'
    CBE_BIRR = 'cbebirr'
    HELLO_CASH = 'hello-cash'
    BANK_TRANSFER = 'bank-transfer'
    STRIPE = 'stripe'  # For international cards

class ScheduleStatus(Enum):
    SCHEDULED = 'scheduled'
    DEPARTED = 'departed'
    ARRIVED = 'arrived'
    CANCELLED = 'cancelled'
    DELAYED = 'delayed'  # Added for delayed schedules

class AssignmentStatus(Enum):
    ASSIGNED = 'assigned'
    UNASSIGNED = 'unassigned'
    CANCELLED = 'cancelled'
    COMPLETED = 'completed'

class BusStatus(Enum):  # NEW: Bus operational status
    ACTIVE = 'active'
    MAINTENANCE = 'maintenance'
    INACTIVE = 'inactive'
    REPAIR = 'repair'

class RouteStatus(Enum):  # NEW: Route status
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    SEASONAL = 'seasonal'  # For routes that run only in certain seasons

class NotificationType(Enum):  # NEW: For different types of notifications
    BOOKING_CONFIRMATION = 'booking_confirmation'
    PAYMENT_SUCCESS = 'payment_success'
    PAYMENT_FAILED = 'payment_failed'
    SCHEDULE_UPDATE = 'schedule_update'
    CHECKIN_REMINDER = 'checkin_reminder'
    PROMOTIONAL = 'promotional'

class BaggageType(Enum):  # NEW: For different baggage types
    HAND_CARRY = 'hand_carry'
    CHECKED = 'checked'
    SPECIAL = 'special'  # For oversized items

# Helper functions for better enum usage
def get_enum_value(enum_class, value, default=None):
    """Safely get enum value, return default if not found"""
    try:
        return enum_class(value)
    except ValueError:
        return default

def get_enum_values(enum_class):
    """Get all values from an enum class"""
    return [member.value for member in enum_class]

def is_valid_enum_value(enum_class, value):
    """Check if a value is valid for the given enum"""
    return value in get_enum_values(enum_class)

# Example usage in your routes:
"""
from enums import UserRole, get_enum_value

# Safe way to use enums
user_role = get_enum_value(UserRole, user_data.get('role'), UserRole.CUSTOMER)

# Check if valid
if is_valid_enum_value(BookingStatus, booking_data.get('status')):
    # Process booking
    pass
"""
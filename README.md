# 🚌 Bus Reservation System

A comprehensive full-stack bus ticket booking and management system built with Flask backend and React frontend. This system provides a complete solution for bus operators, ticketing agents, drivers, and passengers.

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [User Roles](#-user-roles)
- [Screenshots](#-screenshots)

## ✨ Features

### For Passengers
- 🔍 Search and browse available bus schedules
- 🎫 Book tickets with seat selection
- 💳 Secure payment processing (Chapa integration)
- 📱 Digital ticket with QR code
- �️ Real-time bus tracking
- ✅ Online check-in
- 🚫 Booking cancellation with refund management
- �️ Email notifications for bookings
- � User pr ofile and booking history

### For Ticketing Agents
- 🏪 Point of Sale (POS) system
- ⚡ Quick booking interface
- � ScheduSle browser
- 👥 Customer management
- 🔍 Booking lookup and modifications
- 💰 Payment collection

### For Operators
- 📊 Operator dashboard with analytics
- 📅 Schedule management
- 🚌 Bus tracking and monitoring
- ✅ Passenger check-in management
- 📝 Cancellation request handling
- 📈 Revenue and booking reports
- 💵 Tariff management

### For Drivers
- 🚗 Driver check-in system
- 📍 Active trip management
- 👥 Passenger list and verification
- 🗓️ Schedule viewing
- 📱 Trip details and navigation

### For Administrators
- 👥 User management (all roles)
- 🚌 Bus fleet management
- 🗺️ Route management
- 📅 Schedule creation and management
- 💰 Payment and transaction monitoring
- 📊 Comprehensive reports and analytics
- ⚙️ System settings and configuration
- 💵 Dynamic tariff management

## 🛠 Tech Stack

### Backend
- **Framework:** Flask (Python)
- **Database:** MongoDB
- **Authentication:** JWT (JSON Web Tokens)
- **Payment Gateway:** Chapa
- **Email Service:** SMTP
- **API:** RESTful API

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **State Management:** React Context API

## 📁 Project Structure

```
bus-reservation-system/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── admin.py           # Admin management endpoints
│   │   │   ├── auth.py            # Authentication endpoints
│   │   │   ├── booking.py         # Booking management
│   │   │   ├── bus.py             # Bus fleet management
│   │   │   ├── checkin.py         # Check-in system
│   │   │   ├── driver.py          # Driver endpoints
│   │   │   ├── emergency_cancel.py # Emergency cancellations
│   │   │   ├── operator.py        # Operator management
│   │   │   ├── payment.py         # Payment processing
│   │   │   ├── route.py           # Route management
│   │   │   ├── schedule.py        # Schedule management
│   │   │   ├── tariff.py          # Tariff management
│   │   │   ├── ticketer.py        # Ticketing agent endpoints
│   │   │   ├── tracking.py        # Bus tracking
│   │   │   └── user.py            # User management
│   │   ├── utils/
│   │   │   ├── email_service.py   # Email notifications
│   │   │   ├── travel_calculator.py # Distance/fare calculations
│   │   │   └── validators.py      # Input validation
│   │   ├── models.py              # Database models
│   │   └── __init__.py            # Flask app initialization
│   ├── config/                    # Configuration files
│   ├── middleware/                # Custom middleware
│   ├── .env                       # Environment variables
│   ├── requirements.txt           # Python dependencies
│   └── run.py                     # Application entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              # Authentication components
│   │   │   ├── booking/           # Booking flow components
│   │   │   ├── common/            # Reusable UI components
│   │   │   └── tracking/          # Tracking components
│   │   ├── pages/
│   │   │   ├── admin/             # Admin dashboard pages
│   │   │   ├── auth/              # Login/Register pages
│   │   │   ├── booking/           # Booking pages
│   │   │   ├── customer/          # Customer dashboard
│   │   │   ├── driver/            # Driver dashboard
│   │   │   ├── home/              # Public pages
│   │   │   ├── operator/          # Operator dashboard
│   │   │   ├── ticketer/          # Ticketer dashboard
│   │   │   └── shared/            # Shared pages
│   │   ├── services/              # API service modules
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── utils/                 # Utility functions
│   │   ├── styles/                # CSS files
│   │   ├── App.jsx                # Main app component
│   │   ├── routes.jsx             # Route definitions
│   │   └── main.jsx               # Entry point
│   ├── public/                    # Static assets
│   ├── .env                       # Environment variables
│   ├── package.json               # Node dependencies
│   ├── vite.config.js             # Vite configuration
│   └── tailwind.config.js         # Tailwind configuration
│
├── .gitignore
└── README.md
```

## 🚀 Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB 4.4+
- Git

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/abre0101/bus-reservation-system.git
cd bus-reservation-system
```

2. Create and activate virtual environment:
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/Mac
python3 -m venv .venv
source .venv/bin/activate
```

3. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Configure environment variables (see [Configuration](#-configuration))

5. Initialize database (optional - load sample data):
```bash
python insertFullData.py
```

6. Run the backend server:
```bash
python run.py
```

The backend API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see [Configuration](#-configuration))

4. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Flask Configuration
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/bus_reservation

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key

# Email Configuration (SMTP)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Chapa Payment Gateway
CHAPA_SECRET_KEY=your-chapa-secret-key
CHAPA_PUBLIC_KEY=your-chapa-public-key

# Application Settings
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_CHAPA_PUBLIC_KEY=your-chapa-public-key
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "phone": "+251912345678"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

### Booking Endpoints

#### Search Schedules
```http
GET /api/schedules/search?origin=Addis Ababa&destination=Bahir Dar&date=2024-12-01
```

#### Create Booking
```http
POST /api/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "schedule_id": "schedule-id",
  "passenger_details": {
    "full_name": "John Doe",
    "phone": "+251912345678",
    "email": "john@example.com"
  },
  "seat_numbers": ["A1", "A2"],
  "baggage": {
    "count": 2,
    "weight": 25
  }
}
```

#### Get User Bookings
```http
GET /api/bookings/my-bookings
Authorization: Bearer {token}
```

#### Cancel Booking
```http
POST /api/bookings/{booking_id}/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Change of plans"
}
```

### Schedule Endpoints

#### Get All Schedules
```http
GET /api/schedules
```

#### Get Schedule Details
```http
GET /api/schedules/{schedule_id}
```

#### Create Schedule (Admin/Operator)
```http
POST /api/schedules
Authorization: Bearer {token}
Content-Type: application/json

{
  "route_id": "route-id",
  "bus_id": "bus-id",
  "driver_id": "driver-id",
  "departure_time": "2024-12-01T08:00:00",
  "arrival_time": "2024-12-01T14:00:00",
  "base_price": 500
}
```

### Payment Endpoints

#### Initialize Payment
```http
POST /api/payments/initialize
Authorization: Bearer {token}
Content-Type: application/json

{
  "booking_id": "booking-id",
  "amount": 1000,
  "payment_method": "chapa"
}
```

#### Verify Payment
```http
GET /api/payments/verify/{transaction_id}
Authorization: Bearer {token}
```

### Tracking Endpoints

#### Get Bus Location
```http
GET /api/tracking/bus/{bus_id}/location
Authorization: Bearer {token}
```

#### Update Bus Location (Driver)
```http
POST /api/tracking/update-location
Authorization: Bearer {token}
Content-Type: application/json

{
  "schedule_id": "schedule-id",
  "latitude": 9.0320,
  "longitude": 38.7469
}
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users
Authorization: Bearer {token}
```

#### Create Bus
```http
POST /api/admin/buses
Authorization: Bearer {token}
Content-Type: application/json

{
  "plate_number": "AA-12345",
  "bus_type": "Standard",
  "capacity": 45,
  "operator_id": "operator-id"
}
```

#### Create Route
```http
POST /api/admin/routes
Authorization: Bearer {token}
Content-Type: application/json

{
  "origin": "Addis Ababa",
  "destination": "Bahir Dar",
  "distance_km": 565,
  "duration_hours": 6,
  "stops": ["Debre Markos"]
}
```

## 👥 User Roles

The system supports four main user roles:

1. **Customer** - Book tickets, manage bookings, track buses
2. **Ticketing Agent** - Sell tickets at physical locations
3. **Operator** - Manage schedules, buses, and operations
4. **Driver** - Check-in, manage trips, view passenger lists
5. **Admin** - Full system access and management

## 🖼️ Screenshots

> Add screenshots of your application here

### Home Page
![Home Page](screenshots/home.png)

### Booking Flow
![Search](screenshots/search.png)
![Seat Selection](screenshots/seats.png)
![Payment](screenshots/payment.png)

### Dashboards
![Customer Dashboard](screenshots/customer-dashboard.png)
![Operator Dashboard](screenshots/operator-dashboard.png)
![Admin Dashboard](screenshots/admin-dashboard.png)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Abraham Worku**
- GitHub: [@abre0101](https://github.com/abre0101)
- Email: Abrahamworku10a@gmail.com

## 🙏 Acknowledgments

- Ethiopian bus operators for inspiration
- Open source community for amazing tools and libraries

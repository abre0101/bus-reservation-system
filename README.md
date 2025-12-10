# 🚌 EthioBus - Bus Booking & Management System

A comprehensive bus ticket booking and management platform designed for Ethiopian bus transportation services. Built with modern web technologies to streamline bus operations, ticket booking, and passenger management.

## � Table  of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [User Roles](#-user-roles)
- [Payment Integration](#-payment-integration)
- [Contributing](#-contributing)
- [License](#-license)

✨ Features

### For Customers
- 🎫 **Online Ticket Booking** - Search and book bus tickets with real-time seat availability
- 🔴 **Real-Time Seat Locking** - See live seat availability with instant updates (NEW!)
- 💺 **Visual Seat Selection** - Interactive seat map with 4 color-coded status indicators
- ⚡ **Instant Updates** - WebSocket-powered real-time synchronization across all users (<100ms)
- 🔒 **Temporary Seat Reservation** - Automatic 10-minute seat locks during booking process
- � ***Persistent Selection** - Your seat selection is saved even after page refresh
- 🎨 **Smart Visual Feedback** - Green (available), Blue (your selection), Orange (locked by others), Red (booked)
- � ***QR Code Tickets** - Digital tickets with QR codes for easy check-in
- 💳 **Multiple Payment Options** - Support for TeleBirr, CBE Birr, HelloCash, and international cards
- 📊 **Booking History** - Track all your past and upcoming trips
- 🎁 **Loyalty Program** - Earn rewards for frequent bookings

### For Operators
- 🚍 **Bus Management** - Add, edit, and manage bus fleet information
- 🗺️ **Route Management** - Create and manage bus routes with multiple stops
- ⏰ **Schedule Management** - Set up recurring and one-time schedules
- 👨‍✈️ **Driver Assignment** - Assign drivers to specific schedules
- 📊 **Analytics Dashboard** - View booking statistics and revenue reports
- 🎟️ **Ticketer System** - Dedicated interface for ticket verification and check-in
- 📋 **Bus Reports Management** - View, filter, and manage all driver-submitted bus reports
- 🔄 **Report Status Updates** - Update report status (pending → in progress → resolved)
- 📝 **Operator Notes** - Add notes and actions taken for each report
- 📤 **Export Reports** - Export filtered reports to CSV or Excel for analysis

### For Drivers
- 📱 **Driver Mobile App** - Dedicated interface for drivers
- ✅ **Passenger Check-in** - Scan QR codes to verify tickets
- 🗺️ **Route Information** - View assigned routes and schedules
- 📊 **Trip Reports** - Track completed trips and passenger counts
- 📋 **Bus Reporting System** - Submit maintenance, fuel, and issue reports with severity levels
- 🔧 **Quick Report Templates** - Pre-configured templates for common bus issues
- 📈 **Report History** - View status of submitted reports and operator responses

### For Admins
- 👤 **User Management** - Manage all system users and roles
- 💰 **Payment Tracking** - Monitor all transactions and refunds
- 🚨 **Emergency Controls** - Cancel schedules and handle emergencies
- ⚙️ **System Settings** - Configure tariffs, fees, and system parameters
- 📊 **Comprehensive Reports** - Generate detailed analytics and reports

## � Tec h Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Socket.io-client 4.7** - WebSocket client for real-time updates (NEW!)
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **Chart.js & Recharts** - Data visualization
- **React Hook Form** - Form management
- **QRCode.react** - QR code generation
- **React Toastify** - Toast notifications
- **Lucide React** - Icon library

### Backend
- **Flask 2.3** - Python web framework
- **Flask-SocketIO 5.3** - WebSocket support for real-time features (NEW!)
- **MongoDB** - NoSQL database
- **PyMongo** - MongoDB driver
- **Flask-JWT-Extended** - JWT authentication
- **Flask-Bcrypt** - Password hashing
- **Flask-CORS** - Cross-origin resource sharing
- **Stripe** - Payment processing (international)

### Payment Gateways
- Chapa (TeleBirr, CBE Birr, HelloCash)
- Stripe (International cards)
- Cash payments

## 📁 Project Structure

```
ethiobus/
├── backend/                    # Flask backend application
│   ├── app/
│   │   ├── routes/            # API route handlers
│   │   ├── utils/             # Utility functions
│   │   │   ├── seat_lock.py   # Seat locking logic (NEW!)
│   │   │   └── cleanup_locks.py # Lock cleanup task (NEW!)
│   │   ├── models.py          # Data models and enums
│   │   ├── socket_events.py   # WebSocket event handlers (NEW!)
│   │   └── __init__.py        # App factory
│   ├── config/                # Configuration files
│   ├── middleware/            # Custom middleware
│   ├── .env                   # Environment variables
│   ├── requirements.txt       # Python dependencies
│   ├── test_seat_locking.py   # Seat locking tests (NEW!)
│   └── run.py                 # Application entry point
│
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API service layer
│   │   │   └── socketService.js # WebSocket client (NEW!)
│   │   ├── utils/             # Utility functions
│   │   ├── styles/            # CSS and styling
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Application entry point
│   ├── public/                # Static assets
│   ├── .env                   # Environment variables
│   ├── package.json           # Node dependencies
│   ├── vite.config.js         # Vite configuration
│   └── tailwind.config.js     # Tailwind configuration
│
└── README.md                  # Project documentation
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**
- **pip** (Python package manager)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ethiobus.git
cd ethiobus
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install
```

## ⚙️ Configuration

### Backend Configuration

Create a `.env` file in the `backend` directory:

```env
# Flask Configuration
SECRET_KEY=your-secret-key-here
DEBUG=True
PORT=5000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/ethiobusdb

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-here

# Chapa Payment Configuration (Ethiopian Payment Gateway)
CHAPA_SECRET_KEY=your-chapa-secret-key
CHAPA_PUBLIC_KEY=your-chapa-public-key
CHAPA_BASE_URL=https://api.chapa.co/v1

# Stripe Configuration (International Payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLIC_KEY=your-stripe-public-key
```

### Frontend Configuration

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000

# Payment Configuration
VITE_CHAPA_PUBLIC_KEY=your-chapa-public-key
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
```

### MongoDB Setup

1. Install MongoDB on your system
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

3. The database `ethiobusdb` will be created automatically on first run

## 🏃 Running the Application

### Start Backend Server (with WebSocket support)

```bash
cd backend
python run.py
```

The backend server will start on `http://localhost:5000` with WebSocket support enabled.

### Start Seat Lock Cleanup Task (Recommended)

Open a new terminal:

```bash
cd backend
python -m app.utils.cleanup_locks
```

This background task automatically removes expired seat locks every 60 seconds.

### Start Frontend Development Server

```bash
cd frontend
npm run dev
# or
yarn dev
```

The frontend will start on `http://localhost:5173`

### Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/
- **WebSocket**: Automatically connects when you visit seat selection page

## 📚 API Documentation

### Base URL
```
http://localhost:5000
```

### Main Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile

#### Bookings
- `GET /bookings` - Get all bookings
- `POST /bookings` - Create new booking
- `GET /bookings/:id` - Get booking details
- `PUT /bookings/:id` - Update booking
- `DELETE /bookings/:id` - Cancel booking

#### Schedules
- `GET /schedules` - Get all schedules
- `POST /schedules` - Create schedule (operator/admin)
- `GET /schedules/:id` - Get schedule details
- `PUT /schedules/:id` - Update schedule
- `DELETE /schedules/:id` - Delete schedule

#### Routes
- `GET /routes` - Get all routes
- `POST /routes` - Create route (operator/admin)
- `GET /routes/:id` - Get route details
- `PUT /routes/:id` - Update route

#### Buses
- `GET /buses` - Get all buses
- `POST /buses` - Add new bus (operator/admin)
- `GET /buses/:id` - Get bus details
- `PUT /buses/:id` - Update bus

#### Payments
- `POST /payments/initialize` - Initialize payment
- `POST /payments/verify` - Verify payment
- `GET /payments/:id` - Get payment details

#### Admin
- `GET /admin/users` - Get all users
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user
- `GET /admin/statistics` - Get system statistics

#### Bus Reports
- `POST /driver/bus-reports` - Submit bus report (driver)
- `GET /driver/bus-reports` - Get driver's reports
- `GET /operator/bus-reports` - Get all bus reports (operator)
- `PATCH /operator/bus-reports/:id` - Update report status and notes
- `GET /operator/bus-reports/stats` - Get report statistics

## 👥 User Roles

### Customer
- Book tickets
- View booking history
- Make payments
- Receive notifications

### Driver
- View assigned schedules
- Check-in passengers
- Update trip status
- View route information
- Submit bus reports (maintenance, issues, fuel status)
- Track report status and operator responses

### Operator
- Manage buses
- Create routes and schedules
- Assign drivers
- View analytics
- Manage bus reports from drivers
- Update report status and add notes
- Export reports for maintenance planning

### Admin
- Full system access
- User management
- System configuration
- Emergency controls

## 💳 Payment Integration

### Supported Payment Methods

1. **TeleBirr** - Ethiopian mobile money
2. **CBE Birr** - Commercial Bank of Ethiopia mobile banking
3. **HelloCash** - Ethiopian mobile wallet
4. **Bank Transfer** - Direct bank transfers
5. **Stripe** - International credit/debit cards
6. **Cash** - Pay at station

### Payment Flow

1. Customer selects seats and proceeds to payment
2. System calculates total amount (base fare + fees)
3. Customer chooses payment method
4. Payment gateway processes transaction
5. System verifies payment and confirms booking
6. Customer receives ticket with QR code

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
# or
yarn test
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- Secure payment processing
- Role-based access control

## 🌐 Deployment

### Backend Deployment (Example with Heroku)

```bash
# Login to Heroku
heroku login

# Create new app
heroku create ethiobus-api

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set MONGO_URI=your-mongodb-uri

# Deploy
git push heroku main
```

### Frontend Deployment (Example with Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Ethiopian bus transportation industry
- Open source community
- All contributors

## 📞 Support

For support, email support@ethiobus.com or join our Slack channel.

## 🎯 Real-Time Seat Locking Features

### How It Works

1. **Instant Seat Locking** - When you select a seat, it's immediately locked for 10 minutes
2. **Visual Indicators** - 4 color-coded states:
   - 🟢 **Green** - Available (click to select)
   - 🔵 **Blue** - Your selection (click to deselect)
   - 🟠 **Orange** - Locked by another user (wait or choose different seat)
   - 🔴 **Red** - Booked (confirmed booking)

3. **Persistent Selection** - Your seat selection is saved in the database and restored after page refresh
4. **Automatic Cleanup** - Expired locks (10+ minutes old) are automatically removed
5. **Zero Race Conditions** - Database-level validation prevents double bookings
6. **Real-Time Updates** - All users see seat changes instantly (<100ms latency)

### Testing Seat Locking

```bash
cd backend
python test_seat_locking.py
```

All 7 tests should pass:
- ✅ Lock seats for User A
- ✅ Prevent User B from locking same seats
- ✅ Get locked seats for schedule
- ✅ Unlock seats for User A
- ✅ Confirm seat locks after booking
- ✅ Test lock expiration
- ✅ Lock seats for User B after expiration

### Documentation

Comprehensive documentation available:
- `FINAL_SUMMARY.md` - Complete overview
- `QUICK_REFERENCE.md` - Quick commands and troubleshooting
- `SEAT_LOCK_BEHAVIOR.md` - Detailed behavior explanation
- `START_WITH_WEBSOCKET.md` - Getting started guide
- `README_WEBSOCKET_IMPLEMENTATION.md` - Technical implementation details

## 🗺️ Roadmap

- [x] Real-time seat locking with WebSocket (COMPLETED!)
- [x] Temporary seat reservations with auto-expiration (COMPLETED!)
- [x] Visual seat selection with 4 color states (COMPLETED!)
- [x] Persistent seat selection across page refresh (COMPLETED!)
- [x] Bus reporting system for drivers and operators
- [x] Export functionality for bus reports
- [ ] Mobile app for iOS and Android
- [ ] Real-time bus tracking with GPS
- [ ] Multi-language support (Amharic, Oromo, Tigrinya)
- [ ] Advanced analytics and reporting
- [ ] Integration with more payment gateways
- [ ] Customer review and rating system
- [ ] Automated refund processing
- [ ] SMS notifications
- [ ] WhatsApp integration
- [ ] Automated maintenance scheduling based on reports
- [ ] Push notifications for critical bus issues

---

Made with ❤️ for Ethiopian bus transportation

from bson import ObjectId
from datetime import datetime, timedelta
import random
from app import create_app

def calculate_arrival_time(departure_time, duration_hours):
    """Calculate arrival time based on departure time and duration"""
    hours, minutes = map(int, departure_time.split(':'))
    total_minutes = hours * 60 + minutes + int(duration_hours * 60)
    arrival_hours = (total_minutes // 60) % 24
    arrival_minutes = total_minutes % 60
    return f"{arrival_hours:02d}:{arrival_minutes:02d}"

def calculate_fare(base_fare, bus_type):
    """Calculate fare based on bus type"""
    fare_multipliers = {
        'standard': 1.0,
        'premium': 1.3,
        'luxury': 1.7
    }
    return int(base_fare * fare_multipliers.get(bus_type, 1.0))

def calculate_baggage_fee(weight_kg):
    """Calculate baggage fee based on weight"""
    if weight_kg <= 15:
        return 0
    elif weight_kg <= 25:
        return 50
    elif weight_kg <= 35:
        return 100
    else:
        return 150

def create_sample_data():
    """Insert comprehensive sample data with ticketer functionality"""
    
    app = create_app()
    with app.app_context():
        from app import mongo
        db = mongo.db
        
        # Clear existing data
        print("🗑️ Clearing existing data...")
        db.users.delete_many({})
        db.buses.delete_many({})
        db.routes.delete_many({})
        db.busschedules.delete_many({})
        db.bookings.delete_many({})
        db.payments.delete_many({})
        db.driver_assignments.delete_many({})
        
        # 1. Create Users (Admins, Operators, Drivers, Customers, Ticketers)
        print("👥 Creating users...")
        users = [
            # Admin User
            {
                "_id": ObjectId("507f1f77bcf86cd799439011"),
                "email": "admin@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",  # password123
                "name": "System Administrator",
                "phone": "+251911223344",
                "role": "admin",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=30)
            },
            # Operator User
            {
                "_id": ObjectId("507f1f77bcf86cd799439012"),
                "email": "operator@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Operation Manager",
                "phone": "+251922334455",
                "role": "operator",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=25)
            },
            # Ticketer Users (Station Agents)
            {
                "_id": ObjectId("507f1f77bcf86cd799439013"),
                "email": "ticketer1@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Mesfin Alemu",
                "phone": "+251933445566",
                "role": "ticketer",
                "station": "Addis Ababa Main Station",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=20)
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439014"),
                "email": "ticketer2@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Eleni Tesfaye",
                "phone": "+251944556677",
                "role": "ticketer",
                "station": "Hawassa Station",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=18)
            },
            # Driver Users
            {
                "_id": ObjectId("507f1f77bcf86cd799439015"),
                "email": "driver1@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Alemayehu Kebede",
                "phone": "+251955667788",
                "role": "driver",
                "license_number": "ET-DL-001234",
                "experience_years": 8,
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=15)
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439016"),
                "email": "driver2@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Bereket Haile",
                "phone": "+251966778899",
                "role": "driver",
                "license_number": "ET-DL-005678",
                "experience_years": 5,
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=12)
            },
            # Customer Users
            {
                "_id": ObjectId("507f1f77bcf86cd799439017"),
                "email": "customer1@example.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Abraham Worku",
                "phone": "+251911889900",
                "role": "customer",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=10)
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439018"),
                "email": "customer2@example.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Meron Tesfaye",
                "phone": "+251922990011",
                "role": "customer",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=8)
            }
        ]

        # 2. Create Buses
        print("🚌 Creating buses...")
        buses = [
            {
                "_id": ObjectId("607f1f77bcf86cd799439021"),
                "bus_number": "ETB-001",
                "plate_number": "3AA1234",
                "bus_name": "Blue Nile Express",
                "type": "premium",
                "capacity": 45,
                "amenities": ["WiFi", "AC", "Refreshments", "Charging Ports", "Entertainment", "Toilet"],
                "status": "active",
                "isActive": True,
                "createdAt": datetime.utcnow() - timedelta(days=20),
                "updatedAt": datetime.utcnow()
            },
            {
                "_id": ObjectId("607f1f77bcf86cd799439022"),
                "bus_number": "ETB-002",
                "plate_number": "3BB5678",
                "bus_name": "Simien Mountains",
                "type": "standard",
                "capacity": 52,
                "amenities": ["AC", "Reclining Seats", "Reading Lights"],
                "status": "active",
                "isActive": True,
                "createdAt": datetime.utcnow() - timedelta(days=18),
                "updatedAt": datetime.utcnow()
            },
            {
                "_id": ObjectId("607f1f77bcf86cd799439023"),
                "bus_number": "ETB-003",
                "plate_number": "3CC9012",
                "bus_name": "Rift Valley Luxury",
                "type": "luxury",
                "capacity": 35,
                "amenities": ["WiFi", "AC", "Refreshments", "Charging Ports", "Entertainment", "Reclining Seats", "Toilet", "Snacks"],
                "status": "active",
                "isActive": True,
                "createdAt": datetime.utcnow() - timedelta(days=15),
                "updatedAt": datetime.utcnow()
            },
            {
                "_id": ObjectId("607f1f77bcf86cd799439024"),
                "bus_number": "ETB-004",
                "plate_number": "3DD3456",
                "bus_name": "Tana Lake Cruiser",
                "type": "premium",
                "capacity": 45,
                "amenities": ["WiFi", "AC", "Refreshments", "Charging Ports", "Toilet"],
                "status": "maintenance",
                "isActive": False,
                "maintenance_notes": "Engine servicing and brake inspection",
                "estimated_ready_time": datetime.utcnow() + timedelta(days=2),
                "createdAt": datetime.utcnow() - timedelta(days=12),
                "updatedAt": datetime.utcnow()
            }
        ]

        # 3. Create Ethiopian Routes
        print("🗺️ Creating routes...")
        routes = [
            {
                "_id": ObjectId("707f1f77bcf86cd799439031"),
                "name": "Addis Ababa to Bahir Dar",
                "originCity": "Addis Ababa",
                "destinationCity": "Bahir Dar",
                "distanceKm": 578,
                "estimatedDurationHours": 10,
                "baseFareBirr": 450,
                "stops": ["Debre Markos", "Debre Tabor"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=25)
            },
            {
                "_id": ObjectId("707f1f77bcf86cd799439032"),
                "name": "Addis Ababa to Hawassa",
                "originCity": "Addis Ababa",
                "destinationCity": "Hawassa",
                "distanceKm": 275,
                "estimatedDurationHours": 5,
                "baseFareBirr": 250,
                "stops": ["Mojo", "Ziway"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=22)
            },
            {
                "_id": ObjectId("707f1f77bcf86cd799439033"),
                "name": "Addis Ababa to Dire Dawa",
                "originCity": "Addis Ababa",
                "destinationCity": "Dire Dawa",
                "distanceKm": 515,
                "estimatedDurationHours": 9,
                "baseFareBirr": 400,
                "stops": ["Adama", "Aweday"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=20)
            },
            {
                "_id": ObjectId("707f1f77bcf86cd799439034"),
                "name": "Addis Ababa to Mekele",
                "originCity": "Addis Ababa",
                "destinationCity": "Mekele",
                "distanceKm": 783,
                "estimatedDurationHours": 13,
                "baseFareBirr": 600,
                "stops": ["Dessie", "Woldia"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=18)
            },
            {
                "_id": ObjectId("707f1f77bcf86cd799439035"),
                "name": "Hawassa to Addis Ababa",
                "originCity": "Hawassa",
                "destinationCity": "Addis Ababa",
                "distanceKm": 275,
                "estimatedDurationHours": 5,
                "baseFareBirr": 250,
                "stops": ["Ziway", "Mojo"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=15)
            }
        ]

        # 4. Create Bus Schedules (Today, Tomorrow, and Future dates)
        print("🕒 Creating bus schedules...")
        schedules = []
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        schedule_dates = [today, tomorrow, today + timedelta(days=2), today + timedelta(days=3)]
        
        for schedule_date in schedule_dates:
            for route in routes:
                # Skip return routes for some dates to create variety
                if "to Addis Ababa" in route['name'] and random.choice([True, False]):
                    continue
                    
                bus = random.choice([b for b in buses if b['status'] == 'active'])
                driver = random.choice([u for u in users if u['role'] == 'driver'])
                
                # Create morning schedule (6:00 AM - 8:00 AM)
                morning_times = ["06:00", "07:00", "08:00"]
                morning_time = random.choice(morning_times)
                
                morning_schedule = {
                    "_id": ObjectId(),
                    "routeId": str(route['_id']),
                    "busId": str(bus['_id']),
                    "busType": bus['type'],
                    "busNumber": bus['bus_number'],
                    "departureTime": morning_time,
                    "arrivalTime": calculate_arrival_time(morning_time, route['estimatedDurationHours']),
                    "departureDate": schedule_date,
                    "availableSeats": bus['capacity'],
                    "fareBirr": calculate_fare(route['baseFareBirr'], bus['type']),
                    "status": "scheduled",
                    "amenities": bus['amenities'],
                    "originCity": route['originCity'],
                    "destinationCity": route['destinationCity'],
                    "driver_id": str(driver['_id']),
                    "driver_name": driver['name'],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                schedules.append(morning_schedule)
                
                # Create afternoon schedule (1:00 PM - 3:00 PM) for popular routes
                if route['originCity'] == 'Addis Ababa' and random.choice([True, False]):
                    afternoon_times = ["13:00", "14:00", "15:00"]
                    afternoon_time = random.choice(afternoon_times)
                    
                    afternoon_schedule = {
                        "_id": ObjectId(),
                        "routeId": str(route['_id']),
                        "busId": str(bus['_id']),
                        "busType": bus['type'],
                        "busNumber": bus['bus_number'],
                        "departureTime": afternoon_time,
                        "arrivalTime": calculate_arrival_time(afternoon_time, route['estimatedDurationHours']),
                        "departureDate": schedule_date,
                        "availableSeats": bus['capacity'],
                        "fareBirr": calculate_fare(route['baseFareBirr'], bus['type']),
                        "status": "scheduled",
                        "amenities": bus['amenities'],
                        "originCity": route['originCity'],
                        "destinationCity": route['destinationCity'],
                        "driver_id": str(driver['_id']),
                        "driver_name": driver['name'],
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    schedules.append(afternoon_schedule)

        # 5. Create Driver Assignments
        print("👨‍💼 Creating driver assignments...")
        driver_assignments = []
        for schedule in schedules:
            assignment = {
                "_id": ObjectId(),
                "driver_id": schedule['driver_id'],
                "schedule_id": str(schedule['_id']),
                "route_id": schedule['routeId'],
                "bus_id": schedule['busId'],
                "assigned_date": datetime.utcnow() - timedelta(days=random.randint(1, 5)),
                "assigned_by": users[0]['_id'],  # Admin assigned
                "status": "active"
            }
            driver_assignments.append(assignment)

        # 6. Create Bookings with Various Statuses
        print("🎫 Creating bookings...")
        bookings = []
        payments = []
        
        # Passenger names for variety
        passenger_names = [
            "Abraham Worku", "Meron Tesfaye", "Dawit Bekele", "Sara Mohammed", 
            "Yonas Tadesse", "Hana Girma", "Elias Getachew", "Marta Assefa",
            "Tewodros Getnet", "Selamawit Abebe", "Kaleb Mesfin", "Ruth Solomon"
        ]
        
        booking_statuses = ['confirmed', 'pending', 'checked_in', 'completed', 'cancelled']
        
        for i, schedule in enumerate(schedules):
            # Create 2-5 bookings per schedule
            num_bookings = random.randint(2, 5)
            
            for j in range(num_bookings):
                num_seats = random.randint(1, 3)
                seat_numbers = [f"{random.randint(1, bus['capacity']//2)}{chr(random.randint(65, 70))}" 
                               for _ in range(num_seats)]
                
                passenger_name = passenger_names[(i + j) % len(passenger_names)]
                customer = random.choice([u for u in users if u['role'] == 'customer'])
                status = random.choices(
                    booking_statuses,
                    weights=[40, 20, 15, 15, 10],  # More confirmed, fewer cancelled
                    k=1
                )[0]
                
                # Create booking
                booking = {
                    "_id": ObjectId(),
                    "pnr_number": f"ETB{schedule['departureDate'].strftime('%Y%m%d')}{(i*10 + j + 1):04d}",
                    "schedule_id": str(schedule['_id']),
                    "user_id": customer['_id'],
                    "passenger_name": passenger_name,
                    "passenger_phone": f"+2519{random.randint(10000000, 99999999)}",
                    "passenger_email": f"{passenger_name.lower().replace(' ', '.')}@gmail.com",
                    "seat_numbers": seat_numbers,
                    "status": status,
                    "departure_city": schedule['originCity'],
                    "arrival_city": schedule['destinationCity'],
                    "travel_date": schedule['departureDate'].strftime('%Y-%m-%d'),
                    "departure_time": schedule['departureTime'],
                    "arrival_time": schedule['arrivalTime'],
                    "total_amount": schedule['fareBirr'] * num_seats,
                    "base_fare": schedule['fareBirr'],
                    "payment_status": "paid" if status in ['confirmed', 'checked_in', 'completed'] else "pending",
                    "payment_method": random.choice(["chapa", "telebirr", "cash", "bank"]),
                    "bus_company": "EthioBus",
                    "bus_type": schedule['busType'],
                    "bus_number": schedule['busNumber'],
                    "has_baggage": random.choice([True, False]),
                    "baggage_weight": random.randint(5, 25) if random.choice([True, False]) else 0,
                    "baggage_fee": 0,
                    "created_at": schedule['departureDate'] - timedelta(days=random.randint(1, 14)),
                    "updated_at": datetime.utcnow()
                }
                
                # Add baggage fee if applicable
                if booking['has_baggage'] and booking['baggage_weight'] > 0:
                    booking['baggage_fee'] = calculate_baggage_fee(booking['baggage_weight'])
                    booking['total_amount'] += booking['baggage_fee']
                    booking['baggage_tag'] = f"BT{booking['pnr_number'][-6:]}"
                
                # Add check-in info if status is checked_in
                if status == 'checked_in':
                    booking['checked_in_at'] = booking['created_at'] + timedelta(hours=random.randint(1, 24))
                    booking['checked_in_by'] = random.choice([u for u in users if u['role'] == 'ticketer'])['_id']
                
                bookings.append(booking)
                
                # Create corresponding payment
                if booking['payment_status'] == 'paid':
                    payment = {
                        "_id": ObjectId(),
                        "user_id": customer['_id'],
                        "booking_id": str(booking['_id']),
                        "tx_ref": f"ethiobus-{int(booking['created_at'].timestamp())}{i}{j}",
                        "amount": booking['total_amount'],
                        "currency": "ETB",
                        "status": "success",
                        "payment_method": booking['payment_method'],
                        "booking_created": True,
                        "created_at": booking['created_at'],
                        "updated_at": booking['created_at']
                    }
                    payments.append(payment)
                
                # Update available seats in schedule
                schedule['availableSeats'] -= num_seats

        # 7. Insert all data into database
        print("🚀 Inserting data into database...")
        
        # Insert users
        users_result = db.users.insert_many(users)
        print(f"✅ Inserted {len(users_result.inserted_ids)} users")
        
        # Insert buses
        buses_result = db.buses.insert_many(buses)
        print(f"✅ Inserted {len(buses_result.inserted_ids)} buses")
        
        # Insert routes
        routes_result = db.routes.insert_many(routes)
        print(f"✅ Inserted {len(routes_result.inserted_ids)} routes")
        
        # Insert schedules
        schedules_result = db.busschedules.insert_many(schedules)
        print(f"✅ Inserted {len(schedules_result.inserted_ids)} schedules")
        
        # Insert driver assignments
        assignments_result = db.driver_assignments.insert_many(driver_assignments)
        print(f"✅ Inserted {len(assignments_result.inserted_ids)} driver assignments")
        
        # Insert bookings
        bookings_result = db.bookings.insert_many(bookings)
        print(f"✅ Inserted {len(bookings_result.inserted_ids)} bookings")
        
        # Insert payments
        payments_result = db.payments.insert_many(payments)
        print(f"✅ Inserted {len(payments_result.inserted_ids)} payments")

        # 8. Generate Summary Report
        print("\n🎉 Sample data insertion completed!")
        print("=" * 60)
        print("📊 DATA SUMMARY:")
        print(f"👥 Users: {len(users)} (Admin: 1, Operator: 1, Ticketers: 2, Drivers: 2, Customers: 2)")
        print(f"🚌 Buses: {len(buses)} (Active: 3, Maintenance: 1)")
        print(f"🗺️ Routes: {len(routes)}")
        print(f"🕒 Schedules: {len(schedules)}")
        print(f"👨‍💼 Driver Assignments: {len(driver_assignments)}")
        print(f"🎫 Bookings: {len(bookings)}")
        print(f"💰 Payments: {len(payments)}")
        
        # Booking status breakdown
        status_counts = {}
        for booking in bookings:
            status = booking['status']
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print("\n📈 BOOKING STATUS BREAKDOWN:")
        for status, count in status_counts.items():
            print(f"  • {status.capitalize()}: {count}")
        
        total_revenue = sum(p['amount'] for p in payments)
        print(f"💰 Total Revenue: {total_revenue:,} ETB")
        
        print("=" * 60)
        print("\n🔑 LOGIN CREDENTIALS:")
        print("Admin: admin@ethiobus.com / password123")
        print("Operator: operator@ethiobus.com / password123")
        print("Ticketer 1: ticketer1@ethiobus.com / password123")
        print("Ticketer 2: ticketer2@ethiobus.com / password123")
        print("Driver 1: driver1@ethiobus.com / password123")
        print("Driver 2: driver2@ethiobus.com / password123")
        print("Customer 1: customer1@example.com / password123")
        print("Customer 2: customer2@example.com / password123")
        
        print("=" * 60)
        print("\n🎫 SAMPLE PNR NUMBERS FOR CHECK-IN:")
        confirmed_pnrs = [b['pnr_number'] for b in bookings if b['status'] == 'confirmed']
        for pnr in confirmed_pnrs[:5]:
            booking = next(b for b in bookings if b['pnr_number'] == pnr)
            print(f"  • {pnr} - {booking['passenger_name']} - {booking['departure_city']} → {booking['arrival_city']}")
        
        print("=" * 60)
        print("\n🚌 TODAY'S SCHEDULES:")
        today_schedules = [s for s in schedules if s['departureDate'].date() == today.date()]
        for schedule in today_schedules[:3]:
            print(f"  • {schedule['departureTime']} - {schedule['originCity']} → {schedule['destinationCity']} - {schedule['busType']}")
        
        print("=" * 60)

        return {
            "users": len(users),
            "buses": len(buses),
            "routes": len(routes),
            "schedules": len(schedules),
            "bookings": len(bookings),
            "payments": len(payments),
            "revenue": total_revenue
        }

if __name__ == "__main__":
    create_sample_data()
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
    fare_multipliers = {'standard': 1.0, 'premium': 1.3, 'luxury': 1.7}
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

def create_full_data():
    """
    Insert comprehensive sample data with proper active trips logic
    
    Active Trips Logic:
    - Active Trips = scheduled + boarding + departed + active
    - On Route Trips = departed + active (subset of Active Trips)
    - Completed Trips = completed status
    - Cancelled Trips = cancelled status
    """
    app = create_app()
    with app.app_context():
        from app import mongo
        db = mongo.db
        
        print("🗑️  Clearing existing data...")
        db.users.delete_many({})
        db.buses.delete_many({})
        db.routes.delete_many({})
        db.busschedules.delete_many({})
        db.bookings.delete_many({})
        db.payments.delete_many({})
        db.driver_assignments.delete_many({})
        
        print("👥 Creating users...")
        users = [
            {
                "_id": ObjectId("507f1f77bcf86cd799439011"),
                "email": "admin@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "System Administrator",
                "phone": "+251911223344",
                "role": "admin",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=30),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439012"),
                "email": "operator@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Operation Manager",
                "phone": "+251922334455",
                "role": "operator",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=25),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439013"),
                "email": "ticketer1@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Mesfin Alemu",
                "phone": "+251933445566",
                "role": "ticketer",
                "station": "Addis Ababa Main Station",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=20),
                "updated_at": datetime.utcnow()
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
                "created_at": datetime.utcnow() - timedelta(days=18),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439015"),
                "email": "driver1@gmail.com",
                "password": "$2b$12$AKsg0ej.o.UwcgqgKsGZt.CvY3B/cJ2urwgs5LmM36OM.tMMa3tpu",
                "name": "Alemayehu Kebede",
                "phone": "+251955667788",
                "role": "driver",
                "license_number": "ET-DL-001234",
                "license_expiry": (datetime.utcnow() + timedelta(days=730)).strftime('%Y-%m-%d'),
                "experience_years": 8,
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=15),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439016"),
                "email": "driver2@ethiobus.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Bereket Haile",
                "phone": "+251966778899",
                "role": "driver",
                "license_number": "ET-DL-005678",
                "license_expiry": (datetime.utcnow() + timedelta(days=365)).strftime('%Y-%m-%d'),
                "experience_years": 5,
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=12),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439017"),
                "email": "customer1@example.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Abraham Worku",
                "phone": "+251911889900",
                "role": "customer",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=10),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("507f1f77bcf86cd799439018"),
                "email": "customer2@example.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Meron Tesfaye",
                "phone": "+251922990011",
                "role": "customer",
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=8),
                "updated_at": datetime.utcnow()
            }
        ]

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
                "created_at": datetime.utcnow() - timedelta(days=20),
                "updated_at": datetime.utcnow()
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
                "created_at": datetime.utcnow() - timedelta(days=18),
                "updated_at": datetime.utcnow()
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
                "created_at": datetime.utcnow() - timedelta(days=15),
                "updated_at": datetime.utcnow()
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
                "maintenance_notes": "Engine servicing and brake inspection",
                "estimated_ready_time": datetime.utcnow() + timedelta(days=2),
                "created_at": datetime.utcnow() - timedelta(days=12),
                "updated_at": datetime.utcnow()
            }
        ]

        print("🗺️ Creating routes...")
        routes = [
            {
                "_id": ObjectId("707f1f77bcf86cd799439031"),
                "name": "Addis Ababa to Bahir Dar",
                "origin_city": "Addis Ababa",
                "destination_city": "Bahir Dar",
                "distance_km": 578,
                "estimated_duration_hours": 10,
                "base_fare_birr": 450,
                "stops": ["Debre Markos", "Debre Tabor"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=25),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("707f1f77bcf86cd799439032"),
                "name": "Addis Ababa to Hawassa",
                "origin_city": "Addis Ababa",
                "destination_city": "Hawassa",
                "distance_km": 275,
                "estimated_duration_hours": 5,
                "base_fare_birr": 250,
                "stops": ["Mojo", "Ziway"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=22),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("707f1f77bcf86cd799439033"),
                "name": "Addis Ababa to Dire Dawa",
                "origin_city": "Addis Ababa",
                "destination_city": "Dire Dawa",
                "distance_km": 515,
                "estimated_duration_hours": 9,
                "base_fare_birr": 400,
                "stops": ["Adama", "Aweday"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=20),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("707f1f77bcf86cd799439034"),
                "name": "Addis Ababa to Mekele",
                "origin_city": "Addis Ababa",
                "destination_city": "Mekele",
                "distance_km": 783,
                "estimated_duration_hours": 13,
                "base_fare_birr": 600,
                "stops": ["Dessie", "Woldia"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=18),
                "updated_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("707f1f77bcf86cd799439035"),
                "name": "Hawassa to Addis Ababa",
                "origin_city": "Hawassa",
                "destination_city": "Addis Ababa",
                "distance_km": 275,
                "estimated_duration_hours": 5,
                "base_fare_birr": 250,
                "stops": ["Ziway", "Mojo"],
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=15),
                "updated_at": datetime.utcnow()
            }
        ]

        print("🕒 Creating bus schedules with proper active trips logic...")
        print("   Active Trips = scheduled + boarding + departed + active")
        print("   On Route Trips = departed + active")
        schedules = []
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)
        
        # Create schedules for multiple days
        schedule_dates = [
            yesterday,           # Past trips (completed/cancelled)
            today,              # Today's trips (mix of statuses)
            tomorrow,           # Tomorrow (scheduled)
            today + timedelta(days=2),  # Future (scheduled)
            today + timedelta(days=3)   # Future (scheduled)
        ]
        schedule_counter = 0
        status_distribution = {'scheduled': 0, 'boarding': 0, 'departed': 0, 'active': 0, 'completed': 0, 'cancelled': 0}
        
        for schedule_date in schedule_dates:
            # Determine date category
            if schedule_date < today:
                date_category = 'past'
            elif schedule_date == today:
                date_category = 'today'
            else:
                date_category = 'future'
            
            for route in routes:
                # Skip some return routes randomly
                if "to Addis Ababa" in route['name'] and random.choice([True, False]):
                    continue
                
                bus = random.choice([b for b in buses if b['status'] == 'active'])
                driver = random.choice([u for u in users if u['role'] == 'driver'])
                
                # Morning schedule
                morning_times = ["06:00", "07:00", "08:00", "09:00"]
                morning_time = random.choice(morning_times)
                arrival_time = calculate_arrival_time(morning_time, route['estimated_duration_hours'])
                
                # Determine status based on date - THIS IS THE KEY LOGIC
                if date_category == 'past':
                    # Past trips are either completed or cancelled
                    status = random.choices(['completed', 'cancelled'], weights=[85, 15])[0]
                elif date_category == 'today':
                    # Today's trips distributed across operational statuses
                    # This creates realistic "Active Trips" for dashboard
                    status_options = ['scheduled', 'boarding', 'departed', 'active', 'completed']
                    status_weights = [30, 20, 20, 20, 10]  # More active, less completed
                    status = random.choices(status_options, weights=status_weights)[0]
                else:
                    # Future trips are all scheduled
                    status = 'scheduled'
                
                status_distribution[status] += 1
                schedule_id = ObjectId()
                
                morning_schedule = {
                    "_id": schedule_id,
                    "route_id": str(route['_id']),
                    "bus_id": str(bus['_id']),
                    "bus_type": bus['type'],
                    "bus_number": bus['bus_number'],
                    "plate_number": bus['plate_number'],
                    "route_name": route['name'],
                    "origin_city": route['origin_city'],
                    "destination_city": route['destination_city'],
                    "departure_date": schedule_date,
                    "departure_time": morning_time,
                    "arrival_time": arrival_time,
                    "total_seats": bus['capacity'],
                    "available_seats": bus['capacity'],
                    "booked_seats": 0,
                    "fare_birr": calculate_fare(route['base_fare_birr'], bus['type']),
                    "status": status,
                    "amenities": bus['amenities'],
                    "driver_id": str(driver['_id']),
                    "driver_name": driver['name'],
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(5, 15)),
                    "updated_at": datetime.utcnow()
                }
                schedules.append(morning_schedule)
                schedule_counter += 1
                
                # Add afternoon schedule for major routes
                if route['origin_city'] == 'Addis Ababa' and random.choice([True, True, False]):
                    afternoon_times = ["13:00", "14:00", "15:00", "16:00"]
                    afternoon_time = random.choice(afternoon_times)
                    afternoon_arrival = calculate_arrival_time(afternoon_time, route['estimated_duration_hours'])
                    
                    # Determine afternoon status
                    if date_category == 'past':
                        afternoon_status = random.choices(['completed', 'cancelled'], weights=[85, 15])[0]
                    elif date_category == 'today':
                        status_options = ['scheduled', 'boarding', 'departed', 'active', 'completed']
                        status_weights = [35, 25, 15, 15, 10]
                        afternoon_status = random.choices(status_options, weights=status_weights)[0]
                    else:
                        afternoon_status = 'scheduled'
                    
                    status_distribution[afternoon_status] += 1
                    afternoon_id = ObjectId()
                    afternoon_schedule = {
                        "_id": afternoon_id,
                        "route_id": str(route['_id']),
                        "bus_id": str(bus['_id']),
                        "bus_type": bus['type'],
                        "bus_number": bus['bus_number'],
                        "plate_number": bus['plate_number'],
                        "route_name": route['name'],
                        "origin_city": route['origin_city'],
                        "destination_city": route['destination_city'],
                        "departure_date": schedule_date,
                        "departure_time": afternoon_time,
                        "arrival_time": afternoon_arrival,
                        "total_seats": bus['capacity'],
                        "available_seats": bus['capacity'],
                        "booked_seats": 0,
                        "fare_birr": calculate_fare(route['base_fare_birr'], bus['type']),
                        "status": afternoon_status,
                        "amenities": bus['amenities'],
                        "driver_id": str(driver['_id']),
                        "driver_name": driver['name'],
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(5, 15)),
                        "updated_at": datetime.utcnow()
                    }
                    schedules.append(afternoon_schedule)
                    schedule_counter += 1

        print("👨‍💼 Creating driver assignments...")
        driver_assignments = []
        for schedule in schedules:
            assignment = {
                "_id": ObjectId(),
                "driver_id": schedule['driver_id'],
                "schedule_id": str(schedule['_id']),
                "route_id": schedule['route_id'],
                "bus_id": schedule['bus_id'],
                "assigned_date": datetime.utcnow() - timedelta(days=random.randint(1, 5)),
                "assigned_by": str(users[0]['_id']),
                "status": "active"
            }
            driver_assignments.append(assignment)

        print("🎫 Creating bookings...")
        bookings = []
        payments = []
        passenger_names = ["Abraham Worku", "Meron Tesfaye", "Dawit Bekele", "Sara Mohammed", 
                          "Yonas Tadesse", "Hana Girma", "Elias Getachew", "Marta Assefa",
                          "Tewodros Getnet", "Selamawit Abebe", "Kaleb Mesfin", "Ruth Solomon"]
        booking_statuses = ['confirmed', 'pending', 'checked_in', 'completed', 'cancelled']
        
        for i, schedule in enumerate(schedules):
            num_bookings = random.randint(2, 5)
            for j in range(num_bookings):
                num_seats = random.randint(1, 3)
                seat_numbers = [f"{random.randint(1, 20)}{chr(random.randint(65, 68))}" for _ in range(num_seats)]
                passenger_name = passenger_names[(i + j) % len(passenger_names)]
                customer = random.choice([u for u in users if u['role'] == 'customer'])
                status = random.choices(booking_statuses, weights=[40, 20, 15, 15, 10], k=1)[0]
                
                booking_id = ObjectId()
                booking_created_at = schedule['departure_date'] - timedelta(days=random.randint(1, 14))
                
                booking = {
                    "_id": booking_id,
                    "pnr_number": f"ETB{schedule['departure_date'].strftime('%Y%m%d')}{(i*10 + j + 1):04d}",
                    "schedule_id": str(schedule['_id']),
                    "user_id": str(customer['_id']),
                    "passenger_name": passenger_name,
                    "passenger_phone": f"+2519{random.randint(10000000, 99999999)}",
                    "passenger_email": f"{passenger_name.lower().replace(' ', '.')}@gmail.com",
                    "seat_numbers": seat_numbers,
                    "status": status,
                    "departure_city": schedule['origin_city'],
                    "arrival_city": schedule['destination_city'],
                    "travel_date": schedule['departure_date'],
                    "departure_time": schedule['departure_time'],
                    "arrival_time": schedule['arrival_time'],
                    "total_amount": schedule['fare_birr'] * num_seats,
                    "base_fare": schedule['fare_birr'],
                    "payment_status": "paid" if status in ['confirmed', 'checked_in', 'completed'] else "pending",
                    "payment_method": random.choice(["chapa", "telebirr", "cash", "bank"]),
                    "bus_company": "EthioBus",
                    "bus_type": schedule['bus_type'],
                    "bus_number": schedule['bus_number'],
                    "has_baggage": random.choice([True, False]),
                    "baggage_weight": random.randint(5, 25) if random.choice([True, False]) else 0,
                    "baggage_fee": 0,
                    "checked_in": status == 'checked_in',
                    "user": {
                        "name": customer['name'],
                        "email": customer['email'],
                        "phone": customer['phone']
                    },
                    "created_at": booking_created_at,
                    "updated_at": datetime.utcnow()
                }
                
                if booking['has_baggage'] and booking['baggage_weight'] > 0:
                    booking['baggage_fee'] = calculate_baggage_fee(booking['baggage_weight'])
                    booking['total_amount'] += booking['baggage_fee']
                    booking['baggage_tag'] = f"BT{booking['pnr_number'][-6:]}"
                
                if status == 'checked_in':
                    booking['checked_in_at'] = booking['created_at'] + timedelta(hours=random.randint(1, 24))
                    booking['checked_in_by'] = str(random.choice([u for u in users if u['role'] == 'ticketer'])['_id'])
                
                bookings.append(booking)
                
                if booking['payment_status'] == 'paid':
                    payment = {
                        "_id": ObjectId(),
                        "user_id": str(customer['_id']),
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
                
                # Update schedule seat counts
                schedule['available_seats'] -= num_seats
                schedule['booked_seats'] = schedule.get('booked_seats', 0) + num_seats

        print("🚀 Inserting data into database...")
        users_result = db.users.insert_many(users)
        print(f"✅ Inserted {len(users_result.inserted_ids)} users")
        
        buses_result = db.buses.insert_many(buses)
        print(f"✅ Inserted {len(buses_result.inserted_ids)} buses")
        
        routes_result = db.routes.insert_many(routes)
        print(f"✅ Inserted {len(routes_result.inserted_ids)} routes")
        
        schedules_result = db.busschedules.insert_many(schedules)
        print(f"✅ Inserted {len(schedules_result.inserted_ids)} schedules")
        
        assignments_result = db.driver_assignments.insert_many(driver_assignments)
        print(f"✅ Inserted {len(assignments_result.inserted_ids)} driver assignments")
        
        bookings_result = db.bookings.insert_many(bookings)
        print(f"✅ Inserted {len(bookings_result.inserted_ids)} bookings")
        
        payments_result = db.payments.insert_many(payments)
        print(f"✅ Inserted {len(payments_result.inserted_ids)} payments")

        # Calculate statistics
        booking_status_counts = {}
        for booking in bookings:
            status = booking['status']
            booking_status_counts[status] = booking_status_counts.get(status, 0) + 1
        
        total_revenue = sum(p['amount'] for p in payments)
        
        # Calculate active trips metrics
        active_trips = status_distribution['scheduled'] + status_distribution['boarding'] + status_distribution['departed'] + status_distribution['active']
        on_route_trips = status_distribution['departed'] + status_distribution['active']
        
        print("\n🎉 Sample data insertion completed!")
        print("=" * 80)
        print("📊 DATA SUMMARY:")
        print(f"👥 Users: {len(users)} (Admin: 1, Operator: 1, Ticketers: 2, Drivers: 2, Customers: 2)")
        print(f"🚌 Buses: {len(buses)} (Active: 3, Maintenance: 1)")
        print(f"🗺️  Routes: {len(routes)}")
        print(f"🕒 Schedules: {len(schedules)}")
        print(f"👨‍💼 Driver Assignments: {len(driver_assignments)}")
        print(f"🎫 Bookings: {len(bookings)}")
        print(f"💰 Payments: {len(payments)}")
        
        print("\n📈 SCHEDULE STATUS BREAKDOWN (Active Trips Logic):")
        print(f"  ✅ Active Trips: {active_trips} (scheduled + boarding + departed + active)")
        print(f"     • Scheduled: {status_distribution['scheduled']} (awaiting departure)")
        print(f"     • Boarding: {status_distribution['boarding']} (loading passengers)")
        print(f"     • Departed: {status_distribution['departed']} (just left)")
        print(f"     • Active: {status_distribution['active']} (on route)")
        print(f"  🚌 On Route Trips: {on_route_trips} (departed + active)")
        print(f"  ✔️  Completed: {status_distribution['completed']}")
        print(f"  ❌ Cancelled: {status_distribution['cancelled']}")
        
        print("\n📈 BOOKING STATUS BREAKDOWN:")
        for status, count in booking_status_counts.items():
            print(f"  • {status.capitalize()}: {count}")
        
        print(f"\n💰 Total Revenue: {total_revenue:,} ETB")
        print("=" * 80)
        
        print("\n🔑 LOGIN CREDENTIALS:")
        print("Admin: admin@ethiobus.com / password123")
        print("Operator: operator@ethiobus.com / password123")
        print("Ticketer 1: ticketer1@ethiobus.com / password123")
        print("Ticketer 2: ticketer2@ethiobus.com / password123")
        print("Driver 1: driver1@gmail.com / password123")
        print("Driver 2: driver2@ethiobus.com / password123")
        print("Customer 1: customer1@example.com / password123")
        print("Customer 2: customer2@example.com / password123")
        print("=" * 80)
        
        print("\n✨ KEY IMPROVEMENTS:")
        print("  • Consistent snake_case field naming throughout")
        print("  • Proper active trips logic implemented")
        print("  • Single datetime format for departure_date")
        print("  • Realistic status distribution for today's trips")
        print("  • Past trips are completed/cancelled")
        print("  • Future trips are scheduled")
        print("  • Dashboard will show accurate active trip counts")

if __name__ == "__main__":
    create_full_data()
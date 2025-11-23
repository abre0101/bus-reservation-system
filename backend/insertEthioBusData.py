from bson import ObjectId
from datetime import datetime, timedelta
import random
from app import create_app

def create_sample_data():
    """Insert sample data with tickets ready for check-in"""
    
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
        
        # 1. Create Users
        print("👥 Creating users...")
        users = [
            # Operator User (Azaria Mesfin)
            {
                "_id": ObjectId("6911cd2ef151f182c3e4d1a8"),
                "email": "azaria@gmail.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Azaria Mesfin",
                "phone": "+251900469817",
                "role": "operator",
                "is_active": True,
                "created_at": datetime.utcnow()
            },
            # Customer User
            {
                "_id": ObjectId("6910c6bd5d8e6adf1edb8436"),
                "email": "customer@example.com",
                "password": "$2b$12$LQv3c1yqBWVHxkd0L8k7OeB8dZ8N5aYQGzg5YRwN5R5Y5WY5WY5W",
                "name": "Test Customer",
                "phone": "+251911889900",
                "role": "customer",
                "is_active": True,
                "created_at": datetime.utcnow()
            }
        ]
        
        # 2. Create Buses
        print("🚌 Creating buses...")
        buses = [
            {
                "_id": ObjectId("807f1f77bcf86cd799439041"),
                "bus_number": "ETB-001",
                "plate_number": "3AA1234",
                "bus_name": "Blue Nile Express",
                "type": "premium",
                "capacity": 45,
                "amenities": ["WiFi", "AC", "Refreshments", "Charging Ports", "Entertainment", "Toilet"],
                "status": "active",
                "created_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("807f1f77bcf86cd799439043"),
                "bus_number": "ETB-003",
                "plate_number": "3CC9012",
                "bus_name": "Rift Valley Luxury",
                "type": "luxury",
                "capacity": 35,
                "amenities": ["WiFi", "AC", "Refreshments", "Charging Ports", "Entertainment", "Reclining Seats", "Toilet", "Snacks"],
                "status": "active",
                "created_at": datetime.utcnow()
            }
        ]
        
        # 3. Create Ethiopian Routes
        print("🗺️ Creating routes...")
        routes = [
            {
                "_id": ObjectId("907f1f77bcf86cd799439051"),
                "name": "Addis Ababa to Bahir Dar",
                "originCity": "Addis Ababa",
                "destinationCity": "Bahir Dar",
                "distanceKm": 578,
                "estimatedDurationHours": 10,
                "baseFareBirr": 450,
                "stops": ["Debre Markos", "Debre Tabor"],
                "is_active": True,
                "created_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("907f1f77bcf86cd799439052"),
                "name": "Addis Ababa to Hawassa",
                "originCity": "Addis Ababa",
                "destinationCity": "Hawassa",
                "distanceKm": 275,
                "estimatedDurationHours": 5,
                "baseFareBirr": 250,
                "stops": ["Mojo", "Ziway"],
                "is_active": True,
                "created_at": datetime.utcnow()
            },
            {
                "_id": ObjectId("907f1f77bcf86cd799439053"),
                "name": "Addis Ababa to Dire Dawa",
                "originCity": "Addis Ababa",
                "destinationCity": "Dire Dawa",
                "distanceKm": 515,
                "estimatedDurationHours": 9,
                "baseFareBirr": 400,
                "stops": ["Adama", "Aweday"],
                "is_active": True,
                "created_at": datetime.utcnow()
            }
        ]
        
        # 4. Create TODAY'S Bus Schedules
        print("🕒 Creating today's schedules...")
        schedules = []
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        for route in routes:
            bus = random.choice(buses)
            
            # Create morning schedule (8:00 AM)
            morning_schedule = {
                "_id": ObjectId(),
                "routeId": route['_id'],
                "busId": bus['_id'],
                "busType": bus['type'],
                "busNumber": bus['bus_number'],
                "departureTime": "08:00",
                "arrivalTime": "17:00",
                "departureDate": today,
                "availableSeats": bus['capacity'],
                "fareBirr": route['baseFareBirr'] + (80 if bus['type'] == 'premium' else 150 if bus['type'] == 'luxury' else 0),
                "status": "scheduled",
                "amenities": bus['amenities'],
                "originCity": route['originCity'],
                "destinationCity": route['destinationCity'],
                "driver_name": "Alemayehu Kebede",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            schedules.append(morning_schedule)
            
            # Create afternoon schedule (2:00 PM)
            afternoon_schedule = {
                "_id": ObjectId(),
                "routeId": route['_id'],
                "busId": bus['_id'],
                "busType": bus['type'],
                "busNumber": bus['bus_number'],
                "departureTime": "14:00",
                "arrivalTime": "23:00",
                "departureDate": today,
                "availableSeats": bus['capacity'],
                "fareBirr": route['baseFareBirr'] + (80 if bus['type'] == 'premium' else 150 if bus['type'] == 'luxury' else 0),
                "status": "scheduled",
                "amenities": bus['amenities'],
                "originCity": route['originCity'],
                "destinationCity": route['destinationCity'],
                "driver_name": "Alemayehu Kebede",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            schedules.append(afternoon_schedule)
        
        # 5. Create Bookings for Check-in (FOCUS ON THIS)
        print("🎫 Creating bookings for check-in...")
        bookings = []
        payments = []
        
        # Passenger names for variety
        passenger_names = [
            "Abraham Worku", "Meron Tesfaye", "Dawit Bekele", "Sara Mohammed", 
            "Yonas Tadesse", "Hana Girma", "Elias Getachew", "Marta Assefa"
        ]
        
        # Create CONFIRMED bookings for TODAY (ready for check-in)
        for i, schedule in enumerate(schedules[:6]):  # Create bookings for first 6 schedules
            num_seats = random.randint(1, 3)
            seat_numbers = [f"{random.randint(1, 30)}{chr(random.randint(65, 70))}" for _ in range(num_seats)]
            passenger_name = passenger_names[i % len(passenger_names)]
            
            # Create booking with 'confirmed' status (ready for check-in)
            booking = {
                "_id": ObjectId(),
                "pnr_number": f"ETB{today.strftime('%Y%m%d')}{i+1:04d}",
                "schedule_id": str(schedule['_id']),
                "user_id": users[1]['_id'],  # Customer user
                "passenger_name": passenger_name,
                "passenger_phone": f"+2519{random.randint(10000000, 99999999)}",
                "passenger_email": f"{passenger_name.lower().replace(' ', '.')}@gmail.com",
                "seat_numbers": seat_numbers,
                "status": "confirmed",  # ✅ THIS IS KEY: 'confirmed' status means ready for check-in
                "departure_city": schedule['originCity'],
                "arrival_city": schedule['destinationCity'],
                "travel_date": today.strftime('%Y-%m-%d'),  # TODAY's date
                "departure_time": schedule['departureTime'],
                "arrival_time": schedule['arrivalTime'],
                "total_amount": schedule['fareBirr'] * num_seats,
                "base_fare": schedule['fareBirr'],
                "payment_status": "paid",
                "payment_method": "chapa",
                "bus_company": "EthioBus",
                "bus_type": schedule['busType'],
                "bus_number": schedule['busNumber'],
                "has_baggage": random.choice([True, False]),
                "baggage_weight": random.randint(5, 25) if random.choice([True, False]) else 0,
                "baggage_fee": 0,
                "created_at": datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
                "updated_at": datetime.utcnow()
            }
            
            # Add baggage fee if applicable
            if booking['has_baggage'] and booking['baggage_weight'] > 0:
                booking['baggage_fee'] = 100
                booking['total_amount'] += booking['baggage_fee']
                booking['baggage_tag'] = f"BT{booking['pnr_number'][-6:]}"
            
            bookings.append(booking)
            
            # Create corresponding payment
            payment = {
                "_id": ObjectId(),
                "user_id": users[1]['_id'],
                "booking_id": str(booking['_id']),
                "tx_ref": f"ethiobus-{int(datetime.utcnow().timestamp())}{i}",
                "amount": booking['total_amount'],
                "currency": "ETB",
                "status": "success",
                "payment_method": "chapa",
                "booking_created": True,
                "created_at": booking['created_at'],
                "updated_at": booking['created_at']
            }
            payments.append(payment)
            
            # Update available seats in schedule
            schedule['availableSeats'] -= num_seats
        
        # Create some ALREADY CHECKED-IN bookings to show in the checked-in tab
        for i, schedule in enumerate(schedules[6:8]):  # Use next 2 schedules
            num_seats = random.randint(1, 2)
            seat_numbers = [f"{random.randint(1, 30)}{chr(random.randint(65, 70))}" for _ in range(num_seats)]
            passenger_name = passenger_names[(i + 6) % len(passenger_names)]
            
            booking = {
                "_id": ObjectId(),
                "pnr_number": f"ETB{today.strftime('%Y%m%d')}{i+7:04d}",
                "schedule_id": str(schedule['_id']),
                "user_id": users[1]['_id'],
                "passenger_name": passenger_name,
                "passenger_phone": f"+2519{random.randint(10000000, 99999999)}",
                "passenger_email": f"{passenger_name.lower().replace(' ', '.')}@gmail.com",
                "seat_numbers": seat_numbers,
                "status": "checked_in",  # ✅ Already checked in
                "departure_city": schedule['originCity'],
                "arrival_city": schedule['destinationCity'],
                "travel_date": today.strftime('%Y-%m-%d'),
                "departure_time": schedule['departureTime'],
                "arrival_time": schedule['arrivalTime'],
                "total_amount": schedule['fareBirr'] * num_seats,
                "base_fare": schedule['fareBirr'],
                "payment_status": "paid",
                "payment_method": "chapa",
                "bus_company": "EthioBus",
                "bus_type": schedule['busType'],
                "bus_number": schedule['busNumber'],
                "has_baggage": random.choice([True, False]),
                "baggage_weight": random.randint(5, 20) if random.choice([True, False]) else 0,
                "baggage_fee": 0,
                "checked_in_at": datetime.utcnow() - timedelta(hours=random.randint(1, 3)),
                "checked_in_by": users[0]['_id'],  # Operator checked them in
                "created_at": datetime.utcnow() - timedelta(hours=random.randint(4, 12)),
                "updated_at": datetime.utcnow() - timedelta(hours=random.randint(1, 3))
            }
            
            if booking['has_baggage'] and booking['baggage_weight'] > 0:
                booking['baggage_fee'] = 100
                booking['total_amount'] += booking['baggage_fee']
                booking['baggage_tag'] = f"BT{booking['pnr_number'][-6:]}"
            
            bookings.append(booking)
            schedule['availableSeats'] -= num_seats
        
        # Insert all data into database
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
        
        # Insert bookings
        bookings_result = db.bookings.insert_many(bookings)
        print(f"✅ Inserted {len(bookings_result.inserted_ids)} bookings")
        
        # Insert payments
        payments_result = db.payments.insert_many(payments)
        print(f"✅ Inserted {len(payments_result.inserted_ids)} payments")
        
        # Analyze check-in data
        confirmed_count = len([b for b in bookings if b['status'] == 'confirmed'])
        checked_in_count = len([b for b in bookings if b['status'] == 'checked_in'])
        total_revenue = sum(p['amount'] for p in payments)
        
        print("\n🎉 Sample data insertion completed!")
        print("=" * 50)
        print("📊 CHECK-IN READY DATA:")
        print(f"✅ Confirmed bookings (ready for check-in): {confirmed_count}")
        print(f"✅ Already checked-in: {checked_in_count}")
        print(f"💰 Total revenue: {total_revenue} ETB")
        print(f"📅 All bookings for: {today.strftime('%Y-%m-%d')}")
        print("=" * 50)
        print("\n🔑 LOGIN CREDENTIALS:")
        print("Operator: azaria@gmail.com / password123")
        print("=" * 50)
        print("\n🎫 SAMPLE PNR NUMBERS FOR CHECK-IN:")
        confirmed_pnrs = [b['pnr_number'] for b in bookings if b['status'] == 'confirmed']
        for pnr in confirmed_pnrs[:3]:  # Show first 3 PNRs
            print(f"  • {pnr}")
        print("=" * 50)
        
        return {
            "confirmed_bookings": confirmed_count,
            "checked_in_bookings": checked_in_count,
            "total_revenue": total_revenue
        }

if __name__ == "__main__":
    create_sample_data()
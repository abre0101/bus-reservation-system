# test_insert.py
from app import create_app
from datetime import datetime, timedelta

def test_insert_schedule():
    app = create_app()
    with app.app_context():
        from app import mongo
        
        # Insert one test schedule
        schedule = {
            "routeId": "507f1f77bcf86cd799439051",
            "busId": "507f1f77bcf86cd799439041", 
            "busType": "standard",
            "busNumber": "TEST-001",
            "departureTime": "08:00",
            "arrivalTime": "16:00",
            "departureDate": datetime.utcnow() + timedelta(days=1),
            "availableSeats": 40,
            "fareBirr": 450,
            "status": "scheduled",
            "amenities": ["AC", "WiFi"],
            "created_at": datetime.utcnow()
        }
        
        result = mongo.db.busschedules.insert_one(schedule)
        print(f"✅ Inserted schedule with ID: {result.inserted_id}")
        
        # Verify insertion
        count = mongo.db.busschedules.count_documents({})
        print(f"📊 Total schedules in database: {count}")

if __name__ == "__main__":
    test_insert_schedule()
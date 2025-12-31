from mongoengine import connect
from models.database import User, Tour, Booking
import pymongo
from pprint import pprint
import json

def view_database():
    # Connect to MongoDB
    connect(
        db='letstravel_db',
        host='mongodb://localhost:27017/letstravel_db'
    )
    
    # Direct MongoDB connection for raw data view
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db = client.letstravel_db
    
    print("\n=== Registered Users (Raw Data) ===")
    users_collection = db.users
    for user in users_collection.find():
        print("\nUser Details:")
        print(json.dumps(user, indent=2, default=str))
        print("-" * 50)

    print("\n=== Registered Users (Processed) ===")
    users = User.objects()
    for user in users:
        print(f"\nUsername: {user.username}")
        print(f"Email: {user.email}")
        print(f"Mobile: {user.mobile}")
        print(f"Password Hash: {user.password}")
        print(f"Created at: {user.created_at}")
        print(f"Last login: {user.last_login}")
        print("-" * 50)

    print("\n=== Tours ===")
    tours = Tour.objects()
    for tour in tours:
        print(f"\nName: {tour.name}")
        print(f"Price: ${tour.price}")
        print(f"Location: {tour.location}")
        print(f"Category: {tour.category}")
        print("-" * 50)

    print("\n=== Bookings ===")
    bookings = Booking.objects()
    for booking in bookings:
        print(f"\nUser: {booking.user.username}")
        print(f"Tour: {booking.tour.name}")
        print(f"Amount: ${booking.amount}")
        print(f"Travel date: {booking.travel_date}")
        print(f"Status: {booking.status}")
        print("-" * 50)

def find_user_by_email(email):
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db = client.letstravel_db
    
    user = db.users.find_one({"email": email})
    if user:
        print("\nFound user details:")
        print(json.dumps(user, indent=2, default=str))
    else:
        print(f"No user found with email: {email}")

if __name__ == '__main__':
    view_database()
    # To find a specific user, uncomment and modify the line below:
    # find_user_by_email("harshalbarhate2028@gmail.com")

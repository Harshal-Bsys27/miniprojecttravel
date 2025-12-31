from mongoengine import connect
from models.database import User, Tour, Booking

def create_indexes():
    # Connect to MongoDB
    connect(
        db='letstravel_db',
        host='mongodb://localhost:27017/letstravel_db'
    )
    
    # Create indexes
    User.ensure_indexes()
    Tour.ensure_indexes()
    Booking.ensure_indexes()
    
    print("Indexes created successfully!")

if __name__ == '__main__':
    create_indexes()

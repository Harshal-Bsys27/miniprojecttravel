from mongoengine import connect
from models.database import User
import json

def check_users():
    # Connect to MongoDB
    connect(
        db='letstravel_db',
        host='mongodb://localhost:27017/letstravel_db'
    )
    
    print("\nChecking MongoDB Users Collection:")
    print("-" * 50)
    
    users = User.objects()
    if not users:
        print("No users found in database")
        return
        
    for user in users:
        print(f"\nUsername: {user.username}")
        print(f"Email: {user.email}")
        print(f"Mobile: {user.mobile}")
        print(f"Created: {user.created_at}")
        print(f"Last Login: {user.last_login}")
        print("-" * 50)

if __name__ == '__main__':
    check_users()

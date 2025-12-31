from mongoengine import connect
from models.database import User
from werkzeug.security import generate_password_hash

def create_admin():
    # Connect to MongoDB
    connect(
        db='letstravel_db',
        host='mongodb://localhost:27017/letstravel_db'
    )
    
    # Check if admin exists
    if User.objects(email='admin@letstravel.com').first():
        print("Admin already exists")
        return
    
    # Create admin user
    try:
        admin = User(
            username="admin",
            email="admin@letstravel.com",
            mobile="0000000000",
            password=generate_password_hash("admin123"),
            original_password="admin123",  # Add this line
            is_admin=True
        ).save()
        print("Admin created successfully!")
        print("Email: admin@letstravel.com")
        print("Password: admin123")
    except Exception as e:
        print(f"Error creating admin: {e}")

if __name__ == '__main__':
    create_admin()

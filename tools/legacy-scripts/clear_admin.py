from mongoengine import connect
from models.database import User

def clear_admin():
    connect(
        db='letstravel_db',
        host='mongodb://localhost:27017/letstravel_db'
    )
    User.objects(is_admin=True).delete()
    print("Cleared existing admin users")

if __name__ == '__main__':
    clear_admin()

from mongoengine import connect, Document, StringField, FloatField, IntField, BooleanField
import pymongo

# Define Tour model directly here
class Tour(Document):
    name = StringField(required=True)
    description = StringField(required=True)
    price = FloatField(required=True)
    duration = IntField(required=True)
    category = StringField(required=True)
    location = StringField(required=True)
    image_url = StringField(required=True)
    featured = BooleanField(default=False)

def init_db():
    try:
        # Test connection
        client = pymongo.MongoClient("mongodb://localhost:27017/")
        db = client.letstravel_db
        db.command("ping")
        print("MongoDB connection successful!")
        
        # Connect with mongoengine
        connect(
            db='letstravel_db',
            host='mongodb://localhost:27017/letstravel_db'
        )
        
        # Create sample tours
        sample_tours = [
            {
                'name': 'Udaipur Palace Tour',
                'description': 'Experience the royal heritage of Udaipur',
                'price': 15999.99,
                'duration': 4,
                'category': 'Cultural',
                'location': 'Udaipur',
                'image_url': '/images.png/vacation.udaipur.jpg',
                'featured': True
            },
            {
                'name': 'Mysore Heritage Tour',
                'description': 'Discover the grandeur of Mysore Palace',
                'price': 12499.99,
                'duration': 3,
                'category': 'Cultural',
                'location': 'Mysore',
                'image_url': '/images.png/vacation.Mysore.jpg',
                'featured': True
            },
            {
                'name': 'Maharashtra Adventure',
                'description': 'Explore forts and hillstations',
                'price': 18999.99,
                'duration': 5,
                'category': 'Adventure',
                'location': 'Maharashtra',
                'image_url': '/images.png/book.Mahrashtra.jpg',
                'featured': True
            },
            {
                'name': 'Andaman Beach Paradise',
                'description': 'Crystal clear waters and pristine beaches',
                'price': 24999.99,
                'duration': 6,
                'category': 'Beach',
                'location': 'Andaman & Nicobar',
                'image_url': '/images.png/vacation.Andaman & Nicobar.jpg',
                'featured': True
            }
        ]
        
        try:
            # Clear existing data
            Tour.objects.delete()
            print("Cleared existing tours")
            
            # Insert sample data
            for tour_data in sample_tours:
                tour = Tour(**tour_data)
                tour.save()
                print(f"Created tour: {tour.name}")
                
            print("Database initialization completed successfully!")
            
        except Exception as e:
            print(f"Error initializing database: {e}")
    
    except pymongo.errors.ConnectionError as e:
        print(f"Could not connect to MongoDB: {e}")
        print("Please ensure MongoDB is installed and running")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    init_db()

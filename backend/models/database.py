import mongoengine as me
from datetime import datetime, timezone

class User(me.Document):
    username = me.StringField(required=True, unique=True)
    email = me.EmailField(required=True, unique=True)
    mobile = me.StringField(required=True)
    password = me.StringField(required=True)
    is_admin = me.BooleanField(default=False)
    created_at = me.DateTimeField(default=lambda: datetime.now(timezone.utc))
    last_login = me.DateTimeField()
    login_count = me.IntField(default=0)
    active_sessions = me.IntField(default=0)
    total_session_duration = me.IntField(default=0)
    
    meta = {
        'collection': 'users',
        'indexes': [
            {'fields': ['email'], 'unique': True},
            {'fields': ['username'], 'unique': True}
        ],
        'ordering': ['-created_at'],
        'strict': False  # Allow flexible schema
    }

class Tour(me.Document):
    name = me.StringField(required=True)
    description = me.StringField(required=True)
    price = me.FloatField(required=True)
    duration = me.IntField(required=True)
    category = me.StringField(required=True)
    location = me.StringField(required=True)
    image_url = me.StringField(required=True)
    featured = me.BooleanField(default=False)
    created_at = me.DateTimeField(default=lambda: datetime.now(timezone.utc))
    
    meta = {
        'collection': 'tours'
    }

class Booking(me.Document):
    user = me.ReferenceField(User, required=True)
    tour = me.ReferenceField(Tour, required=True)
    booking_date = me.DateTimeField(default=lambda: datetime.now(timezone.utc))
    travel_date = me.DateTimeField(required=True)
    amount = me.FloatField(required=True)
    status = me.StringField(default='pending')
    paid_at = me.DateTimeField()

    # Optional journey/invoice enrichment
    journey_time_slot = me.StringField()
    journey_origin = me.StringField()
    journey_destination = me.StringField()
    travellers = me.IntField()
    journey_notes = me.StringField()

    # Non-tour bookings (hotel/flight) can store structured details here.
    service_type = me.StringField()  # e.g. 'hotel', 'flight'
    service_details = me.DictField()
    
    meta = {
        'collection': 'bookings'
    }

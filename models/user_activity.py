import mongoengine as me
from datetime import datetime, timezone

class PageView(me.EmbeddedDocument):
    page = me.StringField()
    timestamp = me.DateTimeField(default=lambda: datetime.now(timezone.utc))

class SearchQuery(me.EmbeddedDocument):
    query = me.StringField()
    filters = me.DictField()
    results_count = me.IntField()
    timestamp = me.DateTimeField(default=datetime.utcnow)

class Booking(me.EmbeddedDocument):
    booking_id = me.StringField()
    package_id = me.StringField()
    travel_date = me.DateTimeField()
    amount = me.FloatField()
    timestamp = me.DateTimeField(default=datetime.utcnow)

class LoginActivity(me.EmbeddedDocument):
    ip_address = me.StringField()
    device_info = me.StringField()
    status = me.StringField(default='pending')
    timestamp = me.DateTimeField(default=datetime.utcnow)

class UserActivity(me.Document):
    user_id = me.StringField(required=True)
    email = me.StringField()
    device_info = me.DictField()
    page_views = me.ListField(me.EmbeddedDocumentField(PageView))
    search_history = me.ListField(me.EmbeddedDocumentField(SearchQuery))
    bookings = me.ListField(me.EmbeddedDocumentField(Booking))
    created_at = me.DateTimeField(default=lambda: datetime.now(timezone.utc))
    updated_at = me.DateTimeField(default=lambda: datetime.now(timezone.utc))

    meta = {
        'collection': 'user_activity'
    }

class UserActivityLog(me.Document):
    user = me.ReferenceField('User')
    registration_ip = me.StringField()
    registration_device = me.StringField()
    last_login = me.DateTimeField()
    login_history = me.ListField(me.EmbeddedDocumentField(LoginActivity))

    meta = {
        'collection': 'user_activity_logs'
    }

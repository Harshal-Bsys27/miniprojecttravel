from datetime import datetime
from flask import request
from models.user_activity import UserActivity, PageView, SearchQuery, Booking

class ActivityTracker:
    @staticmethod
    def track_page_view(user_id, page, duration=None):
        page_view = PageView(
            page=page,
            timestamp=datetime.utcnow(),
            duration=duration
        )
        
        UserActivity.objects(user_id=user_id).update_one(
            push__page_views=page_view,
            set__updated_at=datetime.utcnow(),
            upsert=True
        )

    @staticmethod
    def track_search(user_id, query, filters=None, results_count=0):
        search = SearchQuery(
            query=query,
            filters=filters or {},
            results_count=results_count
        )
        
        UserActivity.objects(user_id=user_id).update_one(
            push__search_history=search,
            set__updated_at=datetime.utcnow(),
            upsert=True
        )

    @staticmethod
    def track_booking(user_id, booking_data):
        booking = Booking(**booking_data)
        
        UserActivity.objects(user_id=user_id).update_one(
            push__bookings=booking,
            set__updated_at=datetime.utcnow(),
            upsert=True
        )

    @staticmethod
    def add_favorite_destination(user_id, destination_id):
        UserActivity.objects(user_id=user_id).update_one(
            add_to_set__favorite_destinations=destination_id,
            set__updated_at=datetime.utcnow(),
            upsert=True
        )

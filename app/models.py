from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), index=True, unique=True)
    username = db.Column(db.String(64), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    
    bookings = db.relationship('Booking', backref='user', lazy='dynamic')
    payments = db.relationship('Payment', backref='user', lazy='dynamic')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'isAdmin': self.is_admin
        }

class ParkingLocation(db.Model):
    __tablename__ = 'parking_locations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    price_per_hour = db.Column(db.Integer, nullable=False)  # Stored in cents
    image_url = db.Column(db.String(255))
    facilities = db.Column(db.Text)  # Stored as comma-separated values
    
    slots = db.relationship('ParkingSlot', backref='location', lazy='dynamic')
    
    def to_dict(self, include_slots=False):
        data = {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'pricePerHour': self.price_per_hour,
            'imageUrl': self.image_url,
            'facilities': self.facilities.split(',') if self.facilities else []
        }
        
        if include_slots:
            data['slots'] = [slot.to_dict() for slot in self.slots]
            data['availableSlots'] = sum(1 for slot in self.slots if slot.is_available)
            data['totalSlots'] = self.slots.count()
            
        return data

class ParkingSlot(db.Model):
    __tablename__ = 'parking_slots'
    
    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey('parking_locations.id'), nullable=False)
    slot_number = db.Column(db.String(10), nullable=False)
    is_available = db.Column(db.Boolean, default=True)
    vehicle_type = db.Column(db.String(20), default='four-wheeler')  # 'two-wheeler' or 'four-wheeler'
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    bookings = db.relationship('Booking', backref='parking_slot', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'locationId': self.location_id,
            'slotNumber': self.slot_number,
            'isAvailable': self.is_available,
            'vehicleType': self.vehicle_type,
            'lastUpdated': self.last_updated.isoformat()
        }

class Booking(db.Model):
    __tablename__ = 'bookings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('parking_locations.id'), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey('parking_slots.id'), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # In minutes
    amount = db.Column(db.Integer, nullable=False)  # In cents
    status = db.Column(db.String(20), default='pending')  # pending, active, completed, cancelled
    payment_status = db.Column(db.String(20), default='pending')  # pending, paid, refunded
    vehicle_type = db.Column(db.String(20), nullable=False)  # 'two-wheeler' or 'four-wheeler'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    location = db.relationship('ParkingLocation', backref='bookings')
    payments = db.relationship('Payment', backref='booking', lazy='dynamic')
    
    def to_dict(self):
        location_name = self.location.name if self.location else None
        slot_number = self.parking_slot.slot_number if self.parking_slot else None
        
        return {
            'id': self.id,
            'userId': self.user_id,
            'locationId': self.location_id,
            'locationName': location_name,
            'slotId': self.slot_id,
            'slotNumber': slot_number,
            'startDate': self.start_date.isoformat(),
            'endDate': self.end_date.isoformat(),
            'duration': self.duration,
            'amount': self.amount,
            'status': self.status,
            'paymentStatus': self.payment_status,
            'vehicleType': self.vehicle_type,
            'createdAt': self.created_at.isoformat()
        }

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)  # In cents
    status = db.Column(db.String(20), default='pending')  # pending, successful, failed, refunded
    payment_method = db.Column(db.String(20), nullable=False)  # card, upi, etc.
    transaction_id = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'bookingId': self.booking_id,
            'amount': self.amount,
            'status': self.status,
            'paymentMethod': self.payment_method,
            'transactionId': self.transaction_id,
            'createdAt': self.created_at.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='info')  # info, success, warning, error
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'isRead': self.is_read,
            'createdAt': self.created_at.isoformat()
        }
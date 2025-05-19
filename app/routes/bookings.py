from flask import Blueprint, request, jsonify, session
from app.models import Booking, ParkingLocation, ParkingSlot, Payment, Notification
from app import db
from app.routes.auth import login_required, admin_required
from datetime import datetime, timedelta

bookings_bp = Blueprint('bookings', __name__)

# Booking durations constants
BOOKING_DURATIONS = {
    'THIRTY_MIN': 30,
    'ONE_HOUR': 60,
    'TWO_HOURS': 120
}

@bookings_bp.route('', methods=['POST'])
@login_required
def create_booking():
    data = request.json
    user_id = session['user_id']
    
    # Basic validation
    required_fields = ['locationId', 'slotId', 'duration']
    for field in required_fields:
        if field not in data:
            return jsonify({"message": f"Missing required field: {field}"}), 400
    
    # Verify location and slot exist
    location = ParkingLocation.query.get_or_404(data['locationId'])
    slot = ParkingSlot.query.get_or_404(data['slotId'])
    
    # Check if slot is available
    if not slot.is_available:
        return jsonify({"message": "Selected slot is not available"}), 400
    
    # Check if slot belongs to location
    if slot.location_id != location.id:
        return jsonify({"message": "Slot does not belong to specified location"}), 400
    
    # Check if vehicle type is valid
    vehicle_type = data.get('vehicleType', 'four-wheeler')
    if vehicle_type not in ['two-wheeler', 'four-wheeler']:
        return jsonify({"message": "Invalid vehicle type"}), 400
        
    # Calculate booking details
    duration = data['duration']
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(minutes=duration)
    
    # Calculate amount
    price_per_hour = location.price_per_hour
    if vehicle_type == 'two-wheeler':
        price_per_hour = int(price_per_hour * 0.6)  # 60% of the price for two-wheelers
    
    amount = int(price_per_hour * (duration / 60))
    
    # Create booking
    booking = Booking(
        user_id=user_id,
        location_id=location.id,
        slot_id=slot.id,
        start_date=start_date,
        end_date=end_date,
        duration=duration,
        amount=amount,
        vehicle_type=vehicle_type
    )
    
    # Update slot availability
    slot.is_available = False
    slot.last_updated = datetime.utcnow()
    
    db.session.add(booking)
    db.session.commit()
    
    # Create notification
    notification = Notification(
        user_id=user_id,
        title="New Booking Created",
        message=f"Your parking booking at {location.name} has been created successfully.",
        type="success"
    )
    
    db.session.add(notification)
    db.session.commit()
    
    return jsonify({
        "message": "Booking created successfully",
        "booking": booking.to_dict()
    }), 201

@bookings_bp.route('/active', methods=['GET'])
@login_required
def get_active_booking():
    user_id = session['user_id']
    
    # Get the most recent active booking
    booking = Booking.query.filter_by(
        user_id=user_id, 
        status='active'
    ).order_by(Booking.created_at.desc()).first()
    
    if not booking:
        return jsonify({"booking": None}), 200
    
    return jsonify({"booking": booking.to_dict()}), 200

@bookings_bp.route('/history', methods=['GET'])
@login_required
def get_booking_history():
    user_id = session['user_id']
    
    # Get all completed/cancelled bookings for the user
    bookings = Booking.query.filter(
        Booking.user_id == user_id,
        Booking.status.in_(['completed', 'cancelled'])
    ).order_by(Booking.created_at.desc()).all()
    
    return jsonify({
        "bookings": [booking.to_dict() for booking in bookings]
    }), 200

@bookings_bp.route('/<int:booking_id>', methods=['GET'])
@login_required
def get_booking(booking_id):
    user_id = session['user_id']
    
    # Find booking
    booking = Booking.query.get_or_404(booking_id)
    
    # Check if booking belongs to user or user is admin
    user_is_admin = db.session.query(db.exists().where(
        db.and_(
            db.session.query.user.id == user_id,
            db.session.query.user.is_admin == True
        )
    )).scalar()
    
    if booking.user_id != user_id and not user_is_admin:
        return jsonify({"message": "Unauthorized access to booking"}), 403
    
    return jsonify({"booking": booking.to_dict()}), 200

@bookings_bp.route('/<int:booking_id>/status', methods=['PUT'])
@login_required
def update_booking_status(booking_id):
    user_id = session['user_id']
    data = request.json
    
    # Validate request
    if 'status' not in data:
        return jsonify({"message": "Missing status field"}), 400
    
    new_status = data['status']
    if new_status not in ['active', 'completed', 'cancelled']:
        return jsonify({"message": "Invalid status value"}), 400
    
    # Find booking
    booking = Booking.query.get_or_404(booking_id)
    
    # Check if booking belongs to user or user is admin
    user_is_admin = db.session.query(db.exists().where(
        db.and_(
            db.session.query.user.id == user_id,
            db.session.query.user.is_admin == True
        )
    )).scalar()
    
    if booking.user_id != user_id and not user_is_admin:
        return jsonify({"message": "Unauthorized access to booking"}), 403
    
    # Update status
    booking.status = new_status
    
    # Free up slot if booking is completed or cancelled
    if new_status in ['completed', 'cancelled']:
        slot = ParkingSlot.query.get(booking.slot_id)
        if slot:
            slot.is_available = True
            slot.last_updated = datetime.utcnow()
    
    db.session.commit()
    
    # Create notification
    notification = Notification(
        user_id=booking.user_id,
        title=f"Booking {new_status.capitalize()}",
        message=f"Your parking booking has been {new_status}.",
        type="info"
    )
    
    db.session.add(notification)
    db.session.commit()
    
    return jsonify({
        "message": f"Booking status updated to {new_status}",
        "booking": booking.to_dict()
    }), 200

@bookings_bp.route('', methods=['GET'])
@admin_required
def get_all_bookings():
    status = request.args.get('status')
    
    query = Booking.query
    
    if status:
        query = query.filter_by(status=status)
    
    bookings = query.order_by(Booking.created_at.desc()).all()
    
    return jsonify({
        "bookings": [booking.to_dict() for booking in bookings]
    }), 200
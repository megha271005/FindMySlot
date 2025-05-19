from flask import Blueprint, render_template, redirect, url_for, session, request, jsonify, flash
from app.models import User, ParkingLocation, ParkingSlot, Booking, Notification, Payment
from app import db
from app.routes.auth import login_required
from datetime import datetime, timedelta
import math
import os

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('main.map'))
    return redirect(url_for('auth.login'))

@main_bp.route('/map')
@login_required
def map():
    # Get Google Maps API key from environment
    google_maps_api_key = os.environ.get('GOOGLE_MAPS_API_KEY', '')
    
    return render_template(
        'main/map.html',
        active_tab='map',
        show_bottom_nav=True,
        google_maps_api_key=google_maps_api_key
    )

@main_bp.route('/dashboard')
@login_required
def dashboard():
    user_id = session['user_id']
    
    # Get user's active booking
    active_booking = Booking.query.filter_by(
        user_id=user_id,
        status='active'
    ).order_by(Booking.created_at.desc()).first()
    
    # Get user's booking history
    booking_history = Booking.query.filter(
        Booking.user_id == user_id,
        Booking.status.in_(['completed', 'cancelled'])
    ).order_by(Booking.created_at.desc()).limit(5).all()
    
    return render_template(
        'main/dashboard.html',
        active_tab='dashboard',
        show_bottom_nav=True,
        active_booking=active_booking,
        booking_history=booking_history
    )

@main_bp.route('/notifications')
@login_required
def notifications():
    user_id = session['user_id']
    
    # Get user's notifications
    notifications = Notification.query.filter_by(
        user_id=user_id
    ).order_by(Notification.created_at.desc()).all()
    
    # Mark notifications as read
    for notification in notifications:
        if not notification.is_read:
            notification.is_read = True
    
    db.session.commit()
    
    return render_template(
        'main/notifications.html',
        active_tab='notifications',
        show_bottom_nav=True,
        notifications=notifications
    )

@main_bp.route('/profile')
@login_required
def profile():
    user_id = session['user_id']
    user = User.query.get(user_id)
    
    return render_template(
        'main/profile.html',
        active_tab='profile',
        show_bottom_nav=True,
        user=user
    )

@main_bp.route('/location/<int:location_id>')
@login_required
def location_details(location_id):
    location = ParkingLocation.query.get_or_404(location_id)
    
    # Get vehicle type from query param, default to four-wheeler
    vehicle_type = request.args.get('vehicle_type', 'four-wheeler')
    if vehicle_type not in ['two-wheeler', 'four-wheeler']:
        vehicle_type = 'four-wheeler'
    
    # Get available slots for this location
    slots = ParkingSlot.query.filter_by(
        location_id=location_id,
        is_available=True,
        vehicle_type=vehicle_type
    ).all()
    
    # Calculate price for different durations
    price_per_hour = location.price_per_hour
    if vehicle_type == 'two-wheeler':
        price_per_hour = int(price_per_hour * 0.6)  # 60% of the price for two-wheelers
    
    durations = {
        '30_min': {
            'minutes': 30,
            'price': int(price_per_hour * (30 / 60))
        },
        '1_hour': {
            'minutes': 60,
            'price': price_per_hour
        },
        '2_hours': {
            'minutes': 120,
            'price': price_per_hour * 2
        }
    }
    
    return render_template(
        'main/location_details.html',
        show_bottom_nav=False,
        location=location,
        slots=slots,
        vehicle_type=vehicle_type,
        durations=durations,
        available_slots=len(slots)
    )

@main_bp.route('/booking/<int:booking_id>')
@login_required
def booking_details(booking_id):
    user_id = session['user_id']
    
    # Find booking
    booking = Booking.query.get_or_404(booking_id)
    
    # Check if booking belongs to user
    if booking.user_id != user_id:
        flash('Unauthorized access to booking', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get location and slot
    location = ParkingLocation.query.get(booking.location_id)
    slot = ParkingSlot.query.get(booking.slot_id)
    
    return render_template(
        'main/booking_details.html',
        show_bottom_nav=False,
        booking=booking,
        location=location,
        slot=slot
    )

@main_bp.route('/payment/<int:booking_id>')
@login_required
def payment(booking_id):
    user_id = session['user_id']
    
    # Find booking
    booking = Booking.query.get_or_404(booking_id)
    
    # Check if booking belongs to user
    if booking.user_id != user_id:
        flash('Unauthorized access to booking', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Check if payment is pending
    if booking.payment_status != 'pending':
        flash('Payment already processed', 'info')
        return redirect(url_for('main.booking_details', booking_id=booking_id))
    
    # Get location
    location = ParkingLocation.query.get(booking.location_id)
    
    return render_template(
        'main/payment.html',
        show_bottom_nav=False,
        booking=booking,
        location=location
    )
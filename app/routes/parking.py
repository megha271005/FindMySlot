from flask import Blueprint, request, jsonify
from app.models import ParkingLocation, ParkingSlot
from app import db
from app.routes.auth import login_required, admin_required
import math

parking_bp = Blueprint('parking', __name__)

# Helper function to calculate distance between two coordinates
def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two points on the Earth's surface
    using the Haversine formula
    """
    # Convert latitude and longitude from degrees to radians
    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Radius of Earth in kilometers
    
    return c * r

@parking_bp.route('/locations', methods=['GET'])
def get_all_locations():
    locations = ParkingLocation.query.all()
    return jsonify({
        "locations": [location.to_dict() for location in locations]
    }), 200

@parking_bp.route('/locations/<int:location_id>', methods=['GET'])
def get_location(location_id):
    location = ParkingLocation.query.get_or_404(location_id)
    slots = ParkingSlot.query.filter_by(location_id=location_id).all()
    
    location_data = location.to_dict(include_slots=True)
    
    return jsonify({
        "location": location_data,
        "slots": [slot.to_dict() for slot in slots],
        "availableSlots": sum(1 for slot in slots if slot.is_available),
        "totalSlots": len(slots)
    }), 200

@parking_bp.route('/nearby', methods=['GET'])
def get_nearby_locations():
    # Get parameters from query string
    try:
        lat = float(request.args.get('lat', 0))
        lng = float(request.args.get('lng', 0))
        radius = float(request.args.get('radius', 5))  # default 5km radius
    except ValueError:
        return jsonify({"message": "Invalid coordinates"}), 400
    
    # Get all locations first
    all_locations = ParkingLocation.query.all()
    
    # Filter and sort by distance
    nearby_locations = []
    for location in all_locations:
        distance = calculate_distance(lat, lng, location.latitude, location.longitude)
        if distance <= radius:
            location_dict = location.to_dict()
            
            # Add distance and available slots info
            location_dict['distance'] = round(distance, 2)
            slots = ParkingSlot.query.filter_by(location_id=location.id).all()
            location_dict['availableSlots'] = sum(1 for slot in slots if slot.is_available)
            location_dict['totalSlots'] = len(slots)
            
            nearby_locations.append(location_dict)
    
    # Sort by distance
    nearby_locations.sort(key=lambda x: x['distance'])
    
    return jsonify({
        "locations": nearby_locations
    }), 200

@parking_bp.route('/locations', methods=['POST'])
@admin_required
def create_location():
    data = request.json
    
    # Basic validation
    required_fields = ['name', 'address', 'latitude', 'longitude', 'pricePerHour']
    for field in required_fields:
        if field not in data:
            return jsonify({"message": f"Missing required field: {field}"}), 400
    
    # Create new location
    location = ParkingLocation(
        name=data['name'],
        address=data['address'],
        latitude=data['latitude'],
        longitude=data['longitude'],
        price_per_hour=data['pricePerHour'],
        image_url=data.get('imageUrl'),
        facilities=','.join(data.get('facilities', []))
    )
    
    db.session.add(location)
    db.session.commit()
    
    return jsonify({
        "message": "Location created successfully",
        "location": location.to_dict()
    }), 201

@parking_bp.route('/locations/<int:location_id>', methods=['PUT'])
@admin_required
def update_location(location_id):
    location = ParkingLocation.query.get_or_404(location_id)
    data = request.json
    
    # Update fields
    if 'name' in data:
        location.name = data['name']
    if 'address' in data:
        location.address = data['address']
    if 'latitude' in data:
        location.latitude = data['latitude']
    if 'longitude' in data:
        location.longitude = data['longitude']
    if 'pricePerHour' in data:
        location.price_per_hour = data['pricePerHour']
    if 'imageUrl' in data:
        location.image_url = data['imageUrl']
    if 'facilities' in data:
        location.facilities = ','.join(data['facilities'])
    
    db.session.commit()
    
    return jsonify({
        "message": "Location updated successfully",
        "location": location.to_dict()
    }), 200

@parking_bp.route('/locations/<int:location_id>', methods=['DELETE'])
@admin_required
def delete_location(location_id):
    location = ParkingLocation.query.get_or_404(location_id)
    
    # Delete associated slots first
    ParkingSlot.query.filter_by(location_id=location_id).delete()
    
    db.session.delete(location)
    db.session.commit()
    
    return jsonify({
        "message": "Location deleted successfully"
    }), 200

@parking_bp.route('/locations/<int:location_id>/slots', methods=['GET'])
def get_location_slots(location_id):
    # Verify location exists
    ParkingLocation.query.get_or_404(location_id)
    
    # Get slots for this location
    slots = ParkingSlot.query.filter_by(location_id=location_id).all()
    
    return jsonify({
        "slots": [slot.to_dict() for slot in slots],
        "availableSlots": sum(1 for slot in slots if slot.is_available),
        "totalSlots": len(slots)
    }), 200

@parking_bp.route('/locations/<int:location_id>/slots', methods=['POST'])
@admin_required
def create_slot(location_id):
    # Verify location exists
    ParkingLocation.query.get_or_404(location_id)
    
    data = request.json
    
    # Basic validation
    if 'slotNumber' not in data:
        return jsonify({"message": "Missing required field: slotNumber"}), 400
    
    # Create new slot
    slot = ParkingSlot(
        location_id=location_id,
        slot_number=data['slotNumber'],
        is_available=data.get('isAvailable', True),
        vehicle_type=data.get('vehicleType', 'four-wheeler')
    )
    
    db.session.add(slot)
    db.session.commit()
    
    return jsonify({
        "message": "Slot created successfully",
        "slot": slot.to_dict()
    }), 201

@parking_bp.route('/slots/<int:slot_id>', methods=['PUT'])
@admin_required
def update_slot(slot_id):
    slot = ParkingSlot.query.get_or_404(slot_id)
    data = request.json
    
    # Update fields
    if 'slotNumber' in data:
        slot.slot_number = data['slotNumber']
    if 'isAvailable' in data:
        slot.is_available = data['isAvailable']
    if 'vehicleType' in data:
        slot.vehicle_type = data['vehicleType']
    
    slot.last_updated = db.func.now()
    db.session.commit()
    
    return jsonify({
        "message": "Slot updated successfully",
        "slot": slot.to_dict()
    }), 200

@parking_bp.route('/slots/<int:slot_id>', methods=['DELETE'])
@admin_required
def delete_slot(slot_id):
    slot = ParkingSlot.query.get_or_404(slot_id)
    
    db.session.delete(slot)
    db.session.commit()
    
    return jsonify({
        "message": "Slot deleted successfully"
    }), 200
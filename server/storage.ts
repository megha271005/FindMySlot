import { 
  users, type User, type InsertUser,
  parkingLocations, type ParkingLocation, type InsertParkingLocation,
  parkingSlots, type ParkingSlot, type InsertParkingSlot,
  bookings, type Booking, type InsertBooking,
  payments, type Payment, type InsertPayment,
  notifications, type Notification, type InsertNotification,
  otpCodes, type OtpCode, type InsertOtpCode
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // OTP methods
  createOtp(otp: InsertOtpCode): Promise<OtpCode>;
  getOtpByPhoneAndCode(phoneNumber: string, code: string): Promise<OtpCode | undefined>;
  verifyOtp(id: number): Promise<void>;
  
  // Parking location methods
  getAllParkingLocations(): Promise<ParkingLocation[]>;
  getParkingLocationById(id: number): Promise<ParkingLocation | undefined>;
  getNearbyParkingLocations(lat: number, lng: number, radius: number): Promise<ParkingLocation[]>;
  createParkingLocation(location: InsertParkingLocation): Promise<ParkingLocation>;
  updateParkingLocation(id: number, location: Partial<InsertParkingLocation>): Promise<ParkingLocation | undefined>;
  deleteParkingLocation(id: number): Promise<boolean>;
  
  // Parking slot methods
  getAllParkingSlots(): Promise<ParkingSlot[]>;
  getParkingSlotById(id: number): Promise<ParkingSlot | undefined>;
  getParkingSlotsByLocationId(locationId: number): Promise<ParkingSlot[]>;
  createParkingSlot(slot: InsertParkingSlot): Promise<ParkingSlot>;
  updateParkingSlot(id: number, slot: Partial<InsertParkingSlot>): Promise<ParkingSlot | undefined>;
  updateSlotAvailability(id: number, isAvailable: boolean): Promise<ParkingSlot | undefined>;
  deleteParkingSlot(id: number): Promise<boolean>;

  // Booking methods
  getAllBookings(): Promise<Booking[]>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getUserBookings(userId: number): Promise<Booking[]>;
  getUserActiveBooking(userId: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  updateBookingPaymentStatus(id: number, paymentStatus: string): Promise<Booking | undefined>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByBookingId(bookingId: number): Promise<Payment | undefined>;
  getUserPayments(userId: number): Promise<Payment[]>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Location utility methods
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private userMap: Map<number, User>;
  private otpMap: Map<number, OtpCode>;
  private parkingLocationMap: Map<number, ParkingLocation>;
  private parkingSlotMap: Map<number, ParkingSlot>;
  private bookingMap: Map<number, Booking>;
  private paymentMap: Map<number, Payment>;
  private notificationMap: Map<number, Notification>;
  
  private nextUserId: number;
  private nextOtpId: number;
  private nextLocationId: number;
  private nextSlotId: number;
  private nextBookingId: number;
  private nextPaymentId: number;
  private nextNotificationId: number;
  
  constructor() {
    // Initialize maps
    this.userMap = new Map();
    this.otpMap = new Map();
    this.parkingLocationMap = new Map();
    this.parkingSlotMap = new Map();
    this.bookingMap = new Map();
    this.paymentMap = new Map();
    this.notificationMap = new Map();
    
    // Initialize IDs
    this.nextUserId = 1;
    this.nextOtpId = 1;
    this.nextLocationId = 1;
    this.nextSlotId = 1;
    this.nextBookingId = 1;
    this.nextPaymentId = 1;
    this.nextNotificationId = 1;
    
    // Initialize sample data
    this.initializeSampleData();
  }
  
  private initializeSampleData() {
    // Create sample parking locations
    const location1 = this.createParkingLocation({
      name: "City Center Parking",
      address: "123 Main St, Downtown",
      latitude: 12.9716,
      longitude: 77.5946,
      imageUrl: "https://images.unsplash.com/photo-1609587312208-cea54be969e7",
      pricePerHour: 4000, // 40 INR
      facilities: ["24/7 Security", "Well Lit", "CCTV Coverage", "EV Charging"]
    });
    
    const location2 = this.createParkingLocation({
      name: "Market Square Parking",
      address: "456 Market St, City Center",
      latitude: 12.9796,
      longitude: 77.5909,
      imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6",
      pricePerHour: 3000, // 30 INR
      facilities: ["24/7 Security", "CCTV Coverage"]
    });
    
    const location3 = this.createParkingLocation({
      name: "Tech Hub Parking",
      address: "789 Tech Park, Whitefield",
      latitude: 12.9825,
      longitude: 77.6024,
      imageUrl: "https://pixabay.com/get/g132df045bb19ff4dfe5062e2a7cd96e0537b5e2d211fe148da789aac865e813c8857efa84f33a72195dfb01c8a410511ea8c82b3b31e858bf80f4ef79334c469_1280.jpg",
      pricePerHour: 5000, // 50 INR
      facilities: ["24/7 Security", "Well Lit", "CCTV Coverage"]
    });
    
    // Create sample parking slots for location 1
    for (let i = 1; i <= 15; i++) {
      this.createParkingSlot({
        locationId: location1.id,
        slotNumber: `A${i}`,
        isAvailable: Math.random() > 0.3 // 70% chance of being available
      });
    }
    
    // Create sample parking slots for location 2
    for (let i = 1; i <= 12; i++) {
      this.createParkingSlot({
        locationId: location2.id,
        slotNumber: `B${i}`,
        isAvailable: Math.random() > 0.3 // 70% chance of being available
      });
    }
    
    // Create sample parking slots for location 3
    for (let i = 1; i <= 10; i++) {
      this.createParkingSlot({
        locationId: location3.id,
        slotNumber: `C${i}`,
        isAvailable: Math.random() > 0.5 // 50% chance of being available
      });
    }
    
    // Create sample admin user
    this.createUser({
      phoneNumber: "9876543210",
      name: "Admin User",
      isAdmin: true
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.userMap.get(id);
  }
  
  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    return Array.from(this.userMap.values()).find(user => user.phoneNumber === phoneNumber);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const user: User = { ...insertUser, id };
    this.userMap.set(id, user);
    return user;
  }
  
  // OTP methods
  async createOtp(insertOtp: InsertOtpCode): Promise<OtpCode> {
    const id = this.nextOtpId++;
    const otp: OtpCode = { ...insertOtp, id, isVerified: false, createdAt: new Date() };
    this.otpMap.set(id, otp);
    return otp;
  }
  
  async getOtpByPhoneAndCode(phoneNumber: string, code: string): Promise<OtpCode | undefined> {
    return Array.from(this.otpMap.values())
      .find(otp => 
        otp.phoneNumber === phoneNumber && 
        otp.code === code && 
        otp.expiresAt > new Date() && 
        !otp.isVerified
      );
  }
  
  async verifyOtp(id: number): Promise<void> {
    const otp = this.otpMap.get(id);
    if (otp) {
      otp.isVerified = true;
      this.otpMap.set(id, otp);
    }
  }
  
  // Parking location methods
  async getAllParkingLocations(): Promise<ParkingLocation[]> {
    return Array.from(this.parkingLocationMap.values());
  }
  
  async getParkingLocationById(id: number): Promise<ParkingLocation | undefined> {
    return this.parkingLocationMap.get(id);
  }
  
  async getNearbyParkingLocations(lat: number, lng: number, radius: number): Promise<ParkingLocation[]> {
    const locations = Array.from(this.parkingLocationMap.values());
    
    return locations.filter(location => {
      const distance = this.calculateDistance(
        lat, lng, 
        location.latitude, location.longitude
      );
      return distance <= radius;
    }).sort((a, b) => {
      const distanceA = this.calculateDistance(lat, lng, a.latitude, a.longitude);
      const distanceB = this.calculateDistance(lat, lng, b.latitude, b.longitude);
      return distanceA - distanceB;
    });
  }
  
  async createParkingLocation(insertLocation: InsertParkingLocation): Promise<ParkingLocation> {
    const id = this.nextLocationId++;
    const location: ParkingLocation = { ...insertLocation, id };
    this.parkingLocationMap.set(id, location);
    return location;
  }
  
  async updateParkingLocation(id: number, locationUpdate: Partial<InsertParkingLocation>): Promise<ParkingLocation | undefined> {
    const location = this.parkingLocationMap.get(id);
    if (!location) return undefined;
    
    const updatedLocation = { ...location, ...locationUpdate };
    this.parkingLocationMap.set(id, updatedLocation);
    return updatedLocation;
  }
  
  async deleteParkingLocation(id: number): Promise<boolean> {
    return this.parkingLocationMap.delete(id);
  }
  
  // Parking slot methods
  async getAllParkingSlots(): Promise<ParkingSlot[]> {
    return Array.from(this.parkingSlotMap.values());
  }
  
  async getParkingSlotById(id: number): Promise<ParkingSlot | undefined> {
    return this.parkingSlotMap.get(id);
  }
  
  async getParkingSlotsByLocationId(locationId: number): Promise<ParkingSlot[]> {
    return Array.from(this.parkingSlotMap.values())
      .filter(slot => slot.locationId === locationId);
  }
  
  async createParkingSlot(insertSlot: InsertParkingSlot): Promise<ParkingSlot> {
    const id = this.nextSlotId++;
    const slot: ParkingSlot = { 
      ...insertSlot, 
      id, 
      lastUpdated: new Date() 
    };
    this.parkingSlotMap.set(id, slot);
    return slot;
  }
  
  async updateParkingSlot(id: number, slotUpdate: Partial<InsertParkingSlot>): Promise<ParkingSlot | undefined> {
    const slot = this.parkingSlotMap.get(id);
    if (!slot) return undefined;
    
    const updatedSlot: ParkingSlot = { 
      ...slot, 
      ...slotUpdate, 
      lastUpdated: new Date() 
    };
    this.parkingSlotMap.set(id, updatedSlot);
    return updatedSlot;
  }
  
  async updateSlotAvailability(id: number, isAvailable: boolean): Promise<ParkingSlot | undefined> {
    const slot = this.parkingSlotMap.get(id);
    if (!slot) return undefined;
    
    const updatedSlot: ParkingSlot = { 
      ...slot, 
      isAvailable, 
      lastUpdated: new Date() 
    };
    this.parkingSlotMap.set(id, updatedSlot);
    return updatedSlot;
  }
  
  async deleteParkingSlot(id: number): Promise<boolean> {
    return this.parkingSlotMap.delete(id);
  }
  
  // Booking methods
  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookingMap.values());
  }
  
  async getBookingById(id: number): Promise<Booking | undefined> {
    return this.bookingMap.get(id);
  }
  
  async getUserBookings(userId: number): Promise<Booking[]> {
    return Array.from(this.bookingMap.values())
      .filter(booking => booking.userId === userId)
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async getUserActiveBooking(userId: number): Promise<Booking | undefined> {
    return Array.from(this.bookingMap.values())
      .find(booking => 
        booking.userId === userId && 
        booking.status === 'active'
      );
  }
  
  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.nextBookingId++;
    const booking: Booking = { 
      ...insertBooking, 
      id, 
      createdAt: new Date() 
    };
    this.bookingMap.set(id, booking);
    
    // Update slot availability
    await this.updateSlotAvailability(booking.slotId, false);
    
    return booking;
  }
  
  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const booking = this.bookingMap.get(id);
    if (!booking) return undefined;
    
    const updatedBooking: Booking = { ...booking, status };
    this.bookingMap.set(id, updatedBooking);
    
    // If canceled, update slot availability
    if (status === 'cancelled') {
      await this.updateSlotAvailability(booking.slotId, true);
    }
    
    return updatedBooking;
  }
  
  async updateBookingPaymentStatus(id: number, paymentStatus: string): Promise<Booking | undefined> {
    const booking = this.bookingMap.get(id);
    if (!booking) return undefined;
    
    const updatedBooking: Booking = { ...booking, paymentStatus };
    this.bookingMap.set(id, updatedBooking);
    return updatedBooking;
  }
  
  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.nextPaymentId++;
    const payment: Payment = { 
      ...insertPayment, 
      id, 
      createdAt: new Date() 
    };
    this.paymentMap.set(id, payment);
    return payment;
  }
  
  async getPaymentByBookingId(bookingId: number): Promise<Payment | undefined> {
    return Array.from(this.paymentMap.values())
      .find(payment => payment.bookingId === bookingId);
  }
  
  async getUserPayments(userId: number): Promise<Payment[]> {
    return Array.from(this.paymentMap.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.nextNotificationId++;
    const notification: Notification = { 
      ...insertNotification, 
      id, 
      createdAt: new Date() 
    };
    this.notificationMap.set(id, notification);
    return notification;
  }
  
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notificationMap.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async markNotificationAsRead(id: number): Promise<void> {
    const notification = this.notificationMap.get(id);
    if (notification) {
      notification.isRead = true;
      this.notificationMap.set(id, notification);
    }
  }
  
  // Utility methods
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  }
  
  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
  
  // Simulate sensor updates for slot availability (called periodically)
  async simulateSensorUpdates(): Promise<void> {
    const slots = await this.getAllParkingSlots();
    
    // Only update slots that are not booked
    const availableSlots = slots.filter(slot => {
      const isBooked = Array.from(this.bookingMap.values())
        .some(booking => 
          booking.slotId === slot.id && 
          booking.status === 'active'
        );
      return !isBooked;
    });
    
    // Update about 10% of available slots
    const slotsToUpdate = availableSlots
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.ceil(availableSlots.length * 0.1));
    
    for (const slot of slotsToUpdate) {
      // Random change in availability
      await this.updateSlotAvailability(
        slot.id, 
        Math.random() > 0.3 // 70% chance of being available
      );
    }
  }
}

// Export a singleton instance
export const storage = new MemStorage();

// Start simulating sensor updates every 2 minutes
setInterval(() => {
  storage.simulateSensorUpdates();
}, 2 * 60 * 1000);

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertOtpCodeSchema,
  insertBookingSchema,
  insertPaymentSchema,
  insertParkingLocationSchema,
  insertParkingSlotSchema,
  BOOKING_DURATIONS
} from "@shared/schema";
import expressSession from "express-session";
import MemoryStore from "memorystore";
import { z } from "zod";

// Create session store
const sessionStore = MemoryStore(expressSession);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    expressSession({
      secret: process.env.SESSION_SECRET || "find-my-slot-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
      },
      store: new sessionStore({
        checkPeriod: 24 * 60 * 60 * 1000 // 24 hours
      })
    })
  );

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Admin middleware
  const requireAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };

  // Auth Routes
  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const phoneSchema = z.object({
        phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits")
      });

      const { phoneNumber } = phoneSchema.parse(req.body);
      
      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiry to 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      // Store OTP
      await storage.createOtp({
        phoneNumber,
        code: otp,
        expiresAt
      });
      
      // In a real app, this would send an SMS. For demo, we'll just return the OTP
      console.log(`OTP for ${phoneNumber}: ${otp}`);
      
      return res.status(200).json({
        message: "OTP sent successfully",
        // DON'T do this in production, only for demo
        otp
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const verifySchema = z.object({
        phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
        otp: z.string().length(6, "OTP must be 6 digits")
      });

      const { phoneNumber, otp } = verifySchema.parse(req.body);
      
      // Verify OTP
      const otpRecord = await storage.getOtpByPhoneAndCode(phoneNumber, otp);
      
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid OTP" });
      }
      
      // Mark OTP as verified
      await storage.verifyOtp(otpRecord.id);
      
      // Check if user exists
      let user = await storage.getUserByPhoneNumber(phoneNumber);
      
      // Create user if not exists
      if (!user) {
        user = await storage.createUser({
          phoneNumber,
          name: "",
          isAdmin: false
        });
      }
      
      // Set user session
      req.session.userId = user.id;
      
      return res.status(200).json({
        message: "OTP verified successfully",
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json({
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Parking Location Routes
  app.get("/api/parking/locations", async (req, res) => {
    try {
      const locations = await storage.getAllParkingLocations();
      
      return res.status(200).json({ locations });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/parking/locations/:id", async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      
      const location = await storage.getParkingLocationById(locationId);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Get slots for this location
      const slots = await storage.getParkingSlotsByLocationId(locationId);
      const availableSlots = slots.filter(slot => slot.isAvailable).length;
      
      return res.status(200).json({ 
        location,
        slots,
        availableSlots,
        totalSlots: slots.length
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/parking/nearby", async (req, res) => {
    try {
      const latSchema = z.coerce.number().min(-90).max(90);
      const lngSchema = z.coerce.number().min(-180).max(180);
      const radiusSchema = z.coerce.number().positive().default(5);
      
      const lat = latSchema.parse(req.query.lat);
      const lng = lngSchema.parse(req.query.lng);
      const radius = radiusSchema.parse(req.query.radius);
      
      const locations = await storage.getNearbyParkingLocations(lat, lng, radius);
      
      // Add distance and available slots to each location
      const locationsWithDetails = await Promise.all(
        locations.map(async (location) => {
          const slots = await storage.getParkingSlotsByLocationId(location.id);
          const availableSlots = slots.filter(slot => slot.isAvailable).length;
          const distance = storage.calculateDistance(lat, lng, location.latitude, location.longitude);
          
          return {
            ...location,
            distance: parseFloat(distance.toFixed(1)),
            availableSlots,
            totalSlots: slots.length
          };
        })
      );
      
      return res.status(200).json({ locations: locationsWithDetails });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin Location Routes
  app.post("/api/admin/locations", requireAdmin, async (req, res) => {
    try {
      const locationData = insertParkingLocationSchema.parse(req.body);
      
      const location = await storage.createParkingLocation(locationData);
      
      return res.status(201).json({ location });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/locations/:id", requireAdmin, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      
      const locationData = insertParkingLocationSchema.partial().parse(req.body);
      
      const location = await storage.updateParkingLocation(locationId, locationData);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      return res.status(200).json({ location });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/locations/:id", requireAdmin, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      
      const success = await storage.deleteParkingLocation(locationId);
      
      if (!success) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      return res.status(200).json({ message: "Location deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin Slot Routes
  app.post("/api/admin/slots", requireAdmin, async (req, res) => {
    try {
      const slotData = insertParkingSlotSchema.parse(req.body);
      
      const slot = await storage.createParkingSlot(slotData);
      
      return res.status(201).json({ slot });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/slots/:id", requireAdmin, async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      
      if (isNaN(slotId)) {
        return res.status(400).json({ message: "Invalid slot ID" });
      }
      
      const slotData = insertParkingSlotSchema.partial().parse(req.body);
      
      const slot = await storage.updateParkingSlot(slotId, slotData);
      
      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      return res.status(200).json({ slot });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/slots/:id", requireAdmin, async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      
      if (isNaN(slotId)) {
        return res.status(400).json({ message: "Invalid slot ID" });
      }
      
      const success = await storage.deleteParkingSlot(slotId);
      
      if (!success) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      return res.status(200).json({ message: "Slot deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking Routes
  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const bookingSchema = z.object({
        locationId: z.number(),
        slotId: z.number(),
        duration: z.number().refine(
          val => [BOOKING_DURATIONS.THIRTY_MIN, BOOKING_DURATIONS.ONE_HOUR, BOOKING_DURATIONS.TWO_HOURS].includes(val),
          { message: "Invalid duration" }
        )
      });
      
      const { locationId, slotId, duration } = bookingSchema.parse(req.body);
      
      // Verify user doesn't already have an active booking
      const existingBooking = await storage.getUserActiveBooking(req.session.userId!);
      
      if (existingBooking) {
        return res.status(400).json({ 
          message: "You already have an active booking",
          booking: existingBooking
        });
      }
      
      // Verify slot exists and is available
      const slot = await storage.getParkingSlotById(slotId);
      
      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      if (!slot.isAvailable) {
        return res.status(400).json({ message: "Slot is not available" });
      }
      
      // Get location
      const location = await storage.getParkingLocationById(locationId);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Calculate booking details
      const startDate = new Date();
      
      // End date is 1 week from start date
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      
      // Calculate amount based on hourly rate and duration
      // Price per hour is already in cents
      const amount = Math.round(location.pricePerHour * (duration / 60));
      
      // Create booking
      const booking = await storage.createBooking({
        userId: req.session.userId!,
        slotId,
        locationId,
        startDate,
        endDate,
        duration,
        amount,
        status: 'pending',
        paymentStatus: 'pending'
      });
      
      return res.status(201).json({ booking });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookings/active", requireAuth, async (req, res) => {
    try {
      const booking = await storage.getUserActiveBooking(req.session.userId!);
      
      if (!booking) {
        return res.status(404).json({ message: "No active booking found" });
      }
      
      // Get location details
      const location = await storage.getParkingLocationById(booking.locationId);
      
      return res.status(200).json({ booking, location });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookings/history", requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getUserBookings(req.session.userId!);
      
      // Filter out pending bookings
      const bookingHistory = bookings.filter(booking => 
        booking.status !== 'pending'
      );
      
      // Add location details to each booking
      const bookingsWithLocation = await Promise.all(
        bookingHistory.map(async (booking) => {
          const location = await storage.getParkingLocationById(booking.locationId);
          return {
            ...booking,
            location
          };
        })
      );
      
      return res.status(200).json({ bookings: bookingsWithLocation });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/bookings/:id/cancel", requireAuth, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      // Verify booking exists and belongs to user
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (booking.status !== 'active') {
        return res.status(400).json({ message: "Only active bookings can be cancelled" });
      }
      
      // Calculate refund amount (25% penalty)
      const refundAmount = Math.round(booking.amount * 0.75);
      
      // Update booking status
      const updatedBooking = await storage.updateBookingStatus(bookingId, 'cancelled');
      
      if (!updatedBooking) {
        return res.status(500).json({ message: "Failed to cancel booking" });
      }
      
      // Create refund payment if original payment exists
      const payment = await storage.getPaymentByBookingId(bookingId);
      
      if (payment && payment.status === 'success') {
        await storage.createPayment({
          bookingId,
          userId: req.session.userId!,
          amount: -refundAmount, // Negative amount for refund
          transactionId: `refund_${payment.transactionId}`,
          paymentMethod: payment.paymentMethod,
          status: 'refunded'
        });
      }
      
      // Create notification
      await storage.createNotification({
        userId: req.session.userId!,
        title: "Booking Cancelled",
        message: `Your booking has been cancelled with a refund of ₹${(refundAmount / 100).toFixed(2)}`,
        type: "booking",
        isRead: false
      });
      
      return res.status(200).json({ 
        message: "Booking cancelled successfully",
        refundAmount
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Payment Routes
  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const paymentSchema = z.object({
        bookingId: z.number(),
        paymentMethod: z.string(),
        cardDetails: z.object({
          cardNumber: z.string().optional(),
          expiryDate: z.string().optional(),
          cvv: z.string().optional(),
          name: z.string().optional()
        }).optional()
      });
      
      const { bookingId, paymentMethod } = paymentSchema.parse(req.body);
      
      // Verify booking exists and belongs to user
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (booking.paymentStatus !== 'pending') {
        return res.status(400).json({ message: "Payment has already been processed" });
      }
      
      // In a real app, this would process payment via payment gateway
      // For demo, we'll mock a successful payment
      
      // Mock transaction ID
      const transactionId = `tx_${Date.now()}`;
      
      // Create payment record
      const payment = await storage.createPayment({
        bookingId,
        userId: req.session.userId!,
        amount: booking.amount,
        transactionId,
        paymentMethod,
        status: 'success'
      });
      
      // Update booking status
      await storage.updateBookingStatus(bookingId, 'active');
      await storage.updateBookingPaymentStatus(bookingId, 'paid');
      
      // Create notification
      await storage.createNotification({
        userId: req.session.userId!,
        title: "Payment Successful",
        message: `Your payment of ₹${(booking.amount / 100).toFixed(2)} was successful`,
        type: "payment",
        isRead: false
      });
      
      return res.status(200).json({ 
        message: "Payment successful",
        payment,
        transactionId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/payments/history", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getUserPayments(req.session.userId!);
      
      return res.status(200).json({ payments });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.session.userId!);
      
      return res.status(200).json({ notifications });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      await storage.markNotificationAsRead(notificationId);
      
      return res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin Dashboard Routes
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const locations = await storage.getAllParkingLocations();
      const slots = await storage.getAllParkingSlots();
      const bookings = await storage.getAllBookings();
      
      const totalSlots = slots.length;
      const availableSlots = slots.filter(slot => slot.isAvailable).length;
      const activeBookings = bookings.filter(booking => booking.status === 'active').length;
      
      // Calculate today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayBookings = bookings.filter(booking => 
        new Date(booking.createdAt) >= today && 
        booking.status === 'active' && 
        booking.paymentStatus === 'paid'
      );
      
      const todayRevenue = todayBookings.reduce((sum, booking) => sum + booking.amount, 0);
      
      return res.status(200).json({
        stats: {
          totalSlots,
          availableSlots,
          activeBookings,
          todayRevenue
        },
        locations,
        recentBookings: bookings
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

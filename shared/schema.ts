import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  name: text("name"),
  isAdmin: boolean("is_admin").default(false).notNull()
});

export const insertUserSchema = createInsertSchema(users).pick({
  phoneNumber: true,
  name: true,
  isAdmin: true
});

// Parking locations table
export const parkingLocations = pgTable("parking_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  imageUrl: text("image_url"),
  pricePerHour: integer("price_per_hour").notNull(), // stored in cents
  facilities: text("facilities").array() 
});

export const insertParkingLocationSchema = createInsertSchema(parkingLocations).pick({
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  imageUrl: true,
  pricePerHour: true,
  facilities: true
});

// Parking slots table
export const parkingSlots = pgTable("parking_slots", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  slotNumber: text("slot_number").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

export const insertParkingSlotSchema = createInsertSchema(parkingSlots).pick({
  locationId: true,
  slotNumber: true,
  isAvailable: true
});

// Durations for bookings
export const BOOKING_DURATIONS = {
  THIRTY_MIN: 30,
  ONE_HOUR: 60, 
  TWO_HOURS: 120
};

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  slotId: integer("slot_id").notNull(),
  locationId: integer("location_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  amount: integer("amount").notNull(), // in cents
  status: text("status").notNull(), // active, completed, cancelled
  paymentStatus: text("payment_status").notNull(), // pending, paid, refunded
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  userId: true,
  slotId: true,
  locationId: true,
  startDate: true,
  endDate: true,
  duration: true,
  amount: true,
  status: true,
  paymentStatus: true
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // in cents
  transactionId: text("transaction_id"),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull(), // success, failed, refunded
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  bookingId: true,
  userId: true,
  amount: true,
  transactionId: true,
  paymentMethod: true,
  status: true
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // booking, payment, slot, admin
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
  isRead: true
});

// Auth OTP table
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).pick({
  phoneNumber: true,
  code: true,
  expiresAt: true
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ParkingLocation = typeof parkingLocations.$inferSelect;
export type InsertParkingLocation = z.infer<typeof insertParkingLocationSchema>;

export type ParkingSlot = typeof parkingSlots.$inferSelect;
export type InsertParkingSlot = z.infer<typeof insertParkingSlotSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;

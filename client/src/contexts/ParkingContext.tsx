import { createContext, useContext, useState, ReactNode } from "react";

// Context interface
interface ParkingContextType {
  activeScreen: string;
  selectedLocation: any | null;
  currentBooking: any | null;
  setSelectedLocation: (location: any) => void;
  setActiveScreen: (screen: string) => void;
  closeLocationDetails: () => void;
  navigateToPayment: (booking: any) => void;
  closePayment: () => void;
  showBookingConfirmation: () => void;
  goToDashboard: () => void;
  goToHome: () => void;
}

// Create context with default values
const ParkingContext = createContext<ParkingContextType>({
  activeScreen: "map-screen",
  selectedLocation: null,
  currentBooking: null,
  setSelectedLocation: () => {},
  setActiveScreen: () => {},
  closeLocationDetails: () => {},
  navigateToPayment: () => {},
  closePayment: () => {},
  showBookingConfirmation: () => {},
  goToDashboard: () => {},
  goToHome: () => {},
});

// Provider component
export const ParkingProvider = ({ children }: { children: ReactNode }) => {
  const [activeScreen, setActiveScreen] = useState("map-screen");
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [currentBooking, setCurrentBooking] = useState<any | null>(null);
  
  // Set selected location and navigate to details screen
  const handleSelectLocation = (location: any) => {
    setSelectedLocation(location);
    setActiveScreen("slot-details-screen");
  };
  
  // Close location details and go back to map
  const closeLocationDetails = () => {
    setActiveScreen("map-screen");
  };
  
  // Navigate to payment screen with booking details
  const navigateToPayment = (booking: any) => {
    setCurrentBooking(booking);
    setActiveScreen("payment-screen");
  };
  
  // Close payment screen and go back to location details
  const closePayment = () => {
    setActiveScreen("slot-details-screen");
  };
  
  // Show booking confirmation screen
  const showBookingConfirmation = () => {
    setActiveScreen("booking-confirmation-screen");
  };
  
  // Go to dashboard screen
  const goToDashboard = () => {
    setActiveScreen("dashboard-screen");
  };
  
  // Go back to home/map screen
  const goToHome = () => {
    setActiveScreen("map-screen");
  };
  
  return (
    <ParkingContext.Provider
      value={{
        activeScreen,
        selectedLocation,
        currentBooking,
        setSelectedLocation: handleSelectLocation,
        setActiveScreen,
        closeLocationDetails,
        navigateToPayment,
        closePayment,
        showBookingConfirmation,
        goToDashboard,
        goToHome,
      }}
    >
      {children}
    </ParkingContext.Provider>
  );
};

// Custom hook to use the parking context
export const useParking = () => useContext(ParkingContext);

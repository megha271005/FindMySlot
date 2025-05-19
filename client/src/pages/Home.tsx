import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParking } from "@/contexts/ParkingContext";
import AuthScreen from "@/components/AuthScreen";
import MapScreen from "@/components/MapScreen";
import SlotDetailsScreen from "@/components/SlotDetailsScreen";
import PaymentScreen from "@/components/PaymentScreen";
import BookingConfirmationScreen from "@/components/BookingConfirmationScreen";
import DashboardScreen from "@/components/DashboardScreen";
import ProfileScreen from "@/components/ProfileScreen";
import NotificationsScreen from "@/components/NotificationsScreen";
import AdminDashboard from "@/components/AdminDashboard";
import BottomNavigation from "@/components/BottomNavigation";

const Home = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { activeScreen, setActiveScreen } = useParking();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // After initial load and auth check, set isInitialLoad to false
  useEffect(() => {
    if (!isLoading) {
      // Small delay to ensure smooth transitions
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  // Show loading indicator during initial load
  if (isLoading || isInitialLoad) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <span className="material-icons text-white text-2xl">local_parking</span>
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mt-4"></div>
        </div>
      </div>
    );
  }
  
  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  }
  
  // Handle screen changes via bottom navigation
  const handleScreenChange = (screen: string) => {
    setActiveScreen(screen);
  };
  
  return (
    <div className="app-container relative h-screen overflow-hidden" id="app-container">
      <div id="main-content">
        {/* Only show the active screen */}
        {activeScreen === "map-screen" && <MapScreen />}
        {activeScreen === "slot-details-screen" && <SlotDetailsScreen />}
        {activeScreen === "payment-screen" && <PaymentScreen />}
        {activeScreen === "booking-confirmation-screen" && <BookingConfirmationScreen />}
        {activeScreen === "dashboard-screen" && <DashboardScreen />}
        {activeScreen === "profile-screen" && <ProfileScreen />}
        {activeScreen === "notifications-screen" && <NotificationsScreen />}
        {activeScreen === "admin-dashboard" && <AdminDashboard onExit={() => setActiveScreen("map-screen")} />}
        
        {/* Bottom navigation - only show if not in detail screens */}
        {!["slot-details-screen", "payment-screen", "booking-confirmation-screen", "admin-dashboard"].includes(activeScreen) && (
          <BottomNavigation 
            activeScreen={activeScreen} 
            onChange={handleScreenChange} 
          />
        )}
      </div>
    </div>
  );
};

export default Home;

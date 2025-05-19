import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface BottomNavigationProps {
  activeScreen: string;
  onChange: (screen: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const BottomNavigation = ({ activeScreen, onChange }: BottomNavigationProps) => {
  const { user } = useAuth();
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  const navItems: NavItem[] = [
    { id: "map-screen", label: "Map", icon: "map" },
    { id: "dashboard-screen", label: "Dashboard", icon: "dashboard" },
    { id: "notifications-screen", label: "Notifications", icon: "notifications" },
    { id: "profile-screen", label: "Profile", icon: "person" },
  ];
  
  const handleProfileClick = () => {
    // Handle navigation
    onChange("profile-screen");
    
    // Secret admin access: triple-click on profile
    const now = Date.now();
    if (now - lastClickTime < 500) {
      setAdminClickCount(prev => prev + 1);
      if (adminClickCount >= 2) {
        // On third quick click, open admin dashboard if user is admin
        if (user?.isAdmin) {
          onChange("admin-dashboard");
        }
        setAdminClickCount(0);
      }
    } else {
      setAdminClickCount(1);
    }
    setLastClickTime(now);
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yacht-white border-t border-yacht-gray/30 h-14 flex items-center justify-around z-50 shadow-sm">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`flex flex-col items-center justify-center w-1/4 h-full ${
            activeScreen === item.id 
              ? "text-yacht-teal" 
              : "text-yacht-gray"
          }`}
          onClick={item.id === "profile-screen" ? handleProfileClick : () => onChange(item.id)}
        >
          <span className="material-icons text-xl">{item.icon}</span>
          <span className="text-xs mt-1">{item.label}</span>
          
          {activeScreen === item.id && (
            <div className="absolute bottom-0 w-8 h-1 bg-yacht-teal rounded-t-md"></div>
          )}
        </button>
      ))}
    </div>
  );
};

export default BottomNavigation;

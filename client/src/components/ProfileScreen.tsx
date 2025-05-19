import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const ProfileItem = ({ icon, title, onClick }) => {
  return (
    <Card className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors" onClick={onClick}>
      <div className="flex items-center">
        <span className="material-icons text-primary mr-3">{icon}</span>
        <span>{title}</span>
      </div>
      <span className="material-icons text-muted-foreground">chevron_right</span>
    </Card>
  );
};

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    setLogoutDialogOpen(false);
  };
  
  // Generate initials from name or phone number
  const getInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    
    if (user?.phoneNumber) {
      return user.phoneNumber.slice(-2);
    }
    
    return "U";
  };
  
  // Format phone number with country code
  const formatPhone = (phone: string) => {
    return `+91 ${phone}`;
  };
  
  return (
    <div className="fixed inset-0 bg-white z-30 pt-4 pb-16 overflow-y-auto">
      {/* Header */}
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>
      
      {/* User Profile */}
      <div className="px-4 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold mr-4">
            {getInitials()}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.name || "User"}</h2>
            <p className="text-muted-foreground">{user?.phoneNumber ? formatPhone(user.phoneNumber) : ""}</p>
          </div>
        </div>
        
        {/* Profile Options */}
        <div className="space-y-3">
          <ProfileItem 
            icon="credit_card" 
            title="Payment Methods" 
            onClick={() => toast({ 
              title: "Coming Soon", 
              description: "This feature will be available in a future update" 
            })} 
          />
          
          <ProfileItem 
            icon="notifications" 
            title="Notifications" 
            onClick={() => toast({ 
              title: "Coming Soon", 
              description: "This feature will be available in a future update" 
            })} 
          />
          
          <ProfileItem 
            icon="help_outline" 
            title="Help & Support" 
            onClick={() => toast({ 
              title: "Coming Soon", 
              description: "This feature will be available in a future update" 
            })} 
          />
          
          <ProfileItem 
            icon="privacy_tip" 
            title="Privacy Policy" 
            onClick={() => toast({ 
              title: "Coming Soon", 
              description: "This feature will be available in a future update" 
            })} 
          />
          
          <ProfileItem 
            icon="description" 
            title="Terms & Conditions" 
            onClick={() => toast({ 
              title: "Coming Soon", 
              description: "This feature will be available in a future update" 
            })} 
          />
          
          <Button 
            className="w-full mt-6" 
            variant="outline" 
            onClick={() => setLogoutDialogOpen(true)}
          >
            Log Out
          </Button>
        </div>
      </div>
      
      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to log in again to access your account and bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileScreen;

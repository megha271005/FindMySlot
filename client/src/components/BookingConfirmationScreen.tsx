import { Button } from "@/components/ui/button";
import { useParking } from "@/contexts/ParkingContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const BookingConfirmationScreen = () => {
  const { goToDashboard, goToHome } = useParking();
  
  // Get active booking
  const { data, isLoading } = useQuery({
    queryKey: ['/api/bookings/active'],
    queryFn: async () => {
      const res = await fetch('/api/bookings/active');
      if (!res.ok) {
        if (res.status === 404) {
          return { booking: null, location: null };
        }
        throw new Error('Failed to fetch active booking');
      }
      return res.json();
    },
  });
  
  // Format duration
  const getDurationText = (duration?: number) => {
    if (!duration) return "";
    if (duration === 30) return "30 minutes (weekly)";
    if (duration === 60) return "1 hour (weekly)";
    if (duration === 120) return "2 hours (weekly)";
    return `${duration} minutes (weekly)`;
  };
  
  return (
    <div className="fixed inset-0 bg-white z-40">
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        {isLoading ? (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6">
              <span className="material-icons text-white text-3xl">check</span>
            </div>
            
            <h2 className="text-2xl font-semibold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-8">Your parking slot has been successfully booked.</p>
            
            <div className="bg-muted rounded-xl p-4 w-full max-w-sm mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{data?.location?.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Booking ID</span>
                <span className="font-medium">#{data?.booking?.id}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{getDurationText(data?.booking?.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Till</span>
                <span className="font-medium">
                  {data?.booking?.endDate ? format(new Date(data.booking.endDate), "MMM d, yyyy") : ""}
                </span>
              </div>
            </div>
            
            <Button 
              className="w-full max-w-sm mb-3"
              onClick={goToDashboard}
            >
              View Booking
            </Button>
            
            <Button 
              className="w-full max-w-sm"
              variant="outline"
              onClick={goToHome}
            >
              Back to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingConfirmationScreen;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

const DashboardScreen = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // Get active booking
  const { data: activeBookingData, isLoading: isLoadingActive } = useQuery({
    queryKey: ['/api/bookings/active'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/bookings/active');
        if (!res.ok) {
          if (res.status === 404) {
            return { booking: null, location: null };
          }
          throw new Error('Failed to fetch active booking');
        }
        return res.json();
      } catch (error) {
        if (error.message.includes("404")) {
          return { booking: null, location: null };
        }
        throw error;
      }
    },
  });
  
  // Get booking history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/bookings/history'],
    queryFn: async () => {
      const res = await fetch('/api/bookings/history');
      if (!res.ok) throw new Error('Failed to fetch booking history');
      return res.json();
    },
  });
  
  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/cancel`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Booking Cancelled",
        description: `Your booking has been cancelled. ₹${(data.refundAmount / 100).toFixed(2)} will be refunded.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/history'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel booking",
        variant: "destructive",
      });
    },
  });
  
  const handleCancelBooking = () => {
    if (activeBookingData?.booking) {
      cancelBookingMutation.mutate(activeBookingData.booking.id);
      setCancelDialogOpen(false);
    }
  };
  
  // Format dates and times
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `${diffDays} days remaining`;
  };
  
  const getDurationText = (duration: number) => {
    if (duration === 30) return "30 min slot";
    if (duration === 60) return "1 hour slot";
    if (duration === 120) return "2 hour slot";
    return `${duration} min slot`;
  };
  
  return (
    <div className="fixed inset-0 bg-white z-30 pt-4 pb-16 overflow-y-auto">
      {/* Header */}
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
      </div>
      
      {/* Active Booking Section */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Active Booking</h2>
        
        {isLoadingActive ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : activeBookingData?.booking ? (
          <Card className="overflow-hidden">
            {/* Parking location image */}
            <div 
              className="h-40 bg-muted" 
              style={{ 
                backgroundImage: `url('${activeBookingData.location?.imageUrl || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a"}')`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            ></div>
            
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{activeBookingData.location?.name}</h3>
                  <p className="text-sm text-muted-foreground">{activeBookingData.location?.address}</p>
                </div>
                <div className="bg-primary-light text-white text-xs px-2 py-1 rounded-full">
                  Active
                </div>
              </div>
              
              <div className="flex items-center text-muted-foreground mb-4 text-sm">
                <span className="material-icons text-sm mr-1">schedule</span>
                <span>
                  {getDurationText(activeBookingData.booking.duration)} • {getTimeRemaining(activeBookingData.booking.endDate)}
                </span>
              </div>
              
              <div className="bg-muted rounded-lg p-3 mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Booking ID</span>
                  <span className="text-sm font-medium">#{activeBookingData.booking.id}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Amount Paid</span>
                  <span className="text-sm font-medium">₹{(activeBookingData.booking.amount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valid Till</span>
                  <span className="text-sm font-medium">{formatDate(activeBookingData.booking.endDate)}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button className="flex-1 flex items-center justify-center gap-1">
                  <span className="material-icons text-sm">navigation</span>
                  <span>Navigate</span>
                </Button>
                <Button 
                  className="flex-1 flex items-center justify-center gap-1"
                  variant="outline"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={cancelBookingMutation.isPending}
                >
                  <span className="material-icons text-sm">close</span>
                  <span>{cancelBookingMutation.isPending ? "Cancelling..." : "Cancel"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-6 bg-muted rounded-xl">
            <span className="material-icons text-4xl text-muted-foreground mb-2">local_parking</span>
            <p className="text-muted-foreground">No active bookings</p>
            <p className="text-sm text-muted-foreground mt-1">Book a parking slot to see it here</p>
          </div>
        )}
      </div>
      
      {/* Booking History Section */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Booking History</h2>
        
        {isLoadingHistory ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : historyData?.bookings?.length > 0 ? (
          <div className="space-y-4">
            {historyData.bookings.map((booking) => (
              <Card key={booking.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{booking.location?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    booking.status === 'completed' 
                      ? 'bg-muted text-muted-foreground' 
                      : booking.status === 'cancelled'
                      ? 'bg-red-500 text-white'
                      : 'bg-primary-light text-white'
                  }`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Booking ID: #{booking.id}</span>
                  <span className="font-medium">
                    ₹{(booking.amount / 100).toFixed(2)}
                    {booking.status === 'cancelled' && ' (₹' + ((booking.amount * 0.75) / 100).toFixed(2) + ' refunded)'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-muted rounded-xl">
            <span className="material-icons text-4xl text-muted-foreground mb-2">history</span>
            <p className="text-muted-foreground">No booking history</p>
            <p className="text-sm text-muted-foreground mt-1">Your past bookings will appear here</p>
          </div>
        )}
      </div>
      
      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your current booking. You will receive a refund of 75% of the booking amount. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Booking</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelBooking}
              className="bg-red-500 hover:bg-red-600"
            >
              Yes, Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardScreen;

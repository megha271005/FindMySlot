import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useParking } from "@/contexts/ParkingContext";
import { BOOKING_DURATIONS } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const SlotDetailsScreen = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedLocation, closeLocationDetails, navigateToPayment } = useParking();
  const [selectedDuration, setSelectedDuration] = useState(BOOKING_DURATIONS.ONE_HOUR);
  
  // Fetch location details including available slots
  const { data, isLoading } = useQuery({
    queryKey: [`/api/parking/locations/${selectedLocation?.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/parking/locations/${selectedLocation?.id}`);
      if (!res.ok) throw new Error('Failed to fetch location details');
      return res.json();
    },
    enabled: !!selectedLocation,
  });
  
  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async ({ locationId, slotId, duration, vehicleType }: { 
      locationId: number; 
      slotId: number; 
      duration: number;
      vehicleType: 'two-wheeler' | 'four-wheeler'
    }) => {
      const res = await apiRequest("POST", "/api/bookings", { 
        locationId, 
        slotId, 
        duration,
        vehicleType 
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/parking/locations/${selectedLocation?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/parking/nearby'] });
      navigateToPayment(data.booking);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    },
  });
  
  if (!selectedLocation) return null;
  
  const handleBackClick = () => {
    closeLocationDetails();
  };
  
  const handleBooking = () => {
    // Find an available slot
    const availableSlot = data?.slots?.find(slot => slot.isAvailable);
    
    if (!availableSlot) {
      toast({
        title: "No Slots Available",
        description: "Sorry, there are no available slots at this location",
        variant: "destructive",
      });
      return;
    }
    
    createBookingMutation.mutate({
      locationId: selectedLocation.id,
      slotId: availableSlot.id,
      duration: selectedDuration,
      vehicleType: selectedLocation.vehicleType || 'four-wheeler'
    });
  };
  
  // Calculate price for different durations
  const getPriceForDuration = (duration: number) => {
    const hourlyRate = selectedLocation.pricePerHour;
    return Math.round(hourlyRate * (duration / 60));
  };
  
  return (
    <div className="fixed inset-0 bg-yacht-white z-40">
      {/* Header */}
      <div className="bg-yacht-teal text-yacht-white p-4 flex items-center">
        <button className="mr-2" onClick={handleBackClick}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold">Slot Details</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yacht-teal"></div>
        </div>
      ) : (
        <>
          {/* Slot Image */}
          <div 
            className="h-48 bg-yacht-gray" 
            style={{ 
              backgroundImage: `url('${selectedLocation.imageUrl || "https://images.unsplash.com/photo-1609587312208-cea54be969e7"}')`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center' 
            }}
          ></div>
          
          {/* Slot Information */}
          <div className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-yacht-teal">{selectedLocation.name}</h2>
                <p className="text-yacht-gray">{selectedLocation.address}</p>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-1 ${data?.availableSlots > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`font-medium ${data?.availableSlots > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {data?.availableSlots > 0 ? 'Available' : 'Full'}
                  </span>
                </div>
                
                <Badge className="bg-yacht-teal text-yacht-white">
                  {selectedLocation.vehicleType === 'two-wheeler' ? '2-Wheeler' : '4-Wheeler'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center text-yacht-gray mb-6">
              <span className="material-icons text-sm mr-1">near_me</span>
              <span className="text-sm">{selectedLocation.distance} km away</span>
              <span className="mx-2">•</span>
              <span className="material-icons text-sm mr-1">access_time</span>
              <span className="text-sm">
                {Math.round(selectedLocation.distance * 20)} min by walk
              </span>
            </div>
            
            {/* Facility Details */}
            <div className="bg-yacht-gray/20 rounded-xl p-4 mb-6">
              <h3 className="font-medium mb-3 text-yacht-teal">Facilities</h3>
              <div className="grid grid-cols-2 gap-3">
                {selectedLocation.facilities?.map((facility, index) => (
                  <div key={index} className="flex items-center">
                    <span className="material-icons text-yacht-teal mr-2">
                      {facility.includes("Security") ? "security" : 
                       facility.includes("Lit") ? "light" : 
                       facility.includes("CCTV") ? "camera_alt" : 
                       facility.includes("EV") ? "electric_car" : "check_circle"}
                    </span>
                    <span className="text-sm">{facility}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Booking Options */}
            <h3 className="font-medium mb-3 text-yacht-teal">Select Booking Duration</h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div 
                className={`border rounded-lg p-3 text-center cursor-pointer ${
                  selectedDuration === BOOKING_DURATIONS.THIRTY_MIN 
                    ? 'border-yacht-teal bg-yacht-teal/10' 
                    : 'border-yacht-gray'
                }`}
                onClick={() => setSelectedDuration(BOOKING_DURATIONS.THIRTY_MIN)}
              >
                <p className="font-medium">30 min</p>
                <p className="text-sm text-yacht-brown font-medium">
                  ₹{(getPriceForDuration(BOOKING_DURATIONS.THIRTY_MIN) / 100).toFixed(2)}
                </p>
              </div>
              
              <div 
                className={`border rounded-lg p-3 text-center cursor-pointer ${
                  selectedDuration === BOOKING_DURATIONS.ONE_HOUR 
                    ? 'border-yacht-teal bg-yacht-teal/10' 
                    : 'border-yacht-gray'
                }`}
                onClick={() => setSelectedDuration(BOOKING_DURATIONS.ONE_HOUR)}
              >
                <p className="font-medium">1 hour</p>
                <p className="text-sm text-yacht-brown font-medium">
                  ₹{(getPriceForDuration(BOOKING_DURATIONS.ONE_HOUR) / 100).toFixed(2)}
                </p>
              </div>
              
              <div 
                className={`border rounded-lg p-3 text-center cursor-pointer ${
                  selectedDuration === BOOKING_DURATIONS.TWO_HOURS 
                    ? 'border-yacht-teal bg-yacht-teal/10' 
                    : 'border-yacht-gray'
                }`}
                onClick={() => setSelectedDuration(BOOKING_DURATIONS.TWO_HOURS)}
              >
                <p className="font-medium">2 hours</p>
                <p className="text-sm text-yacht-brown font-medium">
                  ₹{(getPriceForDuration(BOOKING_DURATIONS.TWO_HOURS) / 100).toFixed(2)}
                </p>
              </div>
            </div>
            
            <Button 
              className="w-full bg-yacht-teal hover:bg-yacht-teal/90 text-yacht-white"
              onClick={handleBooking}
              disabled={createBookingMutation.isPending || data?.availableSlots <= 0}
            >
              {createBookingMutation.isPending ? (
                "Processing..."
              ) : (
                `Book for ₹${(getPriceForDuration(selectedDuration) / 100).toFixed(2)}/week`
              )}
            </Button>
            
            <p className="text-xs text-yacht-gray text-center mt-3">
              Booking lasts for 1 week from today. Cancellation will incur penalty.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default SlotDetailsScreen;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useParking } from "@/contexts/ParkingContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const PaymentMethods = [
  { id: "card", name: "Credit/Debit Card", icon: "credit_card" },
  { id: "upi", name: "UPI", icon: "account_balance_wallet" },
  { id: "netbanking", name: "Net Banking", icon: "account_balance" },
];

const PaymentScreen = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentBooking, closePayment, showBookingConfirmation } = useParking();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    name: "",
  });
  
  // Get booking and location details
  const { data: locationData } = useQuery({
    queryKey: [`/api/parking/locations/${currentBooking?.locationId}`],
    queryFn: async () => {
      const res = await fetch(`/api/parking/locations/${currentBooking?.locationId}`);
      if (!res.ok) throw new Error('Failed to fetch location details');
      return res.json();
    },
    enabled: !!currentBooking,
  });
  
  // Process payment
  const paymentMutation = useMutation({
    mutationFn: async ({ bookingId, paymentMethod, cardDetails }: any) => {
      const res = await apiRequest("POST", "/api/payments", {
        bookingId,
        paymentMethod,
        cardDetails,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful",
        description: "Your booking has been confirmed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/history'] });
      showBookingConfirmation();
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment",
        variant: "destructive",
      });
    },
  });
  
  if (!currentBooking) return null;
  
  const handleBackClick = () => {
    closePayment();
  };
  
  const handlePayment = () => {
    if (paymentMethod === "card") {
      // Simple validation
      if (!cardDetails.cardNumber.trim() || !cardDetails.expiryDate.trim() || !cardDetails.cvv.trim() || !cardDetails.name.trim()) {
        toast({
          title: "Missing Information",
          description: "Please fill all card details",
          variant: "destructive",
        });
        return;
      }
    }
    
    paymentMutation.mutate({
      bookingId: currentBooking.id,
      paymentMethod,
      cardDetails: paymentMethod === "card" ? cardDetails : undefined,
    });
  };
  
  // Format dates for display
  const formatDate = (date: string) => {
    return format(new Date(date), "MMM d, yyyy");
  };
  
  const startDate = formatDate(currentBooking.startDate);
  const endDate = formatDate(currentBooking.endDate);
  
  // Get duration text
  const getDurationText = (duration: number) => {
    if (duration === 30) return "30 minutes (weekly)";
    if (duration === 60) return "1 hour (weekly)";
    if (duration === 120) return "2 hours (weekly)";
    return `${duration} minutes (weekly)`;
  };
  
  return (
    <div className="fixed inset-0 bg-yacht-white z-40">
      {/* Header */}
      <div className="bg-yacht-teal text-yacht-white p-4 flex items-center">
        <button className="mr-2" onClick={handleBackClick}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold">Payment</h1>
      </div>
      
      {/* Payment Summary */}
      <div className="p-4 overflow-auto h-[calc(100vh-56px)] pb-16">
        <Card className="mb-6 border-yacht-gray/20">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 text-yacht-teal">Booking Summary</h3>
            <div className="flex justify-between mb-2">
              <span className="text-yacht-gray">Location</span>
              <span className="font-medium text-yacht-teal">{locationData?.location?.name}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-yacht-gray">Duration</span>
              <span className="font-medium">{getDurationText(currentBooking.duration)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-yacht-gray">Booking Date</span>
              <span className="font-medium">{startDate} - {endDate}</span>
            </div>
            {currentBooking.vehicleType && (
              <div className="flex justify-between mb-2">
                <span className="text-yacht-gray">Vehicle Type</span>
                <span className="font-medium">
                  {currentBooking.vehicleType === 'two-wheeler' ? '2-Wheeler' : '4-Wheeler'}
                </span>
              </div>
            )}
            <div className="border-t border-yacht-gray/20 my-3"></div>
            <div className="flex justify-between font-medium">
              <span className="text-yacht-teal">Total Amount</span>
              <span className="text-yacht-brown">₹{(currentBooking.amount / 100).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Methods */}
        <h3 className="font-medium mb-3 text-yacht-teal">Select Payment Method</h3>
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3 mb-6">
          {PaymentMethods.map((method) => (
            <div 
              key={method.id} 
              className={`border rounded-lg p-3 flex items-center justify-between ${
                paymentMethod === method.id ? 'border-yacht-teal bg-yacht-teal/5' : 'border-yacht-gray/30'
              }`}
            >
              <div className="flex items-center">
                <span className={`material-icons mr-3 ${
                  paymentMethod === method.id ? 'text-yacht-teal' : 'text-yacht-gray'
                }`}>
                  {method.icon}
                </span>
                <span className={paymentMethod === method.id ? 'text-yacht-teal' : ''}>
                  {method.name}
                </span>
              </div>
              <RadioGroupItem value={method.id} id={method.id} className="border-yacht-teal" />
            </div>
          ))}
        </RadioGroup>
        
        {/* Card Details Form (only show if card payment selected) */}
        {paymentMethod === "card" && (
          <div className="mb-6">
            <div className="mb-4">
              <Label htmlFor="card-number" className="text-yacht-teal">Card Number</Label>
              <Input
                id="card-number"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.cardNumber}
                onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                className="border-yacht-gray/30 focus-visible:ring-yacht-teal"
              />
            </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="expiry-date" className="text-yacht-teal">Expiry Date</Label>
                <Input
                  id="expiry-date"
                  placeholder="MM/YY"
                  value={cardDetails.expiryDate}
                  onChange={(e) => setCardDetails({ ...cardDetails, expiryDate: e.target.value })}
                  className="border-yacht-gray/30 focus-visible:ring-yacht-teal"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="cvv" className="text-yacht-teal">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                  className="border-yacht-gray/30 focus-visible:ring-yacht-teal"
                />
              </div>
            </div>
            <div className="mb-4">
              <Label htmlFor="name" className="text-yacht-teal">Name on Card</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={cardDetails.name}
                onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                className="border-yacht-gray/30 focus-visible:ring-yacht-teal"
              />
            </div>
          </div>
        )}
        
        <Button 
          className="w-full bg-yacht-teal hover:bg-yacht-teal/90 text-yacht-white"
          onClick={handlePayment}
          disabled={paymentMutation.isPending}
        >
          {paymentMutation.isPending ? "Processing..." : `Pay ₹${(currentBooking.amount / 100).toFixed(2)}`}
        </Button>
        
        <div className="flex justify-center items-center mt-4">
          <span className="material-icons text-yacht-gray text-sm mr-2">lock</span>
          <span className="text-xs text-yacht-gray">Secure payment powered by Razorpay</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;

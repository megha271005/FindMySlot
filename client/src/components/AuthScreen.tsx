import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

const AuthScreen = () => {
  const { toast } = useToast();
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sendOtpMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await apiRequest("POST", "/api/auth/request-otp", { phoneNumber });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "OTP Sent",
        description: "We've sent an OTP to your phone number.",
      });
      setShowOtpInput(true);
      startTimer();
      
      // For demo purposes only, auto-fill the OTP
      if (data.otp) {
        const otpArray = data.otp.split("");
        setOtp(otpArray);
        setTimeout(() => {
          verifyOtpMutation.mutate({ phoneNumber, otp: data.otp });
        }, 1000);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    },
  });
  
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ phoneNumber, otp }: { phoneNumber: string; otp: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", { phoneNumber, otp });
      return res.json();
    },
    onSuccess: (data) => {
      login(data.user);
      toast({
        title: "Success",
        description: "You're now logged in",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    },
  });

  const startTimer = () => {
    setTimeLeft(30);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }
    sendOtpMutation.mutate(phoneNumber);
  };

  const handleVerifyOtp = () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit OTP sent to your phone",
        variant: "destructive",
      });
      return;
    }
    verifyOtpMutation.mutate({ phoneNumber, otp: otpString });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(0);
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Move to next input if this one is filled
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <div className="inline-block bg-primary rounded-full p-4 mb-4">
            <span className="material-icons text-white text-3xl">local_parking</span>
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Find My Slot</h1>
          <p className="text-muted-foreground">Find and book parking slots in real-time</p>
        </div>
        
        {/* Phone Authentication Form */}
        <Card className="mb-4">
          <CardContent className="p-6">
            {!showOtpInput ? (
              <div>
                <Label htmlFor="phone-number" className="block text-sm font-medium mb-2">
                  Phone Number
                </Label>
                <div className="flex mb-4">
                  <div className="bg-muted flex items-center px-3 rounded-l-lg border border-input">
                    <span>+91</span>
                  </div>
                  <Input
                    type="tel"
                    id="phone-number"
                    className="flex-1 rounded-l-none"
                    placeholder="Enter your phone number"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? "Sending..." : "Request OTP"}
                </Button>
              </div>
            ) : (
              <div className="mb-6">
                <Label htmlFor="otp" className="block text-sm font-medium mb-2">
                  Enter OTP
                </Label>
                <p className="text-sm text-muted-foreground mb-4">
                  OTP sent to +91 {phoneNumber}
                </p>
                
                <div className="flex gap-2 justify-between mb-4">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <Input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      className="w-12 h-12 text-center text-lg font-medium"
                      value={otp[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                    />
                  ))}
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm">
                    Resend OTP in {timeLeft}s
                  </span>
                  <Button
                    variant="link"
                    className="text-primary text-sm font-medium p-0"
                    disabled={timeLeft > 0}
                    onClick={() => {
                      if (timeLeft === 0) {
                        sendOtpMutation.mutate(phoneNumber);
                      }
                    }}
                  >
                    Resend OTP
                  </Button>
                </div>
                
                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={verifyOtpMutation.isPending}
                >
                  {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Continue"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our{" "}
          <a href="#" className="text-primary">Terms of Service</a> and{" "}
          <a href="#" className="text-primary">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;

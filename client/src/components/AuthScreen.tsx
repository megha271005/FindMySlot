import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AuthScreen = () => {
  const { toast } = useToast();
  const { login } = useAuth();
  
  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Register state
  const [registerEmail, setRegisterEmail] = useState("");
  const [username, setUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // For demo purposes - quick login to bypass backend changes
  const demoLoginMutation = useMutation({
    mutationFn: async (credentials: {email: string, password: string}) => {
      // Normally we would call the API, but for demo we'll simulate a response
      // This would be replaced with actual API call in production
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            user: {
              id: 1,
              email: credentials.email,
              name: credentials.email.split('@')[0],
              isAdmin: credentials.email.includes('admin')
            }
          });
        }, 800);
      });
    },
    onSuccess: (data: any) => {
      login(data.user);
      toast({
        title: "Success",
        description: "You're now logged in",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    },
  });
  
  // For demo purposes - register simulation
  const demoRegisterMutation = useMutation({
    mutationFn: async (user: {email: string, username: string, password: string}) => {
      // Simulate registration process
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            user: {
              id: Math.floor(Math.random() * 1000),
              email: user.email,
              name: user.username,
              isAdmin: false
            }
          });
        }, 1000);
      });
    },
    onSuccess: (data: any) => {
      login(data.user);
      toast({
        title: "Account Created",
        description: "Your account has been created and you're now logged in",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    
    demoLoginMutation.mutate({ email, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerEmail || !username || !registerPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    if (registerPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    demoRegisterMutation.mutate({
      email: registerEmail,
      username,
      password: registerPassword
    });
  };

  return (
    <div className="fixed inset-0 bg-yacht-white z-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-block bg-yacht-teal rounded-full p-4 mb-4 shadow-md">
            <span className="material-icons text-yacht-white text-3xl">local_parking</span>
          </div>
          <h1 className="text-2xl font-bold text-yacht-teal mb-1">Find My Slot</h1>
          <p className="text-yacht-gray">Find and book parking slots in real-time</p>
        </div>
        
        {/* Authentication Form */}
        <Card className="border-yacht-teal/20 shadow-sm">
          <CardContent className="p-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-transparent">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-yacht-teal data-[state=active]:text-yacht-white"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-yacht-teal data-[state=active]:text-yacht-white"
                >
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="p-6">
                <form onSubmit={handleLogin}>
                  <div className="mb-4">
                    <Label htmlFor="email" className="block text-sm font-medium mb-2 text-yacht-teal">
                      Email
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      className="w-full"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <Label htmlFor="password" className="block text-sm font-medium mb-2 text-yacht-teal">
                      Password
                    </Label>
                    <Input
                      type="password"
                      id="password"
                      className="w-full"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-yacht-teal hover:bg-yacht-teal/90 text-yacht-white"
                    disabled={demoLoginMutation.isPending}
                  >
                    {demoLoginMutation.isPending ? "Logging in..." : "Login"}
                  </Button>
                  
                  <div className="mt-4 text-center">
                    <Button
                      variant="link"
                      className="text-yacht-teal text-sm font-medium p-0"
                    >
                      Forgot password?
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="p-6">
                <form onSubmit={handleRegister}>
                  <div className="mb-4">
                    <Label htmlFor="register-email" className="block text-sm font-medium mb-2 text-yacht-teal">
                      Email
                    </Label>
                    <Input
                      type="email"
                      id="register-email"
                      className="w-full"
                      placeholder="Enter your email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="username" className="block text-sm font-medium mb-2 text-yacht-teal">
                      Username
                    </Label>
                    <Input
                      type="text"
                      id="username"
                      className="w-full"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="register-password" className="block text-sm font-medium mb-2 text-yacht-teal">
                      Password
                    </Label>
                    <Input
                      type="password"
                      id="register-password"
                      className="w-full"
                      placeholder="Create a password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <Label htmlFor="confirm-password" className="block text-sm font-medium mb-2 text-yacht-teal">
                      Confirm Password
                    </Label>
                    <Input
                      type="password"
                      id="confirm-password"
                      className="w-full"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-yacht-teal hover:bg-yacht-teal/90 text-yacht-white"
                    disabled={demoRegisterMutation.isPending}
                  >
                    {demoRegisterMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-yacht-gray mt-4">
          By continuing, you agree to our{" "}
          <a href="#" className="text-yacht-teal">Terms of Service</a> and{" "}
          <a href="#" className="text-yacht-teal">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;

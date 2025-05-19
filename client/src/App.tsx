import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { AuthProvider } from "@/contexts/AuthContext";
import { ParkingProvider } from "@/contexts/ParkingContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Load custom yacht club palette for parking app
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', '200 52% 30%'); // #245F73 (teal)
    document.documentElement.style.setProperty('--primary-foreground', '34 6% 95%'); // #F2F0EF (off-white)
    document.documentElement.style.setProperty('--secondary', '19 54% 30%'); // #733E24 (brown)
    document.documentElement.style.setProperty('--secondary-foreground', '34 6% 95%'); // #F2F0EF (off-white)
    document.documentElement.style.setProperty('--background', '34 6% 95%'); // #F2F0EF (off-white)
    document.documentElement.style.setProperty('--muted', '220 2% 74%'); // #BBBDBC (light-gray)
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ParkingProvider>
            <Toaster />
            <Router />
          </ParkingProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

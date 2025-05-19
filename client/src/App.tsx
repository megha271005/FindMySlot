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
  // Load custom styles for parking app
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', '207 90% 54%');
    document.documentElement.style.setProperty('--primary-foreground', '211 100% 99%');
    document.documentElement.style.setProperty('--secondary', '25 100% 62%');
    document.documentElement.style.setProperty('--secondary-foreground', '0 0% 100%');
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

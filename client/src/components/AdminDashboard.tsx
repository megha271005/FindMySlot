import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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

const AdminStatCard = ({ title, value, color = "text-primary" }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
};

const LocationCard = ({ location, onEdit, onDelete, onViewDetails }) => {
  const { id, name, pricePerHour } = location;
  
  // Fetch slots for this location
  const { data } = useQuery({
    queryKey: [`/api/parking/locations/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/parking/locations/${id}`);
      if (!res.ok) throw new Error('Failed to fetch location details');
      return res.json();
    },
  });
  
  const availableSlots = data?.availableSlots || 0;
  const totalSlots = data?.totalSlots || 0;
  
  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-medium">{name}</h3>
        <div className="flex">
          <Button variant="ghost" size="icon" className="text-primary" onClick={() => onEdit(location)}>
            <span className="material-icons">edit</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(id)}>
            <span className="material-icons">delete</span>
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-muted-foreground">Total Slots</span>
          <span className="text-sm font-medium">{totalSlots}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-muted-foreground">Available</span>
          <span className="text-sm font-medium text-green-500">{availableSlots}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-sm text-muted-foreground">Price</span>
          <span className="text-sm font-medium">₹{(pricePerHour / 100).toFixed(2)}/hour</span>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full text-primary border-primary"
          onClick={() => onViewDetails(id)}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

const BookingRow = ({ booking }) => {
  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium">{booking.userName || "User"}</h3>
          <p className="text-sm text-muted-foreground">{booking.locationName}</p>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full ${
          booking.status === 'active' ? 'bg-primary-light text-white' :
          booking.status === 'completed' ? 'bg-muted text-muted-foreground' :
          'bg-destructive text-destructive-foreground'
        }`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Booking ID: #{booking.id}</span>
        <span className="font-medium">₹{(booking.amount / 100).toFixed(2)}</span>
      </div>
    </Card>
  );
};

interface LocationFormData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerHour: number;
  imageUrl: string;
  facilities: string[];
}

const AdminDashboard = ({ onExit }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<number | null>(null);
  const [locationFormData, setLocationFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    pricePerHour: 0,
    imageUrl: '',
    facilities: ['24/7 Security', 'CCTV Coverage']
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLocationId, setEditLocationId] = useState<number | null>(null);
  
  // Fetch admin dashboard data
  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('Failed to fetch admin dashboard data');
      return res.json();
    },
  });
  
  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (locationData: LocationFormData) => {
      // Convert price to cents
      const formattedData = {
        ...locationData,
        pricePerHour: Math.round(parseFloat(locationData.pricePerHour.toString()) * 100),
      };
      
      const res = await apiRequest("POST", "/api/admin/locations", formattedData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Created",
        description: "The parking location has been created successfully",
      });
      setIsAddLocationOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive",
      });
    },
  });
  
  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: LocationFormData }) => {
      // Convert price to cents
      const formattedData = {
        ...data,
        pricePerHour: Math.round(parseFloat(data.pricePerHour.toString()) * 100),
      };
      
      const res = await apiRequest("PUT", `/api/admin/locations/${id}`, formattedData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Updated",
        description: "The parking location has been updated successfully",
      });
      setIsAddLocationOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    },
  });
  
  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/locations/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Deleted",
        description: "The parking location has been deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      });
    },
  });
  
  const handleAddLocation = () => {
    setLocationFormData({
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      pricePerHour: 0,
      imageUrl: '',
      facilities: ['24/7 Security', 'CCTV Coverage']
    });
    setIsEditMode(false);
    setIsAddLocationOpen(true);
  };
  
  const handleEditLocation = (location) => {
    setLocationFormData({
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      pricePerHour: location.pricePerHour / 100, // Convert cents to rupees for display
      imageUrl: location.imageUrl || '',
      facilities: location.facilities || ['24/7 Security', 'CCTV Coverage']
    });
    setEditLocationId(location.id);
    setIsEditMode(true);
    setIsAddLocationOpen(true);
  };
  
  const handleDeleteLocation = (id: number) => {
    setLocationToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  const handleViewLocationDetails = (id: number) => {
    toast({
      title: "Coming Soon",
      description: "Location details view will be available in a future update",
    });
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (
      !locationFormData.name || 
      !locationFormData.address || 
      !locationFormData.latitude || 
      !locationFormData.longitude || 
      !locationFormData.pricePerHour
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditMode && editLocationId) {
      updateLocationMutation.mutate({ id: editLocationId, data: locationFormData });
    } else {
      createLocationMutation.mutate(locationFormData);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocationFormData((prev) => ({
      ...prev,
      [name]: name === 'latitude' || name === 'longitude' || name === 'pricePerHour' 
        ? parseFloat(value) || 0 
        : value,
    }));
  };
  
  const handleFacilityToggle = (facility: string) => {
    setLocationFormData((prev) => {
      const updatedFacilities = prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility];
      
      return {
        ...prev,
        facilities: updatedFacilities,
      };
    });
  };
  
  // Format count with comma for thousands
  const formatCount = (count: number) => {
    return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };
  
  return (
    <div className="fixed inset-0 bg-white z-50 pt-4 pb-16 overflow-y-auto">
      {/* Header */}
      <div className="px-4 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Button variant="ghost" className="text-primary" onClick={onExit}>Exit Admin</Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="px-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <AdminStatCard 
                title="Total Slots" 
                value={formatCount(data?.stats?.totalSlots || 0)} 
              />
              <AdminStatCard 
                title="Available Now" 
                value={formatCount(data?.stats?.availableSlots || 0)} 
                color="text-green-500"
              />
              <AdminStatCard 
                title="Active Bookings" 
                value={formatCount(data?.stats?.activeBookings || 0)} 
              />
              <AdminStatCard 
                title="Today's Revenue" 
                value={formatCurrency(data?.stats?.todayRevenue || 0)} 
              />
            </div>
          </div>
          
          {/* Manage Slots Section */}
          <div className="px-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Manage Parking Locations</h2>
              <Button 
                size="sm" 
                className="flex items-center gap-1"
                onClick={handleAddLocation}
              >
                <span className="material-icons text-sm">add</span>
                <span>Add New</span>
              </Button>
            </div>
            
            <div className="space-y-4">
              {data?.locations?.map((location) => (
                <LocationCard 
                  key={location.id} 
                  location={location} 
                  onEdit={handleEditLocation}
                  onDelete={handleDeleteLocation}
                  onViewDetails={handleViewLocationDetails}
                />
              ))}
            </div>
          </div>
          
          {/* Recent Bookings Section */}
          <div className="px-4">
            <h2 className="text-lg font-semibold mb-4">Recent Bookings</h2>
            
            <div className="space-y-3">
              {data?.recentBookings?.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
              
              {(!data?.recentBookings || data.recentBookings.length === 0) && (
                <div className="text-center py-6 bg-muted rounded-xl">
                  <p className="text-muted-foreground">No bookings yet</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Add/Edit Location Dialog */}
      <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Parking Location" : "Add New Parking Location"}</DialogTitle>
            <DialogDescription>
              Enter the details of the parking location.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Location Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={locationFormData.name} 
                  onChange={handleInputChange} 
                  placeholder="e.g. City Center Parking"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  name="address" 
                  value={locationFormData.address} 
                  onChange={handleInputChange}
                  placeholder="e.g. 123 Main St, Downtown"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input 
                    id="latitude" 
                    name="latitude" 
                    type="number" 
                    step="0.000001"
                    value={locationFormData.latitude || ''} 
                    onChange={handleInputChange}
                    placeholder="e.g. 12.9716"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input 
                    id="longitude" 
                    name="longitude" 
                    type="number" 
                    step="0.000001"
                    value={locationFormData.longitude || ''} 
                    onChange={handleInputChange}
                    placeholder="e.g. 77.5946"
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="pricePerHour">Price per Hour (₹)</Label>
                <Input 
                  id="pricePerHour" 
                  name="pricePerHour" 
                  type="number" 
                  step="0.01"
                  value={locationFormData.pricePerHour || ''} 
                  onChange={handleInputChange}
                  placeholder="e.g. 40"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input 
                  id="imageUrl" 
                  name="imageUrl" 
                  value={locationFormData.imageUrl} 
                  onChange={handleInputChange}
                  placeholder="e.g. https://example.com/image.jpg"
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Facilities</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {['24/7 Security', 'Well Lit', 'CCTV Coverage', 'EV Charging'].map((facility) => (
                    <div key={facility} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id={`facility-${facility}`}
                        checked={locationFormData.facilities.includes(facility)}
                        onChange={() => handleFacilityToggle(facility)}
                        className="h-4 w-4 text-primary rounded border-input"
                      />
                      <label htmlFor={`facility-${facility}`} className="text-sm">
                        {facility}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddLocationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLocationMutation.isPending || updateLocationMutation.isPending}>
                {createLocationMutation.isPending || updateLocationMutation.isPending
                  ? "Saving..."
                  : isEditMode ? "Update Location" : "Add Location"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this location?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All slots and bookings associated with this location will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => locationToDelete && deleteLocationMutation.mutate(locationToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLocationMutation.isPending ? "Deleting..." : "Delete Location"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;

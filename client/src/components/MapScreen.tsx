import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParking } from "@/contexts/ParkingContext";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentPosition } from "@/lib/mapUtils";

interface SlotCardProps {
  id: number;
  name: string;
  distance: number;
  isAvailable: boolean;
  availableSlots: number;
  totalSlots: number;
  pricePerHour: number;
  imageUrl: string;
  vehicleType: 'two-wheeler' | 'four-wheeler';
  onClick: () => void;
}

const SlotCard = ({
  id,
  name,
  distance,
  isAvailable,
  availableSlots,
  totalSlots,
  pricePerHour,
  imageUrl,
  vehicleType,
  onClick,
}: SlotCardProps) => {
  return (
    <Card 
      className="bg-yacht-white rounded-xl border-yacht-teal/20 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" 
      onClick={onClick}
    >
      <div className="flex">
        <div 
          className="w-24 h-24 bg-yacht-gray" 
          style={{ 
            backgroundImage: `url('${imageUrl}')`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center' 
          }}
        ></div>
        <div className="p-3 flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-yacht-teal">{name}</h3>
              <p className="text-sm text-yacht-gray">{distance} km away</p>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-1 ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                {isAvailable ? 'Available' : 'Full'}
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-sm font-medium text-yacht-brown">₹{pricePerHour / 100}/hour</span>
            <span className="text-xs bg-yacht-teal/10 text-yacht-teal px-2 py-1 rounded">
              {vehicleType === 'two-wheeler' ? '2-Wheeler' : '4-Wheeler'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const MapScreen = () => {
  const { toast } = useToast();
  const { setSelectedLocation } = useParking();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [bottomSheetHeight, setBottomSheetHeight] = useState("calc(100% - 130px)");
  const [activeVehicleType, setActiveVehicleType] = useState<'two-wheeler' | 'four-wheeler'>('four-wheeler');
  const mapRef = useRef<HTMLDivElement>(null);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const startTouchYRef = useRef<number>(0);
  const currentTransformRef = useRef<number>(0);
  
  // Get user location
  useEffect(() => {
    getCurrentPosition()
      .then(position => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      })
      .catch(error => {
        toast({
          title: "Location Error",
          description: "Unable to get your location. Please enable location services.",
          variant: "destructive"
        });
        // Set a default location (Bangalore)
        setUserLocation({ lat: 12.9716, lng: 77.5946 });
      });
  }, [toast]);
  
  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    
    const newMap = new google.maps.Map(mapRef.current, {
      center: userLocation,
      zoom: 15,
      disableDefaultUI: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#245F73" }]
        },
        {
          featureType: "landscape",
          elementType: "geometry",
          stylers: [{ color: "#F2F0EF" }]
        }
      ]
    });
    
    setMap(newMap);
    
    // Add user marker
    new google.maps.Marker({
      position: userLocation,
      map: newMap,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#245F73", // Yacht club teal
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#F2F0EF" // Yacht club off-white
      }
    });
    
    // Add map controls
    const locationButton = document.createElement("button");
    locationButton.innerHTML = "<span class='material-icons'>my_location</span>";
    locationButton.className = 
      "w-10 h-10 bg-yacht-white rounded-full shadow-lg flex items-center justify-center text-yacht-teal";
    locationButton.addEventListener("click", () => {
      if (userLocation) {
        newMap.panTo(userLocation);
        newMap.setZoom(15);
      }
    });
    
    const zoomInButton = document.createElement("button");
    zoomInButton.innerHTML = "<span class='material-icons'>add</span>";
    zoomInButton.className = 
      "w-10 h-10 bg-yacht-white rounded-full shadow-lg flex items-center justify-center text-yacht-teal mt-2";
    zoomInButton.addEventListener("click", () => {
      newMap.setZoom(newMap.getZoom()! + 1);
    });
    
    const zoomOutButton = document.createElement("button");
    zoomOutButton.innerHTML = "<span class='material-icons'>remove</span>";
    zoomOutButton.className = 
      "w-10 h-10 bg-yacht-white rounded-full shadow-lg flex items-center justify-center text-yacht-teal mt-2";
    zoomOutButton.addEventListener("click", () => {
      newMap.setZoom(newMap.getZoom()! - 1);
    });
    
    const controlDiv = document.createElement("div");
    controlDiv.className = "absolute top-4 right-4 flex flex-col";
    controlDiv.appendChild(locationButton);
    controlDiv.appendChild(zoomInButton);
    controlDiv.appendChild(zoomOutButton);
    
    mapRef.current.appendChild(controlDiv);
    
    return () => {
      if (mapRef.current && controlDiv.parentNode === mapRef.current) {
        mapRef.current.removeChild(controlDiv);
      }
    };
  }, [userLocation, toast]);
  
  // Fetch nearby parking locations
  const { data: locationsData, isLoading } = useQuery({
    queryKey: ['/api/parking/nearby', userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      if (!userLocation) return { locations: [] };
      const res = await fetch(`/api/parking/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=5`);
      if (!res.ok) throw new Error('Failed to fetch nearby parking locations');
      return res.json();
    },
    enabled: !!userLocation,
  });
  
  // Add location markers to map
  useEffect(() => {
    if (!map || !locationsData?.locations) return;
    
    // Clear existing markers
    map.data.forEach((feature) => {
      map.data.remove(feature);
    });
    
    // Add markers for each location
    locationsData.locations.forEach((location) => {
      const marker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <rect x="5" y="5" width="30" height="30" rx="4" fill="#F2F0EF" stroke="#BBBDBC" stroke-width="1"/>
              <circle cx="20" cy="20" r="6" fill="${location.availableSlots > 0 ? '#245F73' : '#733E24'}"/>
            </svg>
          `)}`,
          anchor: new google.maps.Point(20, 20),
        },
      });
      
      marker.addListener('click', () => {
        handleLocationSelect({...location, vehicleType: activeVehicleType});
      });
    });
  }, [map, locationsData, activeVehicleType]);
  
  // Bottom sheet drag functionality
  useEffect(() => {
    if (!bottomSheetRef.current) return;
    
    const bottomSheet = bottomSheetRef.current;
    
    const handleTouchStart = (e: TouchEvent) => {
      startTouchYRef.current = e.touches[0].clientY;
      const transform = getTransformValue(bottomSheet);
      currentTransformRef.current = transform;
      
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      const diff = touchY - startTouchYRef.current;
      
      if (
        (currentTransformRef.current === 0 && diff > 0) || 
        (currentTransformRef.current < 0 && diff < 0)
      ) {
        const newTranslateY = currentTransformRef.current + diff;
        if (newTranslateY <= 0 && newTranslateY >= -window.innerHeight * 0.8) {
          bottomSheet.style.transform = `translateY(${newTranslateY}px)`;
        }
      }
    };
    
    const handleTouchEnd = () => {
      const finalTransform = getTransformValue(bottomSheet);
      
      if (finalTransform > -window.innerHeight * 0.4) {
        // Snap to minimized
        bottomSheet.style.transform = 'translateY(0)';
        setBottomSheetHeight("calc(100% - 130px)");
      } else {
        // Snap to expanded
        bottomSheet.style.transform = `translateY(${-window.innerHeight * 0.7}px)`;
        setBottomSheetHeight("calc(100% - 30%)");
      }
      
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    bottomSheet.addEventListener('touchstart', handleTouchStart);
    
    return () => {
      bottomSheet.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
  
  const getTransformValue = (element: HTMLElement) => {
    const style = window.getComputedStyle(element);
    const matrix = new WebKitCSSMatrix(style.transform);
    return matrix.m42; // translateY value
  };
  
  const handleLocationSelect = (location) => {
    setSelectedLocation({...location, vehicleType: activeVehicleType});
  };
  
  // Filter locations by vehicle type
  const filteredLocations = locationsData?.locations?.map(location => ({
    ...location,
    vehicleType: activeVehicleType,
    // For demo: Adjust price for two-wheelers to be cheaper
    pricePerHour: activeVehicleType === 'two-wheeler' ? location.pricePerHour * 0.6 : location.pricePerHour
  }));
  
  return (
    <div className="relative" id="map-screen">
      {/* Map Container */}
      <div className="relative h-[calc(100vh-56px)]" ref={mapRef}>
        {/* Search Bar */}
        <div className="absolute top-4 left-4 right-16 shadow-lg z-10">
          <div className="bg-yacht-white rounded-full px-4 py-3 flex items-center">
            <span className="material-icons text-yacht-gray mr-2">search</span>
            <input
              type="text"
              placeholder="Search for parking areas"
              className="w-full bg-transparent outline-none text-yacht-teal"
            />
          </div>
        </div>
      </div>
      
      {/* Bottom Sheet */}
      <div
        ref={bottomSheetRef}
        className="absolute left-0 right-0 bottom-0 bg-yacht-white rounded-t-3xl shadow-lg transform transition-transform duration-300 ease-out z-20"
        style={{ transform: "translateY(0)", height: bottomSheetHeight }}
      >
        <div className="p-4 flex justify-center">
          <div className="w-10 h-1 bg-yacht-gray rounded-full"></div>
        </div>
        
        {/* Vehicle Type Selector */}
        <div className="px-4 mb-4">
          <Tabs 
            defaultValue="four-wheeler" 
            onValueChange={(value) => setActiveVehicleType(value as 'two-wheeler' | 'four-wheeler')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-yacht-gray/20">
              <TabsTrigger 
                value="four-wheeler" 
                className="data-[state=active]:bg-yacht-teal data-[state=active]:text-yacht-white"
              >
                <span className="material-icons mr-2">directions_car</span>
                4-Wheeler
              </TabsTrigger>
              <TabsTrigger 
                value="two-wheeler"
                className="data-[state=active]:bg-yacht-teal data-[state=active]:text-yacht-white"
              >
                <span className="material-icons mr-2">two_wheeler</span>
                2-Wheeler
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="four-wheeler">
              <h2 className="text-lg font-semibold mb-4 text-yacht-teal">Nearby Car Parking</h2>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yacht-teal"></div>
                </div>
              ) : filteredLocations?.length ? (
                <div className="space-y-4 pb-20">
                  {filteredLocations.map((location) => (
                    <SlotCard
                      key={`car-${location.id}`}
                      id={location.id}
                      name={location.name}
                      distance={location.distance}
                      isAvailable={location.availableSlots > 0}
                      availableSlots={location.availableSlots}
                      totalSlots={location.totalSlots}
                      pricePerHour={location.pricePerHour}
                      imageUrl={location.imageUrl || 'https://images.unsplash.com/photo-1593784991095-a205069470b6'}
                      vehicleType="four-wheeler"
                      onClick={() => handleLocationSelect(location)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-yacht-gray">
                  No car parking slots found nearby. Try another location.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="two-wheeler">
              <h2 className="text-lg font-semibold mb-4 text-yacht-teal">Nearby Bike Parking</h2>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yacht-teal"></div>
                </div>
              ) : filteredLocations?.length ? (
                <div className="space-y-4 pb-20">
                  {filteredLocations.map((location) => (
                    <SlotCard
                      key={`bike-${location.id}`}
                      id={location.id}
                      name={location.name}
                      distance={location.distance}
                      isAvailable={location.availableSlots > 0}
                      availableSlots={Math.floor(location.availableSlots * 1.5)} // More slots for bikes
                      totalSlots={Math.floor(location.totalSlots * 1.5)}
                      pricePerHour={location.pricePerHour}
                      imageUrl={location.imageUrl || 'https://images.unsplash.com/photo-1593784991095-a205069470b6'}
                      vehicleType="two-wheeler"
                      onClick={() => handleLocationSelect(location)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-yacht-gray">
                  No bike parking slots found nearby. Try another location.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MapScreen;

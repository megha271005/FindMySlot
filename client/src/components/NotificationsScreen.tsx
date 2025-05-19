import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";

const NotificationItem = ({ notification }) => {
  const queryClient = useQueryClient();
  const { id, title, message, type, isRead, createdAt } = notification;
  
  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      if (isRead) return; // Skip if already read
      const res = await apiRequest("POST", `/api/notifications/${id}/read`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
  
  // Handle notification click
  const handleClick = () => {
    if (!isRead) {
      markAsReadMutation.mutate(id);
    }
  };
  
  // Get icon and color based on notification type
  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'booking':
        return { icon: 'check_circle', color: 'bg-green-500' };
      case 'payment':
        return { icon: 'payment', color: 'bg-secondary' };
      case 'slot':
        return { icon: 'notifications', color: 'bg-primary-light' };
      default:
        return { icon: 'info', color: 'bg-muted' };
    }
  };
  
  const { icon, color } = getIconAndColor(type);
  
  // Format relative time
  const getRelativeTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    
    // If less than 24 hours, show relative time
    if (now.getTime() - notificationDate.getTime() < 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(notificationDate, { addSuffix: true });
    }
    
    // Otherwise show formatted date
    return format(notificationDate, "MMM d, h:mm a");
  };
  
  return (
    <Card 
      className={`p-4 transition-colors ${!isRead ? 'border-l-4 border-l-primary' : ''}`}
      onClick={handleClick}
    >
      <div className="flex">
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white mr-3`}>
          <span className="material-icons">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-medium mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{message}</p>
          <p className="text-xs text-muted-foreground">{getRelativeTime(createdAt)}</p>
        </div>
      </div>
    </Card>
  );
};

const NotificationsScreen = () => {
  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
  });
  
  return (
    <div className="fixed inset-0 bg-white z-30 pt-4 pb-16 overflow-y-auto">
      {/* Header */}
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>
      
      {/* Notifications List */}
      <div className="px-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data?.notifications?.length > 0 ? (
          <div className="space-y-3">
            {data.notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <span className="material-icons text-6xl text-muted-foreground mb-4">notifications_none</span>
            <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
            <p className="text-muted-foreground">
              You'll see notifications about slot availability, bookings, and payments here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen;

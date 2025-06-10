/**
 * Notification service for admin alerts
 */

interface NotificationData {
  type: 'new_order' | 'order_update' | 'vendor_signup';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Send notification to admin when new order is placed
  async sendNewOrderNotification(orderData: {
    orderNumber: string;
    customerName: string;
    vendorName: string;
    total: number;
  }) {
    const notification: NotificationData = {
      type: 'new_order',
      title: '🛒 New Order Placed!',
      message: `Order #${orderData.orderNumber} from ${orderData.customerName} at ${orderData.vendorName} - $${orderData.total.toFixed(2)}`,
      timestamp: new Date().toISOString(),
      data: orderData
    };

    this.addNotification(notification);

    // Browser notification if admin is logged in
    if (this.isAdminLoggedIn() && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'new-order',
          requireInteraction: true
        });
      } else if (Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
    }

    // Play notification sound
    this.playNotificationSound();
  }

  // Send order status update notification
  async sendOrderUpdateNotification(orderData: {
    orderNumber: string;
    status: string;
    customerName: string;
  }) {
    const notification: NotificationData = {
      type: 'order_update',
      title: '📋 Order Status Updated',
      message: `Order #${orderData.orderNumber} for ${orderData.customerName} is now ${orderData.status}`,
      timestamp: new Date().toISOString(),
      data: orderData
    };

    this.addNotification(notification);
  }

  // Check if admin is logged in (check for admin session)
  private isAdminLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('admin_logged_in') === 'true';
  }

  // Set admin login status
  setAdminLoginStatus(isLoggedIn: boolean) {
    if (typeof window !== 'undefined') {
      if (isLoggedIn) {
        sessionStorage.setItem('admin_logged_in', 'true');
        this.requestNotificationPermission();
      } else {
        sessionStorage.removeItem('admin_logged_in');
      }
    }
  }

  // Request notification permission
  private async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('🔔 Admin notifications enabled');
      }
    }
  }

  // Play notification sound
  private playNotificationSound() {
    if (typeof window !== 'undefined' && this.isAdminLoggedIn()) {
      try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.log('Could not play notification sound:', error);
      }
    }
  }

  // Add notification to queue
  private addNotification(notification: NotificationData) {
    this.notifications.unshift(notification);
    // Keep only last 50 notifications
    this.notifications = this.notifications.slice(0, 50);
    this.notifyListeners();
  }

  // Subscribe to notifications
  subscribe(callback: (notifications: NotificationData[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Get all notifications
  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  // Get unread notifications count
  getUnreadCount(): number {
    // For now, all notifications are considered "new" until admin checks them
    return this.notifications.filter(n => n.type === 'new_order').length;
  }

  // Clear all notifications
  clearNotifications() {
    this.notifications = [];
    this.notifyListeners();
  }

  // Mark notifications as read
  markAsRead() {
    // In a real app, you'd persist this state
    this.notifyListeners();
  }
}

export const notificationService = NotificationService.getInstance(); 
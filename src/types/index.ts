export type UserRole = 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export type TableStatus = 'available' | 'reserved' | 'occupied' | 'cleaning';
export type TableSection = 'Main Dining' | 'Patio Garden' | 'Rooftop Lounge' | 'VIP Room';

export interface RestaurantTable {
  id: string;
  number: string;
  capacity: number;
  section: TableSection;
  status: TableStatus;
  currentOrderId?: string;
  assignedWaiter?: string;
  updatedAt: string;
}

export type BookingStatus = 'confirmed' | 'seated' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  tableId: string;
  tableNumber: string;
  guestCount: number;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // HH:mm
  durationMinutes: number; // e.g., 90
  specialRequests?: string;
  status: BookingStatus;
  createdAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  displayOrder: number;
}

export type DietaryType = 'veg' | 'non-veg' | 'vegan';

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  price: number;
  description: string;
  imageUrl: string;
  dietary: DietaryType;
  prepTimeMinutes: number;
  isAvailable: boolean;
  calories?: number;
  spicyLevel?: number; // 0, 1, 2, 3
  createdAt: string;
}

export type OrderType = 'dine-in' | 'takeaway' | 'delivery';
export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  dietary?: DietaryType;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  tableId?: string;
  tableNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  waiterId?: string;
  waiterName?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number; // e.g. 5%
  discountAmount: number;
  serviceCharge: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'upi' | 'wallet';

export interface Bill {
  id: string;
  billNumber: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  discountReason?: string;
  serviceCharge: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  paidAt?: string;
  cashierName?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  totalVisits: number;
  totalSpend: number;
  loyaltyPoints: number;
  isVIP: boolean;
  notes?: string;
  createdAt: string;
  lastVisitAt?: string;
}

export type NotificationType = 'booking' | 'order' | 'kitchen' | 'payment' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface DashboardStats {
  todayRevenue: number;
  revenueChangePercent: number;
  todayOrdersCount: number;
  activeOrdersCount: number;
  todayBookingsCount: number;
  totalCustomers: number;
  tableOccupancyRate: number;
  popularItems: {
    id: string;
    name: string;
    category: string;
    salesCount: number;
    revenue: number;
    imageUrl: string;
  }[];
  recentOrders: Order[];
  revenueTimeline: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  categorySales: {
    category: string;
    count: number;
    amount: number;
  }[];
}

import {
  User,
  RestaurantTable,
  Booking,
  MenuCategory,
  MenuItem,
  Order,
  Bill,
  Customer,
  Notification,
  AuditLog,
  DashboardStats,
  UserRole,
  OrderStatus,
  TableStatus,
  BookingStatus,
  PaymentMethod
} from '../types/index.ts';

const TOKEN_KEY = 'restoflow_jwt_token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Server error (${res.status})`;
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    me: () => request<User>('/auth/me'),
    demoSwitch: (role: UserRole) =>
      request<{ token: string; user: User }>('/auth/demo-switch', {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
  },

  // Dashboard & Analytics
  dashboard: {
    getStats: () => request<DashboardStats>('/dashboard/stats'),
    getReports: (period: 'daily' | 'weekly' | 'monthly' = 'daily') =>
      request<any>(`/reports?period=${period}`),
  },

  // Tables
  tables: {
    getAll: () => request<RestaurantTable[]>('/tables'),
    create: (data: { number: string; capacity: number; section: string }) =>
      request<RestaurantTable>('/tables', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<RestaurantTable>) =>
      request<RestaurantTable>(`/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: TableStatus, assignedWaiter?: string, currentOrderId?: string) =>
      request<RestaurantTable>(`/tables/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, assignedWaiter, currentOrderId }),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/tables/${id}`, { method: 'DELETE' }),
  },

  // Bookings
  bookings: {
    getAll: (params?: { date?: string; status?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.date) query.set('date', params.date);
      if (params?.status) query.set('status', params.status);
      if (params?.search) query.set('search', params.search);
      return request<Booking[]>(`/bookings?${query.toString()}`);
    },
    create: (data: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'status' | 'tableNumber'>) =>
      request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: BookingStatus) =>
      request<Booking>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id: string) =>
      request<{ message: string }>(`/bookings/${id}`, { method: 'DELETE' }),
  },

  // Menu
  menu: {
    getCategories: () => request<MenuCategory[]>('/menu/categories'),
    createCategory: (name: string, icon?: string) =>
      request<MenuCategory>('/menu/categories', { method: 'POST', body: JSON.stringify({ name, icon }) }),
    getItems: (params?: { categoryId?: string; search?: string; dietary?: string; availableOnly?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.categoryId) query.set('categoryId', params.categoryId);
      if (params?.search) query.set('search', params.search);
      if (params?.dietary) query.set('dietary', params.dietary);
      if (params?.availableOnly) query.set('availableOnly', 'true');
      return request<MenuItem[]>(`/menu/items?${query.toString()}`);
    },
    createItem: (data: Partial<MenuItem>) =>
      request<MenuItem>('/menu/items', { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (id: string, data: Partial<MenuItem>) =>
      request<MenuItem>(`/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleAvailability: (id: string, isAvailable: boolean) =>
      request<MenuItem>(`/menu/items/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      }),
    deleteItem: (id: string) =>
      request<{ message: string }>(`/menu/items/${id}`, { method: 'DELETE' }),
  },

  // Orders
  orders: {
    getAll: (params?: { status?: string; orderType?: string; tableId?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.orderType) query.set('orderType', params.orderType);
      if (params?.tableId) query.set('tableId', params.tableId);
      if (params?.search) query.set('search', params.search);
      return request<Order[]>(`/orders?${query.toString()}`);
    },
    getById: (id: string) => request<Order>(`/orders/${id}`),
    create: (data: any) =>
      request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: OrderStatus) =>
      request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },

  // Kitchen Display
  kitchen: {
    getOrders: () => request<Order[]>('/kitchen/orders'),
  },

  // Billing
  billing: {
    getAll: () => request<Bill[]>('/bills'),
    generate: (orderId: string, discountAmount?: number, discountReason?: string) =>
      request<Bill>('/bills/generate', {
        method: 'POST',
        body: JSON.stringify({ orderId, discountAmount, discountReason }),
      }),
    pay: (id: string, paymentMethod: PaymentMethod, tipAmount?: number) =>
      request<Bill>(`/bills/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod, tipAmount }),
      }),
  },

  // Customers
  customers: {
    getAll: (search?: string) =>
      request<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    getById: (id: string) => request<Customer & { orderHistory: Order[]; bookingHistory: Booking[] }>(`/customers/${id}`),
    create: (data: Partial<Customer>) =>
      request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Customer>) =>
      request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ message: string }>(`/customers/${id}`, { method: 'DELETE' }),
  },

  // Users
  users: {
    getAll: () => request<User[]>('/users'),
    create: (data: any) =>
      request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleStatus: (id: string) =>
      request<{ id: string; isActive: boolean }>(`/users/${id}/toggle-status`, { method: 'PATCH' }),
    delete: (id: string) =>
      request<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
  },

  // Notifications
  notifications: {
    getAll: () => request<Notification[]>('/notifications'),
    markRead: (id: string) =>
      request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      request<{ success: boolean }>('/notifications/mark-all-read', { method: 'POST' }),
  },

  // Audit Logs
  auditLogs: {
    getAll: (params?: { module?: string; action?: string }) => {
      const query = new URLSearchParams();
      if (params?.module) query.set('module', params.module);
      if (params?.action) query.set('action', params.action);
      return request<AuditLog[]>(`/audit-logs?${query.toString()}`);
    },
  },
};

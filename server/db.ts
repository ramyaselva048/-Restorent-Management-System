import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  AuditLog
} from '../src/types/index.ts';
import { initTiDBDatabase, syncToTiDB, getTiDBStatus } from './mysql.ts';

export interface DatabaseSchema {
  users: (User & { passwordHash: string; salt: string })[];
  tables: RestaurantTable[];
  bookings: Booking[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  bills: Bill[];
  customers: Customer[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'resto_data.json');

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function getInitialData(): DatabaseSchema {
  const adminSalt = generateSalt();
  const managerSalt = generateSalt();
  const cashierSalt = generateSalt();
  const waiterSalt = generateSalt();
  const kitchenSalt = generateSalt();

  const now = new Date().toISOString();
  const todayDate = new Date().toISOString().split('T')[0];

  return {
    users: [
      {
        id: 'u-1',
        name: 'Alexander Wright',
        email: 'admin@restoflow.com',
        role: 'admin',
        phone: '+1 (555) 234-5678',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        isActive: true,
        createdAt: '2026-01-10T08:00:00.000Z',
        salt: adminSalt,
        passwordHash: hashPassword('admin123', adminSalt),
      },
      {
        id: 'u-2',
        name: 'Elena Rostova',
        email: 'manager@restoflow.com',
        role: 'manager',
        phone: '+1 (555) 876-5432',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
        isActive: true,
        createdAt: '2026-01-12T09:00:00.000Z',
        salt: managerSalt,
        passwordHash: hashPassword('manager123', managerSalt),
      },
      {
        id: 'u-3',
        name: 'Marcus Vance',
        email: 'cashier@restoflow.com',
        role: 'cashier',
        phone: '+1 (555) 345-6789',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
        isActive: true,
        createdAt: '2026-02-01T10:00:00.000Z',
        salt: cashierSalt,
        passwordHash: hashPassword('cashier123', cashierSalt),
      },
      {
        id: 'u-4',
        name: 'Sofia Morales',
        email: 'waiter@restoflow.com',
        role: 'waiter',
        phone: '+1 (555) 456-7890',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
        isActive: true,
        createdAt: '2026-02-15T11:00:00.000Z',
        salt: waiterSalt,
        passwordHash: hashPassword('waiter123', waiterSalt),
      },
      {
        id: 'u-5',
        name: 'Chef Marco Bellini',
        email: 'chef@restoflow.com',
        role: 'kitchen',
        phone: '+1 (555) 567-8901',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=250&q=80',
        isActive: true,
        createdAt: '2026-02-20T12:00:00.000Z',
        salt: kitchenSalt,
        passwordHash: hashPassword('kitchen123', kitchenSalt),
      },
    ],
    tables: [
      { id: 't-1', number: 'T-01', capacity: 2, section: 'Main Dining', status: 'occupied', currentOrderId: 'ord-101', assignedWaiter: 'Sofia Morales', updatedAt: now },
      { id: 't-2', number: 'T-02', capacity: 4, section: 'Main Dining', status: 'available', updatedAt: now },
      { id: 't-3', number: 'T-03', capacity: 4, section: 'Main Dining', status: 'reserved', updatedAt: now },
      { id: 't-4', number: 'T-04', capacity: 6, section: 'Main Dining', status: 'occupied', currentOrderId: 'ord-102', assignedWaiter: 'Sofia Morales', updatedAt: now },
      { id: 't-5', number: 'T-05', capacity: 2, section: 'Patio Garden', status: 'available', updatedAt: now },
      { id: 't-6', number: 'T-06', capacity: 4, section: 'Patio Garden', status: 'cleaning', updatedAt: now },
      { id: 't-7', number: 'T-07', capacity: 6, section: 'Patio Garden', status: 'available', updatedAt: now },
      { id: 't-8', number: 'T-08', capacity: 4, section: 'Rooftop Lounge', status: 'available', updatedAt: now },
      { id: 't-9', number: 'T-09', capacity: 8, section: 'Rooftop Lounge', status: 'reserved', updatedAt: now },
      { id: 't-10', number: 'VIP-01', capacity: 10, section: 'VIP Room', status: 'available', updatedAt: now },
    ],
    categories: [
      { id: 'cat-1', name: 'Starters & Appetizers', icon: 'Soup', displayOrder: 1 },
      { id: 'cat-2', name: 'Chef Signature Mains', icon: 'Utensils', displayOrder: 2 },
      { id: 'cat-3', name: 'Wood-Fired Pizza & Pasta', icon: 'Pizza', displayOrder: 3 },
      { id: 'cat-4', name: 'Artisan Desserts', icon: 'Cake', displayOrder: 4 },
      { id: 'cat-5', name: 'Signature Beverages', icon: 'Wine', displayOrder: 5 },
    ],
    menuItems: [
      {
        id: 'item-1',
        name: 'Truffle Burrata Bruschetta',
        categoryId: 'cat-1',
        categoryName: 'Starters & Appetizers',
        price: 16.5,
        description: 'Fresh Puglia burrata, blistered heirloom tomatoes, aged balsamic glaze, and summer truffle infusion on grilled sourdough.',
        imageUrl: 'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80',
        dietary: 'veg',
        prepTimeMinutes: 12,
        isAvailable: true,
        calories: 420,
        spicyLevel: 0,
        createdAt: now,
      },
      {
        id: 'item-2',
        name: 'Crispy Calamari Fritti',
        categoryId: 'cat-1',
        categoryName: 'Starters & Appetizers',
        price: 18.0,
        description: 'Tender Monterey squid lightly dusted with semolina, smoked paprika aioli, grilled lemon cheek.',
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
        dietary: 'non-veg',
        prepTimeMinutes: 15,
        isAvailable: true,
        calories: 520,
        spicyLevel: 1,
        createdAt: now,
      },
      {
        id: 'item-3',
        name: 'Prime Wagyu Ribeye Steak (300g)',
        categoryId: 'cat-2',
        categoryName: 'Chef Signature Mains',
        price: 52.0,
        description: 'MBS 7+ Australian Wagyu, roasted bone marrow jus, truffle pomme purée, charred broccolini.',
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
        dietary: 'non-veg',
        prepTimeMinutes: 22,
        isAvailable: true,
        calories: 890,
        spicyLevel: 0,
        createdAt: now,
      },
      {
        id: 'item-4',
        name: 'Pan-Seared Chilean Sea Bass',
        categoryId: 'cat-2',
        categoryName: 'Chef Signature Mains',
        price: 44.0,
        description: 'Wild caught sea bass, saffron dashi broth, edamame purée, glazed baby bok choy and lotus crisp.',
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
        dietary: 'non-veg',
        prepTimeMinutes: 20,
        isAvailable: true,
        calories: 640,
        spicyLevel: 0,
        createdAt: now,
      },
      {
        id: 'item-5',
        name: 'Wild Forest Mushroom Risotto',
        categoryId: 'cat-2',
        categoryName: 'Chef Signature Mains',
        price: 28.0,
        description: 'Carnaroli rice, morel and porcini mushrooms, 24-month Parmigiano Reggiano, white truffle emulsion.',
        imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80',
        dietary: 'veg',
        prepTimeMinutes: 18,
        isAvailable: true,
        calories: 580,
        spicyLevel: 0,
        createdAt: now,
      },
      {
        id: 'item-6',
        name: 'Diavola Wood-Fired Pizza',
        categoryId: 'cat-3',
        categoryName: 'Wood-Fired Pizza & Pasta',
        price: 24.0,
        description: 'San Marzano tomatoes, fior di latte mozzarella, spicy Calabrian spianata salami, hot honey drizzle.',
        imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80',
        dietary: 'non-veg',
        prepTimeMinutes: 14,
        isAvailable: true,
        calories: 810,
        spicyLevel: 2,
        createdAt: now,
      },
      {
        id: 'item-7',
        name: 'Tagliolini al Tartufo',
        categoryId: 'cat-3',
        categoryName: 'Wood-Fired Pizza & Pasta',
        price: 29.0,
        description: 'House-made egg ribbon pasta, butter-poached Normandy cream, fresh black truffle shavings.',
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281711?auto=format&fit=crop&w=600&q=80',
        dietary: 'veg',
        prepTimeMinutes: 16,
        isAvailable: true,
        calories: 720,
        spicyLevel: 0,
        createdAt: now,
      },
      {
        id: 'item-8',
        name: 'Classic Venetian Tiramisù',
        categoryId: 'cat-4',
        categoryName: 'Artisan Desserts',
        price: 13.5,
        description: 'Espresso-soaked Savoiardi ladyfingers, velvety mascarpone cream, Valrhona dark cocoa dust.',
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
        dietary: 'veg',
        prepTimeMinutes: 8,
        isAvailable: true,
        calories: 460,
        spicyLevel: 0,
        createdAt: now,
      },
      {
        id: 'item-9',
        name: 'Madagascar Vanilla Bean Panna Cotta',
        categoryId: 'cat-4',
        categoryName: 'Artisan Desserts',
        price: 12.0,
        description: 'Silky cream infused with real Madagascar vanilla bean pods, passionfruit coulis, pistachio crumble.',
        imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
        dietary: 'veg',
        prepTimeMinutes: 6,
        isAvailable: true,
        calories: 390,
        spicyLevel: 0,
        createdAt: now,
      },
      {
        id: 'item-10',
        name: 'Smoked Rosemary Old Fashioned',
        categoryId: 'cat-5',
        categoryName: 'Signature Beverages',
        price: 15.0,
        description: 'Small-batch Kentucky bourbon, Angostura bitters, burnt orange peel, torch-smoked rosemary sprig.',
        imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80',
        dietary: 'vegan',
        prepTimeMinutes: 5,
        isAvailable: true,
        calories: 190,
        spicyLevel: 0,
        createdAt: now,
      },
      {
        id: 'item-11',
        name: 'Yuzu Botanical Mocktail',
        categoryId: 'cat-5',
        categoryName: 'Signature Beverages',
        price: 10.5,
        description: 'Japanese yuzu extract, wild basil, cucumber ribbons, elderflower tonic, crushed Himalayan ice.',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
        dietary: 'vegan',
        prepTimeMinutes: 5,
        isAvailable: true,
        calories: 95,
        spicyLevel: 0,
        createdAt: now,
      },
    ],
    customers: [
      {
        id: 'c-1',
        name: 'Victoria Sterling',
        phone: '+1 (555) 789-0123',
        email: 'victoria.sterling@example.com',
        address: '450 Lexington Ave, New York, NY',
        totalVisits: 14,
        totalSpend: 1840.5,
        loyaltyPoints: 360,
        isVIP: true,
        notes: 'Prefers Table T-04 or Rooftop. Allergic to peanuts.',
        createdAt: '2026-01-05T14:30:00.000Z',
        lastVisitAt: now,
      },
      {
        id: 'c-2',
        name: 'Jonathan Hayes',
        phone: '+1 (555) 890-1234',
        email: 'j.hayes@example.com',
        address: '128 Willow Creek Rd, Suite 4B',
        totalVisits: 6,
        totalSpend: 620.0,
        loyaltyPoints: 120,
        isVIP: false,
        notes: 'Enjoys steak rare and pairing with full-bodied reds.',
        createdAt: '2026-02-14T18:00:00.000Z',
        lastVisitAt: '2026-03-25T19:30:00.000Z',
      },
      {
        id: 'c-3',
        name: 'Aisha Al-Mansoor',
        phone: '+1 (555) 901-2345',
        email: 'aisha.m@example.com',
        address: '88 Grand Promenade',
        totalVisits: 9,
        totalSpend: 1250.0,
        loyaltyPoints: 250,
        isVIP: true,
        notes: 'Strictly Halal / Vegetarian preferences. High tipper.',
        createdAt: '2026-01-20T12:00:00.000Z',
        lastVisitAt: '2026-03-28T20:15:00.000Z',
      },
    ],
    bookings: [
      {
        id: 'bk-1',
        bookingCode: 'BK-7801',
        customerName: 'Victoria Sterling',
        customerPhone: '+1 (555) 789-0123',
        customerEmail: 'victoria.sterling@example.com',
        tableId: 't-3',
        tableNumber: 'T-03',
        guestCount: 4,
        bookingDate: todayDate,
        bookingTime: '19:30',
        durationMinutes: 90,
        specialRequests: 'Anniversary celebration. Complimentary champagne glass requested.',
        status: 'confirmed',
        createdAt: now,
      },
      {
        id: 'bk-2',
        bookingCode: 'BK-7802',
        customerName: 'Harrison Davis',
        customerPhone: '+1 (555) 654-3210',
        customerEmail: 'hdavis@corpgroup.com',
        tableId: 't-9',
        tableNumber: 'T-09',
        guestCount: 8,
        bookingDate: todayDate,
        bookingTime: '20:00',
        durationMinutes: 120,
        specialRequests: 'Executive client business dinner. Need quiet corner.',
        status: 'confirmed',
        createdAt: now,
      },
    ],
    orders: [
      {
        id: 'ord-101',
        orderNumber: 'ORD-1001',
        orderType: 'dine-in',
        tableId: 't-1',
        tableNumber: 'T-01',
        customerId: 'c-1',
        customerName: 'Victoria Sterling',
        customerPhone: '+1 (555) 789-0123',
        waiterId: 'u-4',
        waiterName: 'Sofia Morales',
        items: [
          { id: 'oi-1', menuItemId: 'item-1', name: 'Truffle Burrata Bruschetta', price: 16.5, quantity: 1, dietary: 'veg' },
          { id: 'oi-2', menuItemId: 'item-3', name: 'Prime Wagyu Ribeye Steak (300g)', price: 52.0, quantity: 1, notes: 'Medium-rare, extra truffle jus', dietary: 'non-veg' },
          { id: 'oi-3', menuItemId: 'item-10', name: 'Smoked Rosemary Old Fashioned', price: 15.0, quantity: 1 },
        ],
        subtotal: 83.5,
        taxAmount: 4.18, // 5%
        discountAmount: 0,
        serviceCharge: 8.35, // 10%
        totalAmount: 96.03,
        status: 'preparing',
        paymentStatus: 'unpaid',
        notes: 'VIP guest table. Please expedite steak cooking.',
        createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'ord-102',
        orderNumber: 'ORD-1002',
        orderType: 'dine-in',
        tableId: 't-4',
        tableNumber: 'T-04',
        customerId: 'c-2',
        customerName: 'Jonathan Hayes',
        customerPhone: '+1 (555) 890-1234',
        waiterId: 'u-4',
        waiterName: 'Sofia Morales',
        items: [
          { id: 'oi-4', menuItemId: 'item-2', name: 'Crispy Calamari Fritti', price: 18.0, quantity: 2, dietary: 'non-veg' },
          { id: 'oi-5', menuItemId: 'item-6', name: 'Diavola Wood-Fired Pizza', price: 24.0, quantity: 1, dietary: 'non-veg' },
          { id: 'oi-6', menuItemId: 'item-7', name: 'Tagliolini al Tartufo', price: 29.0, quantity: 1, dietary: 'veg' },
          { id: 'oi-7', menuItemId: 'item-11', name: 'Yuzu Botanical Mocktail', price: 10.5, quantity: 2 },
        ],
        subtotal: 110.0,
        taxAmount: 5.5,
        discountAmount: 10.0,
        serviceCharge: 11.0,
        totalAmount: 116.5,
        status: 'new',
        paymentStatus: 'unpaid',
        notes: 'Separate sauces for calamari.',
        createdAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
        updatedAt: now,
      },
    ],
    bills: [
      {
        id: 'bill-99',
        billNumber: 'INV-2026-0099',
        orderId: 'ord-99',
        orderNumber: 'ORD-0999',
        tableNumber: 'T-02',
        customerName: 'Aisha Al-Mansoor',
        customerPhone: '+1 (555) 901-2345',
        items: [
          { id: 'oi-91', menuItemId: 'item-5', name: 'Wild Forest Mushroom Risotto', price: 28.0, quantity: 2, dietary: 'veg' },
          { id: 'oi-92', menuItemId: 'item-8', name: 'Classic Venetian Tiramisù', price: 13.5, quantity: 2, dietary: 'veg' },
        ],
        subtotal: 83.0,
        taxAmount: 4.15,
        discountAmount: 5.0,
        discountReason: 'Loyalty Reward Member',
        serviceCharge: 8.3,
        totalAmount: 90.45,
        paymentMethod: 'credit_card',
        paymentStatus: 'paid',
        paidAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        cashierName: 'Marcus Vance',
        createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        type: 'booking',
        title: 'New Table Booking',
        message: 'Victoria Sterling confirmed booking for Table T-03 at 19:30 (4 guests).',
        isRead: false,
        relatedId: 'bk-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-2',
        type: 'order',
        title: 'New Order Received',
        message: 'Order ORD-1002 placed for Table T-04 ($116.50).',
        isRead: false,
        relatedId: 'ord-102',
        createdAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-3',
        type: 'payment',
        title: 'Payment Completed',
        message: 'Invoice INV-2026-0099 settled ($90.45 via Credit Card).',
        isRead: true,
        relatedId: 'bill-99',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    ],
    auditLogs: [
      {
        id: 'log-1',
        userId: 'u-1',
        userName: 'Alexander Wright',
        userRole: 'admin',
        action: 'SYSTEM_INITIALIZATION',
        module: 'System',
        details: 'Restaurant database initialized with initial seed configuration.',
        ipAddress: '127.0.0.1',
        timestamp: '2026-01-10T08:00:00.000Z',
      },
      {
        id: 'log-2',
        userId: 'u-4',
        userName: 'Sofia Morales',
        userRole: 'waiter',
        action: 'CREATE_ORDER',
        module: 'Orders',
        details: 'Created order ORD-1001 for Table T-01 (3 items, total $96.03).',
        ipAddress: '192.168.1.104',
        timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      },
      {
        id: 'log-3',
        userId: 'u-3',
        userName: 'Marcus Vance',
        userRole: 'cashier',
        action: 'PROCESS_PAYMENT',
        module: 'Billing',
        details: 'Processed payment for INV-2026-0099 ($90.45 via Credit Card).',
        ipAddress: '192.168.1.102',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    ],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
    // Initialize TiDB Cloud MySQL asynchronously
    initTiDBDatabase().then(() => {
      syncToTiDB(this.data);
    }).catch(err => {
      console.error('TiDB startup sync error:', err.message);
    });
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all collections exist
        const initial = getInitialData();
        return {
          users: parsed.users || initial.users,
          tables: parsed.tables || initial.tables,
          bookings: parsed.bookings || initial.bookings,
          categories: parsed.categories || initial.categories,
          menuItems: parsed.menuItems || initial.menuItems,
          orders: parsed.orders || initial.orders,
          bills: parsed.bills || initial.bills,
          customers: parsed.customers || initial.customers,
          notifications: parsed.notifications || initial.notifications,
          auditLogs: parsed.auditLogs || initial.auditLogs,
        };
      }
    } catch (err) {
      console.error('Error reading db file, regenerating fresh state:', err);
    }

    const fresh = getInitialData();
    this.saveDataDirect(fresh);
    return fresh;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save data to disk:', err);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
    // Asynchronously synchronize changes to TiDB Cloud
    syncToTiDB(this.data).catch(err => {
      console.error('TiDB sync error on save:', err.message);
    });
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  // Audit Log helper
  public logAudit(userId: string, userName: string, userRole: any, action: string, module: string, details: string, ip?: string) {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId,
      userName,
      userRole,
      action,
      module,
      details,
      ipAddress: ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.save();
    return log;
  }

  // Notification helper
  public pushNotification(type: any, title: string, message: string, relatedId?: string) {
    const notif: Notification = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      type,
      title,
      message,
      isRead: false,
      relatedId,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    if (this.data.notifications.length > 100) {
      this.data.notifications.pop();
    }
    this.save();
    return notif;
  }
}

export const db = new Database();

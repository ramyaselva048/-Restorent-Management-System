import { Router, Response } from 'express';
import { db, hashPassword, generateSalt } from './db.ts';
import { getTiDBStatus } from './mysql.ts';
import {
  authenticateToken,
  requireRole,
  generateToken,
  AuthRequest
} from './auth.ts';
import {
  UserRole,
  OrderStatus,
  TableStatus,
  BookingStatus,
  PaymentMethod,
  Order,
  Bill,
  Customer,
  Booking,
  MenuItem,
  RestaurantTable,
  User
} from '../src/types/index.ts';

const router = Router();

// Database Status Endpoint
router.get('/database/status', (req, res) => {
  res.json(getTiDBStatus());
});

// ==========================================
// 1. AUTHENTICATION & SESSIONS
// ==========================================

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const database = db.getData();
  const user = database.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: 'Account has been deactivated. Please contact an admin.' });
  }

  const computedHash = hashPassword(password, user.salt);
  if (computedHash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);

  db.logAudit(user.id, user.name, user.role, 'USER_LOGIN', 'Authentication', `User logged in successfully from IP ${req.ip}`);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
});

router.get('/auth/me', authenticateToken, (req: AuthRequest, res) => {
  const database = db.getData();
  const user = database.users.find(u => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
});

// Demo switch route to effortlessly test as any role
router.post('/auth/demo-switch', (req, res) => {
  const { role } = req.body as { role: UserRole };
  const database = db.getData();
  const targetUser = database.users.find(u => u.role === role && u.isActive) || database.users[0];

  const token = generateToken(targetUser);

  db.logAudit(targetUser.id, targetUser.name, targetUser.role, 'ROLE_SWITCH', 'Authentication', `Switched demo role to ${role}`);

  res.json({
    token,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      phone: targetUser.phone,
      avatar: targetUser.avatar,
      isActive: targetUser.isActive,
      createdAt: targetUser.createdAt,
    },
  });
});

// ==========================================
// 2. DASHBOARD & ANALYTICS
// ==========================================

router.get('/dashboard/stats', authenticateToken, (req: AuthRequest, res) => {
  const data = db.getData();
  const today = new Date().toISOString().split('T')[0];

  // Calculate today revenue from completed/paid bills
  const todayPaidBills = data.bills.filter(b => b.paymentStatus === 'paid' && b.paidAt?.startsWith(today));
  const todayRevenue = todayPaidBills.reduce((sum, b) => sum + b.totalAmount, 0);

  // Total orders today
  const todayOrders = data.orders.filter(o => o.createdAt.startsWith(today));
  const activeOrders = data.orders.filter(o => ['new', 'preparing', 'ready', 'served'].includes(o.status));

  // Today bookings
  const todayBookings = data.bookings.filter(b => b.bookingDate === today && b.status !== 'cancelled');

  // Table occupancy
  const occupiedTables = data.tables.filter(t => t.status === 'occupied').length;
  const occupancyRate = data.tables.length > 0 ? Math.round((occupiedTables / data.tables.length) * 100) : 0;

  // Popular items calculation
  const itemCounts: Record<string, { count: number; revenue: number }> = {};
  data.orders.forEach(order => {
    order.items.forEach(item => {
      if (!itemCounts[item.menuItemId]) {
        itemCounts[item.menuItemId] = { count: 0, revenue: 0 };
      }
      itemCounts[item.menuItemId].count += item.quantity;
      itemCounts[item.menuItemId].revenue += item.price * item.quantity;
    });
  });

  const popularItems = Object.keys(itemCounts)
    .map(itemId => {
      const menuItem = data.menuItems.find(m => m.id === itemId);
      return {
        id: itemId,
        name: menuItem?.name || 'Special Item',
        category: menuItem?.categoryName || 'Dishes',
        salesCount: itemCounts[itemId].count,
        revenue: Math.round(itemCounts[itemId].revenue * 100) / 100,
        imageUrl: menuItem?.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
      };
    })
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);

  // Revenue timeline past 7 days
  const timeline: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayBills = data.bills.filter(b => b.paymentStatus === 'paid' && b.paidAt?.startsWith(dateStr));
    const dayOrders = data.orders.filter(o => o.createdAt.startsWith(dateStr));
    timeline.push({
      date: dateStr,
      revenue: Math.round(dayBills.reduce((acc, b) => acc + b.totalAmount, 0) * 100) / 100 || (i === 0 ? todayRevenue : Math.floor(Math.random() * 400 + 350)),
      orders: dayOrders.length || (i === 0 ? todayOrders.length : Math.floor(Math.random() * 6 + 4)),
    });
  }

  // Category sales breakdown
  const categorySalesMap: Record<string, { count: number; amount: number }> = {};
  data.orders.forEach(order => {
    order.items.forEach(item => {
      const menuItem = data.menuItems.find(m => m.id === item.menuItemId);
      const catName = menuItem?.categoryName || 'Other';
      if (!categorySalesMap[catName]) {
        categorySalesMap[catName] = { count: 0, amount: 0 };
      }
      categorySalesMap[catName].count += item.quantity;
      categorySalesMap[catName].amount += item.price * item.quantity;
    });
  });

  const categorySales = Object.entries(categorySalesMap).map(([category, stats]) => ({
    category,
    count: stats.count,
    amount: Math.round(stats.amount * 100) / 100,
  }));

  res.json({
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    revenueChangePercent: 14.8,
    todayOrdersCount: todayOrders.length,
    activeOrdersCount: activeOrders.length,
    todayBookingsCount: todayBookings.length,
    totalCustomers: data.customers.length,
    tableOccupancyRate: occupancyRate,
    popularItems,
    recentOrders: data.orders.slice(0, 5),
    revenueTimeline: timeline,
    categorySales,
  });
});

router.get('/reports', authenticateToken, (req: AuthRequest, res) => {
  const { period = 'daily' } = req.query;
  const data = db.getData();

  const totalRevenue = data.bills.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.totalAmount, 0);
  const totalTax = data.bills.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.taxAmount, 0);
  const totalDiscounts = data.bills.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.discountAmount, 0);
  const avgOrderValue = data.orders.length > 0 ? totalRevenue / data.orders.length : 0;

  // Payment breakdown
  const paymentBreakdown: Record<string, number> = {
    credit_card: 0,
    cash: 0,
    upi: 0,
    debit_card: 0,
  };
  data.bills.forEach(b => {
    if (b.paymentStatus === 'paid' && b.paymentMethod) {
      paymentBreakdown[b.paymentMethod] = (paymentBreakdown[b.paymentMethod] || 0) + b.totalAmount;
    }
  });

  // Peak dining hours
  const hourlyOrders: Record<string, number> = {
    '11:00': 4,
    '12:00': 14,
    '13:00': 22,
    '14:00': 12,
    '17:00': 8,
    '18:00': 18,
    '19:00': 28,
    '20:00': 34,
    '21:00': 21,
    '22:00': 9,
  };

  res.json({
    period,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders: data.orders.length,
    totalBookings: data.bookings.length,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    paymentBreakdown,
    hourlyOrders,
  });
});

// ==========================================
// 3. TABLE MANAGEMENT
// ==========================================

router.get('/tables', authenticateToken, (req, res) => {
  res.json(db.getData().tables);
});

router.post('/tables', authenticateToken, requireRole(['admin', 'manager']), (req: AuthRequest, res) => {
  const { number, capacity, section } = req.body;
  if (!number || !capacity || !section) {
    return res.status(400).json({ error: 'Table number, capacity, and section are required' });
  }

  const data = db.getData();
  if (data.tables.some(t => t.number.toLowerCase() === number.trim().toLowerCase())) {
    return res.status(400).json({ error: `Table number '${number}' already exists` });
  }

  const newTable: RestaurantTable = {
    id: 't-' + Date.now(),
    number: number.trim(),
    capacity: Number(capacity),
    section,
    status: 'available',
    updatedAt: new Date().toISOString(),
  };

  data.tables.push(newTable);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_TABLE', 'Tables', `Added table ${newTable.number} in ${newTable.section} (Cap: ${newTable.capacity})`);

  res.status(201).json(newTable);
});

router.put('/tables/:id', authenticateToken, requireRole(['admin', 'manager']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { number, capacity, section, status } = req.body;

  const data = db.getData();
  const table = data.tables.find(t => t.id === id);
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }

  if (number) table.number = number.trim();
  if (capacity) table.capacity = Number(capacity);
  if (section) table.section = section;
  if (status) table.status = status;
  table.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_TABLE', 'Tables', `Updated table ${table.number}`);

  res.json(table);
});

router.patch('/tables/:id/status', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status, assignedWaiter, currentOrderId } = req.body as { status: TableStatus; assignedWaiter?: string; currentOrderId?: string };

  const data = db.getData();
  const table = data.tables.find(t => t.id === id);
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }

  table.status = status;
  if (assignedWaiter !== undefined) table.assignedWaiter = assignedWaiter;
  if (currentOrderId !== undefined) table.currentOrderId = currentOrderId;
  if (status === 'available') {
    table.currentOrderId = undefined;
    table.assignedWaiter = undefined;
  }
  table.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'TABLE_STATUS_CHANGE', 'Tables', `Changed ${table.number} status to ${status.toUpperCase()}`);

  res.json(table);
});

router.delete('/tables/:id', authenticateToken, requireRole(['admin']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.tables.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const tableNum = data.tables[index].number;
  data.tables.splice(index, 1);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_TABLE', 'Tables', `Deleted table ${tableNum}`);
  res.json({ message: `Table ${tableNum} deleted successfully` });
});

// ==========================================
// 4. TABLE BOOKING (With Double-Booking Prevention)
// ==========================================

router.get('/bookings', authenticateToken, (req, res) => {
  const { date, status, search } = req.query;
  let bookings = [...db.getData().bookings];

  if (date) {
    bookings = bookings.filter(b => b.bookingDate === date);
  }
  if (status) {
    bookings = bookings.filter(b => b.status === status);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    bookings = bookings.filter(b =>
      b.customerName.toLowerCase().includes(q) ||
      b.customerPhone.includes(q) ||
      b.bookingCode.toLowerCase().includes(q) ||
      b.tableNumber.toLowerCase().includes(q)
    );
  }

  // Sort by date and time
  bookings.sort((a, b) => `${b.bookingDate} ${b.bookingTime}`.localeCompare(`${a.bookingDate} ${a.bookingTime}`));
  res.json(bookings);
});

router.post('/bookings', authenticateToken, (req: AuthRequest, res) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    tableId,
    guestCount,
    bookingDate,
    bookingTime,
    durationMinutes = 90,
    specialRequests,
  } = req.body;

  if (!customerName || !customerPhone || !tableId || !guestCount || !bookingDate || !bookingTime) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  const data = db.getData();
  const table = data.tables.find(t => t.id === tableId);
  if (!table) {
    return res.status(404).json({ error: 'Selected table not found' });
  }

  if (guestCount > table.capacity) {
    return res.status(400).json({
      error: `Table ${table.number} maximum capacity is ${table.capacity} guests (requested: ${guestCount})`
    });
  }

  // DOUBLE-BOOKING PREVENTION LOGIC:
  // Convert time to minutes from midnight
  const [reqHour, reqMin] = bookingTime.split(':').map(Number);
  const reqStartMinutes = reqHour * 60 + reqMin;
  const reqEndMinutes = reqStartMinutes + Number(durationMinutes);

  const conflictingBooking = data.bookings.find(b => {
    if (b.tableId !== tableId || b.bookingDate !== bookingDate || b.status === 'cancelled') {
      return false;
    }
    const [bHour, bMin] = b.bookingTime.split(':').map(Number);
    const bStartMinutes = bHour * 60 + bMin;
    const bEndMinutes = bStartMinutes + (b.durationMinutes || 90);

    // Check overlap: startA < endB && endA > startB
    return reqStartMinutes < bEndMinutes && reqEndMinutes > bStartMinutes;
  });

  if (conflictingBooking) {
    return res.status(409).json({
      error: `Double-booking conflict! Table ${table.number} is already reserved by ${conflictingBooking.customerName} on ${bookingDate} from ${conflictingBooking.bookingTime} (${conflictingBooking.durationMinutes} min). Please choose another time or table.`
    });
  }

  // Create booking
  const newBooking: Booking = {
    id: 'bk-' + Date.now(),
    bookingCode: 'BK-' + Math.floor(1000 + Math.random() * 9000),
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    customerEmail: customerEmail?.trim(),
    tableId,
    tableNumber: table.number,
    guestCount: Number(guestCount),
    bookingDate,
    bookingTime,
    durationMinutes: Number(durationMinutes),
    specialRequests,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  data.bookings.unshift(newBooking);

  // Auto create or update customer record
  let customer = data.customers.find(c => c.phone === newBooking.customerPhone);
  if (!customer) {
    customer = {
      id: 'c-' + Date.now(),
      name: newBooking.customerName,
      phone: newBooking.customerPhone,
      email: newBooking.customerEmail || '',
      totalVisits: 1,
      totalSpend: 0,
      loyaltyPoints: 10,
      isVIP: false,
      notes: specialRequests ? `Booking Note: ${specialRequests}` : '',
      createdAt: new Date().toISOString(),
      lastVisitAt: new Date().toISOString(),
    };
    data.customers.push(customer);
  } else {
    customer.totalVisits += 1;
    customer.lastVisitAt = new Date().toISOString();
  }

  db.save();

  db.pushNotification('booking', 'New Table Booking', `Booking ${newBooking.bookingCode} for ${newBooking.customerName} on Table ${table.number} at ${newBooking.bookingTime}`, newBooking.id);
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_BOOKING', 'Bookings', `Created reservation ${newBooking.bookingCode} for ${newBooking.customerName} (Table: ${table.number})`);

  res.status(201).json(newBooking);
});

router.patch('/bookings/:id/status', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: BookingStatus };

  const data = db.getData();
  const booking = data.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.status = status;

  // If seated, update table status to occupied
  if (status === 'seated') {
    const table = data.tables.find(t => t.id === booking.tableId);
    if (table) {
      table.status = 'occupied';
      table.updatedAt = new Date().toISOString();
    }
  }

  db.save();
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_BOOKING_STATUS', 'Bookings', `Changed booking ${booking.bookingCode} status to ${status.toUpperCase()}`);

  res.json(booking);
});

router.delete('/bookings/:id', authenticateToken, requireRole(['admin', 'manager']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.bookings.findIndex(b => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const code = data.bookings[index].bookingCode;
  data.bookings.splice(index, 1);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_BOOKING', 'Bookings', `Deleted booking ${code}`);
  res.json({ message: 'Booking removed successfully' });
});

// ==========================================
// 5. MENU MANAGEMENT
// ==========================================

router.get('/menu/categories', authenticateToken, (req, res) => {
  res.json(db.getData().categories);
});

router.post('/menu/categories', authenticateToken, requireRole(['admin', 'manager']), (req: AuthRequest, res) => {
  const { name, icon } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  const data = db.getData();
  const newCat = {
    id: 'cat-' + Date.now(),
    name: name.trim(),
    icon: icon || 'Utensils',
    displayOrder: data.categories.length + 1,
  };
  data.categories.push(newCat);
  db.save();
  res.status(201).json(newCat);
});

router.get('/menu/items', authenticateToken, (req, res) => {
  const { categoryId, search, dietary, availableOnly } = req.query;
  let items = [...db.getData().menuItems];

  if (categoryId) {
    items = items.filter(i => i.categoryId === categoryId);
  }
  if (dietary) {
    items = items.filter(i => i.dietary === dietary);
  }
  if (availableOnly === 'true') {
    items = items.filter(i => i.isAvailable);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.categoryName?.toLowerCase().includes(q)
    );
  }

  res.json(items);
});

router.post('/menu/items', authenticateToken, requireRole(['admin', 'manager']), (req: AuthRequest, res) => {
  const {
    name,
    categoryId,
    price,
    description,
    imageUrl,
    dietary = 'veg',
    prepTimeMinutes = 15,
    calories,
    spicyLevel = 0,
  } = req.body;

  if (!name || !categoryId || price === undefined) {
    return res.status(400).json({ error: 'Name, category, and price are required' });
  }

  const data = db.getData();
  const category = data.categories.find(c => c.id === categoryId);

  const newItem: MenuItem = {
    id: 'item-' + Date.now(),
    name: name.trim(),
    categoryId,
    categoryName: category?.name || 'Main',
    price: Number(price),
    description: description || '',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    dietary,
    prepTimeMinutes: Number(prepTimeMinutes),
    isAvailable: true,
    calories: calories ? Number(calories) : undefined,
    spicyLevel: Number(spicyLevel),
    createdAt: new Date().toISOString(),
  };

  data.menuItems.push(newItem);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_MENU_ITEM', 'Menu', `Added new dish "${newItem.name}" at $${newItem.price}`);
  res.status(201).json(newItem);
});

router.put('/menu/items/:id', authenticateToken, requireRole(['admin', 'manager']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = db.getData();
  const item = data.menuItems.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  const {
    name,
    categoryId,
    price,
    description,
    imageUrl,
    dietary,
    prepTimeMinutes,
    isAvailable,
    calories,
    spicyLevel,
  } = req.body;

  if (name !== undefined) item.name = name.trim();
  if (categoryId !== undefined) {
    item.categoryId = categoryId;
    const cat = data.categories.find(c => c.id === categoryId);
    if (cat) item.categoryName = cat.name;
  }
  if (price !== undefined) item.price = Number(price);
  if (description !== undefined) item.description = description;
  if (imageUrl !== undefined) item.imageUrl = imageUrl;
  if (dietary !== undefined) item.dietary = dietary;
  if (prepTimeMinutes !== undefined) item.prepTimeMinutes = Number(prepTimeMinutes);
  if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
  if (calories !== undefined) item.calories = Number(calories);
  if (spicyLevel !== undefined) item.spicyLevel = Number(spicyLevel);

  db.save();
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_MENU_ITEM', 'Menu', `Updated menu item "${item.name}"`);

  res.json(item);
});

router.patch('/menu/items/:id/availability', authenticateToken, requireRole(['admin', 'manager', 'kitchen']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { isAvailable } = req.body;

  const data = db.getData();
  const item = data.menuItems.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  item.isAvailable = Boolean(isAvailable);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'TOGGLE_ITEM_AVAILABILITY', 'Menu', `Set "${item.name}" availability to ${item.isAvailable ? 'IN STOCK' : '86 OUT OF STOCK'}`);
  res.json(item);
});

router.delete('/menu/items/:id', authenticateToken, requireRole(['admin', 'manager']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.menuItems.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  const itemName = data.menuItems[index].name;
  data.menuItems.splice(index, 1);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_MENU_ITEM', 'Menu', `Removed menu item "${itemName}"`);
  res.json({ message: 'Menu item deleted successfully' });
});

// ==========================================
// 6. ORDER PROCESSING
// ==========================================

router.get('/orders', authenticateToken, (req, res) => {
  const { status, orderType, tableId, search } = req.query;
  let orders = [...db.getData().orders];

  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  if (orderType) {
    orders = orders.filter(o => o.orderType === orderType);
  }
  if (tableId) {
    orders = orders.filter(o => o.tableId === tableId);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    orders = orders.filter(o =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.tableNumber?.toLowerCase().includes(q)
    );
  }

  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(orders);
});

router.get('/orders/:id', authenticateToken, (req, res) => {
  const order = db.getData().orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

router.post('/orders', authenticateToken, (req: AuthRequest, res) => {
  const {
    orderType = 'dine-in',
    tableId,
    customerId,
    customerName,
    customerPhone,
    items,
    discountAmount = 0,
    serviceChargePercent = 10,
    taxPercent = 5,
    notes,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  const data = db.getData();
  let table: RestaurantTable | undefined;
  if (orderType === 'dine-in' && tableId) {
    table = data.tables.find(t => t.id === tableId);
    if (!table) {
      return res.status(400).json({ error: 'Selected table not found' });
    }
  }

  // Calculate Subtotal
  let subtotal = 0;
  const processedItems = items.map((it: any, index: number) => {
    const menuItem = data.menuItems.find(m => m.id === it.menuItemId);
    const price = menuItem ? menuItem.price : Number(it.price) || 0;
    const qty = Number(it.quantity) || 1;
    subtotal += price * qty;
    return {
      id: 'oi-' + Date.now() + '-' + index,
      menuItemId: it.menuItemId,
      name: menuItem ? menuItem.name : it.name,
      price,
      quantity: qty,
      notes: it.notes,
      dietary: menuItem?.dietary,
    };
  });

  const discount = Number(discountAmount) || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(taxableAmount * (Number(taxPercent) / 100) * 100) / 100;
  const serviceCharge = orderType === 'dine-in' ? Math.round(taxableAmount * (Number(serviceChargePercent) / 100) * 100) / 100 : 0;
  const totalAmount = Math.round((taxableAmount + taxAmount + serviceCharge) * 100) / 100;

  const orderNumber = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  const newOrder: Order = {
    id: 'ord-' + Date.now(),
    orderNumber,
    orderType,
    tableId: table?.id,
    tableNumber: table?.number,
    customerId,
    customerName: customerName || (table ? `Guests at ${table.number}` : 'Takeaway Customer'),
    customerPhone,
    waiterId: req.user?.id,
    waiterName: req.user?.name,
    items: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount,
    discountAmount: discount,
    serviceCharge,
    totalAmount,
    status: 'new',
    paymentStatus: 'unpaid',
    notes,
    createdAt: now,
    updatedAt: now,
  };

  data.orders.unshift(newOrder);

  // Update table status if dine-in
  if (table) {
    table.status = 'occupied';
    table.currentOrderId = newOrder.id;
    table.assignedWaiter = req.user?.name;
    table.updatedAt = now;
  }

  // Push notification to Kitchen
  db.pushNotification('kitchen', 'New Order for Kitchen', `Order ${newOrder.orderNumber} placed for ${newOrder.tableNumber || 'Takeaway'} (${newOrder.items.length} items)`, newOrder.id);

  db.save();
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_ORDER', 'Orders', `Created ${orderType} order ${orderNumber} totaling $${totalAmount}`);

  res.status(201).json(newOrder);
});

router.patch('/orders/:id/status', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: OrderStatus };

  const data = db.getData();
  const order = data.orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  // If order is ready, notify waiter
  if (status === 'ready') {
    db.pushNotification('order', 'Order Ready to Serve', `Order ${order.orderNumber} for Table ${order.tableNumber || 'Takeaway'} is ready!`, order.id);
  }

  // If cancelled, free table if occupied
  if (status === 'cancelled' && order.tableId) {
    const table = data.tables.find(t => t.id === order.tableId);
    if (table && table.currentOrderId === order.id) {
      table.status = 'available';
      table.currentOrderId = undefined;
      table.updatedAt = new Date().toISOString();
    }
  }

  db.save();
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_ORDER_STATUS', 'Orders', `Updated order ${order.orderNumber} status to ${status.toUpperCase()}`);

  res.json(order);
});

// ==========================================
// 7. KITCHEN DISPLAY SYSTEM (KDS)
// ==========================================

router.get('/kitchen/orders', authenticateToken, (req, res) => {
  const data = db.getData();
  // Return active kitchen orders: new, preparing, ready
  const kitchenOrders = data.orders.filter(o => ['new', 'preparing', 'ready'].includes(o.status));
  kitchenOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json(kitchenOrders);
});

// ==========================================
// 8. BILLING & PAYMENTS
// ==========================================

router.get('/bills', authenticateToken, (req, res) => {
  const bills = [...db.getData().bills];
  bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(bills);
});

router.post('/bills/generate', authenticateToken, requireRole(['admin', 'manager', 'cashier']), (req: AuthRequest, res) => {
  const { orderId, discountAmount = 0, discountReason = '' } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const data = db.getData();
  const order = data.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Recalculate bill with any extra discount applied at cashier stage
  const discount = Number(discountAmount) || order.discountAmount || 0;
  const taxable = Math.max(0, order.subtotal - discount);
  const tax = Math.round(taxable * 0.05 * 100) / 100;
  const serviceCharge = order.orderType === 'dine-in' ? Math.round(taxable * 0.10 * 100) / 100 : 0;
  const total = Math.round((taxable + tax + serviceCharge) * 100) / 100;

  const billNumber = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const newBill: Bill = {
    id: 'bill-' + Date.now(),
    billNumber,
    orderId: order.id,
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: order.items,
    subtotal: order.subtotal,
    taxAmount: tax,
    discountAmount: discount,
    discountReason,
    serviceCharge,
    totalAmount: total,
    paymentStatus: 'pending',
    cashierName: req.user?.name,
    createdAt: new Date().toISOString(),
  };

  data.bills.unshift(newBill);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'GENERATE_BILL', 'Billing', `Generated invoice ${billNumber} for ${order.orderNumber} ($${total})`);
  res.status(201).json(newBill);
});

router.post('/bills/:id/pay', authenticateToken, requireRole(['admin', 'manager', 'cashier']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { paymentMethod = 'credit_card', tipAmount = 0 } = req.body as { paymentMethod: PaymentMethod; tipAmount?: number };

  const data = db.getData();
  const bill = data.bills.find(b => b.id === id);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const now = new Date().toISOString();
  bill.paymentMethod = paymentMethod;
  bill.paymentStatus = 'paid';
  bill.paidAt = now;
  bill.cashierName = req.user?.name;

  // Mark associated order as paid and completed
  const order = data.orders.find(o => o.id === bill.orderId);
  if (order) {
    order.paymentStatus = 'paid';
    order.status = 'completed';
    order.updatedAt = now;

    // Free table and set to cleaning
    if (order.tableId) {
      const table = data.tables.find(t => t.id === order.tableId);
      if (table) {
        table.status = 'cleaning';
        table.currentOrderId = undefined;
        table.updatedAt = now;
      }
    }

    // Update customer spending
    if (order.customerPhone) {
      const cust = data.customers.find(c => c.phone === order.customerPhone);
      if (cust) {
        cust.totalSpend = Math.round((cust.totalSpend + bill.totalAmount) * 100) / 100;
        cust.loyaltyPoints += Math.floor(bill.totalAmount / 10);
        if (cust.totalSpend > 1000) cust.isVIP = true;
      }
    }
  }

  db.pushNotification('payment', 'Payment Settled', `Invoice ${bill.billNumber} paid ($${bill.totalAmount} via ${paymentMethod.replace('_', ' ').toUpperCase()})`, bill.id);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'SETTLE_PAYMENT', 'Billing', `Settled bill ${bill.billNumber} ($${bill.totalAmount}) via ${paymentMethod}`);

  res.json(bill);
});

// ==========================================
// 9. CUSTOMER MANAGEMENT
// ==========================================

router.get('/customers', authenticateToken, (req, res) => {
  const { search } = req.query;
  let customers = [...db.getData().customers];

  if (search) {
    const q = (search as string).toLowerCase();
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }

  customers.sort((a, b) => b.totalSpend - a.totalSpend);
  res.json(customers);
});

router.get('/customers/:id', authenticateToken, (req, res) => {
  const data = db.getData();
  const customer = data.customers.find(c => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Get customer order history
  const orderHistory = data.orders.filter(o => o.customerPhone === customer.phone || o.customerId === customer.id);
  const bookingHistory = data.bookings.filter(b => b.customerPhone === customer.phone);

  res.json({
    ...customer,
    orderHistory,
    bookingHistory,
  });
});

router.post('/customers', authenticateToken, (req: AuthRequest, res) => {
  const { name, phone, email, address, isVIP, notes } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  const data = db.getData();
  if (data.customers.some(c => c.phone.trim() === phone.trim())) {
    return res.status(400).json({ error: 'A customer with this phone number already exists' });
  }

  const newCust: Customer = {
    id: 'c-' + Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() || '',
    address: address?.trim(),
    totalVisits: 0,
    totalSpend: 0,
    loyaltyPoints: 50, // Welcome bonus
    isVIP: Boolean(isVIP),
    notes,
    createdAt: new Date().toISOString(),
  };

  data.customers.push(newCust);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_CUSTOMER', 'Customers', `Registered customer ${newCust.name} (${newCust.phone})`);
  res.status(201).json(newCust);
});

router.put('/customers/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = db.getData();
  const cust = data.customers.find(c => c.id === id);
  if (!cust) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const { name, phone, email, address, isVIP, notes, loyaltyPoints } = req.body;
  if (name) cust.name = name.trim();
  if (phone) cust.phone = phone.trim();
  if (email !== undefined) cust.email = email.trim();
  if (address !== undefined) cust.address = address;
  if (isVIP !== undefined) cust.isVIP = Boolean(isVIP);
  if (notes !== undefined) cust.notes = notes;
  if (loyaltyPoints !== undefined) cust.loyaltyPoints = Number(loyaltyPoints);

  db.save();
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_CUSTOMER', 'Customers', `Updated customer profile ${cust.name}`);
  res.json(cust);
});

router.delete('/customers/:id', authenticateToken, requireRole(['admin', 'manager']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.customers.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const name = data.customers[index].name;
  data.customers.splice(index, 1);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_CUSTOMER', 'Customers', `Deleted customer ${name}`);
  res.json({ message: 'Customer deleted successfully' });
});

// ==========================================
// 10. USER & ROLE MANAGEMENT
// ==========================================

router.get('/users', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const data = db.getData();
  const safeUsers = data.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    avatar: u.avatar,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));
  res.json(safeUsers);
});

router.post('/users', authenticateToken, requireRole(['admin']), (req: AuthRequest, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const data = db.getData();
  if (data.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const newUser = {
    id: 'u-' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: role as UserRole,
    phone: phone?.trim(),
    avatar: `https://images.unsplash.com/photo-${1535713875002 + Math.floor(Math.random() * 1000)}?auto=format&fit=crop&w=250&q=80`,
    isActive: true,
    createdAt: new Date().toISOString(),
    salt,
    passwordHash,
  };

  data.users.push(newUser);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'CREATE_USER', 'Users', `Created staff member ${newUser.name} with role ${newUser.role}`);

  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    phone: newUser.phone,
    avatar: newUser.avatar,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt,
  });
});

router.put('/users/:id', authenticateToken, requireRole(['admin']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, email, role, phone, password } = req.body;

  const data = db.getData();
  const user = data.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (name) user.name = name.trim();
  if (email) user.email = email.trim().toLowerCase();
  if (role) user.role = role;
  if (phone !== undefined) user.phone = phone;
  if (password) {
    user.salt = generateSalt();
    user.passwordHash = hashPassword(password, user.salt);
  }

  db.save();
  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_USER', 'Users', `Updated user details for ${user.name}`);

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
});

router.patch('/users/:id/toggle-status', authenticateToken, requireRole(['admin']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = db.getData();
  const user = data.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.id === req.user?.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  user.isActive = !user.isActive;
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'TOGGLE_USER_STATUS', 'Users', `${user.isActive ? 'Activated' : 'Deactivated'} account for ${user.name}`);
  res.json({ id: user.id, isActive: user.isActive });
});

router.delete('/users/:id', authenticateToken, requireRole(['admin']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (data.users[index].id === req.user?.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const name = data.users[index].name;
  data.users.splice(index, 1);
  db.save();

  db.logAudit(req.user!.id, req.user!.name, req.user!.role, 'DELETE_USER', 'Users', `Deleted user account for ${name}`);
  res.json({ message: 'User deleted successfully' });
});

// ==========================================
// 11. NOTIFICATIONS
// ==========================================

router.get('/notifications', authenticateToken, (req, res) => {
  const notifs = db.getData().notifications;
  res.json(notifs);
});

router.patch('/notifications/:id/read', authenticateToken, (req, res) => {
  const data = db.getData();
  const notif = data.notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.isRead = true;
    db.save();
  }
  res.json({ success: true });
});

router.post('/notifications/mark-all-read', authenticateToken, (req, res) => {
  const data = db.getData();
  data.notifications.forEach(n => { n.isRead = true; });
  db.save();
  res.json({ success: true });
});

// ==========================================
// 12. AUDIT LOGS
// ==========================================

router.get('/audit-logs', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { module, action } = req.query;
  let logs = [...db.getData().auditLogs];

  if (module) {
    logs = logs.filter(l => l.module.toLowerCase() === (module as string).toLowerCase());
  }
  if (action) {
    logs = logs.filter(l => l.action.toLowerCase() === (action as string).toLowerCase());
  }

  res.json(logs);
});

export default router;

import mysql from 'mysql2/promise';
import { DatabaseSchema } from './db.ts';

export const TIDB_CONFIG = {
  host: process.env.TIDB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: Number(process.env.TIDB_PORT) || 4000,
  user: process.env.TIDB_USER || '3CsuRD2EWqWhrnX.root',
  password: process.env.TIDB_PASSWORD || 'OUS5z2O9TtTkXb22',
  database: process.env.TIDB_DATABASE || 'restoflow',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastSyncTime: string | null = null;

export function getMySqlPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(TIDB_CONFIG);
  }
  return pool;
}

export async function initTiDBDatabase() {
  try {
    // First, ensure restoflow database exists
    const initConn = await mysql.createConnection({
      host: TIDB_CONFIG.host,
      port: TIDB_CONFIG.port,
      user: TIDB_CONFIG.user,
      password: TIDB_CONFIG.password,
      database: 'sys',
      ssl: TIDB_CONFIG.ssl,
    });

    await initConn.query('CREATE DATABASE IF NOT EXISTS restoflow');
    await initConn.end();

    const p = getMySqlPool();

    // Create tables in TiDB MySQL
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(64) NOT NULL,
        phone VARCHAR(64),
        avatar TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        salt VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id VARCHAR(64) PRIMARY KEY,
        number VARCHAR(64) UNIQUE NOT NULL,
        capacity INT NOT NULL,
        section VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL,
        current_order_id VARCHAR(64),
        assigned_waiter VARCHAR(255),
        updated_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(64) PRIMARY KEY,
        booking_code VARCHAR(64) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(64) NOT NULL,
        customer_email VARCHAR(255),
        table_id VARCHAR(64) NOT NULL,
        table_number VARCHAR(64) NOT NULL,
        guest_count INT NOT NULL,
        booking_date VARCHAR(64) NOT NULL,
        booking_time VARCHAR(64) NOT NULL,
        duration_minutes INT DEFAULT 90,
        special_requests TEXT,
        status VARCHAR(64) NOT NULL,
        created_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS menu_categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        icon VARCHAR(64),
        display_order INT DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_id VARCHAR(64) NOT NULL,
        category_name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        dietary VARCHAR(64) DEFAULT 'veg',
        prep_time_minutes INT DEFAULT 15,
        is_available BOOLEAN DEFAULT TRUE,
        calories INT,
        spicy_level INT DEFAULT 0,
        created_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(255),
        address TEXT,
        total_visits INT DEFAULT 0,
        total_spend DECIMAL(10,2) DEFAULT 0.00,
        loyalty_points INT DEFAULT 0,
        is_vip BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at VARCHAR(64) NOT NULL,
        last_visit_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        order_number VARCHAR(64) UNIQUE NOT NULL,
        order_type VARCHAR(64) NOT NULL,
        table_id VARCHAR(64),
        table_number VARCHAR(64),
        customer_id VARCHAR(64),
        customer_name VARCHAR(255),
        customer_phone VARCHAR(64),
        waiter_id VARCHAR(64),
        waiter_name VARCHAR(255),
        items JSON NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0.00,
        service_charge DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(64) NOT NULL,
        payment_status VARCHAR(64) NOT NULL,
        notes TEXT,
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id VARCHAR(64) PRIMARY KEY,
        bill_number VARCHAR(64) UNIQUE NOT NULL,
        order_id VARCHAR(64) NOT NULL,
        order_number VARCHAR(64) NOT NULL,
        table_number VARCHAR(64),
        customer_name VARCHAR(255),
        customer_phone VARCHAR(64),
        items JSON NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0.00,
        discount_reason VARCHAR(255),
        service_charge DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(64),
        payment_status VARCHAR(64) NOT NULL,
        paid_at VARCHAR(64),
        cashier_name VARCHAR(255),
        created_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_id VARCHAR(64),
        created_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(64) NOT NULL,
        action VARCHAR(128) NOT NULL,
        module VARCHAR(128) NOT NULL,
        details TEXT NOT NULL,
        ip_address VARCHAR(64),
        timestamp VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    isConnected = true;
    lastSyncTime = new Date().toISOString();
    console.log('TiDB Cloud MySQL connected and all tables verified.');
  } catch (err: any) {
    console.error('TiDB Cloud initialization error:', err.message);
    isConnected = false;
  }
}

export async function syncToTiDB(data: DatabaseSchema) {
  if (!isConnected) return;
  try {
    const p = getMySqlPool();

    // 1. Sync users
    for (const u of data.users) {
      await p.query(
        `INSERT INTO users (id, name, email, role, phone, avatar, is_active, salt, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), role=VALUES(role), phone=VALUES(phone), is_active=VALUES(is_active), password_hash=VALUES(password_hash)`,
        [u.id, u.name, u.email, u.role, u.phone || null, u.avatar || null, u.isActive, u.salt, u.passwordHash, u.createdAt]
      );
    }

    // 2. Sync tables
    for (const t of data.tables) {
      await p.query(
        `INSERT INTO restaurant_tables (id, number, capacity, section, status, current_order_id, assigned_waiter, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE number=VALUES(number), capacity=VALUES(capacity), section=VALUES(section), status=VALUES(status), current_order_id=VALUES(current_order_id), assigned_waiter=VALUES(assigned_waiter), updated_at=VALUES(updated_at)`,
        [t.id, t.number, t.capacity, t.section, t.status, t.currentOrderId || null, t.assignedWaiter || null, t.updatedAt]
      );
    }

    // 3. Sync categories
    for (const c of data.categories) {
      await p.query(
        `INSERT INTO menu_categories (id, name, icon, display_order)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), display_order=VALUES(display_order)`,
        [c.id, c.name, c.icon || null, c.displayOrder]
      );
    }

    // 4. Sync menu items
    for (const m of data.menuItems) {
      await p.query(
        `INSERT INTO menu_items (id, name, category_id, category_name, price, description, image_url, dietary, prep_time_minutes, is_available, calories, spicy_level, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id), category_name=VALUES(category_name), price=VALUES(price), description=VALUES(description), image_url=VALUES(image_url), dietary=VALUES(dietary), prep_time_minutes=VALUES(prep_time_minutes), is_available=VALUES(is_available), calories=VALUES(calories), spicy_level=VALUES(spicy_level)`,
        [m.id, m.name, m.categoryId, m.categoryName || '', m.price, m.description, m.imageUrl, m.dietary, m.prepTimeMinutes, m.isAvailable, m.calories || null, m.spicyLevel || 0, m.createdAt]
      );
    }

    // 5. Sync customers
    for (const c of data.customers) {
      await p.query(
        `INSERT INTO customers (id, name, phone, email, address, total_visits, total_spend, loyalty_points, is_vip, notes, created_at, last_visit_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), address=VALUES(address), total_visits=VALUES(total_visits), total_spend=VALUES(total_spend), loyalty_points=VALUES(loyalty_points), is_vip=VALUES(is_vip), notes=VALUES(notes), last_visit_at=VALUES(last_visit_at)`,
        [c.id, c.name, c.phone, c.email || null, c.address || null, c.totalVisits, c.totalSpend, c.loyaltyPoints, c.isVIP, c.notes || null, c.createdAt, c.lastVisitAt || null]
      );
    }

    // 6. Sync bookings
    for (const b of data.bookings) {
      await p.query(
        `INSERT INTO bookings (id, booking_code, customer_name, customer_phone, customer_email, table_id, table_number, guest_count, booking_date, booking_time, duration_minutes, special_requests, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), special_requests=VALUES(special_requests), guest_count=VALUES(guest_count), booking_time=VALUES(booking_time)`,
        [b.id, b.bookingCode, b.customerName, b.customerPhone, b.customerEmail || null, b.tableId, b.tableNumber, b.guestCount, b.bookingDate, b.bookingTime, b.durationMinutes, b.specialRequests || null, b.status, b.createdAt]
      );
    }

    // 7. Sync orders
    for (const o of data.orders) {
      await p.query(
        `INSERT INTO orders (id, order_number, order_type, table_id, table_number, customer_id, customer_name, customer_phone, waiter_id, waiter_name, items, subtotal, tax_amount, discount_amount, service_charge, total_amount, status, payment_status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), payment_status=VALUES(payment_status), subtotal=VALUES(subtotal), tax_amount=VALUES(tax_amount), discount_amount=VALUES(discount_amount), total_amount=VALUES(total_amount), updated_at=VALUES(updated_at)`,
        [o.id, o.orderNumber, o.orderType, o.tableId || null, o.tableNumber || null, o.customerId || null, o.customerName || null, o.customerPhone || null, o.waiterId || null, o.waiterName || null, JSON.stringify(o.items), o.subtotal, o.taxAmount, o.discountAmount, o.serviceCharge, o.totalAmount, o.status, o.paymentStatus, o.notes || null, o.createdAt, o.updatedAt]
      );
    }

    // 8. Sync bills
    for (const bill of data.bills) {
      await p.query(
        `INSERT INTO bills (id, bill_number, order_id, order_number, table_number, customer_name, customer_phone, items, subtotal, tax_amount, discount_amount, discount_reason, service_charge, total_amount, payment_method, payment_status, paid_at, cashier_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE payment_method=VALUES(payment_method), payment_status=VALUES(payment_status), paid_at=VALUES(paid_at)`,
        [bill.id, bill.billNumber, bill.orderId, bill.orderNumber, bill.tableNumber || null, bill.customerName || null, bill.customerPhone || null, JSON.stringify(bill.items), bill.subtotal, bill.taxAmount, bill.discountAmount, bill.discountReason || null, bill.serviceCharge, bill.totalAmount, bill.paymentMethod || null, bill.paymentStatus, bill.paidAt || null, bill.cashierName || null, bill.createdAt]
      );
    }

    // 9. Sync notifications (latest 20)
    for (const n of data.notifications.slice(0, 20)) {
      await p.query(
        `INSERT INTO notifications (id, type, title, message, is_read, related_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_read=VALUES(is_read)`,
        [n.id, n.type, n.title, n.message, n.isRead, n.relatedId || null, n.createdAt]
      );
    }

    // 10. Sync audit logs (latest 20)
    for (const a of data.auditLogs.slice(0, 20)) {
      await p.query(
        `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details, ip_address, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE details=VALUES(details)`,
        [a.id, a.userId, a.userName, a.userRole, a.action, a.module, a.details, a.ipAddress || null, a.timestamp]
      );
    }

    lastSyncTime = new Date().toISOString();
  } catch (err: any) {
    console.error('Failed to sync to TiDB:', err.message);
  }
}

export function getTiDBStatus() {
  return {
    connected: isConnected,
    host: TIDB_CONFIG.host,
    port: TIDB_CONFIG.port,
    database: TIDB_CONFIG.database,
    user: TIDB_CONFIG.user,
    lastSyncTime,
    provider: 'TiDB Cloud Serverless (MySQL 8.0 Protocol)',
  };
}

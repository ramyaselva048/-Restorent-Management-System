# RestoFlow – Enterprise Full-Stack Restaurant Management System

RestoFlow is a production-grade Restaurant Management System built with a React + Vite + Tailwind CSS frontend, Express + Node full-stack runner with Python FastAPI backend specifications, PostgreSQL database models, JWT token authentication, and role-based access control (RBAC).

---

## Architecture & Modules

1. **Dashboard & Analytics**: Real-time sales, order counts, active kitchen tickets, table occupancy rate, 7-day revenue trend charts, and popular dish rankings.
2. **Table Booking & Conflict Prevention**: Timeslot scheduling with automatic double-booking collision prevention across dining sections.
3. **Menu Catalog**: Categories, culinary tags, prices, preparation time estimates, spicy level, and instant "86 / Out of Stock" toggles.
4. **Point of Sale (POS) & Order Processing**: Dine-in, Takeaway, and Delivery orders, table assignment, waiter assignment, automatic GST (5%) & service charge (10%) calculations, and order progression.
5. **Kitchen Display System (KDS)**: Live kitchen ticket columns (New Tickets, In Preparation, Ready to Expedite) with elapsed time warnings.
6. **Billing & Payments**: Automated bill generation, multiple payment methods (Credit Card, Debit Card, Cash, UPI), thermal receipt printing preview, CSV export, and PDF downloading.
7. **Customer CRM**: Guest profiles, VIP status tags, loyalty points calculation, dining visit counts, and lifetime spend history.
8. **Table Management**: Table capacities, dining floor sections (Main Dining, Patio Garden, Rooftop Lounge, VIP Room), and real-time status indicators (Available, Reserved, Occupied, Cleaning).
9. **Financial Reports**: Daily, Weekly, and Monthly sales summaries, payment breakdown, dining rush velocity graphs, and CSV reporting.
10. **Staff & Role Management**: 5 granular roles:
    - **Admin**: Full system management, staff accounts, table configuration, audit trail.
    - **Manager**: Dashboard, menu management, orders, tables, bookings, billing, reports.
    - **Cashier**: POS checkout, bill settlement, customer lookup, thermal receipts.
    - **Waiter**: Table status updates, booking seating, order taking, menu viewing.
    - **Kitchen Staff**: Kitchen Display System (KDS), ticket status progression, 86 item toggles.
11. **Live Notifications**: Automated system alerts for new bookings, new orders, kitchen ready notifications, and payment receipts.
12. **Audit Trail**: Security tracking of financial actions, price adjustments, cancellations, and staff activities with timestamp and IP address.

---

## Default Staff Credentials for Testing

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Alexander Wright | `admin@restoflow.com` | `admin123` |
| **Manager** | Elena Rostova | `manager@restoflow.com` | `manager123` |
| **Cashier** | Marcus Vance | `cashier@restoflow.com` | `cashier123` |
| **Waiter** | Sofia Morales | `waiter@restoflow.com` | `waiter123` |
| **Kitchen Staff** | Chef Marco Bellini | `chef@restoflow.com` | `kitchen123` |

*Note: You can also use the 1-click Role Switcher pills in the top navigation bar to test any role instantly.*

---

## Database Connection

The application is connected to your **TiDB Cloud Serverless MySQL** cluster:
- **Host**: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
- **Port**: `4000`
- **Database**: `restoflow`
- **SSL**: TLSv1.2 Encrypted Connection
- **Tables Initialized**:
  - `users`: Staff authentication & role accounts
  - `restaurant_tables`: Dining tables, capacities, sections & live statuses
  - `bookings`: Table reservations with double-booking prevention
  - `menu_categories`: Menu dish classifications
  - `menu_items`: Catalog of dishes, prices, prep times, and 86 stock toggles
  - `orders`: POS tickets, items, table links, taxes, and order statuses
  - `bills`: Invoices, GST tax calculations, discounts, payment records
  - `customers`: Guest CRM profiles, lifetime spend, and loyalty points
  - `notifications`: System alerts and kitchen notifications
  - `audit_logs`: Security audit trail

---

## Deployment to Render

RestoFlow is configured with `render.yaml` for 1-click deployment on Render:

1. Push your repository to GitHub / GitLab.
2. In Render Dashboard, click **New +** -> **Blueprint**.
3. Select your repository. Render will automatically parse `render.yaml` and provision:
   - Node.js Full-Stack Web Service (`npm run start` on port 3000)
   - PostgreSQL Database (`restoflow-postgres`)
   - Standalone FastAPI Python Backend (located in `/backend`)

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False) # admin, manager, cashier, waiter, kitchen
    phone = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RestaurantTable(Base):
    __tablename__ = "tables"

    id = Column(String, primary_key=True, index=True)
    number = Column(String, unique=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    section = Column(String, nullable=False) # Main Dining, Patio Garden, Rooftop Lounge, VIP Room
    status = Column(String, default="available") # available, reserved, occupied, cleaning
    current_order_id = Column(String, nullable=True)
    assigned_waiter = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, index=True)
    booking_code = Column(String, unique=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=False)
    customer_email = Column(String, nullable=True)
    table_id = Column(String, ForeignKey("tables.id"), nullable=False)
    table_number = Column(String, nullable=False)
    guest_count = Column(Integer, nullable=False)
    booking_date = Column(String, nullable=False) # YYYY-MM-DD
    booking_time = Column(String, nullable=False) # HH:mm
    duration_minutes = Column(Integer, default=90)
    special_requests = Column(Text, nullable=True)
    status = Column(String, default="confirmed") # confirmed, seated, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    icon = Column(String, nullable=True)
    display_order = Column(Integer, default=1)

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category_id = Column(String, ForeignKey("menu_categories.id"))
    category_name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(Text, default="")
    image_url = Column(String, nullable=False)
    dietary = Column(String, default="veg") # veg, non-veg, vegan
    prep_time_minutes = Column(Integer, default=15)
    is_available = Column(Boolean, default=True)
    calories = Column(Integer, nullable=True)
    spicy_level = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    total_visits = Column(Integer, default=0)
    total_spend = Column(Float, default=0.0)
    loyalty_points = Column(Integer, default=0)
    is_vip = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_visit_at = Column(DateTime, nullable=True)

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True)
    order_type = Column(String, default="dine-in") # dine-in, takeaway, delivery
    table_id = Column(String, nullable=True)
    table_number = Column(String, nullable=True)
    customer_id = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    waiter_id = Column(String, nullable=True)
    waiter_name = Column(String, nullable=True)
    items = Column(JSON, nullable=False)
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    service_charge = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String, default="new") # new, preparing, ready, served, completed, cancelled
    payment_status = Column(String, default="unpaid") # unpaid, paid, refunded
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Bill(Base):
    __tablename__ = "bills"

    id = Column(String, primary_key=True, index=True)
    bill_number = Column(String, unique=True, index=True)
    order_id = Column(String, ForeignKey("orders.id"))
    order_number = Column(String, nullable=False)
    table_number = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    items = Column(JSON, nullable=False)
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    discount_reason = Column(String, nullable=True)
    service_charge = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    payment_method = Column(String, nullable=True) # cash, credit_card, debit_card, upi, wallet
    payment_status = Column(String, default="pending") # pending, paid, cancelled
    paid_at = Column(DateTime, nullable=True)
    cashier_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    user_role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    module = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    ip_address = Column(String, default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.utcnow)

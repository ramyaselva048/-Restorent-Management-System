import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, get_db
from sqlalchemy.orm import Session
import models

# Create tables in PostgreSQL if not existing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RestoFlow - Restaurant Management System API",
    description="Enterprise REST API for Restaurant Operations, Table Bookings, POS Orders, KDS, and Billing",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "app": "RestoFlow API",
        "status": "online",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "FastAPI PostgreSQL backend"}

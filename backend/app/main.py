import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import models
from app.database import engine
from app.routes import users, projects, issues, comments, members

# print("Registered tables:", models.Base.metadata.tables.keys())

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Bug Tracker API",
    description="Issue Tracking System built with FastAPI",
    version="1.0.0",
)

origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(projects.router)
app.include_router(issues.router)
app.include_router(comments.router)
app.include_router(members.router)

@app.get("/")
def home():
    return {
        "message": "Welcome to Bug Tracker API!",
        "status": "Running successfully"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }

@app.get("/db-check")
def database_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "success",
            "message": "PostgreSQL connected successfully!"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

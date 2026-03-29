from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration relative to application root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_URL_DEFAULT = f"sqlite:///./{os.path.basename(BASE_DIR)}/app.db"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    # Standard production engine for PostgreSQL
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
    )
else:
    # SQLite fallback for local development
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

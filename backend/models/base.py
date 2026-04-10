from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from ..config import config


engine = create_engine(
    config.DATABASE_URL,
    connect_args={'check_same_thread': False} if 'sqlite' in config.DATABASE_URL else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency injection for FastAPI/Flask routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import os

from sqlalchemy import (
    create_engine,
)
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
DATABASE_URL = 'sqlite:///'+os.path.join(BASE_DIR, f'Italian.db')

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


async def get_db():
    with SessionLocal() as session:
        yield session


def create_db_and_tables():
    Base.metadata.create_all(engine)

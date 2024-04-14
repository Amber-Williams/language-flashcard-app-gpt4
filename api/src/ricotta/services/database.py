from sqlalchemy import (
    create_engine,
)
from sqlalchemy.orm import sessionmaker, declarative_base

from ricotta.config import config


engine = create_engine(config.database_uri, echo=config.debug)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


async def get_db():
    with SessionLocal() as session:
        yield session


def create_db_and_tables():
    Base.metadata.create_all(engine)

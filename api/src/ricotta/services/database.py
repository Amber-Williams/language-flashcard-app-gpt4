import datetime

from sqlalchemy import (
    create_engine,
    DateTime
)
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.types import TypeDecorator

from ricotta.config import config


engine = create_engine(config.database_uri, echo=config.debug)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


async def get_db():
    with SessionLocal() as session:
        yield session


def create_db_and_tables():
    Base.metadata.create_all(engine)


class TZDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if not value.tzinfo or value.tzinfo.utcoffset(value) is None:
                raise TypeError("tzinfo is required")
            value = value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            value = value.replace(tzinfo=datetime.timezone.utc)
        return value

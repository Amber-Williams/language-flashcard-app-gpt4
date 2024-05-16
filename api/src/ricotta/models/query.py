from sqlalchemy import (
    Column,
    Integer,
    Text
)

from ricotta.services.database import Base

class Query(Base):
    __tablename__ = 'ricotta__queries'

    id = Column(Integer, autoincrement=True, primary_key=True)
    query = Column(Text)

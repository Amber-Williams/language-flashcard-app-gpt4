from sqlalchemy import (
    Column,
    Integer,
    String
)
from sqlalchemy.orm import relationship

from ricotta.services.database import Base
from ricotta.models.card import UserCardInteraction

class User(Base):
    __tablename__ = 'ricotta__users'

    id = Column(Integer, autoincrement=True, primary_key=True)
    username = Column(String, nullable=False, unique=True)

    card_interactions = relationship(UserCardInteraction, back_populates="user")

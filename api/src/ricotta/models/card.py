
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from ricotta.services.database import Base

class UserCardInteraction(Base):
    __tablename__ = 'ricotta__user_card_interactions'

    id = Column(Integer, autoincrement=True, primary_key=True)
    user_id = Column(Integer, ForeignKey('ricotta__users.id'))
    card_id = Column(Integer, ForeignKey('ricotta__cards.id'))
    times_seen = Column(Integer, default=0, nullable=False)
    times_correct = Column(Integer, default=0, nullable=False)
    user = relationship("User", back_populates="card_interactions")
    card = relationship("Card", back_populates="user_interactions")


class Card(Base):
    __tablename__ = 'ricotta__cards'

    id = Column(Integer, autoincrement=True, primary_key=True)
    word = Column(String, nullable=False)
    language = Column(String, nullable=False)
    english = Column(String, nullable=False)
    sentenceLANG = Column(String, nullable=False, unique=True)
    sentenceEN = Column(String, nullable=False)
    incorrect_options = relationship("IncorrectOption", back_populates="card")
    user_interactions = relationship("UserCardInteraction", back_populates="card")


class IncorrectOption(Base):
    __tablename__ = 'ricotta__incorrect_options'
    
    id = Column(Integer, autoincrement=True, primary_key=True)
    option = Column(String, nullable=False)
    card_id = Column(Integer, ForeignKey('ricotta__cards.id'))
    card = relationship("Card", back_populates="incorrect_options")

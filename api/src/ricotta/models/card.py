from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from fsrs import Card as FSRSCard

from ricotta.services.database import Base, TZDateTime


class UserCardInteraction(Base):
    __tablename__ = 'ricotta__user_card_interactions'

    id = Column(Integer, autoincrement=True, primary_key=True)
    user_id = Column(Integer, ForeignKey('ricotta__users.id'))
    card_id = Column(Integer, ForeignKey('ricotta__cards.id'))
    difficulty = Column(Float)
    due = Column(TZDateTime)
    elapsed_days = Column(Integer)
    lapses = Column(Integer, nullable=True)
    last_review = Column(TZDateTime, nullable=True)
    reps = Column(Integer)
    scheduled_days = Column(Integer)
    stability = Column(Float)
    state = Column(Integer)
    rating = Column(Integer)

    user = relationship("User", back_populates="card_interactions")
    card = relationship("Card", back_populates="user_interactions")

    def to_fsrs_card(self) -> FSRSCard:
        # FSRSCard retrievability logic requires stability to be at least 0.01 but defaults to 0
        if not self.stability:
            self.stability = 0.01

        return FSRSCard(
            difficulty=self.difficulty,
            due=self.due,
            elapsed_days=self.elapsed_days,
            lapses=self.lapses,
            last_review=self.last_review,
            reps=self.reps,
            scheduled_days=self.scheduled_days,
            stability=self.stability,
            state=self.state
        )


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
    card_id = Column(Integer, ForeignKey('ricotta__cards.id'))
    option = Column(String, nullable=False)

    card = relationship("Card", back_populates="incorrect_options")

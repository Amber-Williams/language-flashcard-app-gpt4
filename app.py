import json
import os
from random import shuffle

from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    ForeignKey,
    and_
)
from sqlalchemy.sql.expression import func
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, joinedload
from sqlalchemy.orm.exc import NoResultFound
from chat_extractor import ChatExtractor

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'production')

app = Flask(__name__)
if ENVIRONMENT == 'production':
    app.config.from_object('config.ProductionConfig')
elif ENVIRONMENT == 'development':
    app.config.from_object('config.DevelopmentConfig')
else:
    app.config.from_object('config.TestingConfig')
cors = CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORGINS"]}})
Base = declarative_base()
default_language = app.config["LEARNING_LANGUAGE"]
conn_str = 'sqlite:///'+os.path.join(BASE_DIR, f'{default_language}.db')
engine = create_engine(conn_str, echo=True)


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, autoincrement=True, primary_key=True)
    username = Column(String, nullable=False, unique=True)
    card_interactions = relationship("UserCardInteraction", back_populates="user")


class UserCardInteraction(Base):
    __tablename__ = 'user_card_interactions'

    id = Column(Integer, autoincrement=True, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    card_id = Column(Integer, ForeignKey('cards.id'))
    times_seen = Column(Integer, default=0, nullable=False)
    times_correct = Column(Integer, default=0, nullable=False)
    user = relationship("User", back_populates="card_interactions")
    card = relationship("Card", back_populates="user_interactions")


class Card(Base):
    __tablename__ = 'cards'

    id = Column(Integer, autoincrement=True, primary_key=True)
    word = Column(String, nullable=False)
    english = Column(String, nullable=False)
    sentenceLANG = Column(String, nullable=False, unique=True)
    sentenceEN = Column(String, nullable=False)
    incorrect_options = relationship("IncorrectOption", back_populates="card")
    user_interactions = relationship("UserCardInteraction", back_populates="card")


class IncorrectOption(Base):
    __tablename__ = 'incorrect_options'
    
    id = Column(Integer, autoincrement=True, primary_key=True)
    option = Column(String, nullable=False)
    card_id = Column(Integer, ForeignKey('cards.id'))
    card = relationship("Card", back_populates="incorrect_options")


Base.metadata.create_all(engine)
session = sessionmaker()(bind=engine)


@app.route('/api/cards/generate', methods=['POST'])
def generate_cards():
    subject = request.json.get('subject', 'basic words')
    language = request.json.get('language', default_language)
    if language not in app.config["SUPPORTED_LANGUAGES"]:
        return jsonify({"error": "Invalid language"}), 400
    
    openai_api_key = request.headers.get('X-OpenAI-Key', app.config["OPENAI_API_KEY"])
    if not openai_api_key:
        return jsonify({"error": "OpenAI api key is required to generate new words"}), 400
    
    chat = ChatExtractor(
        model_key=openai_api_key,
        model=app.config["OPENAI_MODEL"],
        max_tokens=None
    )

    orm_cards = session.query(Card.word).all()
    db_words_str = json.dumps([orm_card.word for orm_card in orm_cards])

    try:
        words = chat.extract(description=subject, db_words=db_words_str, language=language)
        words = words.get("words", words)
        cards = []
        for word in words:
            try:
                db_card = Card(
                    word=word['word'],
                    english=word['english'],
                    sentenceLANG=word['sentenceLANG'],
                    sentenceEN=word['sentenceEN'],
                    incorrect_options=[IncorrectOption(option=option) for option in word['incorrect_options']]
                )
                session.add(db_card)

                options = [word['english']] + [incorrect_option.option for incorrect_option in db_card.incorrect_options]
                shuffle(options)
                card = {
                    "id": db_card.id,
                    "word": word['word'],
                    "correct": word['english'],
                    "english": word['english'],
                    "sentenceLANG": word['sentenceLANG'],
                    "sentenceEN": word['sentenceEN'],
                    "options": options
                }
                cards.append(card)
            except Exception as e:
                pass
        session.commit()
        return jsonify(cards)
    except json.decoder.JSONDecodeError:
        print("Couldn't parse JSON from model response")
        return 500
    except Exception as err:
        print(f"Unexpected {err=}, {type(err)=}")
        return 500


@app.route('/api/cards', methods=['GET'])
def get_cards():
    try:
        cards = []
        orm_cards = session.query(Card).order_by(func.random()).limit(10).all()

        for orm_card in orm_cards:
            options = [orm_card.english] + [incorrect_option.option for incorrect_option in orm_card.incorrect_options]
            shuffle(options)

            card = {
                "id": orm_card.id,
                "word": orm_card.word,
                "correct": orm_card.english,
                "english": orm_card.english,
                "sentenceLANG": orm_card.sentenceLANG,
                "sentenceEN": orm_card.sentenceEN,
                "options": options
            }
            cards.append(card)
        return jsonify(cards)
    except json.decoder.JSONDecodeError:
        print("Couldn't parse JSON from model response")
        return 500
    except Exception as err:
        print(f"Unexpected {err=}, {type(err)=}")
        return 500


@app.route('/api/cards/review', methods=['GET'])
def review_cards():
    try:
        username = request.args.get('username')
        user = session.query(User).filter(User.username == username).first()
        if not user:
            return jsonify([]), 200

        interactions = session.query(UserCardInteraction)\
            .options(joinedload(UserCardInteraction.card))\
            .filter(UserCardInteraction.user_id == user.id).all()

        if not interactions:
            return jsonify([]), 200

        cards = []
        for interaction in interactions:
            orm_card = interaction.card
            options = [orm_card.english] + [incorrect_option.option for incorrect_option in orm_card.incorrect_options]
            shuffle(options)
            card = {
                "id": orm_card.id,
                "word": orm_card.word,
                "correct": orm_card.english,
                "sentenceLANG": orm_card.sentenceLANG,
                "sentenceEN": orm_card.sentenceEN,
                "times_seen": interaction.times_seen,
                "times_correct": interaction.times_correct,
                "options": options
            }
            cards.append(card)
        shuffle(cards)
        return jsonify(cards)
    except json.decoder.JSONDecodeError:
        print("Couldn't parse JSON from model response")
        return jsonify({"error": "An unexpected error occurred"}), 500
    except Exception as err:
        print(f"Unexpected {err=}, {type(err)=}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        if 'username' not in data:
            return jsonify({"error": "Missing username"}), 400
        new_user = User(username=data['username'])
        session.add(new_user)
        session.commit()
        return jsonify({
            "message": "User created successfully",
            "username": new_user.username
        }), 201
    except SQLAlchemyError as e:
        session.rollback()
        # TODO: handle already existing user
        return jsonify({"error": "An unexpected error occurred"}), 500
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500


@app.route('/api/card/<int:card_id>', methods=['POST'])
def mark_card_as_seen(card_id):
    try:
        if not card_id:
            return jsonify({"error": "Missing card id"}), 400
        data = request.get_json()
        if 'username' not in data:
            return jsonify({"error": "Missing username"}), 400
        if 'correct' not in data:
            return jsonify({"error": "Missing is correct"}), 400

        user = session.query(User).filter(User.username == data['username']).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        card = session.query(Card).filter(Card.id == card_id).first()
        if not card:
            return jsonify({"error": "Card not found"}), 404

        try:
            interaction = session.query(UserCardInteraction)\
                .filter(and_(UserCardInteraction.user_id == user.id, UserCardInteraction.card_id == card.id))\
                .one()
            interaction.times_seen += 1
            if request.json and request.json.get('correct', False):
                interaction.times_correct += 1

        except NoResultFound:
            interaction = UserCardInteraction(user_id=user.id, card_id=card.id, times_seen=1, times_correct=int(request.json and request.json.get('correct', False)))
            session.add(interaction)

        session.commit()

        return jsonify({"message": "Card marked as seen", "times_seen": interaction.times_seen, "times_correct": interaction.times_correct}), 200

    except Exception as e:
        session.rollback()  # Roll back in case of any error
        print(f"Unexpected error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


if __name__ == "__main__":
    app.run(port=5000)

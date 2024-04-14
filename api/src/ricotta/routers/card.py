
import json
from typing import Annotated
from random import shuffle

from fastapi import HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from sqlalchemy.orm.exc import NoResultFound
from pydantic import BaseModel
from fastapi import APIRouter
from sqlalchemy.sql.expression import func
from sqlalchemy import (
    and_
)
from sqlalchemy.orm import joinedload

from ricotta.models.user import User
from ricotta.models.card import Card, IncorrectOption, UserCardInteraction
from ricotta.config import config
from ricotta.services.database import get_db
from ricotta.services.chat_extractor import ChatExtractor
from ricotta.core.logger import logging

logger = logging.getLogger(__name__)

card_router = APIRouter(
    prefix="/card",
    tags=["Card endpoints"],
)

class GenerateCardsRequest(BaseModel):
    subject: str
    language: str

class MarkCardSeenRequest(BaseModel):
    username: str
    correct: bool


@card_router.post("/generate")
def generate_cards(request: Request, payload: GenerateCardsRequest, db: Session = Depends(get_db)):
    try:
        subject = "".join(ch for ch in payload.subject if ch.isalnum() or ch.isspace())
        language = payload.language or config.default_language

        request.app.extra = {
            **request.app.extra,
            "context": f'language="{language}" subject="{subject}"'
            }

        if language not in config.supported_languages:
            logging.error(f"Invalid language: {language}")
            raise HTTPException(status_code=400, detail="Invalid language")

        openai_api_key = request.headers.get('X-OpenAI-Key') or config.openai_api_key
        if not openai_api_key:
            logging.error("OpenAI API key is required to generate new words")
            raise HTTPException(status_code=400, detail="OpenAI API key is required to generate new words")

        chat = ChatExtractor(
            model_key=openai_api_key,
            model=config.openai_model,
            max_tokens=None
        )

        words_known = db.query(Card.word).filter(Card.language == language).limit(100).all()
        db_words_str = json.dumps([orm_card.word for orm_card in words_known])

        words = chat.extract(description=subject, db_words=db_words_str, language=language)
        words = words.get("words", words)
        cards = []
        for word in words:
            prexisting_card = db.query(Card).filter(
                 and_(Card.sentenceLANG == word['sentenceLANG'],
                      Card.language == language)
                ).one_or_none()
            db_card = prexisting_card

            if not db_card:
                db_card = Card(
                    word=word['word'],
                    language=language,
                    english=word['english'],
                    sentenceLANG=word['sentenceLANG'],
                    sentenceEN=word['sentenceEN'],
                    incorrect_options=[IncorrectOption(option=option) for option in word['incorrect_options']]
                )
                db.add(db_card)
                db.commit()
            else:
                logger.warning(f"Card already exists: {db_card.id}")

            options = [word['english']] + [incorrect_option.option for incorrect_option in db_card.incorrect_options]
            shuffle(options)
            card = {
                "id": db_card.id,
                "word": word['word'],
                "language": language,
                "correct": word['english'],
                "english": word['english'],
                "sentenceLANG": word['sentenceLANG'],
                "sentenceEN": word['sentenceEN'],
                "options": options
            }
            cards.append(card)

        return JSONResponse(content={'cards': cards}, status_code=200)
    except Exception as err:
        db.rollback()
        logging.error(f"Unexpected error: {err}")
        return HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.get('/')
def get_cards(language: Annotated[str, None] = None, db: Session = Depends(get_db)):
    try:
        language = language or config.default_language
        if language not in config.supported_languages:
            logging.error(f"Invalid language: {language}")
            raise HTTPException(status_code=400, detail="Invalid language")

        cards = []
        orm_cards = db.query(Card).filter(Card.language == language).order_by(func.random()).limit(10).all()

        if not orm_cards or len(orm_cards) == 0:
            return JSONResponse(content={"cards": []}, status_code=200)

        for orm_card in orm_cards:
            options = [orm_card.english] + [incorrect_option.option for incorrect_option in orm_card.incorrect_options]
            shuffle(options)

            card = {
                "id": orm_card.id,
                "word": orm_card.word,
                "language": language,
                "correct": orm_card.english,
                "english": orm_card.english,
                "sentenceLANG": orm_card.sentenceLANG,
                "sentenceEN": orm_card.sentenceEN,
                "options": options
            }
            cards.append(card)
        return JSONResponse(content={'cards': cards}, status_code=200)
    except json.decoder.JSONDecodeError:
        logging.error("Couldn't parse JSON from model response")
        return HTTPException(status_code=500, detail="An unexpected error occurred")
    except Exception as err:
        logging.error(f"Unexpected {err=}, {type(err)=}")
        return HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.get('/review')
def review_cards(username: Annotated[str, None] = None, language: Annotated[str, None] = None, db: Session = Depends(get_db)):
    try:
        if not username:
            logging.error("Missing username")
            return HTTPException(status_code=400, detail="Missing username")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return JSONResponse(content={"cards": []}, status_code=200)

        language = language or config.default_language
        if language not in config.supported_languages:
            logging.error(f"Invalid language: {language}")
            raise HTTPException(status_code=400, detail="Invalid language")

        interactions = db.query(UserCardInteraction)\
            .options(joinedload(UserCardInteraction.card))\
            .filter(
                and_(UserCardInteraction.user_id == user.id,
                     UserCardInteraction.card.language == language)
            ).all()

        if not interactions:
            return JSONResponse(content={"cards": []}, status_code=200)
        cards = []
        for interaction in interactions:
            orm_card = interaction.card
            options = [orm_card.english] + [incorrect_option.option for incorrect_option in orm_card.incorrect_options]
            shuffle(options)
            card = {
                "id": orm_card.id,
                "word": orm_card.word,
                "language": orm_card.language,
                "correct": orm_card.english,
                "sentenceLANG": orm_card.sentenceLANG,
                "sentenceEN": orm_card.sentenceEN,
                "times_seen": interaction.times_seen,
                "times_correct": interaction.times_correct,
                "options": options
            }
            cards.append(card)
        shuffle(cards)
        return JSONResponse(content={'cards': cards}, status_code=200)
    except json.decoder.JSONDecodeError:
        # TODO: Log error & use error exeptions
        logging.error("Couldn't parse JSON from model response")
        return HTTPException(status_code=500, detail="An unexpected error occurred")
    except Exception as err:
        logging.error(f"Unexpected {err=}, {type(err)=}")
        return HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.post("/{card_id}")
def mark_card_as_seen(card_id: int, payload: MarkCardSeenRequest, db: Session = Depends(get_db)):
    try:
        if not card_id:
            logging.error("Missing card id")
            return HTTPException(status_code=400, detail="Missing card id")

        user = db.query(User).filter(User.username == payload.username).first()
        if not user:
            logging.error(f"User not found: {payload.username}")
            return HTTPException(status_code=404, detail="User not found")

        card = db.query(Card).filter(Card.id == card_id).first()
        if not card:
            logging.error(f"Card not found: {card_id}")
            return HTTPException(status_code=404, detail="Card not found")

        try:
            interaction = db.query(UserCardInteraction)\
                .filter(and_(UserCardInteraction.user_id == user.id, UserCardInteraction.card_id == card.id))\
                .one()
            interaction.times_seen += 1
            if payload.correct:
                interaction.times_correct += 1

        except NoResultFound:
            interaction = UserCardInteraction(user_id=user.id, card_id=card.id, times_seen=1, times_correct=payload.correct and 1 or 0)
            db.add(interaction)

        db.commit()
        return JSONResponse(content={"message": "Card marked as seen", "times_seen": interaction.times_seen, "times_correct": interaction.times_correct}, status_code=200)
    except Exception as e:
        db.rollback()
        logging.error(f"Unexpected error: {e}")
        return HTTPException(status_code=500, detail="An unexpected error occurred")

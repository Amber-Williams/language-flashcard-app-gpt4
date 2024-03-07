
import json
from typing import Annotated

from fastapi import HTTPException, Depends, Request, Query
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
from random import shuffle

from ricotta.models.user import User
from ricotta.models.card import Card, IncorrectOption, UserCardInteraction
from ricotta.config import config
from ricotta.services.database import get_db
from ricotta.services.chat_extractor import ChatExtractor


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
    language = payload.language or config.default_language
    if language not in config.supported_languages:
        raise HTTPException(status_code=400, detail="Invalid language")

    openai_api_key = request.headers.get('X-OpenAI-Key') or config.openai_api_key
    if not openai_api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key is required to generate new words")

    chat = ChatExtractor(
        model_key=openai_api_key,
        model=config.openai_model,
        max_tokens=None
    )

    orm_cards = db.query(Card.word).all()
    db_words_str = json.dumps([orm_card.word for orm_card in orm_cards])

    try:
        words = chat.extract(description=payload.subject, db_words=db_words_str, language=language)
        words = words.get("words", words)
        cards = []
        for word in words:
            db_card = Card(
                word=word['word'],
                english=word['english'],
                sentenceLANG=word['sentenceLANG'],
                sentenceEN=word['sentenceEN'],
                incorrect_options=[IncorrectOption(option=option) for option in word['incorrect_options']]
            )
            db.add(db_card)
            db.commit()

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

        return JSONResponse(content={'cards': cards}, status_code=200)
    except Exception as err:
        db.rollback()  # Roll back in case of any error
        print(f"Unexpected {err=}, {type(err)=}")
        return HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.get('/')
def get_cards(db: Session = Depends(get_db)):
    try:
        cards = []
        orm_cards = db.query(Card).order_by(func.random()).limit(10).all()

        if not orm_cards or len(orm_cards) == 0:
            return JSONResponse(content={"cards": []}, status_code=200)

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
        return JSONResponse(content={'cards': cards}, status_code=200)
    except json.decoder.JSONDecodeError:
        print("Couldn't parse JSON from model response")
        return HTTPException(status_code=500, detail="An unexpected error occurred")
    except Exception as err:
        print(f"Unexpected {err=}, {type(err)=}")
        return HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.get('/review')
def review_cards(username: Annotated[str, None] = None, db: Session = Depends(get_db)):
    try:
        if not username:
            return HTTPException(status_code=400, detail="Missing username")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return JSONResponse(content={"cards": []}, status_code=200)

        interactions = db.query(UserCardInteraction)\
            .options(joinedload(UserCardInteraction.card))\
            .filter(UserCardInteraction.user_id == user.id).all()

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
        print("Couldn't parse JSON from model response")
        return HTTPException(status_code=500, detail="An unexpected error occurred")
    except Exception as err:
        print(f"Unexpected {err=}, {type(err)=}")
        return HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.post("/{card_id}")
def mark_card_as_seen(card_id: int, payload: MarkCardSeenRequest, db: Session = Depends(get_db)):
    try:
        if not card_id:
            return HTTPException(status_code=400, detail="Missing card id")

        user = db.query(User).filter(User.username == payload.username).first()
        if not user:
            return HTTPException(status_code=404, detail="User not found")

        card = db.query(Card).filter(Card.id == card_id).first()
        if not card:
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
        db.rollback()  # Roll back in case of any error
        print(f"Unexpected error: {e}")
        return HTTPException(status_code=500, detail="An unexpected error occurred")

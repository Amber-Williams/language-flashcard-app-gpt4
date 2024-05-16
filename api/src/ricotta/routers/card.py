
import json
from typing import Annotated
from random import shuffle
from datetime import datetime, timezone, UTC

from fastapi import HTTPException, Depends, Request, APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy.orm.exc import NoResultFound
from pydantic import BaseModel
from sqlalchemy import (
    and_, func
)
from sqlalchemy.orm import joinedload, Session
from fsrs import FSRS, Card as FSRSCard, State as FSRSStateEnum, Rating as FSRSRatingEnum

from ricotta.models.user import User
from ricotta.models.card import Card, IncorrectOption, UserCardInteraction
from ricotta.models.query import Query
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
    rating: FSRSRatingEnum


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

        # Save the query to the database
        subject_query = Query(query=subject)
        db.add(subject_query)

        # Include query, user context in prompt and ask for new words
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
    except HTTPException as e:
        raise e
    except Exception as err:
        db.rollback()
        logging.error(f"Unexpected error: {err}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.get('/')
def get_cards(username: Annotated[str, None] = None, language: Annotated[str, None] = None, db: Session = Depends(get_db)):
    try:
        orm_cards = None
        cards = []

        if not username:
            logging.error("Missing username")
            raise HTTPException(status_code=400, detail="Missing username")

        language = language or config.default_language
        if language not in config.supported_languages:
            logging.error(f"Invalid language: {language}")
            raise HTTPException(status_code=400, detail="Invalid language")

        user = db.query(User).filter(User.username == username).first()
        if not user:
            orm_cards = db.query(Card)\
                .filter(Card.language == language)\
                .order_by(func.random())\
                .limit(10)\
                .all()
        else:
            interacted_card_ids = [interaction.card_id for interaction in user.card_interactions]
            orm_cards = db.query(Card)\
                .filter(Card.language == language)\
                .filter(~Card.id.in_(interacted_card_ids))\
                .order_by(func.random())\
                .limit(10)\
                .all()

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
        raise HTTPException(status_code=500, detail="An unexpected error occurred")
    except HTTPException as e:
        raise e
    except Exception as err:
        logging.error(f"Unexpected {err=}, {type(err)=}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.get('/review')
def review_cards(username: Annotated[str, None] = None, language: Annotated[str, None] = None, db: Session = Depends(get_db)):
    try:
        if not username:
            logging.error("Missing username")
            raise HTTPException(status_code=400, detail="Missing username")
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
                     UserCardInteraction.due <= func.now())
            ).all()

        if not interactions:
            return JSONResponse(content={"cards": []}, status_code=200)
        cards = []
        for interaction in interactions:
            orm_card = interaction.card
            if orm_card.language != language:
                continue
            options = [orm_card.english] + [incorrect_option.option for incorrect_option in orm_card.incorrect_options]
            shuffle(options)
            card = {
                "id": orm_card.id,
                "word": orm_card.word,
                "language": orm_card.language,
                "correct": orm_card.english,
                "sentenceLANG": orm_card.sentenceLANG,
                "sentenceEN": orm_card.sentenceEN,
                "options": options
            }
            cards.append(card)
        shuffle(cards)
        return JSONResponse(content={'cards': cards}, status_code=200)
    except json.decoder.JSONDecodeError:
        logging.error("Couldn't parse JSON from model response")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")
    except HTTPException as e:
        raise e
    except Exception as err:
        logging.error(f"Unexpected {err=}, {type(err)=}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@card_router.post("/{card_id}")
def rate_card_interaction(card_id: int, payload: MarkCardSeenRequest, db: Session = Depends(get_db)):
    try:
        if not card_id:
            logging.error("Missing card id")
            raise HTTPException(status_code=400, detail="Missing card id")

        user = db.query(User).filter(User.username == payload.username).first()
        if not user:
            logging.error(f"User not found: {payload.username}")
            raise HTTPException(status_code=404, detail="User not found")

        card = db.query(Card).filter(Card.id == card_id).first()
        if not card:
            logging.error(f"Card not found: {card_id}")
            raise HTTPException(status_code=404, detail="Card not found")
        fsrs = FSRS()
        now = datetime.now(timezone.utc)
        try:
            card_interaction = db.query(UserCardInteraction)\
                .filter(and_(UserCardInteraction.user_id == user.id,
                             UserCardInteraction.card_id == card_id))\
                .one()
            
            # TODO: algo updated to work with the correctness of the answer
            card_interaction.last_review = card_interaction.last_review.replace(tzinfo=UTC)
            fsrs_scheduling_cards = fsrs.repeat(card_interaction.to_fsrs_card(), now)
            new_card_interaction = fsrs_scheduling_cards[payload.rating].card.to_dict()
            new_card_interaction["rating"] = fsrs_scheduling_cards[payload.rating].review_log.rating.value
            new_card_interaction["state"] = new_card_interaction["state"].value
            new_card_interaction["last_review"] = datetime.fromisoformat(new_card_interaction['last_review'])
            new_card_interaction["due"] = datetime.fromisoformat(new_card_interaction['due'])

            for key, value in new_card_interaction.items():
                setattr(card_interaction, key, value)

            db.commit()

        except NoResultFound:
            card_interaction = FSRSCard(
                state=FSRSStateEnum.Learning.value
            )
            card_interaction = UserCardInteraction(due=card_interaction.due,
                                                   stability=card_interaction.stability,
                                                   difficulty=card_interaction.difficulty,
                                                   elapsed_days=card_interaction.elapsed_days,
                                                   scheduled_days=card_interaction.scheduled_days,
                                                   reps=card_interaction.reps,
                                                   lapses=card_interaction.lapses,
                                                   state=card_interaction.state,
                                                   rating=payload.rating,
                                                   last_review=now.replace(tzinfo=UTC),
                                                   user_id=user.id,
                                                   card_id=card.id,
                                                  )
            db.add(card_interaction)
            db.commit()
        return JSONResponse(content={"message": "Success"}, status_code=200)
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

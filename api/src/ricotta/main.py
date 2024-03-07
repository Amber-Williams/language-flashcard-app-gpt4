import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from ricotta.routers.ping import ping_router
from ricotta.routers.user import user_router
from ricotta.routers.card import card_router
from ricotta.services.database import create_db_and_tables
from ricotta.config import config

logger.add(sys.stderr, format="{time} {level} {message}", level="INFO")


description = """
Ricotta is a language learning app integrated with AI to generate new content.
"""

app = FastAPI(title="Ricotta API", version="0.0.1", description=description)
app.include_router(ping_router)
app.include_router(user_router)
app.include_router(card_router)
app.mount("/api", app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    create_db_and_tables()
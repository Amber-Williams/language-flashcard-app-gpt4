import time
import random
import string

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from ricotta.routers.ping import ping_router
from ricotta.routers.user import user_router
from ricotta.routers.card import card_router
from ricotta.services.database import create_db_and_tables
from ricotta.config import config
from ricotta.core.logger import logging


logging.basicConfig(filename=config.log_file, level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Ricotta API",
    version="2.3.0",
    description="Ricotta is a language learning app integrated with AI to generate new content.",
    docs_url=config.docs_url,
    openapi_url=None,
    redoc_url=None,
    )
app.include_router(ping_router)
app.include_router(user_router)
app.include_router(card_router)
app.mount("/api", app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in config.allow_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_db_and_tables()
    logging.info("Starting up Ricotta API")


@app.middleware('http')
async def log_requests(request: Request, call_next):
    idem = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    start_time = time.time()
    response = await call_next(request)
    processing_time = (time.time() - start_time) * 1000
    processing_time = '{0:.1f}'.format(processing_time) + "ms"
    if request.method != "OPTIONS":
        log = {
                "message": "request",
                "path": request.url.path,
                "method": request.method,
                "processing_time": processing_time,
                "status_code": response.status_code,
                "query_params": request.query_params,
                "rid": idem,
            }
        if request.app.extra.get("context"):
            log["context"] = request.app.extra.get("context")
        logging.info(log)
    return response

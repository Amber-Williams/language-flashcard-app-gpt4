from fastapi import HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ricotta.models.user import User
from ricotta.services.database import get_db

from fastapi import APIRouter

user_router = APIRouter(
    prefix="/user",
    tags=["User endpoints"],
)


class UserCreate(BaseModel):
    username: str


@user_router.post("/user")
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        new_user = User(username=user_data.username)
        db.add(new_user)
        db.commit()
        return JSONResponse(content={"message": "User created successfully", "username": new_user.username}, status_code=200)
    except SQLAlchemyError as e:
        print(e)
        db.rollback()
        # TODO: handle already existing user
        raise HTTPException(status_code=500, detail="An unexpected error occurred")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
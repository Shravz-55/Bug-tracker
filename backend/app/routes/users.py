from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt

from app.database import get_db
from app import models, schemas
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import create_access_token
from app.core.security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


def normalize_password(password: str) -> bytes:
    """Bcrypt supports at most 72 bytes per password."""
    return password.encode("utf-8")[:72]


@router.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):

    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = bcrypt.hashpw(
        normalize_password(user.password),
        bcrypt.gensalt()
    ).decode("utf-8")

    new_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user



@router.post("/login")
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    password_matches = False
    if user:
        try:
            password_matches = bcrypt.checkpw(
                normalize_password(form_data.password),
                user.hashed_password.encode("utf-8")
            )
        except (ValueError, AttributeError):
            password_matches = False

    if not user or not password_matches:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    access_token = create_access_token(
        data={"sub": str(user.id)}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_my_profile(
    current_user: models.User = Depends(get_current_user)
):
    return current_user


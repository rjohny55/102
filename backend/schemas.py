from datetime import datetime

from pydantic import BaseModel, field_validator


# ----- User -----
class UserCreate(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Username must not be empty")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 4:
            raise ValueError("Password must be at least 4 characters")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ----- Token -----
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ----- Score -----
class ScoreSubmit(BaseModel):
    score: int
    level: int
    moves: int


class ScoreResponse(BaseModel):
    id: int
    user_id: int
    score: int
    level: int
    moves: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ----- Leaderboard -----
class LeaderboardEntry(BaseModel):
    user_id: int
    username: str
    highest_score: int
    best_level: int
    best_moves: int

    model_config = {"from_attributes": True}

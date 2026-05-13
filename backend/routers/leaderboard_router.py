from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Score
from backend.schemas import LeaderboardEntry

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            User.id.label("user_id"),
            User.username,
            func.max(Score.score).label("highest_score"),
            func.max(Score.level).label("best_level"),
            func.min(Score.moves).label("best_moves"),
        )
        .join(Score, User.id == Score.user_id)
        .group_by(User.id)
        .order_by(func.max(Score.score).desc())
        .limit(limit)
        .all()
    )

    return [
        LeaderboardEntry(
            user_id=row.user_id,
            username=row.username,
            highest_score=row.highest_score,
            best_level=row.best_level,
            best_moves=row.best_moves,
        )
        for row in rows
    ]

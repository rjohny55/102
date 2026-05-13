from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Score
from backend.schemas import ScoreSubmit, ScoreResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/scores", tags=["scores"])


@router.post("", response_model=ScoreResponse, status_code=201)
def submit_score(
    payload: ScoreSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    score = Score(
        user_id=current_user.id,
        score=payload.score,
        level=payload.level,
        moves=payload.moves,
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return score


@router.get("", response_model=list[ScoreResponse])
def list_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scores = (
        db.query(Score)
        .filter(Score.user_id == current_user.id)
        .order_by(Score.created_at.desc())
        .all()
    )
    return scores

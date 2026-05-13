# Game Backend

FastAPI-based backend with SQLite, JWT authentication, score tracking, and leaderboard.

## Project Structure

```
backend/
├── __init__.py
├── main.py                  # FastAPI app entry point, CORS, lifespan
├── config.py                # SECRET_KEY, ALGORITHM, DATABASE_URL
├── database.py              # SQLAlchemy engine, SessionLocal, Base, get_db
├── models.py                # User and Score ORM models
├── schemas.py               # Pydantic request/response schemas
├── auth.py                  # JWT creation, decoding, get_current_user dependency
├── requirements.txt
└── routers/
    ├── __init__.py
    ├── auth_router.py       # POST /auth/register, POST /auth/login
    ├── game_router.py       # POST /scores, GET /scores (auth required)
    └── leaderboard_router.py # GET /leaderboard (public)
```

## Features

- **User Registration & Login** — bcrypt password hashing, JWT tokens
- **Score Submission** — authenticated users can submit their scores
- **Score History** — authenticated users can view their own scores
- **Leaderboard** — public endpoint showing top players by highest score

## Quick Start

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run the server
python -m uvicorn backend.main:app --reload
```

The API will be available at `http://localhost:8000`.

## API Endpoints

| Method | Path               | Auth Required | Description            |
|--------|--------------------|---------------|------------------------|
| POST   | /auth/register     | No            | Register new user      |
| POST   | /auth/login        | No            | Login and get token    |
| POST   | /scores            | Yes           | Submit a score         |
| GET    | /scores            | Yes           | Get user's scores      |
| GET    | /leaderboard       | No            | Get top players        |

## Configuration

Environment variables (with defaults):

- `SECRET_KEY` — JWT signing key (default: `super-secret-key-change-in-production`)
- `DATABASE_URL` — SQLite connection string (default: `sqlite:///./game.db`)

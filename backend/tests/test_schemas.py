"""
Tests for backend schemas, focusing on the TokenResponse.user field change.
"""
import sys
import os
import unittest
from datetime import datetime, timezone

# Add the project root to the path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from backend.schemas import (
    TokenResponse,
    UserResponse,
    UserCreate,
    UserLogin,
    ScoreSubmit,
    ScoreResponse,
    LeaderboardEntry,
)


class TestTokenResponseUserField(unittest.TestCase):
    """TokenResponse now requires a user field (the key change in this session)."""

    def test_token_response_requires_user_field(self):
        """TokenResponse must now include a user field."""
        user = UserResponse(id=1, username="testuser", created_at=datetime.now(timezone.utc))
        response = TokenResponse(access_token="test-token-123", user=user)
        self.assertEqual(response.access_token, "test-token-123")
        self.assertEqual(response.token_type, "bearer")
        self.assertEqual(response.user, user)
        self.assertEqual(response.user.id, 1)
        self.assertEqual(response.user.username, "testuser")

    def test_token_response_serializes_correctly(self):
        """TokenResponse model_dump includes user data."""
        user = UserResponse(id=2, username="janedoe", created_at=datetime(2025, 1, 1, tzinfo=timezone.utc))
        response = TokenResponse(access_token="abc", user=user)
        data = response.model_dump()
        self.assertEqual(data["access_token"], "abc")
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"]["id"], 2)
        self.assertEqual(data["user"]["username"], "janedoe")
        self.assertIsNotNone(data["user"]["created_at"])

    def test_token_response_fails_without_user(self):
        """TokenResponse should fail validation when user is missing."""
        with self.assertRaises(Exception):
            TokenResponse(access_token="test-token")

    def test_token_response_fails_with_invalid_user_type(self):
        """TokenResponse should fail when user is not a valid UserResponse."""
        with self.assertRaises(Exception):
            TokenResponse(access_token="test-token", user="not-a-user-object")

    def test_token_response_with_minimal_user(self):
        """TokenResponse works with minimal valid user data."""
        user = UserResponse(id=1, username="a", created_at=datetime.now(timezone.utc))
        response = TokenResponse(access_token="tok", user=user)
        self.assertEqual(response.user.username, "a")
        self.assertEqual(response.user.id, 1)


class TestUserCreate(unittest.TestCase):
    """UserCreate schema validators."""

    def test_valid_user_create(self):
        data = UserCreate(username="testuser", password="password123")
        self.assertEqual(data.username, "testuser")
        self.assertEqual(data.password, "password123")

    def test_username_stripped(self):
        data = UserCreate(username="  spaceduser  ", password="password123")
        self.assertEqual(data.username, "spaceduser")

    def test_empty_username_raises_error(self):
        with self.assertRaises(Exception) as ctx:
            UserCreate(username="   ", password="password123")
        self.assertIn("Username must not be empty", str(ctx.exception))

    def test_short_password_raises_error(self):
        with self.assertRaises(Exception) as ctx:
            UserCreate(username="testuser", password="abc")
        self.assertIn("Password must be at least 4 characters", str(ctx.exception))


class TestUserLogin(unittest.TestCase):
    """UserLogin schema."""

    def test_valid_user_login(self):
        data = UserLogin(username="testuser", password="password123")
        self.assertEqual(data.username, "testuser")
        self.assertEqual(data.password, "password123")


class TestScoreSubmit(unittest.TestCase):
    """ScoreSubmit schema."""

    def test_valid_score_submit(self):
        data = ScoreSubmit(score=100, level=2, moves=15)
        self.assertEqual(data.score, 100)
        self.assertEqual(data.level, 2)
        self.assertEqual(data.moves, 15)


class TestScoreResponse(unittest.TestCase):
    """ScoreResponse schema."""

    def test_valid_score_response(self):
        now = datetime.now(timezone.utc)
        data = ScoreResponse(id=1, user_id=1, score=100, level=2, moves=15, created_at=now)
        self.assertEqual(data.id, 1)
        self.assertEqual(data.user_id, 1)
        self.assertEqual(data.score, 100)


class TestLeaderboardEntry(unittest.TestCase):
    """LeaderboardEntry schema."""

    def test_valid_leaderboard_entry(self):
        data = LeaderboardEntry(user_id=1, username="testuser", highest_score=500, best_level=10, best_moves=30)
        self.assertEqual(data.user_id, 1)
        self.assertEqual(data.username, "testuser")
        self.assertEqual(data.highest_score, 500)


if __name__ == "__main__":
    unittest.main()

"""
Tests for the auth router, focusing on the user field in register/login responses.
"""
import sys
import os
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from backend.schemas import TokenResponse, UserResponse


class TestAuthRouterUserInResponse(unittest.TestCase):
    """
    Tests to verify that register and login endpoints return user data
    in the TokenResponse (the key change in this session).
    """

    def test_token_response_with_user_object(self):
        """Verify TokenResponse can be constructed with user data."""
        now = datetime.now(timezone.utc)
        user_data = UserResponse(id=1, username="testuser", created_at=now)
        response = TokenResponse(access_token="jwt-token", user=user_data)

        self.assertEqual(response.access_token, "jwt-token")
        self.assertEqual(response.user.id, 1)
        self.assertEqual(response.user.username, "testuser")
        self.assertEqual(response.user.created_at, now)

    def test_token_response_model_dump_includes_user(self):
        """Verify serialization includes user data."""
        now = datetime.now(timezone.utc)
        user_data = UserResponse(id=42, username="alice", created_at=now)
        response = TokenResponse(access_token="tok123", user=user_data)

        dumped = response.model_dump()
        self.assertEqual(dumped["access_token"], "tok123")
        self.assertEqual(dumped["user"]["id"], 42)
        self.assertEqual(dumped["user"]["username"], "alice")
        self.assertIn("created_at", dumped["user"])

    def test_user_field_required(self):
        """TokenResponse should fail if user is not provided."""
        with self.assertRaises(Exception):
            TokenResponse(access_token="tok")

    def test_user_field_accepts_dict(self):
        """TokenResponse should accept a dict for user."""
        now = datetime.now(timezone.utc)
        response = TokenResponse.model_validate({
            "access_token": "tok",
            "token_type": "bearer",
            "user": {"id": 5, "username": "bob", "created_at": now.isoformat()},
        })
        self.assertEqual(response.user.id, 5)
        self.assertEqual(response.user.username, "bob")


if __name__ == "__main__":
    unittest.main()

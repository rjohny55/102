"""
Tests for the auth module: password hashing, JWT creation/decoding, and get_current_user.
"""
import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from backend.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    get_current_user,
)
from backend.config import SECRET_KEY, ALGORITHM


class TestPasswordHashing(unittest.TestCase):
    """Tests for hash_password and verify_password."""

    def test_hash_password_returns_string(self):
        hashed = hash_password("mysecretpassword")
        self.assertIsInstance(hashed, str)
        self.assertGreater(len(hashed), 10)

    def test_hash_password_produces_different_hashes(self):
        h1 = hash_password("samepassword")
        h2 = hash_password("samepassword")
        # Each call should generate a different salt, so hashes differ
        self.assertNotEqual(h1, h2)

    def test_verify_password_correct(self):
        hashed = hash_password("correctpassword")
        self.assertTrue(verify_password("correctpassword", hashed))

    def test_verify_password_incorrect(self):
        hashed = hash_password("correctpassword")
        self.assertFalse(verify_password("wrongpassword", hashed))

    def test_verify_password_empty(self):
        hashed = hash_password("somepassword")
        self.assertFalse(verify_password("", hashed))


class TestJWTTokens(unittest.TestCase):
    """Tests for create_access_token and decode_token."""

    def setUp(self):
        self.payload = {"sub": "1", "username": "testuser"}

    def test_create_access_token_returns_string(self):
        token = create_access_token(data=self.payload)
        self.assertIsInstance(token, str)
        # JWT tokens have 3 parts separated by dots
        self.assertEqual(len(token.split(".")), 3)

    def test_create_access_token_with_custom_expiry(self):
        short_lived = timedelta(seconds=30)
        token = create_access_token(data=self.payload, expires_delta=short_lived)
        decoded = decode_token(token)
        self.assertEqual(decoded["sub"], "1")
        self.assertEqual(decoded["username"], "testuser")

    def test_decode_token_valid(self):
        token = create_access_token(data=self.payload)
        decoded = decode_token(token)
        self.assertEqual(decoded["sub"], "1")
        self.assertEqual(decoded["username"], "testuser")
        self.assertIn("exp", decoded)

    def test_decode_token_invalid_signature(self):
        # Create a token with a different key
        import jwt

        bad_token = jwt.encode(
            {"sub": "1"}, "wrong-secret-key", algorithm=ALGORITHM
        )
        with self.assertRaises(Exception) as ctx:
            decode_token(bad_token)
        self.assertIn("Invalid token", str(ctx.exception))

    def test_decode_token_malformed(self):
        with self.assertRaises(Exception) as ctx:
            decode_token("not-a-valid-token")
        self.assertIn("Invalid token", str(ctx.exception))

    def test_decode_token_expired(self):
        import jwt
        from datetime import datetime, timezone, timedelta

        # Create a token that expired 1 hour ago
        expired = jwt.encode(
            {
                "sub": "1",
                "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            },
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        with self.assertRaises(Exception) as ctx:
            decode_token(expired)
        self.assertIn("Token has expired", str(ctx.exception))


class TestGetCurrentUser(unittest.TestCase):
    """Tests for get_current_user dependency."""

    def setUp(self):
        self.mock_user = MagicMock()
        self.mock_user.id = 1
        self.mock_user.username = "testuser"

    def test_get_current_user_valid(self):
        """get_current_user should return user when token is valid."""
        token = create_access_token(data={"sub": "1"})
        mock_credentials = MagicMock()
        mock_credentials.credentials = token

        mock_db = MagicMock()
        mock_db.query().filter().first.return_value = self.mock_user

        user = get_current_user(credentials=mock_credentials, db=mock_db)
        self.assertEqual(user.id, 1)
        self.assertEqual(user.username, "testuser")

    def test_get_current_user_user_not_found(self):
        """get_current_user should raise 401 when user not in database."""
        token = create_access_token(data={"sub": "999"})
        mock_credentials = MagicMock()
        mock_credentials.credentials = token

        mock_db = MagicMock()
        mock_db.query().filter().first.return_value = None

        with self.assertRaises(Exception) as ctx:
            get_current_user(credentials=mock_credentials, db=mock_db)
        self.assertIn("User not found", str(ctx.exception))

    def test_get_current_user_invalid_payload(self):
        """get_current_user should raise 401 when token has no 'sub'."""
        token = create_access_token(data={"not_sub": "1"})
        mock_credentials = MagicMock()
        mock_credentials.credentials = token

        mock_db = MagicMock()

        with self.assertRaises(Exception) as ctx:
            get_current_user(credentials=mock_credentials, db=mock_db)
        self.assertIn("Invalid token payload", str(ctx.exception))

    def test_get_current_user_invalid_sub_type(self):
        """get_current_user should raise 401 when sub is not a valid integer string."""
        token = create_access_token(data={"sub": "not-a-number"})
        mock_credentials = MagicMock()
        mock_credentials.credentials = token

        mock_db = MagicMock()

        with self.assertRaises(Exception) as ctx:
            get_current_user(credentials=mock_credentials, db=mock_db)
        self.assertIn("Invalid token payload", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()

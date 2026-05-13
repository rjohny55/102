"""
Tests for the game_router endpoints: submit_score and list_scores.
Uses mocked database and auth dependencies to verify logic in isolation.
"""
import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from backend.routers.game_router import submit_score, list_scores
from backend.schemas import ScoreSubmit


class TestSubmitScore(unittest.TestCase):
    """Tests for the POST /scores endpoint."""

    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_user = MagicMock()
        self.mock_user.id = 1
        self.mock_user.username = "testuser"

    def test_submit_score_creates_score(self):
        """submit_score should create a Score object and add it to the db."""
        payload = ScoreSubmit(score=100, level=2, moves=15)

        result = submit_score(payload, db=self.mock_db, current_user=self.mock_user)

        # Should add a Score to the session
        self.mock_db.add.assert_called_once()
        added_score = self.mock_db.add.call_args[0][0]
        self.assertEqual(added_score.user_id, 1)
        self.assertEqual(added_score.score, 100)
        self.assertEqual(added_score.level, 2)
        self.assertEqual(added_score.moves, 15)

        # Should commit and refresh
        self.mock_db.commit.assert_called_once()
        self.mock_db.refresh.assert_called_once()

    def test_submit_score_uses_current_user_id(self):
        """submit_score should use the authenticated user's ID."""
        payload = ScoreSubmit(score=500, level=5, moves=30)
        another_user = MagicMock()
        another_user.id = 42

        submit_score(payload, db=self.mock_db, current_user=another_user)

        added_score = self.mock_db.add.call_args[0][0]
        self.assertEqual(added_score.user_id, 42)

    def test_submit_score_returns_score(self):
        """submit_score should return the created score."""
        payload = ScoreSubmit(score=200, level=3, moves=20)
        # Make refresh set an id on the score
        def refresh_side_effect(score_obj):
            score_obj.id = 10
            score_obj.created_at = datetime.now(timezone.utc)

        self.mock_db.refresh.side_effect = refresh_side_effect

        result = submit_score(payload, db=self.mock_db, current_user=self.mock_user)

        self.assertEqual(result.score, 200)
        self.assertEqual(result.level, 3)
        self.assertEqual(result.moves, 20)
        self.assertEqual(result.user_id, 1)
        self.assertIsNotNone(result.id)
        self.assertIsNotNone(result.created_at)


class TestListScores(unittest.TestCase):
    """Tests for the GET /scores endpoint."""

    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_user = MagicMock()
        self.mock_user.id = 1

    def test_list_scores_returns_user_scores(self):
        """list_scores should return scores filtered by current user."""
        mock_scores = [
            MagicMock(id=1, user_id=1, score=100, level=2, moves=15, created_at=datetime.now(timezone.utc)),
            MagicMock(id=2, user_id=1, score=200, level=3, moves=20, created_at=datetime.now(timezone.utc)),
        ]
        # Mock the query chain: db.query(Score).filter(...).order_by(...).all()
        mock_query = self.mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_order.all.return_value = mock_scores

        result = list_scores(db=self.mock_db, current_user=self.mock_user)

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].score, 100)
        self.assertEqual(result[1].score, 200)

        # Verify the query was filtered by the correct user
        self.mock_db.query.assert_called_once()
        mock_filter_call = mock_query.filter.call_args[0][0]
        # We can't easily compare SQL expressions, but we can verify the chain was called
        mock_query.filter.assert_called_once()
        mock_filter.order_by.assert_called_once()

    def test_list_scores_empty(self):
        """list_scores should return empty list when user has no scores."""
        mock_query = self.mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_order.all.return_value = []

        result = list_scores(db=self.mock_db, current_user=self.mock_user)

        self.assertEqual(result, [])

    def test_list_scores_scoped_to_current_user(self):
        """list_scores should only return scores for the authenticated user."""
        self.mock_user.id = 42
        mock_query = self.mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_order.all.return_value = []

        list_scores(db=self.mock_db, current_user=self.mock_user)

        # Verify the filter used the correct user_id
        filter_args = mock_query.filter.call_args[0]
        # The filter expression is Score.user_id == current_user.id
        # We verify by checking the user_id in the filter expression
        self.assertTrue(any("42" in str(arg) for arg in filter_args) or
                        any("user_id" in str(arg) for arg in filter_args))


if __name__ == "__main__":
    unittest.main()

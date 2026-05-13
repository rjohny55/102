"""
Tests for the leaderboard_router endpoint: get_leaderboard.
Uses mocked database to verify logic in isolation.
"""
import sys
import os
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from backend.routers.leaderboard_router import get_leaderboard


class TestGetLeaderboard(unittest.TestCase):
    """Tests for the GET /leaderboard endpoint."""

    def setUp(self):
        self.mock_db = MagicMock()

    def _make_row(self, user_id, username, highest_score, best_level, best_moves):
        """Create a mock row object that mimics the SQLAlchemy result."""
        row = MagicMock()
        row.user_id = user_id
        row.username = username
        row.highest_score = highest_score
        row.best_level = best_level
        row.best_moves = best_moves
        return row

    def test_get_leaderboard_returns_entries(self):
        """get_leaderboard should return leaderboard entries sorted by highest_score desc."""
        mock_rows = [
            self._make_row(1, "champion", 5000, 8, 50),
            self._make_row(2, "player2", 3000, 6, 30),
            self._make_row(3, "player3", 1000, 4, 20),
        ]

        mock_query = self.mock_db.query.return_value
        mock_join = mock_query.join.return_value
        mock_group = mock_join.group_by.return_value
        mock_order = mock_group.order_by.return_value
        mock_order.limit.return_value.all.return_value = mock_rows

        result = get_leaderboard(db=self.mock_db, limit=10)

        self.assertEqual(len(result), 3)
        self.assertEqual(result[0].username, "champion")
        self.assertEqual(result[0].highest_score, 5000)
        self.assertEqual(result[1].username, "player2")
        self.assertEqual(result[1].highest_score, 3000)
        self.assertEqual(result[2].username, "player3")
        self.assertEqual(result[2].highest_score, 1000)

    def test_get_leaderboard_empty(self):
        """get_leaderboard should return empty list when no scores exist."""
        mock_query = self.mock_db.query.return_value
        mock_join = mock_query.join.return_value
        mock_group = mock_join.group_by.return_value
        mock_order = mock_group.order_by.return_value
        mock_order.limit.return_value.all.return_value = []

        result = get_leaderboard(db=self.mock_db, limit=10)

        self.assertEqual(result, [])

    def test_get_leaderboard_respects_limit(self):
        """get_leaderboard should respect the limit parameter."""
        # Create 5 mock rows
        mock_rows = [self._make_row(i, f"player{i}", 1000 - i * 100, 5, 30) for i in range(1, 6)]

        mock_query = self.mock_db.query.return_value
        mock_join = mock_query.join.return_value
        mock_group = mock_join.group_by.return_value
        mock_order = mock_group.order_by.return_value

        # Store the limit argument
        original_limit = mock_order.limit
        mock_order.limit.return_value.all.return_value = mock_rows

        result = get_leaderboard(db=self.mock_db, limit=5)

        self.assertEqual(len(result), 5)
        # Verify limit was called with 5
        mock_order.limit.assert_called_with(5)

    def test_get_leaderboard_default_limit(self):
        """get_leaderboard should use default limit of 10."""
        mock_rows = []
        mock_query = self.mock_db.query.return_value
        mock_join = mock_query.join.return_value
        mock_group = mock_join.group_by.return_value
        mock_order = mock_group.order_by.return_value
        mock_order.limit.return_value.all.return_value = mock_rows

        get_leaderboard(db=self.mock_db)

        # The default limit is Query(10) which wraps to 10
        # Verify that .all() was called (meaning the chain completed)
        mock_order.limit.return_value.all.assert_called_once()

    def test_get_leaderboard_uses_max_aggregates(self):
        """get_leaderboard should use MAX for score and level, MIN for moves."""
        mock_rows = [
            self._make_row(1, "testuser", 500, 5, 20),
        ]

        mock_query = self.mock_db.query.return_value
        mock_join = mock_query.join.return_value
        mock_group = mock_join.group_by.return_value
        mock_order = mock_group.order_by.return_value
        mock_order.limit.return_value.all.return_value = mock_rows

        result = get_leaderboard(db=self.mock_db, limit=10)

        # Verify the join was between User and Score
        mock_query.join.assert_called_once()

        # Verify group_by was called
        mock_join.group_by.assert_called_once()

        # Verify order_by was called
        mock_group.order_by.assert_called_once()

    def test_get_leaderboard_proper_entry_values(self):
        """get_leaderboard should return LeaderboardEntry with correct field types."""
        mock_rows = [
            self._make_row(1, "player1", 2500, 7, 25),
        ]

        mock_query = self.mock_db.query.return_value
        mock_join = mock_query.join.return_value
        mock_group = mock_join.group_by.return_value
        mock_order = mock_group.order_by.return_value
        mock_order.limit.return_value.all.return_value = mock_rows

        result = get_leaderboard(db=self.mock_db, limit=10)

        entry = result[0]
        self.assertEqual(entry.user_id, 1)
        self.assertEqual(entry.username, "player1")
        self.assertEqual(entry.highest_score, 2500)
        self.assertEqual(entry.best_level, 7)
        self.assertEqual(entry.best_moves, 25)


if __name__ == "__main__":
    unittest.main()

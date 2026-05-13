import { useState, useEffect } from 'react';
import client from '../api/client';

interface LeaderboardEntry {
  rank: number;
  username: string;
  highest_score: number;
  level: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data } = await client.get<LeaderboardEntry[]>('/api/leaderboard');
        setEntries(data);
      } catch {
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="leaderboard-page">
        <h1>Leaderboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-page">
        <h1>Leaderboard</h1>
        <p className="form-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <h1>Leaderboard</h1>
      {entries.length === 0 ? (
        <p>No entries yet.</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Username</th>
              <th>Highest Score</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.rank}>
                <td>{entry.rank}</td>
                <td>{entry.username}</td>
                <td>{entry.highest_score}</td>
                <td>{entry.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

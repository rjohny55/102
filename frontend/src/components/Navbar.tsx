import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Game</Link>
      </div>
      <div className="navbar-links">
        <Link to="/game">Game</Link>
        <Link to="/leaderboard">Leaderboard</Link>
      </div>
      <div className="navbar-user">
        {user ? (
          <>
            <span className="navbar-username">{user.username}</span>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

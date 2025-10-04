import React, { useContext, useState, useEffect, useCallback } from 'react';
import { UserContext } from '../context/UserContext';
import { useNavigate, Navigate } from 'react-router-dom';
import background from '../assets/images/dashboard_background.jpg';

const API_URL = process.env.REACT_APP_API_URL;

const Profile = () => {
  // 1. Hooks always run in the same order
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [secretPassword, setSecretPassword] = useState('');
  const [error, setError] = useState('');

  // 2. Memoize the fetch so useEffect deps are satisfied
  const fetchPlayerDetails = useCallback(async () => {
    // guard inside the function
    if (user == null || (user.id == null && user.id !== 0)) return;

    setLoading(true);
    try {
const res = await fetch(
  `${API_URL}/player/${user.id}`,
  { credentials: 'include' }
);

      if (!res.ok) {
        setError('Failed to fetch player details.');
      } else {
        const data = await res.json();
        setPlayer(data);
      }
    } catch (err) {
      console.error('Error fetching player details:', err);
      setError('Error fetching player details.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 3. Unconditional useEffect, with fetchPlayerDetails as dep
  useEffect(() => {
    fetchPlayerDetails();
  }, [fetchPlayerDetails]);

  // 4. Handlers
  const handleLevelUp = async () => {
    if (user == null || (user.id == null && user.id !== 0)) return;

    try {
      const res = await fetch(
        `${API_URL}/player/levelup`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: user.id, secretPassword }),
        }
      );
      if (!res.ok) {
        const msg = await res.text();
        alert(`Failed to level up: ${msg}`);
      } else {
        alert('Leveled up successfully!');
        fetchPlayerDetails();
      }
    } catch (err) {
      console.error('Error leveling up:', err);
      alert('Error leveling up.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const goBackToDashboard = () => {
    navigate('/dashboard');
  };

  // 5. Redirect guard *after* all hooks
  if (!user) {
    return <Navigate to="/login" />;
  }

  // 6. Styles
  const containerStyle = {
    backgroundImage:
      `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  };
  const cardStyle = {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: '8px',
    padding: '2rem 3rem',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  };
  const headingStyle = {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    color: '#333',
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
  };
  const textStyle = {
    fontSize: '1.2rem',
    color: '#333',
  };
  const inputStyle = {
    padding: '0.5rem',
    marginRight: '1rem',
    fontSize: '1rem',
    borderRadius: '5px',
    border: '1px solid #ccc',
  };
  const buttonStyle = {
    margin: '0.5rem',
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#61dafb',
    color: '#333',
    fontWeight: 'bold',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  // 7. Render
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Profile</h1>

        {loading ? (
          <p style={textStyle}>Loading...</p>
        ) : player ? (
          <div style={{ marginBottom: '1rem' }}>
            <p style={textStyle}>
              <strong>Username:</strong> {player.username}
            </p>
            <p style={textStyle}>
              <strong>Level:</strong> {player.level}
            </p>
          </div>
        ) : (
          <p style={textStyle}>No player details available.</p>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ ...headingStyle, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
            Level Up
          </h3>
          <input
            type="password"
            placeholder="Enter secret password"
            value={secretPassword}
            onChange={e => setSecretPassword(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleLevelUp} style={buttonStyle}>
            Level Up
          </button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button onClick={goBackToDashboard} style={buttonStyle}>
            Back to Dashboard
          </button>
          <button onClick={handleLogout} style={buttonStyle}>
            Logout
          </button>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </div>
  );
};

export default Profile;

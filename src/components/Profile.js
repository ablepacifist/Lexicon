import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { useAvatar } from '../hooks/useAvatar';
import background from '../assets/images/lexicon_room.jpg';

const Profile = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [playerStats, setPlayerStats] = useState(null);
  const [alchemyPlayer, setAlchemyPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [levelUpMsg, setLevelUpMsg] = useState('');
  const fileInputRef = useRef(null);

  const { avatarUrl, uploadAvatar, removeAvatar } = useAvatar(user?.username);
  const lexiconApiUrl = process.env.REACT_APP_LEXICON_API_URL || 'http://localhost:8081';
  const alchemyApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch player statistics
    const fetchPlayerStats = async () => {
      try {
        const response = await fetch(`${lexiconApiUrl}/api/players/${user.id}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlayerStats(data);
        }
      } catch (err) {
        console.error('Error fetching player stats:', err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch alchemy player details (for level)
    const fetchAlchemyPlayer = async () => {
      try {
        const res = await fetch(`${alchemyApiUrl}/api/player/${user.id}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAlchemyPlayer(data);
        }
      } catch (err) {
        console.error('Error fetching alchemy player:', err);
      }
    };

    fetchPlayerStats();
    fetchAlchemyPlayer();
  }, [user, navigate, lexiconApiUrl, alchemyApiUrl]);

  const handleLevelUp = async () => {
    if (!user) return;
    setLevelUpMsg('');
    try {
      const res = await fetch(`${alchemyApiUrl}/api/player/levelup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: user.id, secretPassword }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setLevelUpMsg(`Failed: ${msg}`);
      } else {
        const updatedPlayer = await res.json();
        setAlchemyPlayer(updatedPlayer);
        setLevelUpMsg('Leveled up successfully!');
        setSecretPassword('');
      }
    } catch (err) {
      console.error('Error leveling up:', err);
      setLevelUpMsg('Error leveling up.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMsg('File must be under 2 MB');
      return;
    }
    setAvatarUploading(true);
    setAvatarMsg('');
    try {
      await uploadAvatar(file, user?.id);
      setAvatarMsg('Avatar updated!');
    } catch (err) {
      setAvatarMsg('Upload failed — bridge may be offline');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarMsg('');
    try {
      await removeAvatar(user?.id);
      setAvatarMsg('Avatar removed');
    } catch {
      setAvatarMsg('Remove failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const containerStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: '#fff',
  };

  const cardStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: '3rem 4rem',
    borderRadius: '12px',
    boxShadow: '0 0 30px rgba(0, 0, 0, 0.8)',
    maxWidth: '600px',
    width: '100%',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem',
    borderBottom: '2px solid #9b59b6',
    paddingBottom: '1rem',
  };

  const infoRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem',
    borderBottom: '1px solid rgba(155, 89, 182, 0.3)',
    fontSize: '1.1rem',
  };

  const labelStyle = {
    color: '#9b59b6',
    fontWeight: 'bold',
  };

  const valueStyle = {
    color: '#fff',
  };

  const buttonStyle = {
    margin: '0.5rem',
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '3px 3px 10px rgba(0, 0, 0, 0.6)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  const logoutButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e74c3c',
    color: '#fff',
    width: '100%',
    marginTop: '2rem',
  };

  const backButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#555',
    color: '#fff',
    width: '100%',
  };

  const buttonHoverStyle = {
    transform: 'scale(1.05)',
    boxShadow: '5px 5px 15px rgba(0, 0, 0, 0.8)',
  };

  if (!user) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#9b59b6' }}>
            Profile
          </h1>
          <p style={{ fontSize: '1rem', color: '#aaa' }}>Account Information</p>
        </div>

        {/* Avatar Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={() => setHover(h => ({ ...h, avatar: true }))}
            onMouseLeave={() => setHover(h => ({ ...h, avatar: false }))}
            title="Click to change avatar"
          >
            <img
              src={avatarUrl}
              alt={`${user.username}'s avatar`}
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #9b59b6',
                boxShadow: '0 0 20px rgba(155, 89, 182, 0.4)',
                transition: 'opacity 0.2s',
                opacity: hover.avatar ? 0.7 : 1,
              }}
            />
            {hover.avatar && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.8rem', fontWeight: 600,
              }}>
                📷 Change
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '6px',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                backgroundColor: '#9b59b6', color: '#fff', opacity: avatarUploading ? 0.6 : 1,
              }}
            >
              {avatarUploading ? 'Uploading…' : 'Upload Photo'}
            </button>
            <button
              onClick={handleAvatarRemove}
              disabled={avatarUploading}
              style={{
                padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '6px',
                border: '1px solid rgba(155,89,182,0.4)', cursor: 'pointer', fontWeight: 600,
                backgroundColor: 'transparent', color: '#aaa',
              }}
            >
              Remove
            </button>
          </div>
          {avatarMsg && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: avatarMsg.includes('fail') || avatarMsg.includes('must') ? '#e74c3c' : '#2ecc71' }}>
              {avatarMsg}
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading profile...</p>
          </div>
        ) : (
          <div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>Username:</span>
              <span style={valueStyle}>{user.username}</span>
            </div>

            <div style={infoRowStyle}>
              <span style={labelStyle}>User ID:</span>
              <span style={valueStyle}>{user.id}</span>
            </div>

            {playerStats?.email && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Email:</span>
                <span style={valueStyle}>{playerStats.email}</span>
              </div>
            )}

            {playerStats?.displayName && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Display Name:</span>
                <span style={valueStyle}>{playerStats.displayName}</span>
              </div>
            )}

            {playerStats?.createdAt && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Account Created:</span>
                <span style={valueStyle}>
                  {new Date(playerStats.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {playerStats?.lastLogin && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Last Login:</span>
                <span style={valueStyle}>
                  {new Date(playerStats.lastLogin).toLocaleString()}
                </span>
              </div>
            )}

            {/* Alchemy Level */}
            <div style={infoRowStyle}>
              <span style={labelStyle}>Alchemy Level:</span>
              <span style={valueStyle}>{alchemyPlayer?.level ?? '—'}</span>
            </div>

            {/* Level Up Section */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(155, 89, 182, 0.15)',
              border: '1px solid rgba(155, 89, 182, 0.3)',
            }}>
              <h3 style={{ color: '#9b59b6', marginTop: 0, marginBottom: '1rem', fontSize: '1.3rem' }}>
                ⬆️ Level Up
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="password"
                  placeholder="Enter secret password"
                  value={secretPassword}
                  onChange={e => setSecretPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLevelUp()}
                  style={{
                    flex: 1,
                    minWidth: '180px',
                    padding: '0.75rem 1rem',
                    fontSize: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(155, 89, 182, 0.4)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleLevelUp}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#9b59b6',
                    color: '#fff',
                    margin: 0,
                    ...(hover.levelUp ? buttonHoverStyle : {}),
                  }}
                  onMouseEnter={() => setHover(h => ({ ...h, levelUp: true }))}
                  onMouseLeave={() => setHover(h => ({ ...h, levelUp: false }))}
                >
                  ⬆️ Level Up
                </button>
              </div>
              {levelUpMsg && (
                <p style={{
                  marginTop: '0.75rem',
                  marginBottom: 0,
                  fontSize: '0.9rem',
                  color: levelUpMsg.includes('success') ? '#2ecc71' : '#e74c3c',
                }}>
                  {levelUpMsg}
                </p>
              )}
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button
                style={{
                  ...logoutButtonStyle,
                  ...(hover.logout ? buttonHoverStyle : {}),
                }}
                onMouseEnter={() => setHover({ ...hover, logout: true })}
                onMouseLeave={() => setHover({ ...hover, logout: false })}
                onClick={handleLogout}
              >
                🚪 Logout
              </button>

              <Link to="/lexicon-dashboard">
                <button
                  style={{
                    ...backButtonStyle,
                    ...(hover.back ? buttonHoverStyle : {}),
                  }}
                  onMouseEnter={() => setHover({ ...hover, back: true })}
                  onMouseLeave={() => setHover({ ...hover, back: false })}
                >
                  ← Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

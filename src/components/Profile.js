import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { useAvatar } from '../hooks/useAvatar';
import { getApiUrls } from '../utils/apiUrls';
import { clearMobileToken } from '../utils/apiFetch';
import NotificationSettings from './NotificationSettings';
import background from '../assets/images/lexicon_room.jpg';
import './NotificationBell.css';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [playerStats, setPlayerStats] = useState(null);
  const [alchemyPlayer, setAlchemyPlayer] = useState(null);
  const [pokeStats, setPokeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [levelUpMsg, setLevelUpMsg] = useState('');
  const [notifPrefs, setNotifPrefs] = useState(null);
  const fileInputRef = useRef(null);

  const { avatarUrl, uploadAvatar, removeAvatar } = useAvatar(user?.username);
  const { lexiconApiUrl, alchemyApiUrl, pokemonApiUrl } = getApiUrls();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    const fetchPlayerStats = async () => {
      try {
        const res = await fetch(`${lexiconApiUrl}/api/players/${user.id}`, { credentials: 'include' });
        if (res.ok) setPlayerStats(await res.json());
      } catch (err) {
        console.error('Error fetching player stats:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAlchemyPlayer = async () => {
      try {
        const res = await fetch(`${alchemyApiUrl}/api/player/${user.id}`, { credentials: 'include' });
        if (res.ok) setAlchemyPlayer(await res.json());
      } catch (err) {
        console.error('Error fetching alchemy player:', err);
      }
    };

    const fetchPokeStats = async () => {
      try {
        const res = await fetch(`${pokemonApiUrl}/api/pokemon/player/stats`, { credentials: 'include' });
        if (res.ok) setPokeStats(await res.json());
      } catch (err) {
        console.error('Error fetching poke stats:', err);
      }
    };

    const fetchNotifPrefs = async () => {
      try {
        const res = await fetch(`${lexiconApiUrl}/api/notifications/prefs?userId=${user.id}`);
        if (res.ok) setNotifPrefs(await res.json());
      } catch (err) {
        console.error('Error fetching notification prefs:', err);
      }
    };

    fetchPlayerStats();
    fetchAlchemyPlayer();
    fetchPokeStats();
    fetchNotifPrefs();
  }, [user, navigate, lexiconApiUrl, alchemyApiUrl, pokemonApiUrl]);

  const updateNotifPrefs = useCallback(async (next) => {
    setNotifPrefs(next);
    try {
      await fetch(`${lexiconApiUrl}/api/notifications/prefs?userId=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.error('Error saving notification prefs:', err);
    }
  }, [lexiconApiUrl, user]);

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
        setLevelUpMsg(`Failed: ${await res.text()}`);
      } else {
        setAlchemyPlayer(await res.json());
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
    // Android shell: drop the bearer token too, or the app silently re-authenticates
    clearMobileToken();
    navigate('/');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setAvatarMsg('File must be under 2 MB'); return; }
    setAvatarUploading(true);
    setAvatarMsg('');
    try {
      await uploadAvatar(file, user?.id);
      setAvatarMsg('Avatar updated!');
    } catch {
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

  if (!user) return null;

  const infoRows = [
    { label: 'User ID',      value: user.id },
    playerStats?.email       && { label: 'Email',       value: playerStats.email },
    playerStats?.createdAt   && { label: 'Member Since', value: new Date(playerStats.createdAt).toLocaleDateString() },
    playerStats?.lastLogin   && { label: 'Last Login',   value: new Date(playerStats.lastLogin).toLocaleString() },
  ].filter(Boolean);

  return (
    <div
      className="profile-page"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.78)), url(${background})` }}
    >
      <div className="profile-card">

        {/* Top bar */}
        <div className="profile-topbar">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
          <span className="profile-topbar-title">PROFILE</span>
          <div className="profile-topbar-spacer" />
        </div>

        <div className="profile-body">

          {/* Avatar */}
          <div className="profile-avatar-section">
            <div
              className="profile-avatar-wrapper"
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={() => setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
              title="Click to change avatar"
            >
              <img
                src={avatarUrl}
                alt={`${user.username}'s avatar`}
                className={`profile-avatar-img${avatarHovered ? ' dimmed' : ''}`}
              />
              {avatarHovered && (
                <div className="profile-avatar-overlay">📷 Change</div>
              )}
            </div>

            <h2 className="profile-username">{user.username}</h2>
            {playerStats?.displayName && playerStats.displayName !== user.username && (
              <p className="profile-displayname">{playerStats.displayName}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />

            <div className="avatar-actions">
              <button
                className="avatar-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? 'Uploading…' : 'Upload Photo'}
              </button>
              <button className="avatar-remove-btn" onClick={handleAvatarRemove} disabled={avatarUploading}>
                Remove
              </button>
            </div>
            {avatarMsg && (
              <p className={`avatar-msg ${avatarMsg.includes('fail') || avatarMsg.includes('must') ? 'error' : 'success'}`}>
                {avatarMsg}
              </p>
            )}
          </div>

          {loading ? (
            <p className="profile-loading">Loading profile…</p>
          ) : (
            <>
              {/* Game Stats */}
              <div className="game-stats">
                <div className="game-stat-card alchemy">
                  <span className="game-stat-icon">⚗️</span>
                  <span className="game-stat-label">Alchemy</span>
                  <span className="game-stat-level">Lv. {alchemyPlayer?.level ?? '—'}</span>
                </div>
                <div className="game-stat-card pokemon">
                  <span className="game-stat-icon">⚡</span>
                  <span className="game-stat-label">PokéWorld</span>
                  <span className="game-stat-level">Lv. {pokeStats?.level ?? '—'}</span>
                </div>
              </div>

              {/* Account Info */}
              <div className="account-info">
                {infoRows.map((row, i) => (
                  <div className="info-row" key={i}>
                    <span className="info-label">{row.label}</span>
                    <span className="info-value">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Notification Settings */}
              {notifPrefs && (
                <div className="profile-notif-section">
                  <h3 className="levelup-title">🔔 Notification Settings</h3>
                  <NotificationSettings
                    userId={user.id}
                    prefs={notifPrefs}
                    updatePrefs={updateNotifPrefs}
                  />
                </div>
              )}

              {/* Level Up */}
              <div className="levelup-section">
                <h3 className="levelup-title">⬆️ Alchemy Level Up</h3>
                <div className="levelup-row">
                  <input
                    type="password"
                    placeholder="Secret password"
                    value={secretPassword}
                    onChange={e => setSecretPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLevelUp()}
                    className="levelup-input"
                  />
                  <button className="levelup-btn" onClick={handleLevelUp}>
                    Level Up
                  </button>
                </div>
                {levelUpMsg && (
                  <p className={`levelup-msg ${levelUpMsg.includes('success') ? 'success' : 'error'}`}>
                    {levelUpMsg}
                  </p>
                )}
              </div>

              {/* Logout */}
              <button className="logout-btn" onClick={handleLogout}>
                🚪 Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

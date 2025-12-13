import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import '../styles/MediaPlayer.css';

function Audiobooks() {
    const { user } = useContext(UserContext);
    const [audiobooks, setAudiobooks] = useState([]);
    const [currentBook, setCurrentBook] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [error, setError] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistMode, setPlaylistMode] = useState(false);
    const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('library');
    const [editingMedia, setEditingMedia] = useState(null);
    const [editFormData, setEditFormData] = useState({ title: '', description: '', isPublic: true });
    const [showEditModal, setShowEditModal] = useState(false);
    const audioRef = useRef(null);
    const navigate = useNavigate();

    const lexiconApiUrl = process.env.REACT_APP_LEXICON_API_URL || 'http://localhost:36568';

    useEffect(() => {
        if (user === undefined) return;
        if (user === null) {
            navigate('/login');
            return;
        }
        fetchAudiobooks();
        fetchPlaylists();
    }, [user]);

    const fetchAudiobooks = async () => {
        try {
            const [userResp, publicResp] = await Promise.all([
                fetch(`${lexiconApiUrl}/api/media/user/${user.id}`, { credentials: 'include' }),
                fetch(`${lexiconApiUrl}/api/media/public`, { credentials: 'include' })
            ]);

            if (userResp.status === 401 || publicResp.status === 401) {
                navigate('/login');
                return;
            }

            const userMedia = userResp.ok ? await userResp.json() : [];
            const publicMedia = publicResp.ok ? await publicResp.json() : [];

            userMedia.forEach(m => { m.isPersonal = !m.isPublic; });
            publicMedia.forEach(m => { m.isPersonal = false; });

            const combined = [...userMedia, ...publicMedia];
            const map = new Map();
            combined.forEach(item => map.set(item.id, item));
            const allMedia = Array.from(map.values());

            // Filter only audiobooks
            const audiobooksOnly = allMedia.filter(media => {
                const mediaTypeValue = media.mediaType || media.type || '';
                return mediaTypeValue === 'AUDIOBOOK' ||
                       media.filePath?.match(/\.(mp3|m4a|m4b|aac)$/i);
            });
            
            setAudiobooks(audiobooksOnly);
        } catch (err) {
            setError('Error connecting to server: ' + err.message);
        }
    };

    const fetchPlaylists = async () => {
        try {
            const [userResp, publicResp] = await Promise.all([
                fetch(`${lexiconApiUrl}/api/playlists/user/${user.id}`, { credentials: 'include' }),
                fetch(`${lexiconApiUrl}/api/playlists/public`, { credentials: 'include' })
            ]);

            if (userResp.ok || publicResp.ok) {
                const userPlaylists = userResp.ok ? await userResp.json() : [];
                const publicPlaylists = publicResp.ok ? await publicResp.json() : [];
                
                const audiobookPlaylists = [...userPlaylists, ...publicPlaylists].filter(
                    p => p.mediaType === 'AUDIOBOOK'
                );
                setPlaylists(audiobookPlaylists);
            }
        } catch (err) {
            console.log('Could not fetch playlists:', err.message);
        }
    };

    const loadPlaylist = async (playlistId) => {
        try {
            const resp = await fetch(`${lexiconApiUrl}/api/playlists/${playlistId}`, {
                credentials: 'include'
            });

            if (resp.ok) {
                const playlist = await resp.json();
                const playlistBooks = playlist.items.map(item => item.mediaFile);
                setAudiobooks(playlistBooks);
                setSelectedPlaylist(playlist);
                setPlaylistMode(true);
                setFilterType('all');
                setActiveTab('library');
                
                if (playlistBooks.length > 0) {
                    playBook(playlistBooks[0], 0);
                }
            }
        } catch (err) {
            setError('Failed to load playlist: ' + err.message);
        }
    };

    const exitPlaylistMode = () => {
        setPlaylistMode(false);
        setSelectedPlaylist(null);
        fetchAudiobooks();
    };

    const getFilteredAudiobooks = () => {
        if (filterType === 'all') return audiobooks;
        return audiobooks.filter(book => 
            filterType === 'personal' ? book.isPersonal : !book.isPersonal
        );
    };

    const playBook = (book, index) => {
        setCurrentBook(book);
        setCurrentIndex(index);
        setError('');
        setIsPlaying(true);

        // Media Session API
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: book.title || 'Audiobook',
                artist: book.description || 'Lexicon Audiobooks',
                album: 'Audiobooks',
                artwork: [
                    { src: '/manifest.json', sizes: '96x96', type: 'image/png' },
                    { src: '/manifest.json', sizes: '192x192', type: 'image/png' },
                    { src: '/manifest.json', sizes: '512x512', type: 'image/png' }
                ]
            });
        }
    };

    // Load saved playback position for audiobook
    const loadPlaybackPosition = async (mediaFileId) => {
        try {
            const resp = await fetch(
                `${lexiconApiUrl}/api/playback/position/${user.id}/${mediaFileId}`,
                { credentials: 'include' }
            );
            
            if (resp.ok) {
                const data = await resp.json();
                if (data.found && data.position > 0) {
                    // Wait for audio element to be ready
                    setTimeout(() => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = data.position;
                            setCurrentTime(data.position);
                            console.log(`Resumed audiobook at ${Math.floor(data.position)}s (${Math.floor(data.progressPercentage)}%)`);
                        }
                    }, 100);
                }
            }
        } catch (err) {
            console.log('Could not load playback position:', err.message);
        }
    };

    // Save playback position
    const savePlaybackPosition = async (position, duration, completed = false) => {
        if (!currentBook || !user) return;
        
        try {
            await fetch(`${lexiconApiUrl}/api/playback/position`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userId: user.id,
                    mediaFileId: currentBook.id,
                    position: Math.floor(position),
                    duration: Math.floor(duration),
                    completed: completed
                })
            });
        } catch (err) {
            console.log('Could not save playback position:', err.message);
        }
    };

    // Auto-save position every 10 seconds
    useEffect(() => {
        if (!currentBook || !isPlaying) return;
        
        const interval = setInterval(() => {
            if (audioRef.current && duration > 0) {
                const position = audioRef.current.currentTime;
                const isCompleted = (duration - position) < 30; // Within 30 seconds of end
                savePlaybackPosition(position, duration, isCompleted);
            }
        }, 10000); // Save every 10 seconds
        
        return () => clearInterval(interval);
    }, [currentBook, isPlaying, duration]);

    // Save position when pausing or changing books
    useEffect(() => {
        return () => {
            if (currentBook && audioRef.current && duration > 0) {
                const position = audioRef.current.currentTime;
                const isCompleted = (duration - position) < 30;
                savePlaybackPosition(position, duration, isCompleted);
            }
        };
    }, [currentBook]);

    useEffect(() => {
        if ('mediaSession' in navigator && currentBook) {
            navigator.mediaSession.setActionHandler('play', () => {
                if (audioRef.current) {
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                }
            });

            navigator.mediaSession.setActionHandler('seekbackward', () => {
                if (audioRef.current) {
                    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 30);
                }
            });

            navigator.mediaSession.setActionHandler('seekforward', () => {
                if (audioRef.current) {
                    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30);
                }
            });

            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [currentBook, isPlaying, duration]);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const skipBackward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, currentTime - 30);
        }
    };

    const skipForward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(duration, currentTime + 30);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = async () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
            // Load saved playback position once audio is ready
            if (currentBook) {
                await loadPlaybackPosition(currentBook.id);
            }
        }
    };

    const handleSeek = (e) => {
        const newTime = (e.target.value / 100) * duration;
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = e.target.value / 100;
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    };

    const formatTime = (time) => {
        if (isNaN(time)) return '0:00';
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return mb.toFixed(2) + ' MB';
    };

    const getStreamUrl = (book) => {
        return `${lexiconApiUrl}/api/media/stream/${book.id}`;
    };

    const openEditModal = (media, e) => {
        e.stopPropagation();
        setEditingMedia(media);
        setEditFormData({
            title: media.title,
            description: media.description || '',
            isPublic: media.isPublic
        });
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingMedia(null);
        setEditFormData({ title: '', description: '', isPublic: true });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const updatedMedia = {
                ...editingMedia,
                title: editFormData.title,
                description: editFormData.description,
                isPublic: editFormData.isPublic
            };

            const resp = await fetch(`${lexiconApiUrl}/api/media/${editingMedia.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updatedMedia)
            });

            if (resp.ok) {
                await fetchAudiobooks();
                closeEditModal();
            } else {
                setError('Failed to update media');
            }
        } catch (err) {
            setError('Error updating media: ' + err.message);
        }
    };

    return (
        <div className="media-player-container">
            <div className="media-player-header">
                <h1>📚 Audiobooks</h1>
                <button onClick={() => navigate('/lexicon-dashboard')} className="back-button">
                    Back to Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {currentBook && (
                <audio
                    ref={audioRef}
                    crossOrigin="use-credentials"
                    src={getStreamUrl(currentBook)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => setError('Failed to load audiobook')}
                    autoPlay={isPlaying}
                />
            )}

            <div className="media-player-layout">
                {/* Audiobook Player */}
                <div className="audio-player-section">
                    {currentBook ? (
                        <div className="audio-player-controls">
                            <div className="now-playing">
                                <h2>Now Playing</h2>
                                <h3>{currentBook.title}</h3>
                                <p>{currentBook.description}</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="progress-container">
                                <span className="time">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={(currentTime / duration) * 100 || 0}
                                    onChange={handleSeek}
                                    className="progress-bar"
                                />
                                <span className="time">{formatTime(duration)}</span>
                            </div>

                            {/* Playback Controls */}
                            <div className="playback-controls">
                                <button onClick={skipBackward} className="control-button prev-button">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
                                    </svg>
                                    <span>-30s</span>
                                </button>
                                <button onClick={togglePlayPause} className="control-button play-pause-button">
                                    {isPlaying ? (
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                                        </svg>
                                    ) : (
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z"/>
                                        </svg>
                                    )}
                                </button>
                                <button onClick={skipForward} className="control-button next-button">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                                    </svg>
                                    <span>+30s</span>
                                </button>
                            </div>

                            {/* Volume and Speed Controls */}
                            <div className="audio-options">
                                <div className="volume-control">
                                    <label>🔊 Volume</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={volume * 100}
                                        onChange={handleVolumeChange}
                                        className="volume-slider"
                                    />
                                    <span className="volume-value">{Math.round(volume * 100)}%</span>
                                </div>
                                <div className="speed-control">
                                    <label>⚡ Speed</label>
                                    <div className="speed-buttons">
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                            <button
                                                key={speed}
                                                className={`speed-button ${playbackSpeed === speed ? 'active' : ''}`}
                                                onClick={() => handleSpeedChange(speed)}
                                            >
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-track-selected">
                            <p>📚 Select an audiobook to start listening</p>
                        </div>
                    )}
                </div>

                {/* Audiobook Library */}
                <div className="playlist-section">
                    <div className="playlist-header">
                        <h2>{playlistMode ? `📚 ${selectedPlaylist?.name}` : 'My Audiobooks'}</h2>
                        {playlistMode && (
                            <button onClick={exitPlaylistMode} className="exit-playlist-btn">
                                ← Back to Library
                            </button>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button
                            className={`tab-button ${activeTab === 'library' ? 'active' : ''}`}
                            onClick={() => setActiveTab('library')}
                        >
                            📚 Library
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'playlists' ? 'active' : ''}`}
                            onClick={() => setActiveTab('playlists')}
                        >
                            📋 Playlists
                        </button>
                    </div>

                    {activeTab === 'library' ? (
                        <>
                            <div className="filter-buttons">
                                <button
                                    className={filterType === 'all' ? 'active' : ''}
                                    onClick={() => setFilterType('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={filterType === 'personal' ? 'active' : ''}
                                    onClick={() => setFilterType('personal')}
                                >
                                    Personal
                                </button>
                                <button
                                    className={filterType === 'public' ? 'active' : ''}
                                    onClick={() => setFilterType('public')}
                                >
                                    Public
                                </button>
                            </div>

                    <div className="audio-list">
                        {getFilteredAudiobooks().length === 0 ? (
                            <p className="no-audio">No audiobooks found</p>
                        ) : (
                            getFilteredAudiobooks().map((book, index) => (
                                <div
                                    key={book.id}
                                    className={`audio-item ${currentBook?.id === book.id ? 'active' : ''}`}
                                    onClick={() => playBook(book, index)}
                                >
                                    <div className="audio-item-info">
                                        <h4>📖 {book.title}</h4>
                                        <p className="audio-description">{book.description}</p>
                                        <div className="audio-meta">
                                            <span className="audio-type">
                                                {book.isPersonal ? '🔒 Personal' : '🌐 Public'}
                                            </span>
                                            <span className="audio-size">{formatFileSize(book.fileSize)}</span>
                                        </div>
                                    </div>
                                    <div className="media-item-actions">
                                        {currentBook?.id === book.id && isPlaying && (
                                            <span className="playing-indicator">♫</span>
                                        )}
                                        {book.uploadedBy === user?.id && (
                                            <button
                                                className="edit-media-btn"
                                                onClick={(e) => openEditModal(book, e)}
                                                title="Edit media"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                        </>
                    ) : (
                        <>
                            {/* Playlists Tab */}
                            <div className="playlist-selector-container">
                                <input
                                    type="text"
                                    placeholder="🔍 Search playlists..."
                                    value={playlistSearchQuery}
                                    onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                                    className="playlist-search-input"
                                />
                                
                                <div className="playlists-grid">
                                    {playlists
                                        .filter(pl => 
                                            !playlistSearchQuery || 
                                            pl.name.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
                                            pl.description?.toLowerCase().includes(playlistSearchQuery.toLowerCase())
                                        )
                                        .map(pl => (
                                            <div
                                                key={pl.id}
                                                className="playlist-card"
                                                onClick={() => loadPlaylist(pl.id)}
                                            >
                                                <div className="playlist-icon">📚</div>
                                                <div className="playlist-info">
                                                    <h3>{pl.name}</h3>
                                                    <p>{pl.description || 'No description'}</p>
                                                    <span className="playlist-count">{pl.items?.length || 0} books</span>
                                                    <span className="playlist-type-badge">{pl.mediaType}</span>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {playlists.filter(pl => 
                                        !playlistSearchQuery || 
                                        pl.name.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
                                        pl.description?.toLowerCase().includes(playlistSearchQuery.toLowerCase())
                                    ).length === 0 && (
                                        <p className="no-playlists">No audiobook playlists found</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>✏️ Edit Audiobook</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={editFormData.title}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    rows="4"
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={editFormData.isPublic}
                                        onChange={(e) => setEditFormData({ ...editFormData, isPublic: e.target.checked })}
                                    />
                                    {' '}Public (visible to all users)
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="save-btn">Save Changes</button>
                                <button type="button" onClick={closeEditModal} className="cancel-btn">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Audiobooks;

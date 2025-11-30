import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import '../styles/MediaPlayer.css';

function AudioPlayer() {
    const { user } = useContext(UserContext);
    const [audioFiles, setAudioFiles] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [filterType, setFilterType] = useState('all'); // all, personal, public
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [error, setError] = useState('');
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistMode, setPlaylistMode] = useState(false);
    const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('library'); // 'library' or 'playlists'
    const [editingMedia, setEditingMedia] = useState(null);
    const [editFormData, setEditFormData] = useState({ title: '', description: '' });
    const [showEditModal, setShowEditModal] = useState(false);
    const audioRef = useRef(null);
    const navigate = useNavigate();

    const lexiconApiUrl = process.env.REACT_APP_LEXICON_API_URL || 'http://localhost:36568';

    useEffect(() => {
        // Wait until user context resolves
        if (user === undefined) return; // still loading
        if (user === null) {
            navigate('/login');
            return;
        }
        fetchAudioFiles();
        fetchPlaylists();
    }, [user]);

    const fetchAudioFiles = async () => {
        try {
            // fetch both personal and public media then merge
            const [userResp, publicResp] = await Promise.all([
                fetch(`${lexiconApiUrl}/api/media/user/${user.id}`, { credentials: 'include' }),
                fetch(`${lexiconApiUrl}/api/media/public`, { credentials: 'include' })
            ]);

            if (userResp.status === 401 || publicResp.status === 401) {
                navigate('/login');
                return;
            }

            if (!userResp.ok && !publicResp.ok) {
                setError('Failed to fetch audio files');
                return;
            }

            const userMedia = userResp.ok ? await userResp.json() : [];
            const publicMedia = publicResp.ok ? await publicResp.json() : [];

            // mark personal items based on isPublic field (personal = NOT public)
            userMedia.forEach(m => { m.isPersonal = !m.isPublic; });
            publicMedia.forEach(m => { m.isPersonal = false; }); // public files are never personal

            const combined = [...userMedia, ...publicMedia];
            const map = new Map();
            combined.forEach(item => map.set(item.id, item));
            const allMedia = Array.from(map.values());

            console.log('AudioPlayer: Fetched media files:', allMedia.length);
            console.log('AudioPlayer: Media types:', allMedia.map(m => ({ id: m.id, title: m.title, mediaType: m.mediaType, type: m.type })));

            // Filter only audio files (check both type and mediaType for compatibility)
            const audioOnly = allMedia.filter(media => {
                const mediaTypeValue = media.mediaType || media.type || '';
                return mediaTypeValue === 'AUDIO' || 
                       mediaTypeValue === 'MUSIC' ||
                       mediaTypeValue === 'AUDIOBOOK' ||
                       media.filePath?.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i);
            });
            console.log('AudioPlayer: Filtered audio files:', audioOnly.length);
            console.log('AudioPlayer: Audio files:', audioOnly.map(m => ({ id: m.id, title: m.title, mediaType: m.mediaType })));
            setAudioFiles(audioOnly);
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
                
                // Filter for music/audio playlists only
                const audioPlaylists = [...userPlaylists, ...publicPlaylists].filter(
                    p => p.mediaType === 'MUSIC' || p.mediaType === 'AUDIO' || p.mediaType === 'AUDIOBOOK'
                );
                setPlaylists(audioPlaylists);
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
                const playlistTracks = playlist.items.map(item => item.mediaFile);
                setAudioFiles(playlistTracks);
                setSelectedPlaylist(playlist);
                setPlaylistMode(true);
                setAutoPlay(true); // Enable autoplay for playlists
                setFilterType('all');
                setActiveTab('library'); // Switch to library tab to show the loaded tracks
                
                // Auto-play first track
                if (playlistTracks.length > 0) {
                    playTrack(playlistTracks[0], 0);
                }
            }
        } catch (err) {
            setError('Failed to load playlist: ' + err.message);
        }
    };

    const exitPlaylistMode = () => {
        setPlaylistMode(false);
        setSelectedPlaylist(null);
        setAutoPlay(false);
        fetchAudioFiles();
    };

    const openEditModal = (media, e) => {
        e.stopPropagation(); // Prevent playing the track
        setEditingMedia(media);
        setEditFormData({
            title: media.title,
            description: media.description || ''
        });
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingMedia(null);
        setEditFormData({ title: '', description: '' });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const updatedMedia = {
                ...editingMedia,
                title: editFormData.title,
                description: editFormData.description
            };

            const resp = await fetch(`${lexiconApiUrl}/api/media/${editingMedia.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updatedMedia)
            });

            if (resp.ok) {
                // Refresh the media list
                await fetchAudioFiles();
                closeEditModal();
            } else {
                setError('Failed to update media');
            }
        } catch (err) {
            setError('Error updating media: ' + err.message);
        }
    };

    const getFilteredAudio = () => {
        if (filterType === 'all') return audioFiles;
        return audioFiles.filter(audio => 
            filterType === 'personal' ? audio.isPersonal : !audio.isPersonal
        );
    };

    const getStreamUrl = (audio) => {
        return `${lexiconApiUrl}/api/media/stream/${audio.id}`;
    };

    const playTrack = (audio, index) => {
        setCurrentTrack(audio);
        setCurrentIndex(index);
        setError('');
        setIsPlaying(true);
    };

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

    const playNext = () => {
        const filtered = getFilteredAudio();
        if (filtered.length === 0) return;
        
        const nextIndex = (currentIndex + 1) % filtered.length;
        playTrack(filtered[nextIndex], nextIndex);
    };

    const playPrevious = () => {
        const filtered = getFilteredAudio();
        if (filtered.length === 0) return;
        
        const prevIndex = currentIndex === 0 ? filtered.length - 1 : currentIndex - 1;
        playTrack(filtered[prevIndex], prevIndex);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        const seekTime = (e.target.value / 100) * duration;
        if (audioRef.current) {
            audioRef.current.currentTime = seekTime;
            setCurrentTime(seekTime);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = e.target.value / 100;
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const handleEnded = () => {
        if (autoPlay) {
            playNext();
        } else {
            setIsPlaying(false);
        }
    };

    const formatTime = (time) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return mb.toFixed(2) + ' MB';
    };

    return (
        <div className="media-player-container">
            <div className="media-player-header">
                <h1>Audio Player</h1>
                <button onClick={() => navigate('/lexicon-dashboard')} className="back-button">
                    Back to Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Audio Element (hidden) */}
            {currentTrack && (
                <audio
                    ref={audioRef}
                    src={getStreamUrl(currentTrack)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => setError('Failed to load audio stream')}
                    autoPlay={isPlaying}
                />
            )}

            <div className="media-player-layout">
                {/* Audio Player Controls */}
                <div className="audio-player-section">
                    {currentTrack ? (
                        <div className="audio-player-controls">
                            <div className="now-playing">
                                <h2>Now Playing</h2>
                                <h3>{currentTrack.title}</h3>
                                <p>{currentTrack.description}</p>
                                {playlistMode && selectedPlaylist && (
                                    <div className="playlist-info">
                                        <span className="playlist-badge">
                                            📋 {selectedPlaylist.name}
                                        </span>
                                        <span className="track-position">
                                            Track {currentIndex + 1} of {audioFiles.length}
                                        </span>
                                    </div>
                                )}
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
                                <button onClick={playPrevious} className="control-button">
                                    ⏮ Previous
                                </button>
                                <button onClick={togglePlayPause} className="control-button play-pause">
                                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                                </button>
                                <button onClick={playNext} className="control-button">
                                    ⏭ Next
                                </button>
                            </div>

                            {/* Volume and Options */}
                            <div className="audio-options">
                                <div className="volume-control">
                                    <label>🔊 Volume:</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={volume * 100}
                                        onChange={handleVolumeChange}
                                        className="volume-slider"
                                    />
                                </div>
                                <div className="autoplay-control">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={autoPlay}
                                            onChange={(e) => setAutoPlay(e.target.checked)}
                                        />
                                        Auto-play next
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-track-selected">
                            <p>Select a track from the playlist to start listening</p>
                        </div>
                    )}
                </div>

                {/* Playlist Section */}
                <div className="playlist-section">
                    <div className="playlist-header">
                        {playlistMode ? (
                            <>
                                <h2>{selectedPlaylist?.name || 'Playlist'}</h2>
                                <button onClick={exitPlaylistMode} className="exit-playlist-btn">
                                    Exit Playlist Mode
                                </button>
                            </>
                        ) : (
                            <h2>Music Browser</h2>
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

                    {/* Tab Content */}
                    {activeTab === 'library' ? (
                        <>
                            {!playlistMode && (
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
                            )}

                            <div className="audio-list">
                                {getFilteredAudio().length === 0 ? (
                                    <p className="no-audio">No audio files found</p>
                                ) : (
                                    getFilteredAudio().map((audio, index) => (
                                        <div
                                            key={audio.id}
                                            className={`audio-item ${currentTrack?.id === audio.id ? 'active' : ''}`}
                                            onClick={() => playTrack(audio, index)}
                                            onDoubleClick={() => {
                                                playTrack(audio, index);
                                                togglePlayPause();
                                            }}
                                        >
                                            <div className="audio-item-info">
                                                <h4>{audio.title}</h4>
                                                <p className="audio-description">{audio.description}</p>
                                                <div className="audio-meta">
                                                    <span className="audio-type">
                                                        {audio.isPersonal ? '🔒 Personal' : '🌐 Public'}
                                                    </span>
                                                    <span className="audio-size">{formatFileSize(audio.fileSize)}</span>
                                                </div>
                                            </div>
                                            <div className="media-item-actions">
                                                {currentTrack?.id === audio.id && isPlaying && (
                                                    <span className="playing-indicator">♫</span>
                                                )}
                                                {audio.uploadedBy === user?.id && (
                                                    <button
                                                        className="edit-media-btn"
                                                        onClick={(e) => openEditModal(audio, e)}
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
                                                className="playlist-card-mini"
                                                onClick={() => loadPlaylist(pl.id)}
                                            >
                                                <div className="playlist-icon">🎵</div>
                                                <h4>{pl.name}</h4>
                                                <p>{pl.description}</p>
                                                <span className="playlist-type-badge">{pl.mediaType}</span>
                                            </div>
                                        ))
                                    }
                                    {playlists.filter(pl => 
                                        !playlistSearchQuery || 
                                        pl.name.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
                                        pl.description?.toLowerCase().includes(playlistSearchQuery.toLowerCase())
                                    ).length === 0 && (
                                        <p className="no-playlists">No playlists found</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Edit Media Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>✏️ Edit Media</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={editFormData.title}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    required
                                    placeholder="Enter media title"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    placeholder="Enter media description (optional)"
                                    rows="4"
                                />
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

export default AudioPlayer;

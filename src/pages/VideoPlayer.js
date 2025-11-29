import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import '../styles/MediaPlayer.css';

function VideoPlayer() {
    const { user } = useContext(UserContext);
    const [videos, setVideos] = useState([]);
    const [currentVideo, setCurrentVideo] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [filterType, setFilterType] = useState('all'); // all, personal, public
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState('');
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistMode, setPlaylistMode] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('library'); // 'library' or 'playlists'
    const [editingMedia, setEditingMedia] = useState(null);
    const [editFormData, setEditFormData] = useState({ title: '', description: '' });
    const [showEditModal, setShowEditModal] = useState(false);
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const navigate = useNavigate();

    const lexiconApiUrl = process.env.REACT_APP_LEXICON_API_URL || 'http://localhost:36568';

    useEffect(() => {
        // Wait until user is resolved by UserContext
        if (user === undefined) return; // still loading
        if (user === null) {
            navigate('/login');
            return;
        }
        fetchVideos();
        fetchPlaylists();
    }, [user]);

    const fetchVideos = async () => {
        try {
            // fetch user's personal media and public media and merge
            const [userResp, publicResp] = await Promise.all([
                fetch(`${lexiconApiUrl}/api/media/user/${user.id}`, { credentials: 'include' }),
                fetch(`${lexiconApiUrl}/api/media/public`, { credentials: 'include' })
            ]);

            if (userResp.status === 401 || publicResp.status === 401) {
                navigate('/login');
                return;
            }

            if (!userResp.ok && !publicResp.ok) {
                setError('Failed to fetch videos');
                return;
            }

            const userMedia = userResp.ok ? await userResp.json() : [];
            const publicMedia = publicResp.ok ? await publicResp.json() : [];

            // mark personal items
            userMedia.forEach(m => { m.isPersonal = true; });
            publicMedia.forEach(m => { if (m.isPersonal === undefined) m.isPersonal = false; });

            // merge and dedupe by id
            const combined = [...userMedia, ...publicMedia];
            const map = new Map();
            combined.forEach(item => map.set(item.id, item));
            const allMedia = Array.from(map.values());

            // Filter only video files (check both type and mediaType for compatibility)
            const videoFiles = allMedia.filter(media => {
                const mediaTypeValue = media.mediaType || media.type || '';
                return mediaTypeValue === 'VIDEO' || 
                       media.filePath?.match(/\.(mp4|avi|mkv|mov|webm|flv)$/i);
            });
            setVideos(videoFiles);
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
                
                // Filter for video playlists only
                const videoPlaylists = [...userPlaylists, ...publicPlaylists].filter(
                    p => p.mediaType === 'VIDEO'
                );
                setPlaylists(videoPlaylists);
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
                const playlistVideos = playlist.items.map(item => item.mediaFile);
                setVideos(playlistVideos);
                setSelectedPlaylist(playlist);
                setPlaylistMode(true);
                setAutoPlay(true); // Enable autoplay for playlists
                setFilterType('all');
                setActiveTab('library'); // Switch to library tab to show the loaded videos
                
                // Auto-play first video
                if (playlistVideos.length > 0) {
                    playVideo(playlistVideos[0], 0);
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
        fetchVideos();
    };

    const openEditModal = (media, e) => {
        e.stopPropagation(); // Prevent playing the video
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
                await fetchVideos();
                closeEditModal();
            } else {
                setError('Failed to update media');
            }
        } catch (err) {
            setError('Error updating media: ' + err.message);
        }
    };

    const getFilteredVideos = () => {
        if (filterType === 'all') return videos;
        return videos.filter(video => 
            filterType === 'personal' ? video.isPersonal : !video.isPersonal
        );
    };

    const playVideo = (video, index = 0) => {
        setCurrentVideo(video);
        setCurrentIndex(index);
        setError('');
    };

    const playNext = () => {
        const filtered = getFilteredVideos();
        if (filtered.length === 0) return;
        
        const nextIndex = (currentIndex + 1) % filtered.length;
        playVideo(filtered[nextIndex], nextIndex);
    };

    const playPrevious = () => {
        const filtered = getFilteredVideos();
        if (filtered.length === 0) return;
        
        const prevIndex = currentIndex === 0 ? filtered.length - 1 : currentIndex - 1;
        playVideo(filtered[prevIndex], prevIndex);
    };

    const handleVideoEnded = () => {
        if (autoPlay) {
            playNext();
        }
    };

    const getStreamUrl = (video) => {
        return `${lexiconApiUrl}/api/media/stream/${video.id}`;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="media-player-container">
            <div className="media-player-header">
                <h1>Video Player</h1>
                <button onClick={() => navigate('/lexicon-dashboard')} className="back-button">
                    Back to Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="media-player-layout">
                {/* Video Player Section */}
                <div className="player-section" ref={containerRef}>
                    {currentVideo ? (
                        <div className="video-player-wrapper">
                            <video
                                ref={videoRef}
                                controls
                                className={isFullscreen ? 'fullscreen-video' : 'video-player'}
                                src={getStreamUrl(currentVideo)}
                                onError={() => setError('Failed to load video stream')}
                                onEnded={handleVideoEnded}
                            >
                                Your browser does not support the video tag.
                            </video>
                            <div className="video-controls">
                                <h3>{currentVideo.title}</h3>
                                <p>{currentVideo.description}</p>
                                {playlistMode && selectedPlaylist && (
                                    <div className="playlist-info">
                                        <span className="playlist-badge">
                                            📋 {selectedPlaylist.name}
                                        </span>
                                        <span className="track-position">
                                            Video {currentIndex + 1} of {videos.length}
                                        </span>
                                    </div>
                                )}
                                <div className="video-button-controls">
                                    {playlistMode && (
                                        <>
                                            <button onClick={playPrevious} className="control-button">
                                                ⏮ Previous
                                            </button>
                                            <button onClick={playNext} className="control-button">
                                                ⏭ Next
                                            </button>
                                            <label className="autoplay-label">
                                                <input
                                                    type="checkbox"
                                                    checked={autoPlay}
                                                    onChange={(e) => setAutoPlay(e.target.checked)}
                                                />
                                                Auto-play next
                                            </label>
                                        </>
                                    )}
                                    <button onClick={toggleFullscreen} className="fullscreen-button">
                                        {isFullscreen ? '⊗ Exit Fullscreen' : '⛶ Fullscreen'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-video-selected">
                            <p>Select a video from the list to start playing</p>
                        </div>
                    )}
                </div>

                {/* Video List Section */}
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
                            <h2>Video Browser</h2>
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

                            <div className="video-list">
                                {getFilteredVideos().length === 0 ? (
                                    <p className="no-videos">No videos found</p>
                                ) : (
                                    getFilteredVideos().map((video, index) => (
                                        <div
                                            key={video.id}
                                            className={`video-item ${currentVideo?.id === video.id ? 'active' : ''}`}
                                            onClick={() => playVideo(video, index)}
                                        >
                                            <div className="video-item-info">
                                                <h4>{video.title}</h4>
                                                <p className="video-description">{video.description}</p>
                                                <div className="video-meta">
                                                    <span className="video-type">
                                                        {video.isPersonal ? '🔒 Personal' : '🌐 Public'}
                                                    </span>
                                                    <span className="video-size">{formatFileSize(video.fileSize)}</span>
                                                </div>
                                            </div>
                                            <div className="media-item-actions">
                                                {video.uploadedBy === user?.id && (
                                                    <button
                                                        className="edit-media-btn"
                                                        onClick={(e) => openEditModal(video, e)}
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
                                                <div className="playlist-icon">🎬</div>
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

export default VideoPlayer;

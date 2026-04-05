import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { getApiUrls } from '../utils/apiUrls';
import '../styles/MediaPlayer.css';
import './VideoLiveStream.css';

const CHANNEL = 'video';

function VideoLiveStream() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    
    const [streamState, setStreamState] = useState(null);
    const [queue, setQueue] = useState([]);
    const [currentMedia, setCurrentMedia] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [lastSyncTime, setLastSyncTime] = useState(null);
    
    const [availableMedia, setAvailableMedia] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [addingId, setAddingId] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [publicPlaylists, setPublicPlaylists] = useState([]);
    const [addingPlaylistId, setAddingPlaylistId] = useState(null);
    
    const videoRef = useRef(null);
    const playerContainerRef = useRef(null);
    const eventSourceRef = useRef(null);
    const syncIntervalRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const hasSyncedRef = useRef(false);
    const mediaEndedInProgressRef = useRef(false);
    
    const lexiconApiUrl = getApiUrls().lexiconApiUrl;

    // Fetch stream state
    const fetchStreamState = useCallback(async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/state?channel=${CHANNEL}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setStreamState(data.state);
                    if (data.state?.currentMediaId) {
                        const mediaResponse = await fetch(
                            `${lexiconApiUrl}/api/media/${data.state.currentMediaId}`,
                            { credentials: 'include' }
                        );
                        if (mediaResponse.ok) {
                            const mediaData = await mediaResponse.json();
                            setCurrentMedia(mediaData);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching stream state:', err);
        }
    }, [lexiconApiUrl]);

    // Fetch queue
    const fetchQueue = useCallback(async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/queue?channel=${CHANNEL}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setQueue(data.queue || []);
                }
            }
        } catch (err) {
            console.error('Error fetching queue:', err);
        }
    }, [lexiconApiUrl]);

    // Fetch available media
    const fetchAvailableMedia = useCallback(async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/eligible-media?channel=${CHANNEL}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.media) {
                    setAvailableMedia(data.media);
                }
            }
        } catch (err) {
            console.error('Error fetching available media:', err);
        }
    }, [lexiconApiUrl]);

    // Fetch public playlists for this channel
    const fetchPublicPlaylists = useCallback(async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/playlists/public?mediaType=VIDEO`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setPublicPlaylists(data || []);
            }
        } catch (err) {
            console.error('Error fetching public playlists:', err);
        }
    }, [lexiconApiUrl]);

    // Setup SSE connection with robust reconnection
    useEffect(() => {
        if (!user) return;

        let retryCount = 0;
        const maxRetries = 10;
        const baseRetryDelay = 1000;

        const setupSSE = () => {
            setConnectionStatus('connecting');
            
            const eventSource = new EventSource(`${lexiconApiUrl}/api/livestream/updates?channel=${CHANNEL}`);
            eventSourceRef.current = eventSource;

            eventSource.addEventListener('init', (event) => {
                const data = JSON.parse(event.data);
                if (data.state) {
                    setStreamState(data.state);
                    if (data.state.currentMedia) {
                        setCurrentMedia(data.state.currentMedia);
                    }
                }
                if (data.queue) setQueue(data.queue);
                setIsLoading(false);
                setConnectionStatus('connected');
                setLastSyncTime(new Date());
                retryCount = 0;
                
                if (data.state?.currentMediaId) {
                    if (data.state.currentMedia) {
                        setCurrentMedia(data.state.currentMedia);
                    } else {
                        fetch(`${lexiconApiUrl}/api/media/${data.state.currentMediaId}`, {
                            credentials: 'include'
                        })
                        .then(res => res.ok ? res.json() : null)
                        .then(mediaData => { if (mediaData) setCurrentMedia(mediaData); })
                        .catch(console.error);
                    }
                }
            });

            eventSource.addEventListener('state-update', (event) => {
                const data = JSON.parse(event.data);
                if (data.data) {
                    setStreamState(data.data);
                    setLastSyncTime(new Date());
                    
                    if (data.data.currentMedia) {
                        setCurrentMedia(data.data.currentMedia);
                    } else if (data.data.currentMediaId) {
                        fetch(`${lexiconApiUrl}/api/media/${data.data.currentMediaId}`, {
                            credentials: 'include'
                        })
                        .then(res => res.ok ? res.json() : null)
                        .then(mediaData => { if (mediaData) setCurrentMedia(mediaData); })
                        .catch(console.error);
                    }
                }
            });

            eventSource.addEventListener('queue-update', (event) => {
                const data = JSON.parse(event.data);
                if (data.data) {
                    const queueData = data.data;
                    if (Array.isArray(queueData)) {
                        setQueue(queueData);
                    } else if (queueData.items && Array.isArray(queueData.items)) {
                        setQueue(queueData.items);
                    }
                    setLastSyncTime(new Date());
                }
            });

            eventSource.onopen = () => setConnectionStatus('connected');

            eventSource.onerror = () => {
                setConnectionStatus('disconnected');
                eventSource.close();
                
                if (retryCount < maxRetries) {
                    const delay = Math.min(baseRetryDelay * Math.pow(2, retryCount), 30000);
                    retryCount++;
                    reconnectTimeoutRef.current = setTimeout(setupSSE, delay);
                } else {
                    setError('Lost connection to server. Please refresh the page.');
                }
            };
        };

        setupSSE();

        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [user, lexiconApiUrl]);

    // Initial data fetch
    useEffect(() => {
        if (user === undefined) return;
        if (user === null) { navigate('/login'); return; }
        fetchStreamState();
        fetchQueue();
        // Don't fetch available media on mount — defer to modal open
    }, [user, navigate, fetchStreamState, fetchQueue]);

    // Calculate real-time position
    const calculateCurrentPosition = useCallback(() => {
        if (!streamState || !streamState.currentStartTime) return 0;
        const startTime = new Date(streamState.currentStartTime).getTime();
        const elapsed = Date.now() - startTime;
        const initialPosition = streamState.currentPositionMs || 0;
        return Math.max(0, initialPosition + elapsed);
    }, [streamState]);

    // Sync video playback
    useEffect(() => {
        if (!videoRef.current || !streamState || !currentMedia) return;

        const syncPlayback = (isInitialSync = false) => {
            if (!videoRef.current) return;
            const serverPosition = calculateCurrentPosition();
            const currentPosition = videoRef.current.currentTime * 1000;
            const drift = Math.abs(currentPosition - serverPosition);
            
            if (isInitialSync || drift > 30000) {
                videoRef.current.currentTime = serverPosition / 1000;
            }
        };

        if (!hasSyncedRef.current) {
            syncPlayback(true);
            hasSyncedRef.current = true;
        }

        syncIntervalRef.current = setInterval(() => syncPlayback(false), 60000);
        return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
    }, [streamState, currentMedia, calculateCurrentPosition]);
    
    useEffect(() => { hasSyncedRef.current = false; }, [currentMedia?.id]);

    const handleSkip = useCallback(async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/skip?channel=${CHANNEL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: user.id })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.message || 'Failed to skip');
            } else {
                // Explicitly refresh state after skip — SSE may be throttled on locked screens
                hasSyncedRef.current = false;
                await fetchStreamState();
                await fetchQueue();
            }
        } catch (err) {
            setError('Error skipping: ' + err.message);
        }
    }, [lexiconApiUrl, user, fetchStreamState, fetchQueue]);

    // Media Session API — lock screen / Bluetooth / CarPlay controls
    useEffect(() => {
        if (!('mediaSession' in navigator) || !currentMedia) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentMedia.title || currentMedia.originalFilename || 'Unknown Video',
            artist: currentMedia.description || 'Video Live Stream',
            album: 'Lexicon Live Stream',
            artwork: [
                { src: '/logo192.png', sizes: '192x192', type: 'image/png' },
                { src: '/logo512.png', sizes: '512x512', type: 'image/png' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
            if (videoRef.current) videoRef.current.play();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (videoRef.current) videoRef.current.pause();
        });
        navigator.mediaSession.setActionHandler('nexttrack', async () => {
            // Pause current video to keep media session alive during skip
            if (videoRef.current) videoRef.current.pause();
            navigator.mediaSession.playbackState = 'paused';
            await handleSkip();
        });

        const el = videoRef.current;
        if (el) {
            const onPlay = () => { navigator.mediaSession.playbackState = 'playing'; };
            const onPause = () => { navigator.mediaSession.playbackState = 'paused'; };
            el.addEventListener('play', onPlay);
            el.addEventListener('pause', onPause);
            navigator.mediaSession.playbackState = el.paused ? 'paused' : 'playing';
            return () => {
                el.removeEventListener('play', onPlay);
                el.removeEventListener('pause', onPause);
            };
        }
    }, [currentMedia, handleSkip]);

    const handleVideoLoad = useCallback(() => {
        if (videoRef.current && streamState) {
            const serverPosition = calculateCurrentPosition();
            // Only seek if the track has been playing for a while (late joiner).
            // If < 15s, the offset is just loading latency — start from beginning.
            if (serverPosition > 15000) {
                videoRef.current.currentTime = serverPosition / 1000;
            } else {
                videoRef.current.currentTime = 0;
            }
            videoRef.current.play().catch(err => console.log('Autoplay prevented:', err));
        }
    }, [streamState, calculateCurrentPosition]);

    const handleMediaEnded = useCallback(async () => {
        if (mediaEndedInProgressRef.current) return;
        mediaEndedInProgressRef.current = true;
        
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/media-ended?channel=${CHANNEL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            if (!response.ok) {
                fetchStreamState();
                fetchQueue();
            }
        } catch (err) {
            console.error('Error notifying server of media end:', err);
            fetchStreamState();
            fetchQueue();
        } finally {
            setTimeout(() => { mediaEndedInProgressRef.current = false; }, 2000);
        }
    }, [lexiconApiUrl, fetchStreamState, fetchQueue]);

    // Fullscreen toggle
    const toggleFullscreen = useCallback(() => {
        const container = playerContainerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => setIsFullscreen(true))
                .catch(err => console.error('Error entering fullscreen:', err));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false))
                .catch(err => console.error('Error exiting fullscreen:', err));
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleAddToQueue = async (mediaFileId) => {
        if (addingId) return;
        setAddingId(mediaFileId);
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/queue?channel=${CHANNEL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: user.id, mediaFileId })
            });
            const data = await response.json();
            if (data.success) {
                fetchQueue();
            } else {
                setError(data.message || 'Failed to add to queue');
            }
        } catch (err) {
            setError('Error adding to queue: ' + err.message);
        } finally {
            setAddingId(null);
        }
    };

    const handleRemoveFromQueue = async (queueId) => {
        try {
            const response = await fetch(
                `${lexiconApiUrl}/api/livestream/queue/${queueId}?userId=${user.id}&channel=${CHANNEL}`,
                { method: 'DELETE', credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) fetchQueue();
            else setError(data.message || 'Failed to remove from queue');
        } catch (err) {
            setError('Error removing from queue: ' + err.message);
        }
    };

    const handleAddPlaylistToQueue = async (playlistId) => {
        if (addingPlaylistId) return;
        setAddingPlaylistId(playlistId);
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/queue/playlist?channel=${CHANNEL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: user.id, playlistId })
            });
            const data = await response.json();
            if (data.success) {
                fetchQueue();
                setShowPlaylistModal(false);
            } else {
                setError(data.message || 'Failed to add playlist to queue');
            }
        } catch (err) {
            setError('Error adding playlist to queue: ' + err.message);
        } finally {
            setAddingPlaylistId(null);
        }
    };

    const filteredMedia = availableMedia
        .filter(media => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (media.title || '').toLowerCase().includes(q) ||
                   (media.originalFilename || '').toLowerCase().includes(q) ||
                   (media.description || '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (sortBy === 'title') return (a.title || a.originalFilename || '').localeCompare(b.title || b.originalFilename || '');
            if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
            if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
            return 0;
        });

    if (isLoading) {
        return (
            <div className="media-player-container video-livestream-container">
                <div className="loading-container">
                    <div className="loading-spinner-animation"></div>
                    <p className="loading-text">Connecting to Video Stream...</p>
                    <p className="loading-subtext">Syncing with other viewers</p>
                </div>
            </div>
        );
    }

    return (
        <div className="media-player-container video-livestream-container">
            <div className="media-player-header">
                <h1>🎬 Video Live Stream</h1>
                <div className="header-right">
                    <span className={`connection-status ${connectionStatus}`}>
                        {connectionStatus === 'connected' ? '🟢 Connected' : 
                         connectionStatus === 'connecting' ? '🟡 Connecting...' : 
                         '🔴 Disconnected'}
                    </span>
                    <button className="back-button" onClick={() => navigate('/lexicon-dashboard')}>
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span>{error}</span>
                    {error.includes('Lost connection') ? (
                        <button className="reconnect-button" onClick={() => window.location.reload()}>
                            🔄 Reconnect
                        </button>
                    ) : (
                        <button className="dismiss-button" onClick={() => setError('')}>✕</button>
                    )}
                </div>
            )}

            {connectionStatus === 'disconnected' && !error && (
                <div className="warning-banner">
                    <span>⚠️ Connection lost. Attempting to reconnect...</span>
                </div>
            )}

            <div className="video-livestream-layout">
                {/* Video Player */}
                <div className="player-section video-player-section">
                    <div className="now-playing-header">
                        <span className="live-indicator">● LIVE</span>
                        <h2>Now Playing</h2>
                        {lastSyncTime && (
                            <span className="last-sync">
                                Last sync: {lastSyncTime.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    
                    {currentMedia ? (
                        <div className={`video-player-wrapper ${isFullscreen ? 'fullscreen' : ''}`} ref={playerContainerRef}>
                            <video
                                key={currentMedia.id}
                                ref={videoRef}
                                className="video-player"
                                src={`${lexiconApiUrl}/api/media/stream/${currentMedia.id}`}
                                autoPlay
                                muted={false}
                                playsInline
                                onLoadedData={handleVideoLoad}
                                onEnded={handleMediaEnded}
                                onError={(e) => console.error('Video error:', e)}
                            />
                            <div className="video-controls">
                                <h3>{currentMedia.title || currentMedia.originalFilename}</h3>
                                <p>{currentMedia.description || 'No description'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="no-media-message">
                            <p>No video currently playing</p>
                            <p>Add something to the queue to start!</p>
                        </div>
                    )}

                    <div className="stream-controls">
                        <button className="skip-button" onClick={handleSkip}>
                            ⏭ Skip
                        </button>
                        <button 
                            className="fullscreen-button"
                            onClick={toggleFullscreen}
                        >
                            {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}
                        </button>
                        <button 
                            className="add-to-queue-button"
                            onClick={() => {
                                setShowPlaylistModal(true);
                                if (publicPlaylists.length === 0) fetchPublicPlaylists();
                            }}
                        >
                            📋 Add Playlist
                        </button>
                        <button 
                            className="add-to-queue-button"
                            onClick={() => {
                                setShowAddModal(true);
                                if (availableMedia.length === 0) fetchAvailableMedia();
                            }}
                        >
                            ➕ Add to Queue
                        </button>
                        <button 
                            className="queue-manager-button"
                            onClick={() => navigate('/queue-manager')}
                        >
                            🎵 Manage Queue
                        </button>
                    </div>
                </div>

                {/* Queue Section */}
                <div className="queue-section">
                    <h2>Up Next ({queue.filter(q => q.status === 'QUEUED').length})</h2>
                    
                    <div className="queue-list">
                        {queue.filter(q => q.status === 'QUEUED').length === 0 ? (
                            <div className="empty-queue">
                                <p>Queue is empty</p>
                                <p>Random videos will play when queue is empty</p>
                            </div>
                        ) : (
                            queue.filter(q => q.status === 'QUEUED').map((item, index) => (
                                <div key={item.id} className="queue-item">
                                    <span className="queue-position">{index + 1}</span>
                                    <div className="queue-item-info">
                                        <span className="queue-item-title">
                                            {item.mediaFile?.title || `Media #${item.mediaFileId}`}
                                        </span>
                                        <span className="queue-item-added">
                                            Added by User #{item.addedBy}
                                        </span>
                                    </div>
                                    {item.addedBy === user?.id && (
                                        <button 
                                            className="remove-queue-button"
                                            onClick={() => handleRemoveFromQueue(item.id)}
                                        >✕</button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Add to Queue Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="add-queue-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🎬 Add Video to Queue</h2>
                            <button className="modal-close-x" onClick={() => setShowAddModal(false)}>✕</button>
                        </div>
                        
                        <div className="search-controls">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by title or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <div className="sort-controls">
                                <span className="sort-label">Sort:</span>
                                {['title', 'newest', 'oldest'].map(s => (
                                    <button
                                        key={s}
                                        className={`sort-btn ${sortBy === s ? 'active' : ''}`}
                                        onClick={() => setSortBy(s)}
                                    >
                                        {s === 'title' ? '🔤 A-Z' : s === 'newest' ? '🆕 Newest' : '📅 Oldest'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="media-results-count">
                            {filteredMedia.length} of {availableMedia.length} videos
                        </div>

                        <div className="media-list-scroll">
                            {filteredMedia.length === 0 ? (
                                <div className="no-results">
                                    <p>No videos found{searchQuery ? ` matching "${searchQuery}"` : ''}</p>
                                </div>
                            ) : (
                                filteredMedia.map(media => (
                                    <div key={media.id} className="media-list-item">
                                        <div className="media-list-icon">🎬</div>
                                        <div className="media-list-info">
                                            <span className="media-list-title">{media.title || media.originalFilename}</span>
                                            {media.description && (
                                                <span className="media-list-desc">{media.description}</span>
                                            )}
                                        </div>
                                        <button
                                            className="media-add-btn"
                                            onClick={() => handleAddToQueue(media.id)}
                                            disabled={addingId === media.id}
                                        >
                                            {addingId === media.id ? '...' : '+ Add'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Playlist to Queue Modal */}
            {showPlaylistModal && (
                <div className="modal-overlay" onClick={() => setShowPlaylistModal(false)}>
                    <div className="add-queue-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📋 Add Playlist to Queue</h2>
                            <button className="modal-close-x" onClick={() => setShowPlaylistModal(false)}>✕</button>
                        </div>
                        
                        <div className="media-results-count">
                            {publicPlaylists.length} public video playlist{publicPlaylists.length !== 1 ? 's' : ''}
                        </div>

                        <div className="media-list-scroll">
                            {publicPlaylists.length === 0 ? (
                                <div className="no-results">
                                    <p>No public video playlists found</p>
                                </div>
                            ) : (
                                publicPlaylists.map(playlist => (
                                    <div key={playlist.id} className="media-list-item">
                                        <div className="media-list-icon">📋</div>
                                        <div className="media-list-info">
                                            <span className="media-list-title">{playlist.name}</span>
                                            <span className="media-list-desc">
                                                {playlist.itemCount || 0} videos{playlist.description ? ` • ${playlist.description}` : ''}
                                            </span>
                                        </div>
                                        <button
                                            className="media-add-btn"
                                            onClick={() => handleAddPlaylistToQueue(playlist.id)}
                                            disabled={addingPlaylistId === playlist.id}
                                        >
                                            {addingPlaylistId === playlist.id ? '...' : '+ Queue All'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VideoLiveStream;

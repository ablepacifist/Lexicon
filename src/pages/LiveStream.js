import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { getApiUrls } from '../utils/apiUrls';
import '../styles/MediaPlayer.css';
import './LiveStream.css';

function LiveStream() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    
    // Stream state
    const [streamState, setStreamState] = useState(null);
    const [queue, setQueue] = useState([]);
    const [currentMedia, setCurrentMedia] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, disconnected
    const [lastSyncTime, setLastSyncTime] = useState(null);
    
    // Media library for adding to queue
    const [availableMedia, setAvailableMedia] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Video player refs
    const videoRef = useRef(null);
    const playerContainerRef = useRef(null);
    const eventSourceRef = useRef(null);
    const syncIntervalRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const [lightweightMode, setLightweightMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const lexiconApiUrl = getApiUrls().lexiconApiUrl;

    // Fetch stream state
    const fetchStreamState = useCallback(async () => {
        try {
            const endpoint = lightweightMode ? '/api/livestream/light/state' : '/api/livestream/state';
            const response = await fetch(`${lexiconApiUrl}${endpoint}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setStreamState(data.state);
                    
                    // Fetch current media details if we have a media ID
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
    }, [lexiconApiUrl, lightweightMode]);

    // Fetch queue
    const fetchQueue = useCallback(async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/queue`, {
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

    // Fetch available media for adding to queue
    const fetchAvailableMedia = useCallback(async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/eligible-media`, {
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

    // Setup SSE connection with robust reconnection
    useEffect(() => {
        if (!user) return;

        let retryCount = 0;
        const maxRetries = 10;
        const baseRetryDelay = 1000;

        const setupSSE = () => {
            setConnectionStatus('connecting');
            
            const endpoint = lightweightMode ? '/api/livestream/light/updates' : '/api/livestream/updates';
            const eventSource = new EventSource(`${lexiconApiUrl}${endpoint}`);
            eventSourceRef.current = eventSource;

            eventSource.addEventListener('init', (event) => {
                const data = JSON.parse(event.data);
                if (data.state) setStreamState(data.state);
                if (data.queue) setQueue(data.queue);
                setIsLoading(false);
                setConnectionStatus('connected');
                setLastSyncTime(new Date());
                retryCount = 0; // Reset retry count on successful connection
                
                // Fetch current media details
                if (data.state?.currentMediaId) {
                    fetch(`${lexiconApiUrl}/api/media/${data.state.currentMediaId}`, {
                        credentials: 'include'
                    })
                    .then(res => {
                        if (!res.ok) {
                            console.warn(`Media ${data.state.currentMediaId} not found`);
                            return null;
                        }
                        return res.json();
                    })
                    .then(mediaData => { if (mediaData) setCurrentMedia(mediaData); })
                    .catch(console.error);
                }
            });

            eventSource.addEventListener('state-update', (event) => {
                const data = JSON.parse(event.data);
                if (data.data) {
                    setStreamState(data.data);
                    setLastSyncTime(new Date());
                    
                    // Re-fetch media details when state changes
                    if (data.data.currentMediaId) {
                        fetch(`${lexiconApiUrl}/api/media/${data.data.currentMediaId}`, {
                            credentials: 'include'
                        })
                        .then(res => {
                            if (!res.ok) {
                                console.warn(`Media ${data.data.currentMediaId} not found`);
                                return null;
                            }
                            return res.json();
                        })
                        .then(mediaData => { if (mediaData) setCurrentMedia(mediaData); })
                        .catch(console.error);
                    }
                }
            });

            eventSource.addEventListener('queue-update', (event) => {
                const data = JSON.parse(event.data);
                if (data.data) {
                    // Handle wrapper object {items, totalCount} from backend
                    const queueData = data.data;
                    if (Array.isArray(queueData)) {
                        setQueue(queueData);
                    } else if (queueData.items && Array.isArray(queueData.items)) {
                        setQueue(queueData.items);
                    } else {
                        console.warn('Unexpected queue-update format:', queueData);
                    }
                    setLastSyncTime(new Date());
                }
            });

            eventSource.addEventListener('state-update-light', (event) => {
                const data = JSON.parse(event.data);
                if (data.data) {
                    setStreamState(data.data);
                    setLastSyncTime(new Date());
                    
                    // Re-fetch media details when state changes
                    if (data.data.currentMediaId) {
                        fetch(`${lexiconApiUrl}/api/media/${data.data.currentMediaId}`, {
                            credentials: 'include'
                        })
                        .then(res => {
                            if (!res.ok) {
                                console.warn(`Media ${data.data.currentMediaId} not found`);
                                return null;
                            }
                            return res.json();
                        })
                        .then(mediaData => { if (mediaData) setCurrentMedia(mediaData); })
                        .catch(console.error);
                    }
                }
            });

            eventSource.onopen = () => {
                console.log('SSE connection opened');
                setConnectionStatus('connected');
            };

            eventSource.onerror = () => {
                console.log('SSE connection error');
                setConnectionStatus('disconnected');
                eventSource.close();
                
                // Exponential backoff reconnection
                if (retryCount < maxRetries) {
                    const delay = Math.min(baseRetryDelay * Math.pow(2, retryCount), 30000);
                    console.log(`Reconnecting in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                    retryCount++;
                    reconnectTimeoutRef.current = setTimeout(setupSSE, delay);
                } else {
                    setError('Lost connection to server. Please refresh the page.');
                }
            };
        };

        setupSSE();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [user, lexiconApiUrl, lightweightMode]);

    // Initial data fetch
    useEffect(() => {
        if (user === undefined) return;
        if (user === null) {
            navigate('/login');
            return;
        }

        fetchStreamState();
        fetchQueue();
        fetchAvailableMedia();
    }, [user, navigate, fetchStreamState, fetchQueue, fetchAvailableMedia]);

    // Calculate real-time position based on server start time
    const calculateCurrentPosition = useCallback(() => {
        if (!streamState || !streamState.currentStartTime) return 0;
        
        // Parse the server start time and calculate elapsed time
        const startTime = new Date(streamState.currentStartTime).getTime();
        const now = Date.now();
        const elapsed = now - startTime;
        
        // Add the initial position offset
        const initialPosition = streamState.currentPositionMs || 0;
        return Math.max(0, initialPosition + elapsed);
    }, [streamState]);

    // Sync video playback with calculated server position
    // Only sync on major drift to avoid choppy playback
    const hasSyncedRef = useRef(false);
    
    useEffect(() => {
        if (!videoRef.current || !streamState || !currentMedia) return;

        const syncPlayback = (isInitialSync = false) => {
            if (!videoRef.current) return;
            
            const serverPosition = calculateCurrentPosition();
            const currentPosition = videoRef.current.currentTime * 1000;
            const drift = Math.abs(currentPosition - serverPosition);
            
            // Only sync if:
            // 1. Initial sync (first load) OR
            // 2. Drift is more than 30 seconds (major desync)
            // This prevents choppy playback from constant seeking
            if (isInitialSync || drift > 30000) {
                console.log(`Syncing playback: drift=${drift}ms, seeking to ${serverPosition}ms`);
                videoRef.current.currentTime = serverPosition / 1000;
            }
        };

        // Only do initial sync once per media
        if (!hasSyncedRef.current) {
            syncPlayback(true);
            hasSyncedRef.current = true;
        }

        // Set up periodic sync check every 60 seconds (only syncs if major drift)
        syncIntervalRef.current = setInterval(() => syncPlayback(false), 60000);

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [streamState, currentMedia, calculateCurrentPosition]);
    
    // Reset sync flag when media changes
    useEffect(() => {
        hasSyncedRef.current = false;
    }, [currentMedia?.id]);

    // Handle video player events
    const handleVideoLoad = useCallback(() => {
        if (videoRef.current && streamState) {
            const serverPosition = calculateCurrentPosition();
            videoRef.current.currentTime = serverPosition / 1000;
            videoRef.current.play().catch(err => {
                console.log('Autoplay prevented:', err);
                // Show play button or notification if autoplay blocked
            });
        }
    }, [streamState, calculateCurrentPosition]);

    // Ref to prevent duplicate media-ended calls
    const mediaEndedInProgressRef = useRef(false);

    // Handle media ended - notify server to advance to next track
    const handleMediaEnded = useCallback(async () => {
        // Prevent duplicate calls - only one media-ended request at a time
        if (mediaEndedInProgressRef.current) {
            console.log('Media ended already in progress, ignoring duplicate call');
            return;
        }
        mediaEndedInProgressRef.current = true;
        
        console.log('Media ended, notifying server to advance...');
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/media-ended`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Server advanced to next media:', data);
                // State will be updated via SSE
            } else {
                console.error('Failed to notify server of media end:', response.status);
                // Fallback: refetch state
                fetchStreamState();
                fetchQueue();
            }
        } catch (err) {
            console.error('Error notifying server of media end:', err);
            // Fallback: refetch state
            fetchStreamState();
            fetchQueue();
        } finally {
            // Reset after a short delay to allow for the next media to load
            setTimeout(() => {
                mediaEndedInProgressRef.current = false;
            }, 2000);
        }
    }, [lexiconApiUrl, fetchStreamState, fetchQueue]);

    // Fullscreen toggle
    const toggleFullscreen = useCallback(() => {
        const container = playerContainerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            }).catch(err => {
                console.error('Error exiting fullscreen:', err);
            });
        }
    }, []);

    // Listen for fullscreen changes (e.g., user presses Escape)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Add to queue
    const handleAddToQueue = async (mediaFileId) => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/queue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userId: user.id,
                    mediaFileId: mediaFileId
                })
            });

            const data = await response.json();
            if (data.success) {
                setShowAddModal(false);
                fetchQueue();
            } else {
                setError(data.message || 'Failed to add to queue');
            }
        } catch (err) {
            setError('Error adding to queue: ' + err.message);
        }
    };

    // Remove from queue
    const handleRemoveFromQueue = async (queueId) => {
        try {
            const response = await fetch(
                `${lexiconApiUrl}/api/livestream/queue/${queueId}?userId=${user.id}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            const data = await response.json();
            if (data.success) {
                fetchQueue();
            } else {
                setError(data.message || 'Failed to remove from queue');
            }
        } catch (err) {
            setError('Error removing from queue: ' + err.message);
        }
    };

    // Vote to skip
    const handleSkip = async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/skip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: user.id })
            });

            const data = await response.json();
            if (!data.success) {
                setError(data.message || 'Failed to skip');
            }
        } catch (err) {
            setError('Error skipping: ' + err.message);
        }
    };

    // Filter available media by search query
    const filteredMedia = availableMedia.filter(media => 
        media.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        media.originalFilename?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Manual reconnect handler
    const handleManualReconnect = () => {
        setError('');
        window.location.reload();
    };

    if (isLoading) {
        return (
            <div className="media-player-container livestream-container">
                <div className="loading-container">
                    <div className="loading-spinner-animation"></div>
                    <p className="loading-text">Connecting to Live Stream...</p>
                    <p className="loading-subtext">Syncing with other viewers</p>
                </div>
            </div>
        );
    }

    return (
        <div className="media-player-container livestream-container">
            <div className="media-player-header">
                <h1>🔴 Live Stream</h1>
                <div className="header-right">
                    <div className="mode-selector">
                        <button 
                            className={`mode-button ${!lightweightMode ? 'active' : ''}`}
                            onClick={() => setLightweightMode(false)}
                            title="Full mode: sync playback with queue management"
                        >
                            ⚙️ Full
                        </button>
                        <button 
                            className={`mode-button ${lightweightMode ? 'active' : ''}`}
                            onClick={() => setLightweightMode(true)}
                            title="Lightweight mode: queue only, minimal bandwidth"
                        >
                            ⚡ Light
                        </button>
                    </div>
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
                        <button className="reconnect-button" onClick={handleManualReconnect}>
                            🔄 Reconnect
                        </button>
                    ) : (
                        <button className="dismiss-button" onClick={() => setError('')}>
                            ✕
                        </button>
                    )}
                </div>
            )}

            {connectionStatus === 'disconnected' && !error && (
                <div className="warning-banner">
                    <span>⚠️ Connection lost. Attempting to reconnect...</span>
                </div>
            )}

            <div className="livestream-layout">
                {/* Main Player */}
                <div className="player-section livestream-player">
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
                            <p>No media currently playing</p>
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
                            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                        >
                            {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}
                        </button>
                        <button 
                            className="add-to-queue-button"
                            onClick={() => setShowAddModal(true)}
                        >
                            ➕ Add to Queue
                        </button>
                        <button 
                            className="queue-manager-button"
                            onClick={() => navigate('/queue-manager')}
                            title="Open dedicated queue manager for faster control"
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
                                <p>Random media will play when queue is empty</p>
                            </div>
                        ) : (
                            queue
                                .filter(q => q.status === 'QUEUED')
                                .map((item, index) => (
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
                                            >
                                                ✕
                                            </button>
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
                    <div className="modal-content add-queue-modal" onClick={e => e.stopPropagation()}>
                        <h2>Add to Queue</h2>
                        
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search media..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <div className="media-grid">
                            {filteredMedia.map(media => (
                                <div 
                                    key={media.id} 
                                    className="media-card"
                                    onClick={() => handleAddToQueue(media.id)}
                                >
                                    <div className="media-type-badge">
                                        {media.mediaType === 'VIDEO' ? '🎬' : '🎵'}
                                    </div>
                                    <h4>{media.title || media.originalFilename}</h4>
                                    <p>{media.description || 'No description'}</p>
                                </div>
                            ))}
                        </div>

                        <button 
                            className="close-modal-button"
                            onClick={() => setShowAddModal(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LiveStream;

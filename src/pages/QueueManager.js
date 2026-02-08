import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import './QueueManager.css';

function QueueManager() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    
    // Queue state
    const [queue, setQueue] = useState([]);
    const [currentMedia, setCurrentMedia] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    
    // Search and add
    const [availableMedia, setAvailableMedia] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('position'); // position, added, user
    
    // Refs
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    
    const lexiconApiUrl = process.env.REACT_APP_LEXICON_API_URL || 'http://localhost:36568';

    // Fetch queue with minimal data
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

    // Fetch current media
    const fetchCurrentMedia = useCallback(async () => {
        try {
            const response = await fetch(`${lexiconApiUrl}/api/livestream/state`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.state?.currentMediaId) {
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
        } catch (err) {
            console.error('Error fetching current media:', err);
        }
    }, [lexiconApiUrl]);

    // Fetch available media for modal
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

    // Setup lightweight SSE for queue updates only
    useEffect(() => {
        if (!user) return;

        let retryCount = 0;
        const maxRetries = 10;
        const baseRetryDelay = 500; // Faster retry for queue manager

        const setupSSE = () => {
            setConnectionStatus('connecting');
            
            // Use lightweight updates for queue manager - no media streaming data
            const eventSource = new EventSource(`${lexiconApiUrl}/api/livestream/light/updates`);
            eventSourceRef.current = eventSource;

            eventSource.addEventListener('init', (event) => {
                const data = JSON.parse(event.data);
                if (data.state?.currentMediaId) {
                    // Fetch full media details
                    fetch(`${lexiconApiUrl}/api/media/${data.state.currentMediaId}`, {
                        credentials: 'include'
                    })
                    .then(res => {
                        if (!res.ok) return null;
                        return res.json();
                    })
                    .then(mediaData => { if (mediaData) setCurrentMedia(mediaData); })
                    .catch(console.error);
                }
                
                setConnectionStatus('connected');
                setIsLoading(false);
                retryCount = 0;
            });

            // Listen for queue updates
            eventSource.addEventListener('queue-update', (event) => {
                const data = JSON.parse(event.data);
                if (data.data) {
                    const queueData = data.data;
                    if (Array.isArray(queueData)) {
                        setQueue(queueData);
                    } else if (queueData.items && Array.isArray(queueData.items)) {
                        setQueue(queueData.items);
                    }
                }
            });

            // Listen for state changes in light mode (media changes)
            eventSource.addEventListener('state-update-light', (event) => {
                const data = JSON.parse(event.data);
                if (data.data?.currentMediaId) {
                    fetch(`${lexiconApiUrl}/api/media/${data.data.currentMediaId}`, {
                        credentials: 'include'
                    })
                    .then(res => {
                        if (!res.ok) return null;
                        return res.json();
                    })
                    .then(mediaData => { if (mediaData) setCurrentMedia(mediaData); })
                    .catch(console.error);
                }
            });

            eventSource.onopen = () => {
                console.log('Queue Manager SSE connected');
                setConnectionStatus('connected');
            };

            eventSource.onerror = () => {
                console.log('Queue Manager SSE error');
                setConnectionStatus('disconnected');
                eventSource.close();
                
                if (retryCount < maxRetries) {
                    const delay = Math.min(baseRetryDelay * Math.pow(2, retryCount), 10000);
                    console.log(`Reconnecting queue manager in ${delay}ms`);
                    retryCount++;
                    reconnectTimeoutRef.current = setTimeout(setupSSE, delay);
                } else {
                    setError('Lost connection. Please refresh the page.');
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
    }, [user, lexiconApiUrl]);

    // Initial data fetch
    useEffect(() => {
        if (user === undefined) return;
        if (user === null) {
            navigate('/login');
            return;
        }

        fetchQueue();
        fetchCurrentMedia();
        fetchAvailableMedia();
    }, [user, navigate, fetchQueue, fetchCurrentMedia, fetchAvailableMedia]);

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
                setSearchQuery('');
                // SSE will update queue automatically
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
                // SSE will update queue automatically
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
            // SSE will update the state automatically
        } catch (err) {
            setError('Error skipping: ' + err.message);
        }
    };

    // Sort queue items
    const getSortedQueue = useCallback(() => {
        const queuedItems = queue.filter(q => q.status === 'QUEUED');
        
        switch (sortBy) {
            case 'added':
                return [...queuedItems].reverse(); // Most recently added first
            case 'user':
                return [...queuedItems].sort((a, b) => a.addedBy - b.addedBy);
            case 'position':
            default:
                return queuedItems; // Original order
        }
    }, [queue, sortBy]);

    // Filter available media
    const filteredMedia = availableMedia.filter(media => 
        media.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        media.originalFilename?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="queue-manager-container">
                <div className="loading-container">
                    <div className="loading-spinner-animation"></div>
                    <p className="loading-text">Loading Queue Manager...</p>
                </div>
            </div>
        );
    }

    const sortedQueue = getSortedQueue();

    return (
        <div className="queue-manager-container">
            <div className="queue-manager-header">
                <h1>🎵 Queue Manager</h1>
                <div className="header-actions">
                    <span className={`connection-status ${connectionStatus}`}>
                        {connectionStatus === 'connected' ? '🟢 Connected' : 
                         connectionStatus === 'connecting' ? '🟡 Connecting...' : 
                         '🔴 Disconnected'}
                    </span>
                    <button className="back-button" onClick={() => navigate('/livestream')}>
                        🔴 Watch Stream
                    </button>
                    <button className="back-button" onClick={() => navigate('/lexicon-dashboard')}>
                        ← Back
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span>{error}</span>
                    <button className="dismiss-button" onClick={() => setError('')}>✕</button>
                </div>
            )}

            <div className="queue-manager-layout">
                {/* Now Playing Section */}
                <div className="now-playing-section">
                    <h2>🎬 Now Playing</h2>
                    {currentMedia ? (
                        <div className="now-playing-card">
                            <h3>{currentMedia.title || currentMedia.originalFilename}</h3>
                            <p className="duration">
                                {currentMedia.durationMs ? 
                                    `${Math.round(currentMedia.durationMs / 1000 / 60)} min` :
                                    'Duration unknown'
                                }
                            </p>
                            <p className="description">{currentMedia.description || 'No description'}</p>
                            <button className="skip-button" onClick={handleSkip}>
                                ⏭ Skip
                            </button>
                        </div>
                    ) : (
                        <div className="no-media-message">
                            <p>No media playing</p>
                        </div>
                    )}
                </div>

                {/* Queue Section */}
                <div className="queue-list-section">
                    <div className="queue-header">
                        <div>
                            <h2>📋 Up Next ({sortedQueue.length})</h2>
                        </div>
                        <div className="queue-controls">
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                                className="sort-selector"
                            >
                                <option value="position">Sort: Position</option>
                                <option value="added">Sort: Recently Added</option>
                                <option value="user">Sort: By User</option>
                            </select>
                            <button 
                                className="add-button"
                                onClick={() => setShowAddModal(true)}
                            >
                                ➕ Add
                            </button>
                        </div>
                    </div>

                    <div className="queue-items">
                        {sortedQueue.length === 0 ? (
                            <div className="empty-queue">
                                <p>Queue is empty</p>
                                <button 
                                    className="add-button-large"
                                    onClick={() => setShowAddModal(true)}
                                >
                                    ➕ Add Something
                                </button>
                            </div>
                        ) : (
                            sortedQueue.map((item, index) => (
                                <div key={item.id} className="queue-item">
                                    <div className="queue-position">{index + 1}</div>
                                    <div className="queue-info">
                                        <h4>{item.mediaFile?.title || `Media #${item.mediaFileId}`}</h4>
                                        <p className="queue-meta">
                                            Added by User #{item.addedBy}
                                            {item.mediaFile?.durationMs && 
                                                ` • ${Math.round(item.mediaFile.durationMs / 1000 / 60)} min`
                                            }
                                        </p>
                                    </div>
                                    {item.addedBy === user?.id && (
                                        <button 
                                            className="remove-button"
                                            onClick={() => handleRemoveFromQueue(item.id)}
                                            title="Remove from queue"
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
                    <div className="modal-content add-media-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add to Queue</h2>
                            <button 
                                className="modal-close"
                                onClick={() => setShowAddModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search media by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />

                        <div className="media-grid">
                            {filteredMedia.length === 0 ? (
                                <div className="no-results">
                                    {searchQuery ? 'No media found' : 'No media available'}
                                </div>
                            ) : (
                                filteredMedia.map(media => (
                                    <div 
                                        key={media.id} 
                                        className="media-card"
                                        onClick={() => handleAddToQueue(media.id)}
                                    >
                                        <div className="media-badge">
                                            {media.mediaType === 'VIDEO' ? '🎬' : '🎵'}
                                        </div>
                                        <h4>{media.title || media.originalFilename}</h4>
                                        <p className="media-description">
                                            {media.description || 'No description'}
                                        </p>
                                        <p className="media-duration">
                                            {media.durationMs ? 
                                                `${Math.round(media.durationMs / 1000 / 60)} min` :
                                                'Unknown duration'
                                            }
                                        </p>
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

export default QueueManager;

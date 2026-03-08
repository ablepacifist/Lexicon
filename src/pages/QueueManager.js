import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { getApiUrls } from '../utils/apiUrls';
import './QueueManager.css';

/**
 * Queue Manager — dedicated page for browsing eligible media and managing
 * the server-side live stream queue. Supports music and video channels.
 */
function QueueManager() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { lexiconApiUrl } = getApiUrls();

    const channel = searchParams.get('channel') || 'video';
    const setChannel = (ch) => setSearchParams({ channel: ch });

    const [queue, setQueue] = useState([]);
    const [currentMedia, setCurrentMedia] = useState(null);
    const [eligibleMedia, setEligibleMedia] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [sortBy, setSortBy] = useState('title');
    const [addingId, setAddingId] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    /* ---- Fetch eligible media (public + public-playlist items + user's own) ---- */
    const fetchEligible = useCallback(async () => {
        try {
            const [eligResp, userResp] = await Promise.all([
                fetch(`${lexiconApiUrl}/api/livestream/eligible-media?channel=${channel}`, { credentials: 'include' }),
                fetch(`${lexiconApiUrl}/api/media/user/${user.id}`, { credentials: 'include' })
            ]);

            const eligData = eligResp.ok ? await eligResp.json() : { media: [] };
            const userData = userResp.ok ? await userResp.json() : [];

            const allowedType = channel === 'music' ? 'MUSIC' : 'VIDEO';
            const map = new Map();
            (eligData.media || []).forEach(m => map.set(m.id, m));
            (Array.isArray(userData) ? userData : []).forEach(m => {
                if (m.mediaType === allowedType && !map.has(m.id)) {
                    map.set(m.id, m);
                }
            });

            setEligibleMedia(Array.from(map.values()));
        } catch (err) {
            setError('Failed to load media: ' + err.message);
        }
    }, [lexiconApiUrl, user, channel]);

    /* ---- SSE for real-time queue & state updates ---- */
    useEffect(() => {
        if (!user) return;

        let es;
        let reconnectTimer;
        let alive = true;

        const connect = () => {
            if (!alive) return;
            es = new EventSource(`${lexiconApiUrl}/api/livestream/updates?channel=${channel}`);

            es.addEventListener('heartbeat', () => setIsConnected(true));

            es.addEventListener('init', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    setIsConnected(true);
                    if (d.queue) setQueue(d.queue);
                    if (d.state?.currentMedia) setCurrentMedia(d.state.currentMedia);
                    setIsLoading(false);
                } catch (err) { console.error(err); }
            });

            es.addEventListener('state-update', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    const data = d.data || d;
                    if (data.currentMedia) setCurrentMedia(data.currentMedia);
                } catch (err) { /* ignore */ }
            });

            es.addEventListener('queue-update', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    const items = d.data || d;
                    if (Array.isArray(items)) setQueue(items);
                } catch (err) { /* ignore */ }
            });

            es.onerror = () => {
                setIsConnected(false);
                es.close();
                reconnectTimer = setTimeout(connect, 3000);
            };
        };

        connect();
        fetchEligible();

        return () => {
            alive = false;
            if (es) es.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lexiconApiUrl, user, channel]);

    /* ---- Auth guard ---- */
    useEffect(() => {
        if (user === undefined) return;
        if (user === null) navigate('/login');
    }, [user, navigate]);

    /* ---- Actions ---- */
    const addToQueue = async (mediaFileId) => {
        if (!user) return;
        setAddingId(mediaFileId);
        try {
            const resp = await fetch(`${lexiconApiUrl}/api/livestream/queue?channel=${channel}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, mediaFileId })
            });
            const data = await resp.json();
            if (!data.success) setError(data.message || 'Failed to add');
        } catch (err) {
            setError('Add failed: ' + err.message);
        } finally {
            setAddingId(null);
        }
    };

    const removeFromQueue = async (queueId) => {
        if (!user) return;
        try {
            const resp = await fetch(`${lexiconApiUrl}/api/livestream/queue/${queueId}?userId=${user.id}&channel=${channel}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await resp.json();
            if (!data.success) setError(data.message || 'Failed to remove');
        } catch (err) {
            setError('Remove failed: ' + err.message);
        }
    };

    const handleSkip = async () => {
        if (!user) return;
        try {
            await fetch(`${lexiconApiUrl}/api/livestream/skip?channel=${channel}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
        } catch (err) {
            setError('Skip failed: ' + err.message);
        }
    };

    /* ---- Filters ---- */
    const filteredMedia = eligibleMedia
        .filter(m => {
            if (filterType !== 'ALL' && m.mediaType !== filterType) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (m.title || m.originalFilename || '').toLowerCase().includes(q) ||
                       (m.description || '').toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'title') return (a.title || a.originalFilename || '').localeCompare(b.title || b.originalFilename || '');
            if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
            if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
            return 0;
        });

    const upNext = queue.filter(q => q.status === 'QUEUED');
    // nowPlaying from queue is unreliable (stale PLAYING items may exist)
    // Prefer currentMedia from server state, fall back to last PLAYING queue item
    const playingItems = queue.filter(q => q.status === 'PLAYING');
    const nowPlaying = playingItems.length > 0 ? playingItems[playingItems.length - 1] : null;

    if (user === undefined) return null;

    return (
        <div className="queue-manager-container">
            {/* Header */}
            <div className="queue-manager-header">
                <h1>{channel === 'music' ? '🎵' : '🎬'} Queue Manager</h1>
                <div className="header-actions">
                    <div className="qm-channel-tabs">
                        <button
                            className={`qm-channel-tab ${channel === 'music' ? 'active' : ''}`}
                            onClick={() => setChannel('music')}
                        >🎵 Music</button>
                        <button
                            className={`qm-channel-tab ${channel === 'video' ? 'active' : ''}`}
                            onClick={() => setChannel('video')}
                        >🎬 Video</button>
                    </div>
                    <span className={`qm-status ${isConnected ? 'connected' : ''}`}>
                        {isConnected ? '● Connected' : '○ Connecting...'}
                    </span>
                    <button className="qm-nav-btn" onClick={() => navigate(channel === 'music' ? '/music-stream' : '/video-stream')}>
                        📡 {channel === 'music' ? 'Music' : 'Video'} Stream
                    </button>
                    <button className="qm-nav-btn" onClick={() => navigate('/lexicon-dashboard')}>
                        ← Dashboard
                    </button>
                </div>
            </div>

            {error && (
                <div className="qm-error">
                    <span>{error}</span>
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}

            <div className="qm-layout">
                {/* Left: Queue */}
                <div className="qm-panel">
                    <div className="qm-panel-header">
                        <h2>Live Stream Queue</h2>
                        <button className="qm-skip-btn" onClick={handleSkip}>⏭ Vote Skip</button>
                    </div>

                    {/* Now Playing — currentMedia from server state is authoritative */}
                    {currentMedia && (
                        <div className="qm-now-playing">
                            <span className="qm-np-label">Now Playing</span>
                            <span className="qm-np-title">
                                {currentMedia.title || currentMedia.originalFilename || 'Unknown'}
                            </span>
                            <span className="qm-np-type">
                                {currentMedia.mediaType === 'VIDEO' ? '🎬 Video' : '🎵 Music'}
                            </span>
                        </div>
                    )}

                    {/* Up Next */}
                    <h3 className="qm-section-title">Up Next ({upNext.length})</h3>
                    {isLoading ? (
                        <div className="qm-loading">Loading queue...</div>
                    ) : upNext.length === 0 ? (
                        <div className="qm-empty">Queue is empty — random media will auto-play</div>
                    ) : (
                        <div className="qm-queue-list">
                            {upNext.map((item, i) => (
                                <div key={item.id} className="qm-queue-item">
                                    <span className="qm-q-pos">{i + 1}</span>
                                    <span className="qm-q-icon">
                                        {item.mediaFile?.mediaType === 'VIDEO' ? '🎬' : '🎵'}
                                    </span>
                                    <div className="qm-q-info">
                                        <span className="qm-q-title">
                                            {item.mediaFile?.title || item.mediaFile?.originalFilename || `Media #${item.mediaFileId}`}
                                        </span>
                                    </div>
                                    {user && item.addedBy === user.id && (
                                        <button
                                            className="qm-q-remove"
                                            onClick={() => removeFromQueue(item.id)}
                                        >✕</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Browse & Add */}
                <div className="qm-panel">
                    <div className="qm-panel-header">
                        <h2>Browse Media</h2>
                        <span className="qm-count">{eligibleMedia.length} available</span>
                    </div>

                    <div className="qm-search-bar">
                        <input
                            type="text"
                            placeholder="Search by title or description..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="qm-search-input"
                        />
                    </div>

                    <div className="qm-filter-row">
                        {['ALL', 'MUSIC', 'VIDEO'].map(f => (
                            <button
                                key={f}
                                className={`qm-filter-btn ${filterType === f ? 'active' : ''}`}
                                onClick={() => setFilterType(f)}
                            >
                                {f === 'ALL' ? '🎯 All' : f === 'MUSIC' ? '🎵 Music' : '🎬 Video'}
                            </button>
                        ))}
                    </div>

                    <div className="qm-sort-row">
                        <span className="qm-sort-label">Sort:</span>
                        {['title', 'newest', 'oldest'].map(s => (
                            <button
                                key={s}
                                className={`qm-sort-btn ${sortBy === s ? 'active' : ''}`}
                                onClick={() => setSortBy(s)}
                            >
                                {s === 'title' ? '🔤 A-Z' : s === 'newest' ? '🆕 Newest' : '📅 Oldest'}
                            </button>
                        ))}
                    </div>

                    <div className="qm-results-count">
                        {filteredMedia.length} of {eligibleMedia.length} items
                    </div>

                    <div className="qm-media-list">
                        {filteredMedia.length === 0 ? (
                            <div className="qm-empty">No matching media</div>
                        ) : (
                            filteredMedia.map(m => (
                                <div key={m.id} className="qm-media-item">
                                    <span className="qm-m-icon">
                                        {m.mediaType === 'VIDEO' ? '🎬' : '🎵'}
                                    </span>
                                    <div className="qm-m-info">
                                        <span className="qm-m-title">{m.title || m.originalFilename}</span>
                                        {m.description && (
                                            <span className="qm-m-desc">{m.description}</span>
                                        )}
                                    </div>
                                    <button
                                        className="qm-m-add"
                                        onClick={() => addToQueue(m.id)}
                                        disabled={addingId === m.id}
                                    >
                                        {addingId === m.id ? '...' : '+ Add'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QueueManager;

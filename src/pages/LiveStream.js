import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { getApiUrls } from '../utils/apiUrls';
import './LiveStream.css';

/**
 * Unified Live Stream page — ALL users see/hear the same media at the same time.
 * Connects to the server's shared stream state via SSE for real-time sync.
 * Media type (MUSIC or VIDEO) determines which player renders.
 */
function LiveStream() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const { lexiconApiUrl } = getApiUrls();

    /* ---- state ---- */
    const [currentMedia, setCurrentMedia] = useState(null);
    const [currentMediaId, setCurrentMediaId] = useState(0);
    const [startTimeMs, setStartTimeMs] = useState(0);      // epoch ms when track started on server
    const [positionOffsetMs, setPositionOffsetMs] = useState(0); // server's currentPositionMs
    const [queue, setQueue] = useState([]);
    const [skipVotes, setSkipVotes] = useState(0);
    const [requiredSkips, setRequiredSkips] = useState(1);

    const [streamStarted, setStreamStarted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    /* add-to-queue panel */
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [eligibleMedia, setEligibleMedia] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [mediaFilter, setMediaFilter] = useState('ALL'); // ALL | MUSIC | VIDEO
    const [addingId, setAddingId] = useState(null);

    /* refs */
    const mediaRef = useRef(null);
    const containerRef = useRef(null);
    const controlsTimerRef = useRef(null);
    const seekTargetRef = useRef(0);
    const currentMediaIdRef = useRef(0);
    const hasEndedRef = useRef(false); // prevent duplicate media-ended calls

    /* ---- helpers ---- */
    const getStreamUrl = (id) => `${lexiconApiUrl}/api/media/stream/${id}`;

    /** Parse Java LocalDateTime (Jackson may send array or ISO string) */
    const parseServerTime = (val) => {
        if (!val) return 0;
        if (Array.isArray(val)) {
            const [y, mo, d, h, mi, s] = val;
            return new Date(y, mo - 1, d, h, mi, s || 0).getTime();
        }
        return new Date(val).getTime();
    };

    /** Calculate where playback should be right now (seconds) */
    const calcSeekSec = useCallback((stMs, posMs) => {
        if (!stMs) return 0;
        const elapsed = Date.now() - stMs;
        return Math.max(0, (posMs + elapsed) / 1000);
    }, []);

    const formatTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    /* ---- SSE connection ---- */
    useEffect(() => {
        if (!user) return;

        let es;
        let reconnectTimer;
        let alive = true;

        const connect = () => {
            if (!alive) return;
            es = new EventSource(`${lexiconApiUrl}/api/livestream/updates`);

            es.addEventListener('heartbeat', () => setIsConnected(true));

            es.addEventListener('init', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    setIsConnected(true);

                    const st = d.state;
                    if (st) {
                        const stMs = parseServerTime(st.currentStartTime);
                        setStartTimeMs(stMs);
                        setPositionOffsetMs(st.currentPositionMs || 0);
                        setSkipVotes(st.totalSkipVotes || 0);
                        setRequiredSkips(st.requiredSkipVotes || 1);

                        if (st.currentMediaId && st.currentMediaId !== 0) {
                            setCurrentMediaId(st.currentMediaId);
                            currentMediaIdRef.current = st.currentMediaId;
                            hasEndedRef.current = false;
                            seekTargetRef.current = calcSeekSec(stMs, st.currentPositionMs || 0);

                            if (st.currentMedia) {
                                setCurrentMedia(st.currentMedia);
                            } else {
                                // Fetch media info if not included
                                fetchMediaInfo(st.currentMediaId);
                            }
                        }
                    }

                    if (d.queue) {
                        setQueue(d.queue);
                    }
                } catch (err) {
                    console.error('SSE init parse error', err);
                }
            });

            es.addEventListener('state-update', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    const data = d.data || d;
                    setSkipVotes(data.totalSkipVotes || 0);
                    setRequiredSkips(data.requiredSkipVotes || 1);

                    const stMs = parseServerTime(data.currentStartTime);
                    setStartTimeMs(stMs);
                    setPositionOffsetMs(data.currentPositionMs || 0);

                    if (data.currentMediaId && data.currentMediaId !== currentMediaIdRef.current) {
                        setCurrentMediaId(data.currentMediaId);
                        currentMediaIdRef.current = data.currentMediaId;
                        hasEndedRef.current = false;
                        seekTargetRef.current = calcSeekSec(stMs, data.currentPositionMs || 0);
                    }
                } catch (err) { console.error('SSE state-update error', err); }
            });

            es.addEventListener('queue-update', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    const items = d.data || d;
                    if (Array.isArray(items)) {
                        setQueue(items);
                    }
                } catch (err) { console.error('SSE queue-update error', err); }
            });

            es.onerror = () => {
                setIsConnected(false);
                es.close();
                reconnectTimer = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            alive = false;
            if (es) es.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lexiconApiUrl, user]);

    /* Fetch media info when we only have the ID */
    const fetchMediaInfo = async (id) => {
        try {
            const resp = await fetch(`${lexiconApiUrl}/api/media/${id}`, { credentials: 'include' });
            if (resp.ok) {
                const media = await resp.json();
                setCurrentMedia(media);
            }
        } catch (err) {
            console.error('Failed to fetch media info:', err);
        }
    };

    /* ---- auth guard ---- */
    useEffect(() => {
        if (user === undefined) return;
        if (user === null) navigate('/login');
    }, [user, navigate]);

    /* ---- Media Session API — lock screen / Bluetooth / CarPlay controls ---- */
    useEffect(() => {
        if (!('mediaSession' in navigator) || !currentMedia) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentMedia.title || currentMedia.originalFilename || 'Unknown',
            artist: currentMedia.description || 'Live Stream',
            album: 'Lexicon Live Stream',
            artwork: [
                { src: '/logo.webp', sizes: '512x512', type: 'image/webp' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
            if (mediaRef.current) mediaRef.current.play();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (mediaRef.current) mediaRef.current.pause();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            handleSkip();
        });

        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }, [currentMedia, isPlaying, handleSkip]);

    /* ---- Player event handlers ---- */
    const handleLoadedMetadata = () => {
        const el = mediaRef.current;
        if (!el) return;
        setDuration(el.duration || 0);

        // Seek to sync position — but only if the track has been playing for a while 
        // (late joiner). If < 15s, the offset is just loading latency.
        const target = seekTargetRef.current;
        if (target > 15 && target < el.duration) {
            el.currentTime = target;
        }
    };

    const handleTimeUpdate = () => {
        if (mediaRef.current) setCurrentTime(mediaRef.current.currentTime);
    };

    const handleEnded = async () => {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;
        try {
            await fetch(`${lexiconApiUrl}/api/livestream/media-ended`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (err) {
            console.error('media-ended call failed', err);
        }
    };

    const handleError = () => {
        const el = mediaRef.current;
        if (!el?.error || el.error.code === 1) return; // MEDIA_ERR_ABORTED
        console.error('Media error:', el.error.code, el.error.message);
        setError(`Playback error — skipping in 2s...`);
        setTimeout(() => {
            setError('');
            handleEnded(); // treat as ended → server advances
        }, 2000);
    };

    /* ---- Controls ---- */
    const handleStartStream = () => {
        setStreamStarted(true);
        // Recalculate seek now (user may have waited a while before clicking)
        seekTargetRef.current = calcSeekSec(startTimeMs, positionOffsetMs);
        if (mediaRef.current) {
            const target = seekTargetRef.current;
            if (target > 15 && target < (mediaRef.current.duration || Infinity)) {
                mediaRef.current.currentTime = target;
            }
            mediaRef.current.play().catch(() => {});
        }
    };

    const handleSkip = useCallback(async () => {
        if (!user) return;
        try {
            await fetch(`${lexiconApiUrl}/api/livestream/skip`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
        } catch (err) {
            setError('Skip failed: ' + err.message);
        }
    }, [lexiconApiUrl, user]);

    /* ---- Fullscreen ---- */
    const toggleFullscreen = () => {
        const c = containerRef.current;
        if (!c) return;
        if (!document.fullscreenElement) {
            c.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    useEffect(() => {
        const h = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', h);
        return () => document.removeEventListener('fullscreenchange', h);
    }, []);

    /* Auto-hide controls for video */
    const resetControlsTimer = useCallback(() => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            if (isPlaying && currentMedia?.mediaType === 'VIDEO') setShowControls(false);
        }, 3000);
    }, [isPlaying, currentMedia]);

    useEffect(() => {
        return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
    }, []);

    /* ---- Add to Queue ---- */
    const loadEligible = useCallback(async () => {
        if (eligibleMedia.length > 0) return; // already loaded
        try {
            // Fetch eligible media (public + public-playlist items)
            const [eligResp, userResp] = await Promise.all([
                fetch(`${lexiconApiUrl}/api/livestream/eligible-media`, { credentials: 'include' }),
                fetch(`${lexiconApiUrl}/api/media/user/${user.id}`, { credentials: 'include' })
            ]);

            const eligData = eligResp.ok ? await eligResp.json() : { media: [] };
            const userData = userResp.ok ? await userResp.json() : [];

            // Merge: eligible + user's own MUSIC/VIDEO (deduped)
            const map = new Map();
            (eligData.media || []).forEach(m => map.set(m.id, m));
            (Array.isArray(userData) ? userData : []).forEach(m => {
                if ((m.mediaType === 'MUSIC' || m.mediaType === 'VIDEO') && !map.has(m.id)) {
                    map.set(m.id, m);
                }
            });

            setEligibleMedia(Array.from(map.values()));
        } catch (err) {
            console.error('Failed to load eligible media:', err);
        }
    }, [lexiconApiUrl, user, eligibleMedia.length]);

    const openAddPanel = () => {
        setShowAddPanel(true);
        loadEligible();
    };

    const addToQueue = async (mediaFileId) => {
        if (!user) return;
        setAddingId(mediaFileId);
        try {
            const resp = await fetch(`${lexiconApiUrl}/api/livestream/queue`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, mediaFileId })
            });
            const data = await resp.json();
            if (!data.success) {
                setError(data.message || 'Failed to add to queue');
            }
        } catch (err) {
            setError('Failed to add: ' + err.message);
        } finally {
            setAddingId(null);
        }
    };

    const removeFromQueue = async (queueId) => {
        if (!user) return;
        try {
            await fetch(`${lexiconApiUrl}/api/livestream/queue/${queueId}?userId=${user.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
        } catch (err) {
            setError('Failed to remove: ' + err.message);
        }
    };

    /* Filtered media for add panel */
    const filteredMedia = eligibleMedia.filter(m => {
        if (mediaFilter !== 'ALL' && m.mediaType !== mediaFilter) return false;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const name = (m.title || m.originalFilename || '').toLowerCase();
            return name.includes(q);
        }
        return true;
    });

    /* Queue items that are QUEUED (not PLAYING/COMPLETED/SKIPPED) */
    const upNextItems = queue.filter(q => q.status === 'QUEUED');
    const nowPlaying = queue.find(q => q.status === 'PLAYING');

    const isVideo = currentMedia?.mediaType === 'VIDEO';

    /* ---- Render ---- */
    if (user === undefined) return null;

    return (
        <div className="ls-container">
            {/* Header */}
            <div className="ls-header">
                <div className="ls-header-left">
                    <h1 className="ls-title">📡 Live Stream</h1>
                    <span className={`ls-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '● LIVE' : '○ Connecting...'}
                    </span>
                </div>
                <div className="ls-header-right">
                    <button className="ls-back-btn" onClick={() => navigate('/lexicon-dashboard')}>
                        ← Dashboard
                    </button>
                </div>
            </div>

            {error && (
                <div className="ls-error">
                    <span>{error}</span>
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}

            <div className="ls-layout">
                {/* ---- Player Area ---- */}
                <div className="ls-player-area">
                    <div
                        className={`ls-player-wrapper ${isVideo ? 'video-mode' : 'audio-mode'}`}
                        ref={containerRef}
                        onMouseMove={isVideo ? resetControlsTimer : undefined}
                    >
                        {/* Media element: key forces React to remount on track change */}
                        {currentMedia && isVideo && (
                            <video
                                key={`v-${currentMediaId}`}
                                ref={mediaRef}
                                className="ls-video-el"
                                crossOrigin="use-credentials"
                                src={getStreamUrl(currentMediaId)}
                                autoPlay={streamStarted}
                                playsInline
                                onLoadedMetadata={handleLoadedMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={handleEnded}
                                onError={handleError}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        )}
                        {currentMedia && !isVideo && (
                            <audio
                                key={`a-${currentMediaId}`}
                                ref={mediaRef}
                                crossOrigin="use-credentials"
                                src={getStreamUrl(currentMediaId)}
                                autoPlay={streamStarted}
                                onLoadedMetadata={handleLoadedMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={handleEnded}
                                onError={handleError}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        )}

                        {/* Audio visualizer background */}
                        {currentMedia && !isVideo && (
                            <div className="ls-audio-visual">
                                <div className="ls-audio-icon">{isPlaying ? '🎵' : '🎶'}</div>
                                <div className="ls-audio-bars">
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`ls-bar ${isPlaying ? 'active' : ''}`}
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Start overlay — browser autoplay policy requires user gesture */}
                        {!streamStarted && (
                            <div className="ls-start-overlay" onClick={handleStartStream}>
                                <div className="ls-start-btn">
                                    <span className="ls-start-icon">▶</span>
                                    <span className="ls-start-text">
                                        {isVideo ? 'Start Watching' : 'Start Listening'}
                                    </span>
                                    <span className="ls-start-sub">Join the live stream</span>
                                </div>
                            </div>
                        )}

                        {/* Video overlay controls (auto-hide) */}
                        {streamStarted && isVideo && (
                            <div className={`ls-vid-overlay ${showControls ? 'visible' : ''}`}>
                                <div className="ls-vid-overlay-top">
                                    <span className="ls-vid-title-overlay">
                                        {currentMedia?.title || currentMedia?.originalFilename || 'No Media'}
                                    </span>
                                </div>
                                <div className="ls-vid-overlay-bottom">
                                    <div className="ls-progress">
                                        <div className="ls-progress-fill"
                                            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                                        />
                                    </div>
                                    <div className="ls-vid-bottom-row">
                                        <button className="ls-ctl ls-skip-btn" onClick={handleSkip}>⏭ Skip</button>
                                        <span className="ls-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                        <button className="ls-ctl" onClick={toggleFullscreen}>
                                            {isFullscreen ? '⛶' : '⛶'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Now Playing info bar (always visible below player) */}
                    <div className="ls-now-playing-bar">
                        <div className="ls-np-info">
                            <span className="ls-np-type-badge">{isVideo ? '🎬 VIDEO' : '🎵 MUSIC'}</span>
                            <span className="ls-np-title">
                                {currentMedia?.title || currentMedia?.originalFilename || 'Nothing playing'}
                            </span>
                        </div>

                        {/* Audio controls — visible when NOT video */}
                        {streamStarted && !isVideo && (
                            <div className="ls-audio-controls">
                                <div className="ls-progress ls-audio-progress">
                                    <div className="ls-progress-fill"
                                        style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                                    />
                                </div>
                                <div className="ls-audio-ctrl-row">
                                    <span className="ls-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                    <button className="ls-ctl ls-skip-btn" onClick={handleSkip}>⏭ Skip</button>
                                </div>
                            </div>
                        )}

                        {!streamStarted && (
                            <span className="ls-np-hint">Click the player to join the stream</span>
                        )}
                    </div>
                </div>

                {/* ---- Sidebar ---- */}
                <div className="ls-sidebar">
                    {/* Skip votes */}
                    <div className="ls-sidebar-card">
                        <div className="ls-skip-info">
                            <span>Skip votes: {skipVotes}/{requiredSkips}</span>
                            <button className="ls-ctl ls-skip-btn" onClick={handleSkip}>⏭ Vote Skip</button>
                        </div>
                    </div>

                    {/* Up Next */}
                    <div className="ls-sidebar-card">
                        <div className="ls-card-header">
                            <h3>Up Next</h3>
                            <button className="ls-add-btn" onClick={openAddPanel}>+ Add</button>
                        </div>
                        {upNextItems.length === 0 ? (
                            <p className="ls-empty-msg">Queue empty — random media will play next</p>
                        ) : (
                            <div className="ls-queue-list">
                                {upNextItems.map((item, i) => (
                                    <div key={item.id} className="ls-queue-item">
                                        <span className="ls-qi-pos">{i + 1}</span>
                                        <div className="ls-qi-info">
                                            <span className="ls-qi-title">
                                                {item.mediaFile?.title || item.mediaFile?.originalFilename || `Media #${item.mediaFileId}`}
                                            </span>
                                            <span className="ls-qi-type">
                                                {item.mediaFile?.mediaType === 'VIDEO' ? '🎬' : '🎵'}
                                            </span>
                                        </div>
                                        {user && item.addedBy === user.id && (
                                            <button
                                                className="ls-qi-remove"
                                                onClick={() => removeFromQueue(item.id)}
                                                title="Remove"
                                            >✕</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Currently Playing card */}
                    {nowPlaying && (
                        <div className="ls-sidebar-card ls-now-card">
                            <h3>Now Playing</h3>
                            <div className="ls-now-detail">
                                <span className="ls-now-name">
                                    {nowPlaying.mediaFile?.title || nowPlaying.mediaFile?.originalFilename || `Media #${nowPlaying.mediaFileId}`}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ---- Add To Queue Panel (modal overlay) ---- */}
            {showAddPanel && (
                <div className="ls-add-overlay" onClick={() => setShowAddPanel(false)}>
                    <div className="ls-add-panel" onClick={e => e.stopPropagation()}>
                        <div className="ls-add-header">
                            <h2>Add to Queue</h2>
                            <button className="ls-add-close" onClick={() => setShowAddPanel(false)}>✕</button>
                        </div>

                        <div className="ls-add-filters">
                            <input
                                type="text"
                                className="ls-add-search"
                                placeholder="Search media..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            <div className="ls-filter-btns">
                                {['ALL', 'MUSIC', 'VIDEO'].map(f => (
                                    <button
                                        key={f}
                                        className={`ls-filter-btn ${mediaFilter === f ? 'active' : ''}`}
                                        onClick={() => setMediaFilter(f)}
                                    >
                                        {f === 'ALL' ? '🎯 All' : f === 'MUSIC' ? '🎵 Music' : '🎬 Video'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ls-add-list">
                            {filteredMedia.length === 0 ? (
                                <p className="ls-empty-msg">No matching media found</p>
                            ) : (
                                filteredMedia.map(m => (
                                    <div key={m.id} className="ls-add-item">
                                        <span className="ls-add-item-icon">
                                            {m.mediaType === 'VIDEO' ? '🎬' : '🎵'}
                                        </span>
                                        <div className="ls-add-item-info">
                                            <span className="ls-add-item-title">{m.title || m.originalFilename}</span>
                                            {m.description && (
                                                <span className="ls-add-item-desc">{m.description}</span>
                                            )}
                                        </div>
                                        <button
                                            className="ls-add-item-btn"
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
            )}
        </div>
    );
}

export default LiveStream;

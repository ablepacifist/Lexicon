import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PokemonMap.css';
import { getApiUrls } from '../utils/apiUrls';
import { useAvatar } from '../hooks/useAvatar';
import CatchScreen3D from './CatchScreen3D';
import WildBattle from './WildBattle';

// Fix Leaflet default icon broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl:       require('leaflet/dist/images/marker-icon.png'),
    shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
});

const POLL_INTERVAL_MS   = 30_000;
const INTERACTION_RANGE_M = 200; // metres — catch, spin, and see on map; beyond → sightings only
const { pokemonApiUrl, lexiconApiUrl } = getApiUrls();

function haversineM(lat1, lng1, lat2, lng2) {
    const R = 6_371_000;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const BALLS = [
    { type: 'POKEBALL',   label: 'Poké Ball',  sprite: 'pokeball_sprite.png',  color: '#ef4444' },
    { type: 'GREAT_BALL', label: 'Great Ball', sprite: 'greatball_sprite.png', color: '#3b82f6' },
    { type: 'ULTRA_BALL', label: 'Ultra Ball', sprite: 'ultraball_sprite.png', color: '#f59e0b' },
];

const BALL_SPRITE = { POKEBALL: 'pokeball_sprite.png', GREAT_BALL: 'greatball_sprite.png', ULTRA_BALL: 'ultraball_sprite.png' };

// ── Map sub-components ────────────────────────────────────────────────────────

// Captures the Leaflet map instance into a ref so it can be used outside MapContainer
function MapRefCapture({ mapRef: mRef }) {
    const map = useMap();
    useEffect(() => { mRef.current = map; }, [map, mRef]);
    return null;
}

function RecenterMap({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.setView(position, map.getZoom());
    }, [position, map]);
    return null;
}

function MapClickHandler({ active, onMapClick }) {
    useMapEvents({
        click(e) { if (active) onMapClick(e.latlng); }
    });
    return null;
}

// Memoised so Leaflet doesn't reload the sprite image on every render
const spawnIconCache = {};
function spawnIcon(spriteKey) {
    if (!spawnIconCache[spriteKey]) {
        spawnIconCache[spriteKey] = L.icon({
            iconUrl: `${pokemonApiUrl}/api/pokemon/sprites/${spriteKey}`,
            iconSize: [48, 48],
            iconAnchor: [24, 48],
            popupAnchor: [0, -48],
        });
    }
    return spawnIconCache[spriteKey];
}

function stopIcon(canSpin, isLured) {
    if (isLured) {
        return L.divIcon({
            className: '',
            html: `<div style="width:36px;height:36px;background:#ec4899;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;animation:lurePulse 1.5s ease-out infinite">🌸</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
        });
    }
    const bg = canSpin ? '#3b82f6' : '#6b7280';
    return L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;background:${bg};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:16px">📦</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}

// Cache icons by URL so Leaflet doesn't flicker on every render,
// but each unique URL gets a fresh divIcon with the URL embedded in the HTML string.
const _playerIconCache = {};
function playerIcon(avatarUrl) {
    const key = avatarUrl || '__default__';
    if (!_playerIconCache[key]) {
        const imgHtml = avatarUrl
            ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.style.background='#ef4444'" />`
            : '';
        _playerIconCache[key] = L.divIcon({
            className: '',
            html: `<div style="width:42px;height:42px;border-radius:50%;border:3px solid white;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.7);background:#1e293b;">${imgHtml}</div>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
        });
    }
    return _playerIconCache[key];
}

function pendingStopIcon() {
    return L.divIcon({
        className: '',
        html: '<div style="width:32px;height:32px;background:#f59e0b;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:16px">❓</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}

// ── Catch Screen ──────────────────────────────────────────────────────────────


function CatchScreen({ spawn, items, selectedBall, onSelectBall, throwing, shaking, catchResult, onThrow, onMiss, onClose, onTryAgain }) {
    const containerRef   = useRef(null);
    const restBallRef    = useRef(null);   // static ball resting at bottom-center
    const dragBallRef    = useRef(null);   // follows finger during drag
    const flyingBallRef  = useRef(null);   // animates during throw
    const animFrameRef   = useRef(null);
    const swipeRef       = useRef(null);
    const spinTrailRef   = useRef([]);     // pointer path for curveball detection
    const attackTimerRef = useRef(null);
    const isAttackingRef = useRef(false);
    const windRef        = useRef(0);         // random lateral wind force, unique per encounter

    const [isBagOpen,     setIsBagOpen]     = useState(false); // kept for bag panel if re-added
    const [throwTier,     setThrowTier]     = useState('');
    const [attackVisible, setAttackVisible] = useState(false);
    const [blockedMsg,    setBlockedMsg]    = useState(false);
    const [impactPos,     setImpactPos]     = useState(null);
    const [spinGlow,      setSpinGlow]      = useState(false); // golden glow when curveball spin detected

    // Cleanup on unmount
    useEffect(() => () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        clearTimeout(attackTimerRef.current);
    }, []);

    // Hide/show rest ball based on throw state
    useEffect(() => {
        if (!restBallRef.current) return;
        restBallRef.current.style.display = (throwing || shaking || catchResult) ? 'none' : '';
    }, [throwing, shaking, catchResult]);

    // Reset visual state when spawn changes
    useEffect(() => {
        setThrowTier('');
        setAttackVisible(false);
        setBlockedMsg(false);
        setSpinGlow(false);
        spinTrailRef.current = [];
        isAttackingRef.current = false;
        clearTimeout(attackTimerRef.current);
    }, [spawn]);

    // Touchmove block for iOS Safari
    useEffect(() => {
        if (!spawn) return;
        const el = containerRef.current;
        if (!el) return;
        const block = e => e.preventDefault();
        el.addEventListener('touchmove', block, { passive: false });
        return () => el.removeEventListener('touchmove', block);
    }, [spawn]);

    // Pokemon attack scheduler — random lunge every 5-9s that blocks throwing
    useEffect(() => {
        if (!spawn || catchResult || shaking) {
            clearTimeout(attackTimerRef.current);
            return;
        }
        function scheduleAttack() {
            attackTimerRef.current = setTimeout(() => {
                if (isAttackingRef.current) { scheduleAttack(); return; }
                isAttackingRef.current = true;
                setAttackVisible(true);
                setTimeout(() => {
                    isAttackingRef.current = false;
                    setAttackVisible(false);
                    scheduleAttack();
                }, 1350);
            }, 5000 + Math.random() * 4000);
        }
        scheduleAttack();
        return () => clearTimeout(attackTimerRef.current);
    }, [spawn, catchResult, shaking]);

    // Fresh random wind per encounter — accumulates over flight time so far Pokemon are less predictable
    useEffect(() => { windRef.current = (Math.random() - 0.5) * 0.00024; }, [spawn]);

    if (!spawn) return null;

    // ── Distance-aware encounter scaling ──────────────────────────────────────
    // distNorm = 0 → player is standing next to Pokemon; 1 → at the 200m edge
    const distNorm      = Math.min(1, Math.max(0, (spawn.distanceM || 0) / 200));
    const ARENA_TOP_PCT = 8  + (1 - distNorm) * 38;                        // far=8% near=46% screen top
    const ARENA_SIZE    = Math.round(90 + (1 - distNorm) * 130);           // far=90px near=220px
    const POKEMON_SIZE  = Math.round(ARENA_SIZE * 0.78);                   // scales with arena
    const SPECIES_SIZE  = { Snorlax:1.9,Wailord:2.4,Dragonite:1.6,Onix:1.5,Lapras:1.5,Rhydon:1.4,Venusaur:1.3,Charizard:1.3,Blastoise:1.3,Gyarados:1.8,Arcanine:1.4,Clefairy:0.9,Jigglypuff:0.85,Pikachu:0.85,Eevee:0.85,Pidgey:0.75,Zubat:0.75,Rattata:0.7,Caterpie:0.65,Weedle:0.65 };
    const HIT_RADIUS    = Math.round((22 + (1 - distNorm) * 68) * Math.sqrt(SPECIES_SIZE[spawn.speciesName] || 1.0));
    const swayClass     = shaking ? '' : (distNorm > 0.6 ? ' catch-arena--swaying-fast' : distNorm > 0.3 ? ' catch-arena--swaying-mid' : ' catch-arena--swaying-slow');

    function getRingBonus() {
        const ring = containerRef.current?.querySelector('.catch-ring');
        if (!ring) return 0;
        const t = window.getComputedStyle(ring).transform;
        if (!t || t === 'none') return 0;
        const m = t.match(/matrix\(([^,]+),/);
        const scale = m ? Math.abs(parseFloat(m[1])) : 1.0;
        return Math.max(0, 1 - scale);
    }

    function getArenaCenter() {
        const arena = containerRef.current?.querySelector('.catch-arena');
        if (!arena || !containerRef.current) return null;
        const cRect = containerRef.current.getBoundingClientRect();
        const aRect = arena.getBoundingClientRect();
        return {
            x: aRect.left - cRect.left + aRect.width  / 2,
            y: aRect.top  - cRect.top  + aRect.height / 2,
        };
    }

    // Analyse pointer trail for circular motion → curveball spin direction
    // Returns -1 (CCW / curves left), 0 (straight), +1 (CW / curves right)
    function detectSpin(trail) {
        if (trail.length < 8) return 0;
        let totalCross = 0;
        for (let i = 1; i < trail.length - 1; i++) {
            const ax = trail[i].x - trail[i-1].x, ay = trail[i].y - trail[i-1].y;
            const bx = trail[i+1].x - trail[i].x, by = trail[i+1].y - trail[i].y;
            totalCross += ax * by - ay * bx; // z of 2D cross product
        }
        if (Math.abs(totalCross) < 1200) return 0;
        return totalCross > 0 ? 1 : -1;
    }

    // Real physics simulation — ball has velocity from swipe, gravity pulls it down.
    // Hit/miss is detected when ball actually reaches Pokemon's position, not pre-calculated.
    // ringBonus is snapshotted at THROW TIME (like real Pokémon GO).
    function launchBall(throwStart, vx, vy, spinDir, ringBonus) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        const GRAVITY = 0.00062;            // px/ms² downward
        const MAGNUS  = spinDir * 0.00022; // Magnus effect: curveball sideways push
        const WIND    = windRef.current;   // random lateral drift per encounter

        const arena = getArenaCenter();

        let bx = throwStart.x;
        let by = throwStart.y;
        let bvx = vx;
        let bvy = vy;          // negative = upward
        let elapsed = 0;
        let prevTimestamp = null;
        let finished = false;

        const ball = flyingBallRef.current;
        if (ball) {
            ball.style.display   = 'block';
            ball.style.opacity   = '1';
            ball.style.left      = `${bx - 45}px`;
            ball.style.top       = `${by - 45}px`;
            ball.style.transform = 'scale(1) rotate(0deg)';
        }

        function frame(ts) {
            if (finished) return;
            if (!prevTimestamp) { prevTimestamp = ts; animFrameRef.current = requestAnimationFrame(frame); return; }

            const dt = Math.min(ts - prevTimestamp, 20); // cap to avoid spiral after tab switch
            prevTimestamp = ts;
            elapsed += dt;

            const b = flyingBallRef.current;
            if (!b) return;

            // ── Integrate physics ──────────────────────────────────────────────
            bvy += GRAVITY * dt;
            bvx += (MAGNUS + WIND) * dt;  // Magnus curveball + random wind drift
            bx  += bvx     * dt;
            by  += bvy     * dt;

            // Perspective: ball shrinks linearly as it rises toward Pokemon
            const yRisen  = throwStart.y - by;                          // px risen above start
            const yTarget = arena ? throwStart.y - arena.y : 320;       // total distance to Pokemon
            const prog    = Math.max(0, Math.min(1.1, yRisen / yTarget));
            // Perspective scale: ball shrinks from 90px → 11px as it recedes into screen depth
            const scale   = Math.max(0.12, 1 - prog * 0.88);

            // Spin rotation
            const spinSign = spinDir < 0 ? -1 : 1;
            const rot = elapsed * (Math.abs(bvx) * 0.9 + 1.4) * spinSign;

            // ── 3D Perspective X-convergence ──────────────────────────────────
            // In real 3D, as the ball travels INTO the screen (depth increases),
            // its screen-X converges toward the vanishing point (Pokemon's X).
            // Visual X uses perspective; hit detection still uses raw physics bx.
            const perspX = arena
                ? arena.x + (bx - arena.x) * Math.max(0, 1 - prog * 0.55)
                : bx;

            b.style.left      = `${perspX - 45}px`;
            b.style.top       = `${by - 45}px`;
            b.style.transform = `rotate(${rot}deg) scale(${scale})`;

            // ── Hit detection — fires when ball reaches Pokemon's Y band ───────
            if (arena) {
                const distX = Math.abs(bx - arena.x);
                const distY = Math.abs(by - arena.y);

                if (distY < 35 && bvy < 0) { // ball is passing upward through Pokemon's Y plane
                    finished = true;
                    b.style.display = 'none';

                    const isHit = distX <= HIT_RADIUS;
                    setImpactPos({ x: bx, y: by, type: isHit ? 'hit' : 'miss' });
                    setTimeout(() => setImpactPos(null), 600);

                    if (isHit) {
                        // Ring bonus was snapshotted at throw time — same as Pokémon GO
                        const ringScale2 = Math.max(0.03, 1 - ringBonus);
                        const ringPxR    = Math.max(6, HIT_RADIUS * ringScale2);
                        const inRing     = distX <= ringPxR;
                        const tier = inRing
                            ? (ringBonus >= 0.90 ? 'Excellent' : ringBonus >= 0.70 ? 'Great' : ringBonus >= 0.40 ? 'Nice' : '')
                            : '';
                        if (tier) setThrowTier(tier);
                        onThrow(inRing ? ringBonus : 0);
                    } else {
                        // Passed through Pokemon's plane but missed to the side
                        setTimeout(() => {
                            if (restBallRef.current) restBallRef.current.style.display = '';
                        }, 650);
                        onMiss();
                    }
                    return;
                }
            }

            // ── Miss: ball fell back below start OR went off screen ────────────
            const cRect = containerRef.current?.getBoundingClientRect();
            const cH = cRect ? cRect.height : 800;
            const cW = cRect ? cRect.width  : 400;
            const fellShort = by > throwStart.y + 20 && bvy > 0;
            const offScreen = bx < -100 || bx > cW + 100 || by < -200;

            if (fellShort || offScreen || elapsed > 3000) {
                finished = true;
                b.style.display = 'none';
                setImpactPos({ x: Math.max(10, Math.min(cW - 10, bx)), y: Math.min(cH - 30, by), type: 'miss' });
                setTimeout(() => {
                    setImpactPos(null);
                    if (restBallRef.current) restBallRef.current.style.display = '';
                }, 650);
                onMiss();
                return;
            }

            animFrameRef.current = requestAnimationFrame(frame);
        }
        animFrameRef.current = requestAnimationFrame(frame);
    }

    function moveDragBall(clientX, clientY) {
        const ball = dragBallRef.current;
        const box  = containerRef.current;
        if (!ball || !box) return;
        const rect = box.getBoundingClientRect();
        ball.style.left    = `${clientX - rect.left - 22}px`;
        ball.style.top     = `${clientY - rect.top  - 22}px`;
        ball.style.display = 'block';
    }

    function handlePointerDown(e) {
        if (throwing || shaking || catchResult) return;

        // Only start drag if pointer touches within 60px of the rest ball
        const restBall = restBallRef.current;
        if (restBall) {
            const r = restBall.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width  / 2);
            const dy = e.clientY - (r.top  + r.height / 2);
            if (Math.sqrt(dx * dx + dy * dy) > 80) return;
            restBall.style.display = 'none';
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        swipeRef.current   = { x: e.clientX, y: e.clientY, time: Date.now() };
        spinTrailRef.current = [{ x: e.clientX, y: e.clientY }];
        setSpinGlow(false);
        moveDragBall(e.clientX, e.clientY);
    }

    function handlePointerMove(e) {
        if (!swipeRef.current || throwing || shaking || catchResult) return;
        moveDragBall(e.clientX, e.clientY);

        // Build spin trail — keep last 35 points (enough for one full circular gesture)
        const trail = spinTrailRef.current;
        trail.push({ x: e.clientX, y: e.clientY });
        if (trail.length > 35) trail.shift();

        // Live feedback: glow when spin is detected during drag
        if (trail.length >= 8) setSpinGlow(detectSpin(trail) !== 0);
    }

    function handlePointerUp(e) {
        if (dragBallRef.current) dragBallRef.current.style.display = 'none';

        const restoreRest = () => {
            if (restBallRef.current) restBallRef.current.style.display = '';
        };

        if (!swipeRef.current || throwing || shaking || catchResult) {
            restoreRest(); swipeRef.current = null; return;
        }

        const dx = e.clientX - swipeRef.current.x;
        const dy = e.clientY - swipeRef.current.y;
        const dt = Math.max(1, Date.now() - swipeRef.current.time);
        const spinDir = detectSpin(spinTrailRef.current);
        spinTrailRef.current = [];
        setSpinGlow(false);
        swipeRef.current = null;

        // Minimum upward gesture: must swipe at least 35px upward
        if (dy >= -35) { restoreRest(); return; }

        if (isAttackingRef.current) {
            restoreRest();
            setBlockedMsg(true);
            setTimeout(() => setBlockedMsg(false), 900);
            return;
        }

        const cRect   = containerRef.current?.getBoundingClientRect();
        const screenW = cRect ? cRect.width  : 400;
        const screenH = cRect ? cRect.height : 800;

        // Ball always launches from the REST BALL position (bottom center) — not from the
        // finger release point. This is how real Pokemon GO works: the origin is fixed at
        // the player's hand at the bottom, so the ball travels the FULL screen depth and
        // the perspective shrink effect is dramatic and consistent.
        const throwStart = { x: screenW / 2, y: screenH - 53 }; // 95px ball, bottom:6px → center at 53px from bottom

        // Velocity comes from the swipe gesture — controls direction and power.
        const vx = dx / dt;
        const vy = dy / dt;

        // Snapshot ring bonus NOW — locked in at throw time, same as real Pokémon GO
        const ringBonus = getRingBonus();

        launchBall(throwStart, vx, vy, spinDir, ringBonus);
    }

    function handlePointerCancel() {
        if (dragBallRef.current) dragBallRef.current.style.display = 'none';
        if (restBallRef.current) restBallRef.current.style.display = '';
        spinTrailRef.current = [];
        setSpinGlow(false);
        swipeRef.current = null;
    }

    const ballSprite      = BALL_SPRITE[selectedBall] || BALLS[0].sprite;
    const selectedBallDef = BALLS.find(b => b.type === selectedBall) || BALLS[0];

    return (
        <div
            ref={containerRef}
            className="catch-screen"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
        >
            {/* Ground scene */}
            <div className="catch-scene-ground" />

            {/* Rest ball — sits at bottom-center, player drags it to throw */}
            <div ref={restBallRef} className={`catch-rest-ball${spinGlow ? ' catch-rest-ball--spinning' : ''}`}>
                <img src={`${pokemonApiUrl}/api/pokemon/item-sprites/${ballSprite}`} alt=""
                     onError={e => { e.target.style.display='none'; }} />
            </div>

            {/* Drag ball — follows finger while dragging */}
            <div ref={dragBallRef} className="catch-drag-ball" style={{ display: 'none' }}>
                <img src={`${pokemonApiUrl}/api/pokemon/item-sprites/${ballSprite}`} alt=""
                     onError={e => { e.target.style.display='none'; }} />
            </div>

            {/* Physics ball */}
            <div ref={flyingBallRef} className="catch-flying-ball" style={{ display: 'none' }}>
                <img src={`${pokemonApiUrl}/api/pokemon/item-sprites/${ballSprite}`} alt=""
                     onError={e => { e.target.style.display='none'; }} />
            </div>

            <button className="catch-run" onPointerDown={e => e.stopPropagation()} onClick={onClose}>
                ← Run
            </button>

            <div className="catch-name" style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 5, background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 28, padding: '8px 22px', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                Wild {spawn.speciesName}!
                {spawn.distanceM > 0 && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{spawn.distanceM}m away</span>}
            </div>

            {/* Throw tier label (Nice / Great / Excellent) */}
            {throwTier && !catchResult && (
                <div key={throwTier} className={`catch-throw-tier catch-throw-tier--${throwTier}`}>
                    {throwTier}!
                </div>
            )}

            {/* Deflected message during Pokemon attack */}
            {blockedMsg && (
                <div className="catch-blocked-msg">Deflected!</div>
            )}

            {/* Ball landing impact marker */}
            {impactPos && (
                <div
                    className={`catch-impact catch-impact--${impactPos.type}`}
                    style={{ left: impactPos.x, top: impactPos.y }}
                />
            )}

            {/* Arena */}
            <div className={`catch-arena${shaking ? ' catch-arena--shaking' : ''}${swayClass}`}
                 style={{ position: 'absolute', top: `${ARENA_TOP_PCT}%`, left: '50%', transform: 'translateX(-50%)', width: ARENA_SIZE, height: ARENA_SIZE, marginBottom: 0 }}>
                {!catchResult && !shaking && <div className="catch-ring" />}
                <div className="catch-arena-shadow" />

                <img
                    className={`catch-pokemon${attackVisible ? ' catch-pokemon--attack' : ''}`}
                    style={{ width: POKEMON_SIZE, height: POKEMON_SIZE }}
                    src={`${pokemonApiUrl}/api/pokemon/sprites/${spawn.spriteKey}`}
                    alt={spawn.speciesName}
                    onError={e => { e.target.style.opacity = '0.15'; }}
                />

                {/* Shake ball — shown while server result is processing */}
                {shaking && (
                    <div className="catch-shake-ball">
                        <img src={`${pokemonApiUrl}/api/pokemon/item-sprites/${ballSprite}`} alt=""
                             onError={e => { e.target.style.display='none'; }} />
                    </div>
                )}

                {catchResult && (
                    <div className={`catch-result-overlay catch-result-overlay--${catchResult.success ? 'success' : 'fail'}`}>
                        <span className="catch-result-emoji">
                            {catchResult.success ? '🎉' : '💨'}
                        </span>
                    </div>
                )}
            </div>

            {catchResult && (
                <div className={`catch-result-text catch-result-text--${catchResult.success ? 'success' : 'fail'}`}
                     style={{ position: 'absolute', top: `calc(${ARENA_TOP_PCT}% + ${ARENA_SIZE}px + 14px)`, left: 16, right: 16, textAlign: 'center', marginBottom: 0 }}>
                    {catchResult.message}
                </div>
            )}

            {!throwing && !shaking && !catchResult && (
                <div className="catch-hint" style={{ position: 'absolute', bottom: 112, left: 0, right: 0 }}>
                    <span className="catch-hint-arrow">↑</span>
                    {attackVisible ? 'Watch out!' : spinGlow ? '✨ Curveball! Release!' : 'Drag the ball up to throw!'}
                </div>
            )}

            {catchResult && (
                <button
                    className="catch-action-btn catch-action-btn--done"
                    style={{ position: 'absolute', bottom: 80 }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={catchResult.success ? onClose : onTryAgain}
                >
                    {catchResult.success ? '🌟 Awesome!' : '🎯 Try Again!'}
                </button>
            )}

            {/* Pokemon GO-style bottom row: berry (left) · pokeball (center, absolute) · ball selector (right) */}
            {!catchResult && !shaking && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 118, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px 10px', zIndex: 10, pointerEvents: 'none' }}
                     onPointerDown={e => e.stopPropagation()}>
                    {/* Razz Berry — placeholder, left side */}
                    <button style={{ pointerEvents: 'auto', width: 68, height: 68, borderRadius: '50%', background: 'rgba(0,0,0,0.38)', border: '2px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, cursor: 'pointer', boxShadow: '0 2px 14px rgba(0,0,0,0.45)', color: 'white' }}>
                        🍓
                    </button>
                    {/* Center spacer — pokeball positioned above separately */}
                    <div style={{ width: 95 }} />
                    {/* Ball type selector — tap to cycle through available balls */}
                    <button
                        style={{ pointerEvents: 'auto', width: 68, height: 68, borderRadius: '50%', background: 'rgba(0,0,0,0.38)', border: `2px solid ${selectedBallDef.color}88`, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', boxShadow: '0 2px 14px rgba(0,0,0,0.45)' }}
                        onClick={() => {
                            if (throwing) return;
                            const avail = BALLS.filter(b => (items[b.type] || 0) > 0);
                            if (!avail.length) return;
                            const curr = avail.findIndex(b => b.type === selectedBall);
                            onSelectBall(avail[(curr + 1) % avail.length].type);
                        }}>
                        <img src={`${pokemonApiUrl}/api/pokemon/item-sprites/${ballSprite}`} alt={selectedBallDef.label}
                             style={{ width: 38, height: 38, objectFit: 'contain' }}
                             onError={e => { e.target.style.display='none'; }} />
                        <span style={{ color: 'white', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>×{items[selectedBall] || 0}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PokemonMap() {
    const navigate = useNavigate();
    const [authState,       setAuthState]       = useState('checking');
    const [loginForm,       setLoginForm]       = useState({ username: '', password: '' });
    const [loginError,      setLoginError]      = useState('');

    const [playerPos,       setPlayerPos]       = useState(null);
    const [playerUsername,  setPlayerUsername]  = useState(null);
    const [spawns,          setSpawns]          = useState([]);
    const [stops,           setStops]           = useState([]);
    const [toast,           setToast]           = useState('');

    // Catch screen
    const [gpsStatus,       setGpsStatus]       = useState('idle'); // 'idle'|'waiting'|'active'|'denied'|'error'

    const [catchTarget,  setCatchTarget]  = useState(null);
    const [playerItems,  setPlayerItems]  = useState({});
    const [selectedBall, setSelectedBall] = useState('POKEBALL');
    const [throwing,     setThrowing]     = useState(false);
    const [shaking,      setShaking]      = useState(false);
    const [catchResult,  setCatchResult]  = useState(null);
    const [battleTarget, setBattleTarget] = useState(null);  // wild spawn we're battling
    const [battleCatchId,setBattleCatchId]= useState(null);  // battleId carried into the throw screen

    // Pokestop placement
    const [placingStop,    setPlacingStop]    = useState(false);
    const [pendingStop,    setPendingStop]    = useState(null);
    const [stopName,       setStopName]       = useState('');
    const [savingStop,     setSavingStop]     = useState(false);
    const [spinningStopId, setSpinningStopId] = useState(null);

    const [playerStats,      setPlayerStats]      = useState(null);
    const [fabOpen,          setFabOpen]          = useState(false);
    const [sightingsVisible, setSightingsVisible] = useState(false);

    const { avatarUrl: playerAvatarUrl } = useAvatar(playerUsername);

    const watchRef = useRef(null);
    const mapRef   = useRef(null);

    // ── Auth ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        async function tryAuth() {
            const meRes = await fetch(`${pokemonApiUrl}/api/pokemon/auth/me`, { credentials: 'include' }).catch(() => null);
            if (meRes?.ok) { setAuthState('authed'); return; }
            try {
                const tokenRes = await fetch(`${lexiconApiUrl}/api/auth/sso/generate-token`, {
                    method: 'POST', credentials: 'include',
                });
                if (tokenRes.ok) {
                    const { token } = await tokenRes.json();
                    const ssoRes = await fetch(`${pokemonApiUrl}/api/pokemon/auth/sso`, {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                    });
                    if (ssoRes.ok) { setAuthState('authed'); return; }
                }
            } catch { /* fall through */ }
            setAuthState('unauthed');
        }
        tryAuth();
    }, []);

    // ── Resolve username after auth (useAvatar hook handles the URL from here) ──
    useEffect(() => {
        if (authState !== 'authed') return;
        fetch(`${pokemonApiUrl}/api/pokemon/auth/me`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.username) setPlayerUsername(data.username); })
            .catch(() => {});
    }, [authState]);

    // ── Player stats ─────────────────────────────────────────────────────────
    const loadPlayerStats = useCallback(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/player/stats`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setPlayerStats(data); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (authState !== 'authed') return;
        loadPlayerStats();
    }, [authState, loadPlayerStats]);

    // ── GPS ───────────────────────────────────────────────────────────────────
    // Call getCurrentPosition first — this is the call that actually triggers the
    // browser permission dialog on iOS/Android (watchPosition can silently fail).
    function requestGPS() {
        if (!navigator.geolocation) { setGpsStatus('error'); return; }
        setGpsStatus('waiting');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPlayerPos([pos.coords.latitude, pos.coords.longitude]);
                setGpsStatus('active');
                if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
                watchRef.current = navigator.geolocation.watchPosition(
                    p => setPlayerPos([p.coords.latitude, p.coords.longitude]),
                    () => {},
                    { enableHighAccuracy: true, maximumAge: 5000 }
                );
            },
            (err) => setGpsStatus(err.code === 1 ? 'denied' : 'error'),
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }

    useEffect(() => {
        if (authState !== 'authed') return;
        requestGPS(); // auto-attempt; works on desktop, shows button fallback on mobile
        return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
    }, [authState]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Poll nearby ───────────────────────────────────────────────────────────
    const fetchNearby = useCallback(() => {
        if (!playerPos) return;
        const [lat, lng] = playerPos;
        fetch(`${pokemonApiUrl}/api/pokemon/nearby?lat=${lat}&lng=${lng}&radius=500`, { credentials: 'include' })
            .then(r => r.json()).then(setSpawns).catch(() => {});
        fetch(`${pokemonApiUrl}/api/pokemon/pokestops/nearby?lat=${lat}&lng=${lng}&radius=500`, { credentials: 'include' })
            .then(r => r.json()).then(setStops).catch(() => {});
    }, [playerPos]);

    useEffect(() => {
        fetchNearby();
        const id = setInterval(fetchNearby, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchNearby]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    function showToast(msg, duration = 3000) {
        setToast(msg);
        setTimeout(() => setToast(''), duration);
    }

    // ── Catch screen open ─────────────────────────────────────────────────────
    async function openCatchScreen(spawn) {
        try {
            const res  = await fetch(`${pokemonApiUrl}/api/pokemon/items`, { credentials: 'include' });
            const list = await res.json();
            const map  = {};
            list.forEach(i => { map[i.itemType] = i.quantity; });
            setPlayerItems(map);
            if (map['ULTRA_BALL'] > 0)      setSelectedBall('ULTRA_BALL');
            else if (map['GREAT_BALL'] > 0) setSelectedBall('GREAT_BALL');
            else                            setSelectedBall('POKEBALL');
        } catch { setPlayerItems({}); }
        const distanceM = playerPos
            ? Math.round(haversineM(playerPos[0], playerPos[1], spawn.lat, spawn.lng))
            : 50;
        setCatchResult(null);
        setThrowing(false);
        setCatchTarget({ ...spawn, distanceM });
    }

    function closeCatchScreen() {
        // If this throw screen was opened from a battle and we leave without catching,
        // tell the server to drop the battle session.
        if (battleCatchId && catchTarget) {
            fetch(`${pokemonApiUrl}/api/pokemon/battle/end`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ battleId: battleCatchId }),
            }).catch(() => {});
        }
        setBattleCatchId(null);
        setCatchTarget(null);
        setCatchResult(null);
        setThrowing(false);
        setShaking(false);
    }

    // ── Battle screen ─────────────────────────────────────────────────────────
    function openBattle(spawn) {
        setBattleTarget(spawn);
    }

    function closeBattle(refresh, consumed) {
        // A won battle consumes the spawn server-side — drop it locally too so it
        // disappears immediately. A loss/flee leaves the spawn on the map.
        if (consumed && battleTarget) {
            setSpawns(prev => prev.filter(s => s.id !== battleTarget.id));
        }
        setBattleTarget(null);
        if (refresh) { fetchNearby(); loadPlayerStats(); }
    }

    // Player chose "Catch" inside a battle → open the throw screen carrying the battleId.
    async function catchFromBattle(battleId) {
        const spawn = battleTarget;
        setBattleTarget(null);
        setBattleCatchId(battleId);
        await openCatchScreen(spawn);
    }

    function resetCatch() {
        setCatchResult(null);
        setThrowing(false);
        setShaking(false);
    }

    // ── Miss (ball thrown but didn't hit the Pokemon) ─────────────────────────
    async function handleMiss() {
        if (throwing || !catchTarget || catchResult) return;
        if ((playerItems[selectedBall] || 0) === 0) return;
        setThrowing(true);
        await new Promise(r => setTimeout(r, 780)); // match miss animation duration
        setPlayerItems(prev => ({
            ...prev,
            [selectedBall]: Math.max(0, (prev[selectedBall] || 0) - 1),
        }));
        setThrowing(false); // ring reappears, player can try again
    }

    // ── Throw (hit — ball reached the Pokemon) ────────────────────────────────
    async function handleThrow(ringBonus, berry) {
        if (throwing || !catchTarget || catchResult) return;
        if ((playerItems[selectedBall] || 0) === 0) {
            showToast('No ' + selectedBall.replace('_', ' ') + ' left!');
            return;
        }
        setThrowing(true);
        setShaking(false);

        try {
            // Fire API immediately so server processes while animation plays
            const fetchPromise = fetch(`${pokemonApiUrl}/api/pokemon/catch`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    spawnId:  catchTarget.id,
                    lat:      playerPos ? playerPos[0] : 0,
                    lng:      playerPos ? playerPos[1] : 0,
                    ballType: selectedBall,
                    berry:    berry || null,
                    battleId: battleCatchId || null,
                }),
            });

            // Wait for ball flight animation (900ms + buffer)
            await new Promise(r => setTimeout(r, 1000));

            // Deduct ball locally
            setPlayerItems(prev => ({
                ...prev,
                [selectedBall]: Math.max(0, (prev[selectedBall] || 0) - 1),
            }));
            // Deduct berry locally if one was used
            if (berry) {
                setPlayerItems(prev => ({ ...prev, [berry]: Math.max(0, (prev[berry] || 0) - 1) }));
            }

            const res = await fetchPromise;
            if (!res.ok) {
                const msg = await res.text().catch(() => 'Server error');
                setCatchResult({ success: false, message: msg });
                return;
            }

            const data = await res.json();

            // Ball-shake phase — 3 shakes × 700ms before revealing result
            setShaking(true);
            await new Promise(r => setTimeout(r, 2200));
            setShaking(false);

            if (data.success) {
                setCatchResult({ success: true, message: `${catchTarget.speciesName} was caught!`, pokemon: data.pokemon });
                setSpawns(prev => prev.filter(s => s.id !== catchTarget.id));
                setBattleCatchId(null); // battle session already closed server-side on a catch
            } else {
                setCatchResult({ success: false, message: data.message || 'It broke free!' });
            }
        } catch {
            setCatchResult({ success: false, message: 'Network error — try again' });
        } finally {
            setThrowing(false);
            setShaking(false);
        }
    }

    // ── Login fallback ────────────────────────────────────────────────────────
    async function handleLogin(e) {
        e.preventDefault();
        setLoginError('');
        try {
            const res = await fetch(`${pokemonApiUrl}/api/pokemon/auth/login`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm),
            });
            if (res.ok) setAuthState('authed');
            else        setLoginError('Invalid username or password');
        } catch { setLoginError('Could not reach Pokemon server'); }
    }

    // ── Pokestop spin ─────────────────────────────────────────────────────────
    async function spinStop(stop) {
        if (!playerPos) return showToast('No GPS signal');
        setSpinningStopId(stop.id);
        setTimeout(() => setSpinningStopId(null), 1200);
        try {
            const res  = await fetch(`${pokemonApiUrl}/api/pokemon/pokestop/spin`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stopId: stop.id, lat: playerPos[0], lng: playerPos[1] }),
            });
            const data = await res.json();
            showToast(typeof data === 'string' ? data : (data.message || 'Spun!'), 4000);
            fetchNearby();
        } catch { showToast('Spin failed'); }
    }

    async function lurePokestop(stop) {
        try {
            const res = await fetch(`${pokemonApiUrl}/api/pokemon/pokestop/lure`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stopId: stop.id }),
            });
            const data = await res.json();
            showToast(data.message || 'Lure activated!', 5000);
            setPlayerItems(prev => ({ ...prev, LURE_MODULE: Math.max(0, (prev.LURE_MODULE || 0) - 1) }));
            fetchNearby();
        } catch { showToast('Failed to activate lure'); }
    }

    // ── Pokestop placement ────────────────────────────────────────────────────
    function handleMapClick(latlng) {
        setPendingStop({ lat: latlng.lat, lng: latlng.lng });
        setStopName('');
        setPlacingStop(false);
    }

    async function confirmAddStop() {
        if (!pendingStop) return;
        setSavingStop(true);
        try {
            const name = stopName.trim() || 'New Pokéstop';
            const res  = await fetch(`${pokemonApiUrl}/api/pokemon/pokestop/add`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, lat: pendingStop.lat, lng: pendingStop.lng }),
            });
            if (res.ok) { showToast(`"${name}" added!`, 4000); fetchNearby(); }
            else          showToast('Failed to add Pokéstop');
        } catch { showToast('Failed to add Pokéstop'); }
        finally  { setSavingStop(false); setPendingStop(null); }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    if (authState === 'checking') return <div style={s.center}>Signing in…</div>;

    if (authState === 'unauthed') {
        return (
            <div style={s.center}>
                <div style={s.loginCard}>
                    <h2 style={{ marginBottom: 8 }}>Sign in to play</h2>
                    <p style={{ color: '#6b7280', marginBottom: 8, fontSize: 14 }}>
                        You must be logged into Lexicon first.
                        <a href="/login" style={{ display: 'block', marginTop: 8, color: '#ef4444', fontWeight: 'bold' }}>
                            Go to Login →
                        </a>
                    </p>
                    <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
                    <p style={{ color: '#6b7280', marginBottom: 12, fontSize: 13 }}>Or enter credentials manually:</p>
                    <form onSubmit={handleLogin}>
                        <input style={s.input} placeholder="Username" value={loginForm.username}
                            onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} />
                        <input style={s.input} type="password" placeholder="Password" value={loginForm.password}
                            onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
                        {loginError && <p style={{ color: '#ef4444', fontSize: 13 }}>{loginError}</p>}
                        <button style={s.btn} type="submit">Start Adventure</button>
                    </form>
                </div>
            </div>
        );
    }

    const center = playerPos || [43.6532, -79.3832];
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    const isDusk  = (hour >= 18 && hour < 20) || (hour === 6);

    return (
        <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
            <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapRefCapture mapRef={mapRef} />
                <MapClickHandler active={placingStop} onMapClick={handleMapClick} />

                {playerPos && (
                    <>
                        <RecenterMap position={playerPos} />
                        <Circle
                            center={playerPos}
                            radius={INTERACTION_RANGE_M}
                            pathOptions={{
                                color: '#3b82f6',
                                fillColor: '#3b82f6',
                                fillOpacity: 0.06,
                                weight: 1.5,
                                dashArray: '6 4',
                            }}
                        />
                        <Marker position={playerPos} icon={playerIcon(playerAvatarUrl)} />
                    </>
                )}

                {spawns.filter(spawn => !playerPos ||
                    haversineM(playerPos[0], playerPos[1], spawn.lat, spawn.lng) <= INTERACTION_RANGE_M
                ).map(spawn => {
                    const dist = playerPos
                        ? Math.round(haversineM(playerPos[0], playerPos[1], spawn.lat, spawn.lng))
                        : 9999;
                    const inRange = dist <= INTERACTION_RANGE_M;
                    return (
                        <Marker key={spawn.id} position={[spawn.lat, spawn.lng]} icon={spawnIcon(spawn.spriteKey)}>
                            <Popup>
                                <div style={{ textAlign: 'center', minWidth: 130 }}>
                                    <img src={`${pokemonApiUrl}/api/pokemon/sprites/${spawn.spriteKey}`}
                                        alt={spawn.speciesName}
                                        style={{ width: 80, height: 80, objectFit: 'contain' }}
                                        onError={e => { e.target.style.display = 'none'; }} />
                                    <div style={{ fontWeight: 'bold', margin: '4px 0', fontSize: 14 }}>{spawn.speciesName}</div>
                                    {spawn.level > 0 && (
                                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 700 }}>Lv. {spawn.level}</div>
                                    )}
                                    {inRange ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <button style={{ ...s.catchBtn, background: '#7c3aed' }} onClick={() => openBattle(spawn)}>
                                                ⚔️ Battle
                                            </button>
                                            <button style={{ ...s.catchBtn, background: '#22c55e' }} onClick={() => openCatchScreen(spawn)}>
                                                🎯 Catch
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                                            🚶 {dist < 1000 ? `${dist}m` : `${(dist/1000).toFixed(1)}km`} away
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {stops.map(stop => (
                    <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopIcon(stop.canSpin, stop.lured)}>
                        <Popup>
                            <div style={{ textAlign: 'center', minWidth: 145 }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{stop.name}</div>
                                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 6 }}>
                                    {stop.lured ? '🌸 Lured! ' : ''}Pokéstop{stop.biome && stop.biome !== 'NORMAL' ? ` · ${stop.biome}` : ''}
                                </div>
                                <button style={{ ...s.catchBtn, background: stop.canSpin ? '#3b82f6' : '#9ca3af', cursor: stop.canSpin ? 'pointer' : 'default', marginBottom: 5 }}
                                    disabled={!stop.canSpin} onClick={() => spinStop(stop)}>
                                    <span style={spinningStopId === stop.id ? { display: 'inline-block', animation: 'stopDiscSpin 0.4s linear infinite' } : {}}>📦</span>
                                    {' '}{stop.canSpin ? 'Spin!' : '⏳ Cooldown'}
                                </button>
                                {!stop.lured && (playerItems.LURE_MODULE || 0) > 0 && (
                                    <button style={{ ...s.catchBtn, background: '#ec4899' }}
                                        onClick={() => lurePokestop(stop)}>
                                        🌸 Use Lure ({playerItems.LURE_MODULE})
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {pendingStop && <Marker position={[pendingStop.lat, pendingStop.lng]} icon={pendingStopIcon()} />}
            </MapContainer>

            {/* Day/night overlay — darkens map tiles without affecting UI */}
            {(isNight || isDusk) && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 200, pointerEvents: 'none',
                    background: isNight
                        ? 'rgba(8,12,40,0.48)'
                        : 'rgba(20,10,35,0.24)',
                }} />
            )}

            {/* Level + coins + stardust badge */}
            {playerStats && (
                <div style={s.levelBadge}>
                    ⭐ Lv.{playerStats.level} &nbsp;💰{playerStats.coins} &nbsp;✨{(playerStats.stardust || 0).toLocaleString()}
                </div>
            )}

            {/* FAB speed dial — all nav + actions */}
            <div style={s.fabContainer}>
                {fabOpen && (
                    <div style={s.fabMenu}>
                        <button style={{ ...s.fabMenuItem, background: 'rgba(100,116,139,.88)' }}
                            onClick={() => { setFabOpen(false); navigate('/profile'); }}>
                            👤 Trainer
                        </button>
                        <button style={{ ...s.fabMenuItem, background: 'rgba(37,99,235,.88)' }}
                            onClick={() => { setFabOpen(false); navigate('/pokemon/shop'); }}>
                            🛒 Shop
                        </button>
                        <button style={{ ...s.fabMenuItem, background: 'rgba(16,185,129,.88)' }}
                            onClick={() => { setFabOpen(false); navigate('/pokemon/items'); }}>
                            🎒 Items
                        </button>
                        <button style={{ ...s.fabMenuItem, background: 'rgba(124,58,237,.88)' }}
                            onClick={() => { setFabOpen(false); navigate('/pokemon/pokemon'); }}>
                            🔴 My Pokémon
                        </button>
                        <button style={{ ...s.fabMenuItem, background: 'rgba(217,119,6,.88)' }}
                            onClick={() => { setFabOpen(false); navigate('/pokemon/pokedex'); }}>
                            📖 Pokédex
                        </button>
                        <button
                            style={{ ...s.fabMenuItem, background: placingStop ? 'rgba(245,158,11,.9)' : 'rgba(15,118,110,.88)' }}
                            onClick={() => { setFabOpen(false); setPlacingStop(p => !p); setPendingStop(null); }}>
                            📍 {placingStop ? 'Cancel Stop' : 'Add Pokéstop'}
                        </button>
                    </div>
                )}
                <button
                    style={{ ...s.fabBtn, ...(fabOpen ? { background: 'rgba(239,68,68,.88)', transform: 'rotate(45deg)' } : {}) }}
                    onClick={() => setFabOpen(o => !o)}>
                    +
                </button>
            </div>

            {placingStop && <div style={s.tapHint}>Tap anywhere on the map to place a Pokéstop</div>}

            {pendingStop && !placingStop && (
                <div style={s.overlay}>
                    <div style={s.dialog}>
                        <h3 style={{ margin: '0 0 4px' }}>New Pokéstop</h3>
                        <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 12px' }}>
                            {pendingStop.lat.toFixed(5)}, {pendingStop.lng.toFixed(5)}
                        </p>
                        <input style={{ ...s.input, marginBottom: 12 }} placeholder="Name (e.g. Park Bench)"
                            value={stopName} onChange={e => setStopName(e.target.value)}
                            autoFocus onKeyDown={e => e.key === 'Enter' && confirmAddStop()} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...s.btn, flex: 1 }} disabled={savingStop} onClick={confirmAddStop}>
                                {savingStop ? 'Saving…' : 'Add Pokéstop'}
                            </button>
                            <button style={{ ...s.btn, flex: 0, background: '#6b7280' }} onClick={() => setPendingStop(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sightings toggle button */}
            {playerPos && spawns.length > 0 && !catchTarget && (
                <button style={s.sightingsToggle} onClick={() => { setFabOpen(false); setSightingsVisible(o => !o); }}
                        title={sightingsVisible ? 'Hide sightings' : 'Show sightings'}>
                    {sightingsVisible ? '👁 Sightings' : '··· Sightings'}
                </button>
            )}

            {/* Sightings panel — only shows spawns OUT of catch range (need to walk closer) */}
            {sightingsVisible && !catchTarget && (() => {
                const distant = playerPos
                    ? spawns.filter(sp => haversineM(playerPos[0], playerPos[1], sp.lat, sp.lng) > INTERACTION_RANGE_M)
                    : spawns;
                if (distant.length === 0) return null;
                return (
                    <div style={s.sightings}>
                        <div style={s.sightingsLabel}>Sightings</div>
                        {distant.slice(0, 4).map(sp => (
                            <div key={sp.id} style={s.sightingsItem}
                                 title={sp.speciesName}
                                 onClick={() => mapRef.current?.flyTo([sp.lat, sp.lng], 18)}>
                                <img
                                    src={`${pokemonApiUrl}/api/pokemon/sprites/${sp.spriteKey}`}
                                    alt=""
                                    style={{ width: 36, height: 36, objectFit: 'contain', filter: 'brightness(0) opacity(0.75)' }}
                                    onError={e => { e.target.style.display='none'; }}
                                />
                                <span style={{ fontSize: 9, color: '#475569' }}>👣</span>
                            </div>
                        ))}
                    </div>
                );
            })()}

            {toast && <div style={s.toast}>{toast}</div>}

            {/* GPS overlay — shown until location is obtained */}
            {!playerPos && (
                <div style={s.gpsOverlay}>
                    {gpsStatus === 'waiting' && (
                        <div style={s.gpsCard}>
                            <div style={{ fontSize: 36, marginBottom: 12 }}>📍</div>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>Getting your location…</div>
                            <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                Allow location access when your browser prompts you
                            </div>
                        </div>
                    )}
                    {gpsStatus === 'denied' && (
                        <div style={s.gpsCard}>
                            <div style={{ fontSize: 36, marginBottom: 12 }}>🚫</div>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>Location Denied</div>
                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                                Open your browser settings, enable location for this site, then tap Retry.
                            </div>
                            <button style={s.gpsBtn} onClick={requestGPS}>Retry</button>
                        </div>
                    )}
                    {gpsStatus === 'error' && (
                        <div style={s.gpsCard}>
                            <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
                            <div style={{ fontWeight: 700, marginBottom: 16 }}>GPS Unavailable</div>
                            <button style={s.gpsBtn} onClick={requestGPS}>Try Again</button>
                        </div>
                    )}
                    {gpsStatus === 'idle' && (
                        <div style={s.gpsCard}>
                            <div style={{ fontSize: 36, marginBottom: 12 }}>📍</div>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>Location Required</div>
                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                                PokeWorld needs your GPS to show nearby Pokémon.
                            </div>
                            <button style={s.gpsBtn} onClick={requestGPS}>Enable Location</button>
                        </div>
                    )}
                </div>
            )}

            <CatchScreen3D
                spawn={catchTarget}
                items={playerItems}
                selectedBall={selectedBall}
                onSelectBall={setSelectedBall}
                throwing={throwing}
                shaking={shaking}
                catchResult={catchResult}
                onThrow={handleThrow}
                onMiss={handleMiss}
                onClose={closeCatchScreen}
                onTryAgain={resetCatch}
            />

            {battleTarget && (
                <WildBattle
                    spawn={battleTarget}
                    playerPos={playerPos}
                    onRequestCatch={catchFromBattle}
                    onClose={closeBattle}
                />
            )}

        </div>
    );
}

const s = {
    center:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9fafb' },
    loginCard: { background: 'white', padding: 32, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,.1)', width: 320 },
    input:     { width: '100%', padding: '10px 12px', marginBottom: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' },
    btn:       { width: '100%', padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 'bold' },
    catchBtn:  { display: 'block', width: '100%', padding: '8px 0', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' },
    levelBadge:    { position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'rgba(0,0,0,.78)', color: 'white', borderRadius: 20, padding: '7px 16px', fontSize: 14, fontWeight: 700, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', pointerEvents: 'none' },
    tapHint:       { position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(245,158,11,.9)', color: 'white', padding: '8px 20px', borderRadius: 20, fontSize: 14, fontWeight: 'bold', zIndex: 1001, whiteSpace: 'nowrap', pointerEvents: 'none' },
    fabContainer:  { position: 'absolute', bottom: 24, right: 14, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
    fabBtn:        { width: 50, height: 50, borderRadius: '50%', background: 'rgba(15,23,42,.78)', border: '1px solid rgba(255,255,255,.15)', color: 'white', fontSize: 28, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', transition: 'transform .2s, background .2s', fontWeight: 300 },
    fabMenu:       { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
    fabMenuItem:   { padding: '9px 16px', borderRadius: 20, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(0,0,0,.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' },
    sightingsToggle: { position: 'absolute', bottom: 24, left: 14, zIndex: 1000, background: 'rgba(10,14,26,.45)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '6px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' },
    overlay:   { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    dialog:    { background: 'white', borderRadius: 14, padding: 24, width: 300, boxShadow: '0 8px 32px rgba(0,0,0,.25)' },
    toast:      { position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.8)', color: 'white', padding: '10px 20px', borderRadius: 20, fontSize: 14, zIndex: 1001, whiteSpace: 'nowrap', pointerEvents: 'none' },
    gpsOverlay:    { position: 'absolute', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' },
    gpsCard:       { background: 'rgba(15,23,42,.96)', color: 'white', padding: '32px 40px', borderRadius: 20, textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.6)', maxWidth: 300, width: '90%' },
    gpsBtn:        { background: '#ef4444', color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 16, cursor: 'pointer', fontWeight: 'bold' },
    sightings:     { position: 'absolute', bottom: 70, left: 14, zIndex: 1000, background: 'rgba(10,14,26,.82)', borderRadius: 14, padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.07)' },
    sightingsLabel:{ color: '#475569', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
    sightingsItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, cursor: 'pointer', padding: '3px 5px', borderRadius: 8, background: 'rgba(255,255,255,.04)' },
};

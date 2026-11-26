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
import GymBattle from './GymBattle';
import ModalFrame from '../components/ModalFrame';
import pressable from '../utils/pressable';
import { responseError } from '../utils/responseError';

// Fix Leaflet default icon broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl:       require('leaflet/dist/images/marker-icon.png'),
    shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
});

const POLL_INTERVAL_MS   = 30_000;
const INTERACTION_RANGE_M = 200; // metres — catch, spin, and see on map; beyond → sightings only
const { pokemonApiUrl } = getApiUrls();

/**
 * A list endpoint's answer, or [] if it was anything else.
 *
 * Without this a 401 (the Pokémon session expired) or a 500 stored an error *object* in
 * spawns/stops/gyms, and the next render's `.map`/`.filter` threw. With no error
 * boundary that blanked the whole site, one poll after the session lapsed.
 */
async function asArray(response) {
    if (!response.ok) return [];
    try {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function haversineM(lat1, lng1, lat2, lng2) {
    const R = 6_371_000;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

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

const TEAM_COLOR = { VALOR: '#ef4444', MYSTIC: '#3b82f6', INSTINCT: '#eab308' };

// Gym marker — taller than a stop, coloured by controlling team (grey if unclaimed).
function gymIcon(team) {
    const bg = TEAM_COLOR[team] || '#6b7280';
    return L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="width:40px;height:40px;background:${bg};border:3px solid white;border-radius:8px;box-shadow:0 3px 10px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font-size:22px">🏛️</div>
            <div style="width:3px;height:8px;background:${bg}"></div>
        </div>`,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function PokemonMap() {
    const navigate = useNavigate();

    const [playerPos,       setPlayerPos]       = useState(null);
    const [playerUsername,  setPlayerUsername]  = useState(null);
    const [spawns,          setSpawns]          = useState([]);
    const [stops,           setStops]           = useState([]);
    const [gyms,            setGyms]            = useState([]);
    const [teamPicker,      setTeamPicker]      = useState(false);
    const [placingGym,      setPlacingGym]      = useState(false);
    const [gymBattleTarget, setGymBattleTarget] = useState(null);  // gym we're attacking
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

    // The Pokémon session is established by PokemonSessionGate before this renders
    // (see AppRoutes), so this page no longer runs its own SSO handshake or its own
    // login form — which used to tell already-signed-in players to "log into Lexicon".

    // ── Resolve username after auth (useAvatar hook handles the URL from here) ──
    useEffect(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/auth/me`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.username) setPlayerUsername(data.username); })
            .catch(() => {});
    }, []);

    // ── Player stats ─────────────────────────────────────────────────────────
    const loadPlayerStats = useCallback(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/player/stats`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setPlayerStats(data); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        loadPlayerStats();
    }, [loadPlayerStats]);

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
        requestGPS(); // auto-attempt; works on desktop, shows button fallback on mobile
        return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Poll nearby ───────────────────────────────────────────────────────────
    const fetchNearby = useCallback(() => {
        if (!playerPos) return;
        const [lat, lng] = playerPos;
        fetch(`${pokemonApiUrl}/api/pokemon/nearby?lat=${lat}&lng=${lng}&radius=500`, { credentials: 'include' })
            .then(asArray).then(setSpawns).catch(() => {});
        fetch(`${pokemonApiUrl}/api/pokemon/pokestops/nearby?lat=${lat}&lng=${lng}&radius=500`, { credentials: 'include' })
            .then(asArray).then(setStops).catch(() => {});
        fetch(`${pokemonApiUrl}/api/pokemon/gyms/nearby?lat=${lat}&lng=${lng}&radius=500`, { credentials: 'include' })
            .then(asArray).then(setGyms).catch(() => {});

        // Report the ping to the walk engine → advances eggs + buddy candy.
        fetch(`${pokemonApiUrl}/api/pokemon/walk`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(res => {
                if (!res || !res.events || !res.events.length) return;
                const hatch = res.events.find(e => e.type === 'hatch');
                const candy = res.events.find(e => e.type === 'buddyCandy');
                const text = hatch
                    ? `🥚 A ${hatch.tierKm}km Egg hatched into ${hatch.speciesName} (Lv.${hatch.level})!`
                    : candy ? `🍬 ${candy.buddyName} found ${candy.candy} Candy!` : '';
                if (text) { setToast(text); setTimeout(() => setToast(''), 5000); }
            })
            .catch(() => {});
    }, [playerPos]);

    // Polls only while the tab is visible. /nearby also spawns Pokémon around the player
    // and the walk ping advances eggs, so a background tab kept changing the world (and
    // holding the radio open) for a map nobody was looking at.
    useEffect(() => {
        let id = null;
        const start = () => {
            if (id !== null) return;
            fetchNearby();
            id = setInterval(fetchNearby, POLL_INTERVAL_MS);
        };
        const stop = () => {
            if (id !== null) { clearInterval(id); id = null; }
        };
        const onVisibility = () => (document.hidden ? stop() : start());
        if (!document.hidden) start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        };
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
                const msg = await responseError(res, "The throw didn't go through. Try again.");
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

    // ── Gyms ──────────────────────────────────────────────────────────────────
    async function spinGym(gym) {
        if (!playerPos) return showToast('No GPS signal');
        try {
            const res = await fetch(`${pokemonApiUrl}/api/pokemon/gym/spin`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gymId: gym.id, lat: playerPos[0], lng: playerPos[1] }),
            });
            const data = await res.json();
            showToast(typeof data === 'string' ? data : (data.message || 'Spun!'), 4000);
            fetchNearby();
        } catch { showToast('Spin failed'); }
    }

    async function chooseTeam(team) {
        try {
            const res = await fetch(`${pokemonApiUrl}/api/pokemon/team`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team }),
            });
            if (res.ok) {
                setTeamPicker(false);
                loadPlayerStats();
                showToast(`Welcome to Team ${team.charAt(0) + team.slice(1).toLowerCase()}!`, 4000);
            } else showToast('Could not set team');
        } catch { showToast('Could not set team'); }
    }

    // Attack a gym: needs a team first.
    function openGymBattle(gym) {
        if (!playerStats?.team) { setTeamPicker(true); return; }
        setGymBattleTarget(gym);
    }

    function closeGymBattle(refresh) {
        setGymBattleTarget(null);
        if (refresh) { fetchNearby(); loadPlayerStats(); }
    }

    // ── Pokestop / Gym placement ────────────────────────────────────────────────
    async function handleMapClick(latlng) {
        if (placingGym) {
            setPlacingGym(false);
            try {
                const res = await fetch(`${pokemonApiUrl}/api/pokemon/gym/add`, {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Gym', lat: latlng.lat, lng: latlng.lng }),
                });
                if (res.ok) { showToast('Gym added! A rival team controls it.', 4000); fetchNearby(); }
                else showToast('Failed to add gym');
            } catch { showToast('Failed to add gym'); }
            return;
        }
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
    const center = playerPos || [43.6532, -79.3832];
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    const isDusk  = (hour >= 18 && hour < 20) || (hour === 6);

    return (
        <div style={{ height: '100dvh', width: '100%', position: 'relative' }}>
            <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                {/* The credit is required by OpenStreetMap's tile usage policy; it was switched off. */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapRefCapture mapRef={mapRef} />
                <MapClickHandler active={placingStop || placingGym} onMapClick={handleMapClick} />

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
                                        <div style={{ fontSize: 12, color: '#a0a0b0', marginBottom: 4, fontWeight: 700 }}>Lv. {spawn.level}</div>
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
                                        <div style={{ color: '#a0a0b0', fontSize: 12, marginTop: 4 }}>
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
                                <div style={{ color: '#a0a0b0', fontSize: 11, marginBottom: 6 }}>
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

                {gyms.map(gym => {
                    const myTeam = playerStats?.team;
                    const mine = gym.controllingTeam && gym.controllingTeam === myTeam;
                    const defenders = gym.defenders || [];
                    const full = defenders.length >= 6;
                    const teamLabel = gym.controllingTeam
                        ? gym.controllingTeam.charAt(0) + gym.controllingTeam.slice(1).toLowerCase()
                        : 'Unclaimed';
                    return (
                        <Marker key={`gym-${gym.id}`} position={[gym.lat, gym.lng]} icon={gymIcon(gym.controllingTeam)}>
                            <Popup>
                                <div style={{ textAlign: 'center', minWidth: 170 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>🏛️ {gym.name}</div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: TEAM_COLOR[gym.controllingTeam] || '#6b7280', marginBottom: 4 }}>
                                        Team {teamLabel} · {defenders.length}/6 defenders
                                    </div>
                                    {defenders.length > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', marginBottom: 6 }}>
                                            {defenders.map(d => (
                                                <div key={d.id} style={{ width: 34, textAlign: 'center' }}>
                                                    <img src={`${pokemonApiUrl}/api/pokemon/sprites/${d.spriteKey}`} alt={d.name}
                                                        style={{ width: 28, height: 28, objectFit: 'contain' }}
                                                        onError={e => { e.target.style.display = 'none'; }} />
                                                    <div style={{ height: 3, background: '#1c1c26', borderRadius: 2, overflow: 'hidden' }}>
                                                        <div style={{ width: `${d.motivation}%`, height: '100%', background: d.motivation > 40 ? '#22c55e' : '#ef4444' }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {!mine && (
                                            <button style={{ ...s.catchBtn, background: '#7c3aed' }} onClick={() => openGymBattle(gym)}>
                                                ⚔️ Battle Gym
                                            </button>
                                        )}
                                        {mine && !full && (
                                            <button style={{ ...s.catchBtn, background: TEAM_COLOR[myTeam] }} onClick={() => openGymBattle(gym)}>
                                                🛡️ Manage / Add Defender
                                            </button>
                                        )}
                                        <button style={{ ...s.catchBtn, background: gym.canSpin ? '#3b82f6' : '#9ca3af', cursor: gym.canSpin ? 'pointer' : 'default' }}
                                            disabled={!gym.canSpin} onClick={() => spinGym(gym)}>
                                            {gym.canSpin ? '📦 Spin Disc' : '⏳ Cooldown'}
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

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

            {/* Level + coins badge */}
            {playerStats && (
                <div style={s.levelBadge}>
                    ⭐ Lv.{playerStats.level} &nbsp;💰{playerStats.coins}
                    {playerStats.team && (
                        <span style={{ marginLeft: 8, color: TEAM_COLOR[playerStats.team] || '#fff', fontWeight: 800 }}>
                            🛡️{playerStats.team.charAt(0) + playerStats.team.slice(1).toLowerCase()}
                        </span>
                    )}
                </div>
            )}

            {/* Exit PokeWorld → back to the main Alex Dyakin site */}
            <button style={s.exitBtn} onClick={() => navigate('/')} title="Exit PokeWorld">
                ✕ Exit
            </button>

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
                            onClick={() => { setFabOpen(false); setPlacingStop(p => !p); setPlacingGym(false); setPendingStop(null); }}>
                            📍 {placingStop ? 'Cancel Stop' : 'Add Pokéstop'}
                        </button>
                        <button
                            style={{ ...s.fabMenuItem, background: placingGym ? 'rgba(245,158,11,.9)' : 'rgba(124,58,237,.88)' }}
                            onClick={() => { setFabOpen(false); setPlacingGym(p => !p); setPlacingStop(false); setPendingStop(null); }}>
                            🏛️ {placingGym ? 'Cancel Gym' : 'Add Gym'}
                        </button>
                    </div>
                )}
                <button
                    style={{ ...s.fabBtn, ...(fabOpen ? { background: 'rgba(239,68,68,.88)', transform: 'rotate(45deg)' } : {}) }}
                    onClick={() => setFabOpen(o => !o)}
                    aria-label={fabOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={fabOpen}>
                    <span aria-hidden="true">+</span>
                </button>
            </div>

            {placingStop && <div style={s.tapHint}>Tap anywhere on the map to place a Pokéstop</div>}
            {placingGym && <div style={s.tapHint}>Tap anywhere on the map to place a Gym</div>}

            {/* Team picker */}
            {teamPicker && (
                <ModalFrame onClose={() => setTeamPicker(false)} overlayStyle={s.overlay} style={{ ...s.dialog, width: 320 }}>
                        <h3 style={{ margin: '0 0 4px' }}>Choose your Team</h3>
                        <p style={{ color: '#a0a0b0', fontSize: 13, margin: '0 0 14px' }}>
                            Pick a team to battle for gyms. You can change it later.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { key: 'VALOR',    label: '❤️ Valor',    color: '#ef4444' },
                                { key: 'MYSTIC',   label: '💙 Mystic',   color: '#3b82f6' },
                                { key: 'INSTINCT', label: '💛 Instinct', color: '#eab308' },
                            ].map(t => (
                                <button key={t.key} onClick={() => chooseTeam(t.key)}
                                    style={{ padding: '12px', borderRadius: 10, border: 'none', background: t.color, color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </ModalFrame>
            )}

            {pendingStop && !placingStop && (
                <ModalFrame onClose={() => !savingStop && setPendingStop(null)} overlayStyle={s.overlay} style={s.dialog}>
                        <h3 style={{ margin: '0 0 4px' }}>New Pokéstop</h3>
                        <p style={{ color: '#a0a0b0', fontSize: 13, margin: '0 0 12px' }}>
                            {pendingStop.lat.toFixed(5)}, {pendingStop.lng.toFixed(5)}
                        </p>
                        <input style={{ ...s.input, marginBottom: 12 }} placeholder="Name (e.g. Park Bench)"
                            aria-label="Pokéstop name"
                            value={stopName} onChange={e => setStopName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && confirmAddStop()} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...s.btn, flex: 1 }} disabled={savingStop} onClick={confirmAddStop}>
                                {savingStop ? 'Saving…' : 'Add Pokéstop'}
                            </button>
                            <button style={{ ...s.btn, flex: 0, background: '#6b7280' }} onClick={() => setPendingStop(null)}>
                                Cancel
                            </button>
                        </div>
                </ModalFrame>
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
                                 title={sp.speciesName} {...pressable(() => mapRef.current?.flyTo([sp.lat, sp.lng], 18))} aria-label={`Show ${sp.speciesName} on the map`}>
                                <img
                                    src={`${pokemonApiUrl}/api/pokemon/sprites/${sp.spriteKey}`}
                                    alt=""
                                    style={{ width: 36, height: 36, objectFit: 'contain', filter: 'brightness(0) opacity(0.75)' }}
                                    onError={e => { e.target.style.display='none'; }}
                                />
                                <span style={{ fontSize: 9, color: '#a0a0b0' }}>👣</span>
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

            {gymBattleTarget && (
                <GymBattle
                    gym={gymBattleTarget}
                    onClose={closeGymBattle}
                />
            )}

        </div>
    );
}

const s = {
    input:     { width: '100%', padding: '10px 12px', marginBottom: 12, border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#12121a', color: '#f0f0f5' },
    btn:       { width: '100%', padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 'bold' },
    catchBtn:  { display: 'block', width: '100%', padding: '8px 0', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' },
    levelBadge:    { position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'rgba(0,0,0,.78)', color: 'white', borderRadius: 20, padding: '7px 16px', fontSize: 14, fontWeight: 700, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', pointerEvents: 'none' },
    exitBtn:       { position: 'absolute', top: 16, right: 16, zIndex: 1000, background: 'rgba(0,0,0,.78)', color: 'white', border: '1px solid rgba(255,255,255,.2)', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' },
    tapHint:       { position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(245,158,11,.9)', color: 'white', padding: '8px 20px', borderRadius: 20, fontSize: 14, fontWeight: 'bold', zIndex: 1001, whiteSpace: 'normal', maxWidth: '88vw', textAlign: 'center', pointerEvents: 'none' },
    fabContainer:  { position: 'absolute', bottom: 24, right: 14, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
    fabBtn:        { width: 50, height: 50, borderRadius: '50%', background: 'rgba(15,23,42,.78)', border: '1px solid rgba(255,255,255,.15)', color: 'white', fontSize: 28, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', transition: 'transform .2s, background .2s', fontWeight: 300 },
    fabMenu:       { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
    fabMenuItem:   { padding: '9px 16px', borderRadius: 20, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(0,0,0,.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' },
    sightingsToggle: { position: 'absolute', bottom: 24, left: 14, zIndex: 1000, background: 'rgba(10,14,26,.45)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '6px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' },
    overlay:   { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    dialog:    { background: '#0e0e14', color: '#e0e0e8', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 24, width: 300, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,.5)' },
    toast:      { position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.8)', color: 'white', padding: '10px 20px', borderRadius: 20, fontSize: 14, zIndex: 1001, whiteSpace: 'normal', maxWidth: '88vw', textAlign: 'center', pointerEvents: 'none' },
    gpsOverlay:    { position: 'absolute', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' },
    gpsCard:       { background: 'rgba(15,23,42,.96)', color: 'white', padding: '32px 40px', borderRadius: 20, textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.6)', maxWidth: 300, width: '90%' },
    gpsBtn:        { background: '#ef4444', color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 16, cursor: 'pointer', fontWeight: 'bold' },
    sightings:     { position: 'absolute', bottom: 70, left: 14, zIndex: 1000, background: 'rgba(10,14,26,.82)', borderRadius: 14, padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.07)' },
    sightingsLabel:{ color: '#a0a0b0', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
    sightingsItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, cursor: 'pointer', padding: '3px 5px', borderRadius: 8, background: 'rgba(255,255,255,.04)' },
};

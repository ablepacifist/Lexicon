import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PokeNavBar from '../components/PokeNavBar';
import { getApiUrls } from '../utils/apiUrls';

const { pokemonApiUrl } = getApiUrls();

const TIER_COLOR = { 2: '#22c55e', 5: '#eab308', 10: '#ef4444' };

function EggProgress({ egg }) {
    const pct = egg.distanceKm > 0 ? Math.min(100, (egg.progressKm / egg.distanceKm) * 100) : 0;
    return (
        <div style={s.incCard}>
            <div style={{ fontSize: 34 }}>🥚</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {egg.distanceKm} km Egg
                    <span style={{ ...s.tierDot, background: TIER_COLOR[egg.distanceKm] || '#9ca3af' }} />
                </div>
                <div style={s.track}>
                    <div style={{ ...s.fill, width: `${pct}%`, background: TIER_COLOR[egg.distanceKm] || '#3b82f6' }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {egg.progressKm.toFixed(2)} / {egg.distanceKm.toFixed(1)} km · {Math.floor(pct)}%
                </div>
            </div>
        </div>
    );
}

export default function EggsPage() {
    const navigate = useNavigate();
    const [eggs,    setEggs]    = useState([]);
    const [totalKm, setTotalKm] = useState(0);
    const [loading, setLoading] = useState(true);
    const [msg,     setMsg]     = useState('');

    const load = useCallback(() => {
        Promise.all([
            fetch(`${pokemonApiUrl}/api/pokemon/eggs`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
            fetch(`${pokemonApiUrl}/api/pokemon/player/stats`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        ]).then(([e, stats]) => {
            setEggs(Array.isArray(e) ? e : []);
            setTotalKm(stats && stats.totalKm != null ? stats.totalKm : 0);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    async function incubate(eggId) {
        try {
            const r = await fetch(`${pokemonApiUrl}/api/pokemon/eggs/incubate`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eggId }),
            });
            if (!r.ok) { setMsg(await r.text()); setTimeout(() => setMsg(''), 2500); return; }
            load();
        } catch { setMsg('Failed to incubate'); setTimeout(() => setMsg(''), 2500); }
    }

    if (loading) return <div style={s.center}>Loading eggs…<PokeNavBar /></div>;

    const incubating = eggs.filter(e => e.incubating);
    const stored     = eggs.filter(e => !e.incubating);

    return (
        <div style={s.page}>
            <div style={s.header}>
                <button onClick={() => navigate('/pokemon')} style={s.backBtn}>← Map</button>
                <h1 style={s.title}>Eggs</h1>
                <span style={s.km}>🚶 {totalKm.toFixed(1)} km</span>
            </div>

            {msg && <div style={s.msg}>{msg}</div>}

            {/* Incubator */}
            <div style={s.section}>Incubator</div>
            {incubating.length > 0
                ? incubating.map(e => <EggProgress key={e.id} egg={e} />)
                : <div style={s.empty}>No egg incubating. Pick one below to start hatching as you walk.</div>}

            {/* Egg inventory */}
            <div style={s.section}>Eggs ({stored.length})</div>
            {stored.length === 0 ? (
                <div style={s.empty}>No eggs yet. Spin Pokéstops for a chance to find one!</div>
            ) : (
                <div style={s.grid}>
                    {stored.map(e => (
                        <div key={e.id} style={s.eggCard}>
                            <div style={{ fontSize: 40 }}>🥚</div>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>
                                {e.distanceKm} km
                                <span style={{ ...s.tierDot, background: TIER_COLOR[e.distanceKm] || '#9ca3af' }} />
                            </div>
                            <button style={s.incBtn} disabled={incubating.length > 0}
                                onClick={() => incubate(e.id)}>
                                {incubating.length > 0 ? 'Incubator full' : 'Incubate'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ height: 80 }} />
            <PokeNavBar />
        </div>
    );
}

const s = {
    page:     { padding: 16, maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: '#f9fafb' },
    center:   { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280' },
    header:   { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
    backBtn:  { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#374151' },
    title:    { margin: 0, fontSize: 22, fontWeight: 'bold', flex: 1 },
    km:       { fontSize: 14, fontWeight: 700, color: '#0f172a', background: '#e2e8f0', borderRadius: 20, padding: '5px 12px' },
    msg:      { background: '#fef3c7', color: '#92400e', padding: '8px 14px', borderRadius: 10, marginBottom: 12, fontWeight: 600, fontSize: 13 },
    section:  { fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' },
    incCard:  { display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
    empty:    { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 18, background: 'white', borderRadius: 12 },
    grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 },
    eggCard:  { background: 'white', borderRadius: 12, padding: 12, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
    incBtn:   { marginTop: 6, width: '100%', padding: '6px 0', border: 'none', borderRadius: 8, background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
    track:    { height: 7, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
    fill:     { height: '100%', borderRadius: 4, transition: 'width .4s' },
    tierDot:  { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginLeft: 6, verticalAlign: 'middle' },
};

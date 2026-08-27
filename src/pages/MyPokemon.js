import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getApiUrls } from '../utils/apiUrls';
import PokeNavBar from '../components/PokeNavBar';

const { pokemonApiUrl } = getApiUrls();

const TYPE_COLORS = {
    Fire: '#f97316', Water: '#3b82f6', Grass: '#22c55e', Electric: '#eab308',
    Psychic: '#ec4899', Ice: '#06b6d4', Dragon: '#7c3aed', Dark: '#374151',
    Normal: '#9ca3af', Fighting: '#b45309', Poison: '#a855f7', Ground: '#d97706',
    Flying: '#60a5fa', Bug: '#65a30d', Rock: '#78716c', Ghost: '#6366f1',
    Steel: '#64748b', Fairy: '#f472b6',
};

function TypeBadge({ type }) {
    if (!type) return null;
    return (
        <span style={{ background: TYPE_COLORS[type] || '#9ca3af', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 'bold', marginRight: 4 }}>
            {type}
        </span>
    );
}

const SORTS = [
    { value: 'date',    label: 'Recent' },
    { value: 'level',   label: 'Level' },
    { value: 'name',    label: 'Name' },
    { value: 'favs',    label: 'Favourites' },
];

export default function MyPokemon() {
    const [pokemon,     setPokemon]     = useState([]);
    const [buddy,       setBuddy]       = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState('');
    const [search,      setSearch]      = useState('');
    const [sort,        setSort]        = useState('date');
    const [filterType,  setFilterType]  = useState('ALL');
    const navigate  = useNavigate();
    const location  = useLocation();

    useEffect(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/collection`, { credentials: 'include' })
            .then(r => {
                if (r.status === 401) throw new Error('not-authed');
                return r.json();
            })
            .then(data => { setPokemon(data); setLoading(false); })
            .catch(e => {
                if (e.message === 'not-authed') navigate('/pokemon');
                else setError('Failed to load collection');
                setLoading(false);
            });
        fetch(`${pokemonApiUrl}/api/pokemon/buddy`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(b => setBuddy(b && b.caughtId ? b : null))
            .catch(() => {});
    }, [navigate]);

    // Show grind message if navigated here after a grind
    const grindMsg = location.state?.grindMsg;

    const sorted = [...pokemon].sort((a, b) => {
        if (sort === 'favs') {
            if (a.favourite !== b.favourite) return a.favourite ? -1 : 1;
        }
        if (sort === 'level')  return b.pokemonLevel - a.pokemonLevel;
        if (sort === 'name')   return (a.nickname || a.speciesName || '').localeCompare(b.nickname || b.speciesName || '');
        return new Date(b.caughtAt) - new Date(a.caughtAt); // date
    });

    // Collect types actually present in the collection for the filter chips
    const presentTypes = ['ALL', ...Array.from(new Set(
        pokemon.flatMap(p => [p.type1, p.type2].filter(Boolean))
    )).sort()];

    const filtered = sorted.filter(p => {
        const nameMatch = (p.nickname || p.speciesName || '').toLowerCase().includes(search.toLowerCase());
        const typeMatch = filterType === 'ALL' || p.type1 === filterType || p.type2 === filterType;
        return nameMatch && typeMatch;
    });

    if (loading) return <div style={styles.center}>Loading your Pokemon…</div>;
    if (error)   return <div style={styles.center}>{error}</div>;

    return (
        <div style={styles.page}>
            {grindMsg && (
                <div style={{ background: '#fde68a', color: '#92400e', padding: '10px 16px', borderRadius: 10, marginBottom: 12, fontWeight: 700, textAlign: 'center' }}>
                    {grindMsg}
                </div>
            )}

            <div style={styles.header}>
                <h1 style={styles.title}>My Pokemon ({pokemon.length})</h1>
            </div>

            {/* Buddy */}
            {buddy && (
                <div style={styles.buddyCard} onClick={() => navigate(`/pokemon/${buddy.caughtId}`)}>
                    <span style={styles.buddyTag}>🤝 Buddy</span>
                    <img src={`${pokemonApiUrl}/api/pokemon/sprites/${buddy.spriteKey}`} alt={buddy.speciesName}
                        style={{ width: 46, height: 46, objectFit: 'contain' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{buddy.nickname || buddy.speciesName}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                            {(buddy.kmSinceCandy || 0).toFixed(1)} / {buddy.kmPerCandy} km to next 🍬
                        </div>
                        <div style={styles.buddyTrack}>
                            <div style={{ ...styles.buddyFill, width: `${Math.min(100, (buddy.kmSinceCandy / buddy.kmPerCandy) * 100)}%` }} />
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input style={{ ...styles.search, flex: 1, marginBottom: 0 }} placeholder="Search by name…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                <select value={sort} onChange={e => setSort(e.target.value)} style={styles.sortSelect}>
                    {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            {/* Type filter chips */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, scrollbarWidth: 'none' }}>
                {presentTypes.map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                        style={{
                            flexShrink: 0, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                            background: filterType === t
                                ? (t === 'ALL' ? '#1e293b' : TYPE_COLORS[t] || '#9ca3af')
                                : '#f1f5f9',
                            color: filterType === t ? 'white' : '#374151',
                            boxShadow: filterType === t ? '0 2px 6px rgba(0,0,0,.2)' : 'none',
                        }}>
                        {t === 'ALL' ? `All (${pokemon.length})` : t}
                    </button>
                ))}
            </div>

            {filtered.length === 0 && (
                <div style={styles.empty}>
                    {pokemon.length === 0
                        ? "You haven't caught any Pokemon yet. Go explore!"
                        : filterType !== 'ALL' && !search
                            ? `No ${filterType}-type Pokemon in your collection`
                            : 'No results'}
                </div>
            )}

            <div style={styles.grid}>
                {filtered.map(p => (
                    <div key={p.id} style={{ ...styles.card, borderColor: p.favourite ? '#f59e0b' : '#e5e7eb' }}
                        onClick={() => navigate(`/pokemon/${p.id}`)}>
                        {p.favourite && <div style={styles.favStar}>⭐</div>}
                        <img src={`${pokemonApiUrl}/api/pokemon/sprites/${p.spriteKey}`}
                            alt={p.speciesName} style={styles.sprite}
                            onError={e => { e.target.style.display = 'none'; }} />
                        <div style={styles.cardName}>{p.nickname || p.speciesName}</div>
                        {p.nickname && <div style={styles.cardSub}>{p.speciesName}</div>}
                        <div style={{ marginTop: 4 }}>
                            <TypeBadge type={p.type1} />
                            <TypeBadge type={p.type2} />
                        </div>
                        <div style={styles.level}>Lv. {p.pokemonLevel}</div>
                        {p.moves && p.moves.length > 0 && (
                            <div style={styles.moveList}>
                                {p.moves.map(m => (
                                    <span key={m.slot || m.id} style={{ ...styles.moveChip, background: TYPE_COLORS[m.type] || '#9ca3af' }}>
                                        {m.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div style={{ height: 80 }} />
            <PokeNavBar />
        </div>
    );
}

const styles = {
    page:       { padding: '16px', maxWidth: 900, margin: '0 auto' },
    center:     { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#6b7280' },
    header:     { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 },
    title:      { margin: 0, fontSize: 22, fontWeight: 'bold' },
    search:     { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' },
    sortSelect: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: 'white', cursor: 'pointer' },
    empty:      { color: '#9ca3af', textAlign: 'center', padding: 40 },
    grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 },
    card:       { background: 'white', border: '2px solid #e5e7eb', borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.05)', position: 'relative' },
    favStar:    { position: 'absolute', top: 6, right: 8, fontSize: 14 },
    sprite:     { width: 72, height: 72, objectFit: 'contain' },
    cardName:   { fontWeight: 'bold', fontSize: 13, marginTop: 4 },
    cardSub:    { color: '#9ca3af', fontSize: 11 },
    level:      { marginTop: 6, color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
    moveList:   { display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 6 },
    moveChip:   { color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, lineHeight: 1.3 },
    buddyCard:  { display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#fff,#fdf2f8)', border: '1px solid #fbcfe8', borderRadius: 12, padding: 10, marginBottom: 12, cursor: 'pointer', position: 'relative' },
    buddyTag:   { position: 'absolute', top: -8, left: 12, background: '#ec4899', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8 },
    buddyTrack: { height: 6, background: '#fce7f3', borderRadius: 4, overflow: 'hidden' },
    buddyFill:  { height: '100%', background: '#ec4899', borderRadius: 4, transition: 'width .4s' },
};

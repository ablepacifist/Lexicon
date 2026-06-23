import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        <span style={{
            background: TYPE_COLORS[type] || '#9ca3af',
            color: 'white', padding: '2px 8px', borderRadius: 12,
            fontSize: 11, fontWeight: 'bold', marginRight: 4,
        }}>{type}</span>
    );
}

export default function MyPokemon() {
    const [pokemon, setPokemon] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

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
    }, [navigate]);

    const filtered = pokemon.filter(p =>
        (p.nickname || p.speciesName || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div style={styles.center}>Loading your Pokemon…</div>;
    if (error) return <div style={styles.center}>{error}</div>;

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>My Pokemon ({pokemon.length})</h1>
            </div>

            <input style={styles.search} placeholder="Search by name…"
                value={search} onChange={e => setSearch(e.target.value)} />

            {filtered.length === 0 && (
                <div style={styles.empty}>
                    {pokemon.length === 0
                        ? "You haven't caught any Pokemon yet. Go explore!"
                        : 'No results for "' + search + '"'}
                </div>
            )}

            <div style={styles.grid}>
                {filtered.map(p => (
                    <div key={p.id} style={styles.card} onClick={() => navigate(`/pokemon/${p.id}`)}>
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
                    </div>
                ))}
            </div>
            <div style={{ height: 80 }} />
            <PokeNavBar />
        </div>
    );
}

const styles = {
    page:     { padding: '16px', maxWidth: 900, margin: '0 auto' },
    center:   { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#6b7280' },
    header:   { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 },
    title:    { margin: 0, fontSize: 22, fontWeight: 'bold' },
    search:   { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' },
    empty:    { color: '#9ca3af', textAlign: 'center', padding: 40 },
    grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 },
    card:     { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.05)' },
    sprite:   { width: 72, height: 72, objectFit: 'contain' },
    cardName: { fontWeight: 'bold', fontSize: 13, marginTop: 4 },
    cardSub:  { color: '#9ca3af', fontSize: 11 },
    level:    { marginTop: 6, color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
};

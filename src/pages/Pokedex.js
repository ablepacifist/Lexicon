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
            color: 'white', padding: '2px 6px', borderRadius: 10,
            fontSize: 10, fontWeight: 'bold', marginRight: 3,
        }}>{type}</span>
    );
}

export default function Pokedex() {
    const [species, setSpecies] = useState([]);
    const [caughtIds, setCaughtIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'caught' | 'unseen'
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            fetch(`${pokemonApiUrl}/api/pokemon/species`).then(r => r.json()),
            fetch(`${pokemonApiUrl}/api/pokemon/caught-species`, { credentials: 'include' })
                .then(r => r.ok ? r.json() : []),
        ])
            .then(([sp, caught]) => {
                setSpecies(sp);
                setCaughtIds(new Set(caught));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = species.filter(s => {
        const nameMatch = s.name.toLowerCase().includes(search.toLowerCase());
        if (!nameMatch) return false;
        if (filter === 'caught') return caughtIds.has(s.id);
        if (filter === 'unseen') return !caughtIds.has(s.id);
        return true;
    });

    if (loading) return <div style={styles.center}>Loading Pokédex…</div>;

    const caughtCount = species.filter(s => caughtIds.has(s.id)).length;

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>Pokédex</h1>
                <span style={styles.progress}>{caughtCount} / {species.length}</span>
            </div>

            <div style={styles.filterRow}>
                {['all', 'caught', 'unseen'].map(f => (
                    <button key={f} style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
                        onClick={() => setFilter(f)}>
                        {f === 'all' ? 'All' : f === 'caught' ? '✓ Caught' : '? Unseen'}
                    </button>
                ))}
            </div>

            <input style={styles.search} placeholder="Search by name…"
                value={search} onChange={e => setSearch(e.target.value)} />

            <div style={styles.grid}>
                {filtered.map(s => {
                    const caught = caughtIds.has(s.id);
                    return (
                        <div key={s.id} style={{ ...styles.card, opacity: caught ? 1 : 0.45 }}>
                            <div style={styles.dexNum}>#{String(s.id).padStart(3, '0')}</div>
                            <img
                                src={`${pokemonApiUrl}/api/pokemon/sprites/${s.spriteKey}`}
                                alt={caught ? s.name : '???'}
                                style={{ ...styles.sprite, filter: caught ? 'none' : 'grayscale(1) brightness(0.4)' }}
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                            <div style={styles.cardName}>{caught ? s.name : '???'}</div>
                            {caught && (
                                <div style={{ marginTop: 3 }}>
                                    <TypeBadge type={s.type1} />
                                    <TypeBadge type={s.type2} />
                                </div>
                            )}
                            {caught && (
                                <div style={styles.baseStats}>
                                    HP {s.baseHp} · Atk {s.baseAttack}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div style={{ height: 80 }} />
            <PokeNavBar />
        </div>
    );
}

const styles = {
    page:        { padding: '16px', maxWidth: 900, margin: '0 auto' },
    center:      { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#6b7280' },
    header:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
    title:       { margin: 0, fontSize: 22, fontWeight: 'bold', flex: 1 },
    progress:    { fontSize: 14, color: '#6b7280', fontWeight: 600 },
    filterRow:   { display: 'flex', gap: 8, marginBottom: 10 },
    filterBtn:   { padding: '6px 14px', borderRadius: 20, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 13, color: '#374151' },
    filterActive:{ background: '#ef4444', color: 'white', borderColor: '#ef4444' },
    search:      { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, marginBottom: 14, boxSizing: 'border-box' },
    grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 },
    card:        { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.05)' },
    dexNum:      { fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 2 },
    sprite:      { width: 64, height: 64, objectFit: 'contain' },
    cardName:    { fontWeight: 'bold', fontSize: 12, marginTop: 4 },
    baseStats:   { fontSize: 10, color: '#6b7280', marginTop: 3 },
};

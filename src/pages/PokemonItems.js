import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PokeNavBar from '../components/PokeNavBar';
import { getApiUrls } from '../utils/apiUrls';

const { pokemonApiUrl } = getApiUrls();

const ITEM_META = {
    POKEBALL:   { label: 'Poké Ball',  sprite: 'pokeball_sprite.png',  desc: 'Catch Pokémon' },
    GREAT_BALL: { label: 'Great Ball', sprite: 'greatball_sprite.png', desc: '1.5× catch rate' },
    ULTRA_BALL: { label: 'Ultra Ball', sprite: 'ultraball_sprite.png', desc: '2× catch rate' },
    POTION:     { label: 'Potion',     sprite: 'Item_0101.png',         desc: 'Restores 20 HP' },
    REVIVE:     { label: 'Revive',     sprite: 'Item_0201.png',         desc: 'Revives fainted Pokémon' },
};

const ORDER = ['POKEBALL','GREAT_BALL','ULTRA_BALL','POTION','REVIVE'];

export default function PokemonItems() {
    const navigate = useNavigate();
    const [items,   setItems]   = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/items`, { credentials: 'include' })
            .then(r => { if (r.status === 401) throw new Error('unauthed'); return r.json(); })
            .then(list => {
                const map = {};
                list.forEach(i => { map[i.itemType] = i.quantity; });
                setItems(map);
                setLoading(false);
            })
            .catch(e => {
                if (e.message === 'unauthed') navigate('/pokemon');
                setLoading(false);
            });
    }, [navigate]);

    const allItems = ORDER.map(type => ({
        type,
        qty: items[type] || 0,
        ...(ITEM_META[type] || { label: type, sprite: '', desc: '' }),
    }));

    if (loading) return (
        <div style={s.center}>
            <div>Loading items…</div>
            <PokeNavBar />
        </div>
    );

    return (
        <div style={s.page}>
            <div style={s.header}>
                <button onClick={() => navigate('/pokemon')} style={s.backBtn}>← Map</button>
                <h1 style={s.title}>Items</h1>
            </div>

            <div style={s.grid}>
                {allItems.map(item => (
                    <div key={item.type} style={{ ...s.card, opacity: item.qty === 0 ? 0.45 : 1 }}>
                        <img
                            src={`${pokemonApiUrl}/api/pokemon/item-sprites/${item.sprite}`}
                            alt={item.label}
                            style={s.sprite}
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                        <div style={s.count}>×{item.qty}</div>
                        <div style={s.name}>{item.label}</div>
                        <div style={s.desc}>{item.desc}</div>
                    </div>
                ))}
            </div>

            <div style={s.shopNote}>
                Need more items? Visit the <button style={s.link} onClick={() => navigate('/pokemon/shop')}>Shop →</button>
            </div>

            <div style={{ height: 80 }} />
            <PokeNavBar />
        </div>
    );
}

const s = {
    page:    { padding: 16, maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: '#f9fafb' },
    center:  { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280', flexDirection: 'column', gap: 16 },
    header:  { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
    backBtn: { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#374151' },
    title:   { margin: 0, fontSize: 22, fontWeight: 'bold' },
    grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 },
    card:    { background: 'white', borderRadius: 12, padding: '16px 12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)', transition: 'opacity .2s' },
    sprite:  { width: 60, height: 60, objectFit: 'contain', display: 'block', margin: '0 auto 6px' },
    count:   { fontSize: 22, fontWeight: 800, color: '#111827' },
    name:    { fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 4 },
    desc:    { fontSize: 11, color: '#9ca3af', marginTop: 2 },
    shopNote:{ textAlign: 'center', color: '#6b7280', fontSize: 14, marginTop: 24 },
    link:    { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
};

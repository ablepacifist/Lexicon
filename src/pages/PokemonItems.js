import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PokeNavBar from '../components/PokeNavBar';
import { getApiUrls } from '../utils/apiUrls';

const { pokemonApiUrl } = getApiUrls();

const ITEM_META = {
    POKEBALL:      { label: 'Poké Ball',     sprite: 'pokeball_sprite.png',         desc: 'Catch Pokémon',                                      group: 'balls'    },
    GREAT_BALL:    { label: 'Great Ball',    sprite: 'greatball_sprite.png',        desc: '1.5× catch rate',                                    group: 'balls'    },
    ULTRA_BALL:    { label: 'Ultra Ball',    sprite: 'ultraball_sprite.png',        desc: '2× catch rate',                                      group: 'balls'    },
    POTION:        { label: 'Potion',        sprite: 'Item_0101.png',               desc: 'Restores 20 HP',                                     group: 'medicine' },
    REVIVE:        { label: 'Revive',        sprite: 'Item_0201.png',               desc: 'Revives fainted Pokémon',                            group: 'medicine' },
    RAZZ_BERRY:    { label: 'Razz Berry',    sprite: 'berry/razz.png',              desc: '1.5× catch rate on next throw',                      group: 'berries'  },
    NANAB_BERRY:   { label: 'Nanab Berry',   sprite: 'berry/nanab.png',             desc: 'Pokémon stops dodging',                              group: 'berries'  },
    PINAP_BERRY:   { label: 'Pinap Berry',   sprite: 'berry/pinap.png',             desc: '2× candy if caught',                                 group: 'berries'  },
    CANDY_XS:      { label: 'Candy XS',      sprite: 'exp-candy/xs.png',            desc: 'Generic candy earned by catching Pokémon',           group: 'candy'    },
    LURE_MODULE:   { label: 'Lure Module',   sprite: 'incense/odd.png',             desc: 'Attracts Pokémon to a Pokéstop for 30 min',          group: 'modules'  },
    THUNDER_STONE: { label: 'Thunder Stone', sprite: 'evo-item/thunder-stone.png',  desc: 'Evolves Pikachu, Eevee→Jolteon',                     group: 'stones'   },
    WATER_STONE:   { label: 'Water Stone',   sprite: 'evo-item/water-stone.png',    desc: 'Evolves Shellder, Staryu, Eevee→Vaporeon',           group: 'stones'   },
    FIRE_STONE:    { label: 'Fire Stone',    sprite: 'evo-item/fire-stone.png',     desc: 'Evolves Vulpix, Growlithe, Eevee→Flareon',           group: 'stones'   },
    LEAF_STONE:    { label: 'Leaf Stone',    sprite: 'evo-item/leaf-stone.png',     desc: 'Evolves Oddish, Weepinbell, Exeggcute',              group: 'stones'   },
    MOON_STONE:    { label: 'Moon Stone',    sprite: 'evo-item/moon-stone.png',     desc: 'Evolves Nidorina, Nidorino, Clefairy, Jigglypuff',   group: 'stones'   },
    LINK_CABLE:    { label: 'Link Cable',    sprite: 'evo-item/up-grade.png',       desc: 'Evolves Kadabra, Machoke, Graveler, Haunter',         group: 'stones'   },
};

const BALL_ORDER     = ['POKEBALL','GREAT_BALL','ULTRA_BALL'];
const MEDICINE_ORDER = ['POTION','REVIVE'];
const BERRY_ORDER    = ['RAZZ_BERRY','NANAB_BERRY','PINAP_BERRY'];
const EXP_CANDY_ORDER = ['EXP_CANDY_XS','EXP_CANDY_S','EXP_CANDY_M','EXP_CANDY_L','EXP_CANDY_XL'];
const EXP_CANDY_META  = {
    EXP_CANDY_XS: { label: 'Candy XS', sprite: 'exp-candy/xs.png', desc: '+100 EXP' },
    EXP_CANDY_S:  { label: 'Candy S',  sprite: 'exp-candy/s.png',  desc: '+800 EXP' },
    EXP_CANDY_M:  { label: 'Candy M',  sprite: 'exp-candy/m.png',  desc: '+3,000 EXP' },
    EXP_CANDY_L:  { label: 'Candy L',  sprite: 'exp-candy/l.png',  desc: '+10,000 EXP' },
    EXP_CANDY_XL: { label: 'Candy XL', sprite: 'exp-candy/xl.png', desc: '+30,000 EXP' },
};
const MODULE_ORDER   = ['LURE_MODULE'];
const STONE_ORDER    = ['THUNDER_STONE','WATER_STONE','FIRE_STONE','LEAF_STONE','MOON_STONE','LINK_CABLE'];

export default function PokemonItems() {
    const navigate = useNavigate();
    const [items,    setItems]    = useState({});
    const [stats,    setStats]    = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [tab,      setTab]      = useState('items'); // 'items' | 'candy'

    useEffect(() => {
        Promise.all([
            fetch(`${pokemonApiUrl}/api/pokemon/items`,        { credentials: 'include' }).then(r => r.json()),
            fetch(`${pokemonApiUrl}/api/pokemon/player/stats`, { credentials: 'include' }).then(r => r.json()),
        ]).then(([list, s]) => {
            const map = {};
            list.forEach(i => { map[i.itemType] = i.quantity; });
            setItems(map);
            setStats(s);
            setLoading(false);
        }).catch(e => {
            if (e?.message === 'unauthed') navigate('/pokemon');
            setLoading(false);
        });
    }, [navigate]);

    if (loading) return (
        <div style={s.center}><div>Loading items…</div><PokeNavBar /></div>
    );

    // All candy types in one flat list — no per-species grouping
    const allCandy = [
        { type: 'CANDY_XS', qty: items['CANDY_XS'] || 0, ...ITEM_META['CANDY_XS'] },
        ...EXP_CANDY_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...EXP_CANDY_META[t] })),
    ];

    return (
        <div style={s.page}>
            <div style={s.header}>
                <button onClick={() => navigate('/pokemon')} style={s.backBtn}>← Map</button>
                <h1 style={s.title}>Items</h1>
            </div>

            {stats && (
                <div style={s.stardustBanner}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>{(stats.stardust || 0).toLocaleString()}</span>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Stardust</span>
                </div>
            )}

            <div style={s.tabs}>
                <button style={{ ...s.tab, ...(tab === 'items' ? s.tabActive : {}) }} onClick={() => setTab('items')}>Items</button>
                <button style={{ ...s.tab, ...(tab === 'candy' ? s.tabActive : {}) }} onClick={() => setTab('candy')}>Candy</button>
            </div>

            {tab === 'items' ? (
                <>
                    <Section title="Pokéballs"        items={BALL_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...ITEM_META[t] }))} />
                    <Section title="Medicine"         items={MEDICINE_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...ITEM_META[t] }))} />
                    <Section title="Berries"          items={BERRY_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...ITEM_META[t] }))} />
                    <Section title="Modules"          items={MODULE_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...ITEM_META[t] })).filter(i => i.qty > 0)} />
                    <Section title="Evolution Stones" items={STONE_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...ITEM_META[t] })).filter(i => i.qty > 0)} />
                </>
            ) : (
                <Section title="Candy" items={allCandy} />
            )}

            <div style={s.shopNote}>
                Need more items? <button style={s.link} onClick={() => navigate('/pokemon/shop')}>Shop →</button>
            </div>

            <div style={{ height: 80 }} />
            <PokeNavBar />
        </div>
    );
}

function Section({ title, items }) {
    if (!items || items.length === 0) return null;
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{title}</div>
            <div style={s.grid}>
                {items.map(item => (
                    <div key={item.type} style={{ ...s.card, opacity: item.qty === 0 ? 0.4 : 1 }}>
                        <img src={`${pokemonApiUrl}/api/pokemon/item-sprites/${item.sprite}`}
                            alt={item.label} style={s.sprite}
                            onError={e => { e.target.style.display = 'none'; }} />
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>×{item.qty}</div>
                        <div style={s.name}>{item.label}</div>
                        <div style={s.desc}>{item.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const s = {
    page:          { padding: 16, maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: '#f9fafb' },
    center:        { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280', flexDirection: 'column', gap: 16 },
    header:        { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn:       { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#374151' },
    title:         { margin: 0, fontSize: 22, fontWeight: 'bold' },
    stardustBanner:{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', borderRadius: 12, padding: '10px 16px', marginBottom: 16 },
    tabs:          { display: 'flex', gap: 4, marginBottom: 16 },
    tab:           { flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' },
    tabActive:     { background: '#ef4444', color: 'white', border: '1px solid #ef4444' },
    grid:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 },
    card:          { background: 'white', borderRadius: 12, padding: '12px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
    sprite:        { width: 52, height: 52, objectFit: 'contain', display: 'block', margin: '0 auto 6px' },
    name:          { fontSize: 11, fontWeight: 700, color: '#374151', marginTop: 4 },
    desc:          { fontSize: 10, color: '#9ca3af', marginTop: 2 },
    empty:         { textAlign: 'center', color: '#9ca3af', padding: 32 },
    shopNote:      { textAlign: 'center', color: '#6b7280', fontSize: 14, marginTop: 24 },
    link:          { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PokeNavBar from '../components/PokeNavBar';
import { getApiUrls } from '../utils/apiUrls';

const { pokemonApiUrl } = getApiUrls();

const ITEM_META = {
    POKEBALL:      { label: 'Poké Ball',     sprite: 'pokeball_sprite.png',  desc: 'Catch Pokémon',         group: 'balls' },
    GREAT_BALL:    { label: 'Great Ball',    sprite: 'greatball_sprite.png', desc: '1.5× catch rate',       group: 'balls' },
    ULTRA_BALL:    { label: 'Ultra Ball',    sprite: 'ultraball_sprite.png', desc: '2× catch rate',         group: 'balls' },
    POTION:        { label: 'Potion',        sprite: 'Item_0101.png',         desc: 'Restores 20 HP',        group: 'medicine' },
    REVIVE:        { label: 'Revive',        sprite: 'Item_0201.png',         desc: 'Revives fainted Pokémon', group: 'medicine' },
    THUNDER_STONE: { label: 'Thunder Stone', sprite: 'thunder_stone.png',    desc: 'Evolves Pikachu, Eevee→Jolteon', group: 'stones' },
    WATER_STONE:   { label: 'Water Stone',   sprite: 'water_stone.png',      desc: 'Evolves Shellder, Staryu, Eevee→Vaporeon', group: 'stones' },
    FIRE_STONE:    { label: 'Fire Stone',    sprite: 'fire_stone.png',       desc: 'Evolves Vulpix, Growlithe, Eevee→Flareon', group: 'stones' },
    LEAF_STONE:    { label: 'Leaf Stone',    sprite: 'leaf_stone.png',       desc: 'Evolves Oddish, Weepinbell, Exeggcute', group: 'stones' },
    MOON_STONE:    { label: 'Moon Stone',    sprite: 'moon_stone.png',       desc: 'Evolves Nidorina, Nidorino, Clefairy, Jigglypuff', group: 'stones' },
    LINK_CABLE:    { label: 'Link Cable',    sprite: 'link_cable.png',       desc: 'Evolves Kadabra, Machoke, Graveler, Haunter', group: 'stones' },
};

const BALL_ORDER     = ['POKEBALL','GREAT_BALL','ULTRA_BALL'];
const MEDICINE_ORDER = ['POTION','REVIVE'];
const STONE_ORDER    = ['THUNDER_STONE','WATER_STONE','FIRE_STONE','LEAF_STONE','MOON_STONE','LINK_CABLE'];

export default function PokemonItems() {
    const navigate = useNavigate();
    const [items,    setItems]    = useState({});
    const [stats,    setStats]    = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [candyTab, setCandyTab] = useState(false);

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

    const candyItems = Object.entries(items)
        .filter(([k]) => k.startsWith('CANDY_') && !k.startsWith('EXP_CANDY'))
        .map(([k, qty]) => ({ type: k, qty, speciesId: parseInt(k.replace('CANDY_', '')) }))
        .filter(c => c.qty > 0)
        .sort((a, b) => a.speciesId - b.speciesId);

    const expCandyItems = Object.entries(items)
        .filter(([k]) => k.startsWith('EXP_CANDY'))
        .map(([k, qty]) => ({ type: k, qty }))
        .filter(c => c.qty > 0);

    if (loading) return (
        <div style={s.center}><div>Loading items…</div><PokeNavBar /></div>
    );

    return (
        <div style={s.page}>
            <div style={s.header}>
                <button onClick={() => navigate('/pokemon')} style={s.backBtn}>← Map</button>
                <h1 style={s.title}>Items</h1>
            </div>

            {/* Stardust banner */}
            {stats && (
                <div style={s.stardustBanner}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>{(stats.stardust || 0).toLocaleString()}</span>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Stardust</span>
                </div>
            )}

            {/* Tabs */}
            <div style={s.tabs}>
                <button style={{ ...s.tab, ...(candyTab ? {} : s.tabActive) }} onClick={() => setCandyTab(false)}>Items</button>
                <button style={{ ...s.tab, ...(candyTab ? s.tabActive : {}) }} onClick={() => setCandyTab(true)}>
                    Candy {candyItems.length > 0 ? `(${candyItems.length})` : ''}
                </button>
            </div>

            {!candyTab ? (
                <>
                    <Section title="Pokéballs" items={BALL_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...ITEM_META[t] }))} />
                    <Section title="Medicine"  items={MEDICINE_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...ITEM_META[t] }))} />
                    <Section title="Evolution Stones" items={STONE_ORDER.map(t => ({ type: t, qty: items[t] || 0, ...ITEM_META[t] })).filter(i => i.qty > 0)} />
                    {expCandyItems.length > 0 && (
                        <Section title="EXP Candy" items={expCandyItems.map(c => ({ ...c, label: c.type.replace('EXP_CANDY_', 'Candy '), sprite: '', desc: 'Grants EXP to a Pokémon' }))} />
                    )}
                </>
            ) : (
                <div>
                    <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
                        Species candy is earned by catching and grinding Pokémon.
                    </div>
                    {candyItems.length === 0 ? (
                        <div style={s.empty}>No species candy yet. Go catch some Pokémon!</div>
                    ) : (
                        <div style={s.grid}>
                            {candyItems.map(c => (
                                <div key={c.type} style={s.card}>
                                    <div style={{ fontSize: 32 }}>🍬</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>×{c.qty}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>#{c.speciesId} Candy</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PokeNavBar from '../components/PokeNavBar';
import { getApiUrls } from '../utils/apiUrls';

const { pokemonApiUrl } = getApiUrls();

const ITEM_ICONS = {
    POKEBALL:   '🔴',
    GREAT_BALL: '🔵',
    ULTRA_BALL: '⚫',
    POTION:     '💊',
    REVIVE:     '⭐',
};

export default function PokemonShop() {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState([]);
    const [stats,   setStats]   = useState(null);
    const [items,   setItems]   = useState({});
    const [buying,  setBuying]  = useState(null);
    const [msg,     setMsg]     = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch(`${pokemonApiUrl}/api/pokemon/shop/catalog`,  { credentials: 'include' }).then(r => r.json()),
            fetch(`${pokemonApiUrl}/api/pokemon/player/stats`,  { credentials: 'include' }).then(r => r.ok ? r.json() : null),
            fetch(`${pokemonApiUrl}/api/pokemon/items`,         { credentials: 'include' }).then(r => r.json()),
        ]).then(([cat, st, inv]) => {
            setCatalog(cat || []);
            setStats(st);
            const map = {};
            (inv || []).forEach(i => { map[i.itemType] = i.quantity; });
            setItems(map);
            setLoading(false);
        }).catch(() => {
            setMsg('Could not load shop. Please log in.');
            setLoading(false);
        });
    }, []);

    async function buy(itemType, quantity = 1) {
        if (buying) return;
        setBuying(itemType);
        setMsg('');
        try {
            const res = await fetch(`${pokemonApiUrl}/api/pokemon/shop/buy`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemType, quantity }),
            });
            const data = await res.json();
            if (res.ok) {
                setMsg(data.message || 'Purchased!');
                setStats(prev => prev ? { ...prev, coins: data.coinsRemaining } : prev);
                setItems(prev => ({ ...prev, [itemType]: (prev[itemType] || 0) + quantity }));
            } else {
                setMsg(typeof data === 'string' ? data : (data.message || 'Purchase failed'));
            }
        } catch {
            setMsg('Network error — try again');
        } finally {
            setBuying(null);
        }
    }

    if (loading) return (
        <div style={s.center}>
            <div>Loading shop…</div>
            <PokeNavBar />
        </div>
    );

    return (
        <div style={s.page}>
            {/* Header */}
            <div style={s.header}>
                <button onClick={() => navigate('/pokemon')} style={s.backBtn}>← Map</button>
                <h1 style={s.title}>Shop</h1>
                {stats && (
                    <div style={s.coins}>
                        💰 {stats.coins.toLocaleString()}
                    </div>
                )}
            </div>

            {msg && (
                <div style={{ ...s.msg, color: msg.includes('failed') || msg.includes('enough') ? '#ef4444' : '#22c55e' }}>
                    {msg}
                </div>
            )}

            <div style={s.hint}>Earn coins by winning Pokémon battles and defending Gyms.</div>

            <div style={s.list}>
                {catalog.map(item => (
                    <div key={item.itemType} style={s.row}>
                        <div style={s.iconCol}>
                            <img
                                src={`${pokemonApiUrl}/api/pokemon/item-sprites/${item.sprite}`}
                                alt={item.label}
                                style={s.sprite}
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                        </div>
                        <div style={s.info}>
                            <div style={s.itemName}>{item.label}</div>
                            <div style={s.owned}>Have: {items[item.itemType] || 0}</div>
                        </div>
                        <div style={s.priceCol}>
                            <div style={s.price}>💰 {item.price}</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    style={{ ...s.buyBtn, opacity: buying === item.itemType ? 0.5 : 1 }}
                                    disabled={!!buying}
                                    onClick={() => buy(item.itemType, 1)}
                                >
                                    ×1
                                </button>
                                <button
                                    style={{ ...s.buyBtn, background: '#f59e0b', opacity: buying === item.itemType ? 0.5 : 1 }}
                                    disabled={!!buying}
                                    onClick={() => buy(item.itemType, 5)}
                                >
                                    ×5
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ height: 80 }} />
            <PokeNavBar />
        </div>
    );
}

const s = {
    page:     { padding: '16px', maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: '#f9fafb' },
    center:   { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280', flexDirection: 'column', gap: 16 },
    header:   { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn:  { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#374151', flexShrink: 0 },
    title:    { margin: 0, fontSize: 22, fontWeight: 'bold', flex: 1 },
    coins:    { background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 20, padding: '6px 14px', fontWeight: 700, fontSize: 15, color: '#92400e', whiteSpace: 'nowrap' },
    msg:      { background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 14, textAlign: 'center', fontWeight: 600 },
    hint:     { color: '#6b7280', fontSize: 13, marginBottom: 16, textAlign: 'center' },
    list:     { display: 'flex', flexDirection: 'column', gap: 10 },
    row:      { background: 'white', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
    iconCol:  { flexShrink: 0 },
    sprite:   { width: 48, height: 48, objectFit: 'contain' },
    info:     { flex: 1 },
    itemName: { fontWeight: 700, fontSize: 15, color: '#111827' },
    owned:    { color: '#6b7280', fontSize: 12, marginTop: 2 },
    priceCol: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
    price:    { fontWeight: 700, color: '#92400e', fontSize: 14 },
    buyBtn:   { background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
};

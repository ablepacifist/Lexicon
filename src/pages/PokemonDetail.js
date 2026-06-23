import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiUrls } from '../utils/apiUrls';

const { pokemonApiUrl } = getApiUrls();

const TYPE_COLORS = {
    Fire: '#f97316', Water: '#3b82f6', Grass: '#22c55e', Electric: '#eab308',
    Psychic: '#ec4899', Ice: '#06b6d4', Dragon: '#7c3aed', Dark: '#374151',
    Normal: '#9ca3af', Fighting: '#b45309', Poison: '#a855f7', Ground: '#d97706',
    Flying: '#60a5fa', Bug: '#65a30d', Rock: '#78716c', Ghost: '#6366f1',
    Steel: '#64748b', Fairy: '#f472b6',
};

const CANDY_LABELS = {
    EXP_CANDY_XS: { label: 'Candy XS', exp: 100,    emoji: '🍬', color: '#fbcfe8' },
    EXP_CANDY_S:  { label: 'Candy S',  exp: 800,    emoji: '🍭', color: '#c4b5fd' },
    EXP_CANDY_M:  { label: 'Candy M',  exp: 3000,   emoji: '🍫', color: '#93c5fd' },
    EXP_CANDY_L:  { label: 'Candy L',  exp: 10000,  emoji: '🧁', color: '#6ee7b7' },
    EXP_CANDY_XL: { label: 'Candy XL', exp: 30000,  emoji: '🎂', color: '#fde68a' },
};
const CANDY_TYPES = Object.keys(CANDY_LABELS);

// Medium-Fast group: total EXP to reach level n = n³
function expForLevel(n) { return n * n * n; }
function expProgress(exp, level) {
    if (level >= 100) return { pct: 100, curr: 0, needed: 0 };
    const base = expForLevel(level);
    const next = expForLevel(level + 1);
    const curr = Math.max(0, exp - base);
    const needed = next - base;
    return { pct: Math.min(100, (curr / needed) * 100), curr, needed };
}

export default function PokemonDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pokemon,     setPokemon]     = useState(null);
    const [nickname,    setNickname]    = useState('');
    const [editing,     setEditing]     = useState(false);
    const [saved,       setSaved]       = useState('');
    const [candyInv,    setCandyInv]    = useState({});   // { EXP_CANDY_XS: 3, ... }
    const [grindModal,  setGrindModal]  = useState(false);
    const [candyModal,  setCandyModal]  = useState(false);
    const [selectedCandy, setSelectedCandy] = useState('EXP_CANDY_XS');
    const [candyAmount, setCandyAmount] = useState(1);
    const [busy,        setBusy]        = useState(false);
    const [flash,       setFlash]       = useState('');
    const [levelUpAnim, setLevelUpAnim] = useState(false);
    const [moves,        setMoves]       = useState([]);
    const [pendingMove,  setPendingMove] = useState(null); // { id, name, type, ... } waiting for slot choice
    const [replaceSlot,  setReplaceSlot] = useState(null); // null = prompt, 1-4 = replacing that slot

    const loadMoves = useCallback(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/moves/${id}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(data => setMoves(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [id]);

    const loadPokemon = useCallback(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/collection`, { credentials: 'include' })
            .then(r => { if (r.status === 401) throw new Error('unauthed'); return r.json(); })
            .then(data => {
                const found = data.find(p => String(p.id) === String(id));
                if (found) { setPokemon(found); setNickname(found.nickname || ''); }
                else navigate('/pokemon/pokemon');
            })
            .catch(e => { if (e.message === 'unauthed') navigate('/pokemon'); });
    }, [id, navigate]);

    useEffect(() => { loadPokemon(); }, [loadPokemon]);
    useEffect(() => { loadMoves(); }, [loadMoves]);

    useEffect(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/items`, { credentials: 'include' })
            .then(r => r.json())
            .then(items => {
                const inv = {};
                (items || []).forEach(i => { inv[i.itemType] = i.quantity; });
                setCandyInv(inv);
            })
            .catch(() => {});
    }, [id]);

    async function saveNickname() {
        try {
            await fetch(`${pokemonApiUrl}/api/pokemon/nickname`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caughtId: parseInt(id), nickname }),
            });
            setPokemon(p => ({ ...p, nickname: nickname || null }));
            setSaved('Saved!');
            setEditing(false);
            setTimeout(() => setSaved(''), 2000);
        } catch { setSaved('Save failed'); }
    }

    async function confirmGrind() {
        setBusy(true);
        try {
            const r = await fetch(`${pokemonApiUrl}/api/pokemon/grind`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caughtId: parseInt(id) }),
            });
            if (!r.ok) throw new Error(await r.text());
            const data = await r.json();
            navigate('/pokemon/pokemon', {
                state: { grindMsg: `Received ${data.amount}× ${CANDY_LABELS[data.candyType]?.label || data.candyType}!` }
            });
        } catch (e) {
            setFlash('Error: ' + e.message);
            setBusy(false);
            setGrindModal(false);
        }
    }

    async function useCandy() {
        if (!selectedCandy || candyAmount < 1) return;
        const available = candyInv[selectedCandy] || 0;
        if (available < candyAmount) { setFlash('Not enough candy!'); return; }
        setBusy(true);
        try {
            const r = await fetch(`${pokemonApiUrl}/api/pokemon/use-candy`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId: parseInt(id), candyType: selectedCandy, amount: candyAmount }),
            });
            if (!r.ok) throw new Error(await r.text());
            const data = await r.json();
            setCandyInv(prev => ({ ...prev, [selectedCandy]: (prev[selectedCandy] || 0) - candyAmount }));
            setCandyModal(false);
            if (data.leveledUp) {
                setLevelUpAnim(true);
                setFlash(`Level up! ${data.oldLevel} → ${data.newLevel} 🎉`);
                setTimeout(() => { setLevelUpAnim(false); }, 2200);
            } else {
                setFlash(`+${CANDY_LABELS[selectedCandy]?.exp * candyAmount} EXP`);
            }
            loadPokemon();
            loadMoves();
            // If there are pending moves that couldn't be auto-assigned (all 4 slots full), show replace UI
            if (data.pendingMoves && data.pendingMoves.length > 0) {
                setPendingMove(data.pendingMoves[0]);
                setReplaceSlot(null);
            }
        } catch (e) {
            setFlash('Error: ' + e.message);
        } finally {
            setBusy(false);
            setTimeout(() => setFlash(''), 3000);
        }
    }

    if (!pokemon) return <div style={styles.center}>Loading…</div>;

    const { pct, curr, needed } = expProgress(pokemon.exp || 0, pokemon.pokemonLevel);
    const hasAnyCandy = CANDY_TYPES.some(t => (candyInv[t] || 0) > 0);
    const stats = [
        { label: 'HP',      value: pokemon.hp,      max: 200 },
        { label: 'Attack',  value: pokemon.attack,   max: 150 },
        { label: 'Defense', value: pokemon.defense,  max: 150 },
        { label: 'Sp. Atk', value: pokemon.spAtk,   max: 150 },
        { label: 'Sp. Def', value: pokemon.spDef,   max: 150 },
        { label: 'Speed',   value: pokemon.speed,   max: 150 },
    ];

    return (
        <div style={styles.page}>
            <button onClick={() => navigate('/pokemon/pokemon')} style={styles.backBtn}>← My Pokémon</button>

            {/* Level-up flash */}
            {levelUpAnim && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(0,0,0,0.45)' }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: '#fde047', textShadow: '0 0 40px #fbbf24', animation: 'levelUpPop 2s ease-out forwards' }}>
                        LEVEL UP!
                    </div>
                </div>
            )}

            {flash && (
                <div style={{ background: levelUpAnim ? '#fde047' : '#22c55e', color: levelUpAnim ? '#92400e' : 'white', padding: '10px 18px', borderRadius: 12, textAlign: 'center', marginBottom: 12, fontWeight: 700, fontSize: 15 }}>
                    {flash}
                </div>
            )}

            <div style={styles.card}>
                <img src={`${pokemonApiUrl}/api/pokemon/sprites/${pokemon.spriteKey}`}
                    alt={pokemon.speciesName} style={styles.sprite}
                    onError={e => { e.target.style.display = 'none'; }} />

                <div style={{ textAlign: 'center' }}>
                    {editing ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
                            <input style={styles.nicknameInput} value={nickname} maxLength={30}
                                onChange={e => setNickname(e.target.value)} placeholder="Enter nickname…" />
                            <button onClick={saveNickname} style={styles.saveBtn}>Save</button>
                            <button onClick={() => setEditing(false)} style={styles.cancelBtn}>✕</button>
                        </div>
                    ) : (
                        <div style={{ marginBottom: 4 }}>
                            <span style={styles.name}>{pokemon.nickname || pokemon.speciesName}</span>
                            <button onClick={() => setEditing(true)} style={styles.editBtn}>✏️</button>
                        </div>
                    )}
                    {pokemon.nickname && <div style={styles.sub}>{pokemon.speciesName}</div>}
                    {saved && <div style={{ color: '#22c55e', fontSize: 13 }}>{saved}</div>}
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '12px 0' }}>
                    {pokemon.type1 && <span style={{ ...styles.badge, background: TYPE_COLORS[pokemon.type1] || '#9ca3af' }}>{pokemon.type1}</span>}
                    {pokemon.type2 && <span style={{ ...styles.badge, background: TYPE_COLORS[pokemon.type2] || '#9ca3af' }}>{pokemon.type2}</span>}
                </div>

                <div style={styles.cpBox}>Lv. {pokemon.pokemonLevel}</div>

                {/* EXP Bar */}
                <div style={{ margin: '0 0 18px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        <span>EXP</span>
                        {pokemon.pokemonLevel < 100
                            ? <span>{curr.toLocaleString()} / {needed.toLocaleString()}</span>
                            : <span>MAX</span>}
                    </div>
                    <div style={styles.barBg}>
                        <div style={{ ...styles.expBarFill, width: `${pct}%` }} />
                    </div>
                </div>

                <div style={styles.stats}>
                    {stats.map(({ label, value, max }) => (
                        <div key={label} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                <span>{label}</span><span style={{ fontWeight: 'bold' }}>{value}</span>
                            </div>
                            <div style={styles.barBg}>
                                <div style={{ ...styles.barFill, width: `${Math.min(100, (value / max) * 100)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Moves */}
                {moves.length > 0 && (
                    <div style={{ textAlign: 'left', marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moves</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {moves.map(m => (
                                <div key={m.slot} style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                    onClick={() => { setPendingMove(null); setReplaceSlot(m.slot); }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                        <span style={{ ...styles.moveBadge, background: TYPE_COLORS[m.type] || '#9ca3af' }}>{m.type}</span>
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{m.category}</span>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                        {m.power > 0 ? `Pwr ${m.power}` : '—'} · {m.accuracy > 0 ? `Acc ${m.accuracy}%` : '∞'} · PP {m.pp}
                                    </div>
                                </div>
                            ))}
                            {/* Empty slots */}
                            {Array.from({ length: 4 - moves.length }).map((_, i) => (
                                <div key={`empty-${i}`} style={{ background: '#f1f5f9', borderRadius: 10, padding: '8px 10px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 70 }}>
                                    <span style={{ color: '#cbd5e1', fontSize: 22 }}>–</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={styles.meta}>Caught {new Date(pokemon.caughtAt).toLocaleDateString()}</div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button
                        onClick={() => setCandyModal(true)}
                        disabled={!hasAnyCandy}
                        style={{ ...styles.actionBtn, background: hasAnyCandy ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : '#e5e7eb', color: hasAnyCandy ? 'white' : '#9ca3af', flex: 1 }}
                    >
                        🍬 Use Candy
                    </button>
                    <button
                        onClick={() => setGrindModal(true)}
                        style={{ ...styles.actionBtn, background: 'linear-gradient(135deg,#ef4444,#b91c1c)', color: 'white', flex: 1 }}
                    >
                        ⚡ Grind Up
                    </button>
                </div>
            </div>

            {/* ── Grind confirmation modal ── */}
            {grindModal && (
                <div style={styles.modalOverlay} onClick={() => !busy && setGrindModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
                        <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Grind Up {pokemon.speciesName}?</h3>
                        <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 14 }}>
                            This <b>permanently</b> removes {pokemon.nickname || pokemon.speciesName} from your collection.
                        </p>
                        <GrindPreview level={pokemon.pokemonLevel} />
                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setGrindModal(false)} style={styles.cancelBtn2} disabled={busy}>Cancel</button>
                            <button onClick={confirmGrind} style={styles.grindConfirmBtn} disabled={busy}>
                                {busy ? 'Grinding…' : '⚡ Grind!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Use Candy modal ── */}
            {candyModal && (
                <div style={styles.modalOverlay} onClick={() => !busy && setCandyModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 4px', color: '#111827' }}>Use EXP Candy</h3>
                        <p style={{ margin: '0 0 14px', color: '#6b7280', fontSize: 13 }}>
                            Give EXP to <b>{pokemon.nickname || pokemon.speciesName}</b> (Lv. {pokemon.pokemonLevel})
                        </p>

                        {/* Candy selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                            {CANDY_TYPES.map(t => {
                                const cnt = candyInv[t] || 0;
                                const info = CANDY_LABELS[t];
                                if (cnt === 0) return null;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => { setSelectedCandy(t); setCandyAmount(1); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `2px solid ${selectedCandy === t ? '#7c3aed' : '#e5e7eb'}`, background: selectedCandy === t ? '#f5f3ff' : 'white', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                        <span style={{ fontSize: 22, background: info.color, borderRadius: 8, padding: '2px 6px' }}>{info.emoji}</span>
                                        <span style={{ flex: 1, fontWeight: 600 }}>{info.label}</span>
                                        <span style={{ fontSize: 13, color: '#64748b' }}>+{info.exp.toLocaleString()} EXP</span>
                                        <span style={{ fontSize: 12, background: '#f1f5f9', borderRadius: 6, padding: '2px 7px', color: '#374151' }}>×{cnt}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Amount selector */}
                        {selectedCandy && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 14 }}>
                                <button onClick={() => setCandyAmount(a => Math.max(1, a - 1))} style={styles.amountBtn}>–</button>
                                <span style={{ fontSize: 22, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>{candyAmount}</span>
                                <button onClick={() => setCandyAmount(a => Math.min(candyInv[selectedCandy] || 1, a + 1))} style={styles.amountBtn}>+</button>
                            </div>
                        )}

                        {selectedCandy && (
                            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#475569', marginBottom: 14 }}>
                                Total: <b>+{((CANDY_LABELS[selectedCandy]?.exp || 0) * candyAmount).toLocaleString()} EXP</b>
                                {pokemon.pokemonLevel < 100 && (
                                    <span style={{ marginLeft: 8, color: '#7c3aed' }}>
                                        ({Math.round(((CANDY_LABELS[selectedCandy]?.exp || 0) * candyAmount / (expForLevel(pokemon.pokemonLevel + 1) - expForLevel(pokemon.pokemonLevel))) * 100)}% of next level)
                                    </span>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setCandyModal(false)} style={styles.cancelBtn2} disabled={busy}>Cancel</button>
                            <button onClick={useCandy} style={{ ...styles.actionBtn, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white', flex: 1 }} disabled={busy || !selectedCandy}>
                                {busy ? 'Using…' : '✨ Use Candy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Replace Move modal (pending move from level-up, or player tapped a slot) ── */}
            {(pendingMove || replaceSlot) && (
                <div style={styles.modalOverlay} onClick={() => { setPendingMove(null); setReplaceSlot(null); }}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        {pendingMove ? (
                            <>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>📖</div>
                                <h3 style={{ margin: '0 0 4px', color: '#111827' }}>New Move!</h3>
                                <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 13 }}>
                                    <b>{pokemon.nickname || pokemon.speciesName}</b> wants to learn <b>{pendingMove.name}</b>.<br />
                                    All 4 move slots are full. Choose a move to replace:
                                </p>
                                <div style={{ ...styles.badge, display: 'inline-block', background: TYPE_COLORS[pendingMove.type] || '#9ca3af', marginBottom: 8 }}>{pendingMove.type} · {pendingMove.category}</div>
                                <div style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                                    {pendingMove.power > 0 ? `Power ${pendingMove.power}` : 'Status'} · Acc {pendingMove.accuracy || '—'} · PP {pendingMove.pp}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {moves.map(m => (
                                        <button key={m.slot} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            onClick={async () => {
                                                try {
                                                    await fetch(`${pokemonApiUrl}/api/pokemon/moves/replace`, {
                                                        method: 'POST', credentials: 'include',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ caughtId: parseInt(id), moveId: pendingMove.id, slot: m.slot })
                                                    });
                                                    setPendingMove(null);
                                                    loadMoves();
                                                } catch {}
                                            }}>
                                            <span style={{ fontWeight: 600 }}>{m.name}</span>
                                            <span style={{ fontSize: 12, color: '#94a3b8' }}>{m.type}</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setPendingMove(null)} style={{ ...styles.cancelBtn2, marginTop: 12, width: '100%' }}>Don't Learn</button>
                            </>
                        ) : replaceSlot ? (
                            <>
                                <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Swap Move in Slot {replaceSlot}</h3>
                                <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 13 }}>Choose a move from {pokemon.nickname || pokemon.speciesName}'s learnset to put here.</p>
                                <LearnsetPicker speciesId={pokemon.speciesId} caughtId={parseInt(id)} slot={replaceSlot} onDone={() => { setReplaceSlot(null); loadMoves(); }} />
                                <button onClick={() => setReplaceSlot(null)} style={{ ...styles.cancelBtn2, marginTop: 12, width: '100%' }}>Cancel</button>
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes levelUpPop {
                    0%   { transform: scale(0.3); opacity: 0; }
                    30%  { transform: scale(1.3); opacity: 1; }
                    60%  { transform: scale(1.0); opacity: 1; }
                    90%  { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1.0); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

function GrindPreview({ level }) {
    let candyType, amount;
    if      (level <= 15) { candyType = 'EXP_CANDY_XS'; amount = 3; }
    else if (level <= 30) { candyType = 'EXP_CANDY_S';  amount = 2; }
    else if (level <= 50) { candyType = 'EXP_CANDY_M';  amount = 1; }
    else if (level <= 75) { candyType = 'EXP_CANDY_L';  amount = 1; }
    else                  { candyType = 'EXP_CANDY_XL'; amount = 1; }
    const info = CANDY_LABELS[candyType];
    return (
        <div style={{ background: '#f1f5f9', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{info.emoji}</span>
            <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>You'll receive:</div>
                <div style={{ color: '#7c3aed', fontWeight: 700, fontSize: 17 }}>{amount}× {info.label}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>+{(info.exp * amount).toLocaleString()} EXP total</div>
            </div>
        </div>
    );
}

function LearnsetPicker({ speciesId, caughtId, slot, onDone }) {
    const [learnset, setLearnset] = useState([]);
    useEffect(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/species/${speciesId}/learnset`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(data => setLearnset(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [speciesId]);

    return (
        <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {learnset.map(m => (
                <button key={`${m.id}-${m.levelLearned}`}
                    style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={async () => {
                        try {
                            await fetch(`${pokemonApiUrl}/api/pokemon/moves/replace`, {
                                method: 'POST', credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ caughtId, moveId: m.id, slot })
                            });
                            onDone();
                        } catch {}
                    }}>
                    <span>
                        <b style={{ marginRight: 6 }}>{m.name}</b>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Lv.{m.levelLearned}</span>
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{m.type} · {m.power > 0 ? `Pwr ${m.power}` : 'Status'}</span>
                </button>
            ))}
        </div>
    );
}

const styles = {
    page: { padding: 20, maxWidth: 480, margin: '0 auto' },
    center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' },
    backBtn: { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#374151', marginBottom: 16 },
    card: { background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,.08)', textAlign: 'center' },
    sprite: { width: 128, height: 128, objectFit: 'contain', display: 'block', margin: '0 auto 12px' },
    name: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    sub: { color: '#9ca3af', fontSize: 13 },
    editBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginLeft: 6 },
    nicknameInput: { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: 160 },
    saveBtn: { padding: '6px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' },
    cancelBtn: { padding: '6px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' },
    badge: { color: 'white', padding: '4px 12px', borderRadius: 20, fontWeight: 'bold', fontSize: 13 },
    cpBox: { display: 'inline-block', background: '#f3f4f6', padding: '6px 20px', borderRadius: 20, fontWeight: 'bold', fontSize: 18, margin: '8px 0 12px' },
    stats: { textAlign: 'left', marginBottom: 16 },
    barBg: { background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' },
    barFill: { background: '#ef4444', height: '100%', borderRadius: 4, transition: 'width .3s' },
    expBarFill: { background: 'linear-gradient(90deg,#8b5cf6,#6d28d9)', height: '100%', borderRadius: 4, transition: 'width .5s' },
    meta: { color: '#9ca3af', fontSize: 12, marginTop: 8 },
    actionBtn: { padding: '12px 16px', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 700, transition: 'opacity .15s' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 20 },
    modal: { background: 'white', borderRadius: 20, padding: 24, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.35)', textAlign: 'center' },
    cancelBtn2: { flex: 1, padding: '12px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 600 },
    grindConfirmBtn: { flex: 1, padding: '12px 16px', background: 'linear-gradient(135deg,#ef4444,#b91c1c)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 700 },
    amountBtn: { width: 38, height: 38, borderRadius: '50%', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    moveBadge: { color: 'white', padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700 },
};

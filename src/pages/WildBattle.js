import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrls } from '../utils/apiUrls';

const { pokemonApiUrl } = getApiUrls();

const TYPE_COLORS = {
    Fire: '#f97316', Water: '#3b82f6', Grass: '#22c55e', Electric: '#eab308',
    Psychic: '#ec4899', Ice: '#06b6d4', Dragon: '#7c3aed', Dark: '#374151',
    Normal: '#9ca3af', Fighting: '#b45309', Poison: '#a855f7', Ground: '#d97706',
    Flying: '#60a5fa', Bug: '#65a30d', Rock: '#78716c', Ghost: '#6366f1',
    Steel: '#64748b', Fairy: '#f472b6',
};

const STATUS_LABEL = {
    PARALYZE: 'PAR', SLEEP: 'SLP', POISON: 'PSN', BURN: 'BRN', FREEZE: 'FRZ', CONFUSE: 'CNF',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const spriteUrl = key => `${pokemonApiUrl}/api/pokemon/sprites/${key}`;

function hpColor(pct) {
    if (pct > 50) return '#22c55e';
    if (pct > 20) return '#eab308';
    return '#ef4444';
}

function HpBar({ name, level, cur, max, status }) {
    const pct = max > 0 ? Math.max(0, Math.round((cur / max) * 100)) : 0;
    return (
        <div style={s.hpCard}>
            <div style={s.hpHeader}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{name}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>Lv.{level}</span>
                {status && <span style={s.statusBadge}>{STATUS_LABEL[status] || status}</span>}
            </div>
            <div style={s.hpTrack}>
                <div style={{ ...s.hpFill, width: `${pct}%`, background: hpColor(pct) }} />
            </div>
            <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>{Math.max(0, Math.round(cur))} / {max}</div>
        </div>
    );
}

function TypeChip({ type }) {
    if (!type) return null;
    return <span style={{ ...s.typeChip, background: TYPE_COLORS[type] || '#9ca3af' }}>{type}</span>;
}

/**
 * Turn-based wild battle screen (Milestone 3).
 * Props:
 *  - spawn: the wild spawn marker { id, speciesName, spriteKey, lat, lng }
 *  - playerPos: [lat, lng]
 *  - onRequestCatch(battleId): switch to the throw screen, carrying the battle's catch bonus
 *  - onClose(refresh, consumed): leave the battle (refresh→reload; consumed→remove spawn)
 */
export default function WildBattle({ spawn, playerPos, onRequestCatch, onClose }) {
    const [phase, setPhase]   = useState('choose');   // choose | battle | switch | end
    const [party, setParty]   = useState(null);
    const [battle, setBattle] = useState(null);       // authoritative latest state
    const [log, setLog]       = useState([]);
    const [busy, setBusy]     = useState(false);
    const [menu, setMenu]     = useState('main');     // main | moves

    // Animation / display HP (decoupled from authoritative state for synced drain)
    const [dispWild, setDispWild] = useState(0);
    const [dispMe,   setDispMe]   = useState(0);
    const [anim,     setAnim]     = useState(null);   // { side:'wild'|'player', kind:'lunge'|'hit' }
    const logRef = useRef(null);

    useEffect(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/collection`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(list => setParty(Array.isArray(list) ? list : []))
            .catch(() => setParty([]));
    }, []);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [log]);

    async function post(path, body) {
        const r = await fetch(`${pokemonApiUrl}/api/pokemon/battle/${path}`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    // Reveal a turn's log line-by-line, animating sprites and draining HP in sync.
    const revealTurn = useCallback(async (state) => {
        const lines = state.log || [];
        const wildName = state.wild.name;
        const meName   = state.player.name;
        let curWild = dispWild, curMe = dispMe;

        for (const line of lines) {
            setLog(prev => [...prev, line]);
            const side = line.startsWith(wildName) ? 'wild'
                       : line.startsWith(meName)   ? 'player' : null;

            if (/ used /.test(line) && side) {
                setAnim({ side, kind: 'lunge' });
            } else {
                // HP loss for the named subject
                const lossM = line.match(/took (\d+) damage|hurt by .*\((\d+)\)|confusion \((\d+)\)|recoil \((\d+)\)/);
                const gainM = line.match(/drained (\d+) HP|restored (\d+) HP/);
                if (lossM && side) {
                    const n = parseInt(lossM.slice(1).find(Boolean), 10);
                    if (side === 'wild') { curWild = Math.max(0, curWild - n); setDispWild(curWild); }
                    else                 { curMe   = Math.max(0, curMe - n);   setDispMe(curMe); }
                    setAnim({ side, kind: 'hit' });
                } else if (gainM && side) {
                    const n = parseInt(gainM.slice(1).find(Boolean), 10);
                    if (side === 'wild') { curWild = Math.min(state.wild.maxHp, curWild + n); setDispWild(curWild); }
                    else                 { curMe   = Math.min(state.player.maxHp, curMe + n); setDispMe(curMe); }
                }
            }
            await sleep(line.match(/ used | took | fainted/) ? 760 : 520);
            setAnim(null);
        }
        // Snap to authoritative truth in case a line wasn't parsed.
        setDispWild(state.wild.curHp);
        setDispMe(state.player.curHp);
        setBattle(state);
        if (state.over) setPhase('end');
    }, [dispWild, dispMe]);

    async function startWith(caught) {
        setBusy(true);
        try {
            const state = await post('start', {
                spawnId: spawn.id, caughtId: caught.id,
                lat: playerPos ? playerPos[0] : 0, lng: playerPos ? playerPos[1] : 0,
            });
            setBattle(state);
            setDispWild(state.wild.curHp);
            setDispMe(state.player.curHp);
            setLog(state.log || []);
            setPhase('battle');
            setMenu('main');
        } catch (e) {
            setLog(prev => [...prev, '⚠️ ' + e.message]);
        } finally { setBusy(false); }
    }

    async function playMove(moveId) {
        if (busy || !battle) return;
        setBusy(true); setMenu('main');
        try { await revealTurn(await post('turn', { battleId: battle.battleId, moveId })); }
        catch (e) { setLog(prev => [...prev, '⚠️ ' + e.message]); }
        finally { setBusy(false); }
    }

    async function switchTo(caught) {
        if (busy || !battle) return;
        setBusy(true); setPhase('battle');
        try { await revealTurn(await post('switch', { battleId: battle.battleId, caughtId: caught.id })); }
        catch (e) { setLog(prev => [...prev, '⚠️ ' + e.message]); }
        finally { setBusy(false); }
    }

    async function run() {
        if (busy || !battle) return;
        setBusy(true);
        try {
            const state = await post('flee', { battleId: battle.battleId });
            await revealTurn(state);
            if (state.outcome === 'FLED') setTimeout(() => onClose(false, false), 600);
        } catch (e) { setLog(prev => [...prev, '⚠️ ' + e.message]); }
        finally { setBusy(false); }
    }

    function goCatch() { onRequestCatch(battle.battleId); }

    // ── Party picker (initial + switch) ──────────────────────────────────────
    if (phase === 'choose' || phase === 'switch') {
        const switching = phase === 'switch';
        return (
            <div style={s.overlay}>
                <div style={s.panel}>
                    <div style={s.wildHeader}>
                        <img src={spriteUrl(spawn.spriteKey)} alt={spawn.speciesName} style={{ width: 70, height: 70, objectFit: 'contain' }}
                            onError={e => { e.target.style.display = 'none'; }} />
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 18 }}>Wild {spawn.speciesName}</div>
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>{switching ? 'Switch to which Pokémon?' : 'Choose your Pokémon!'}</div>
                        </div>
                    </div>
                    {party === null ? (
                        <div style={s.dim}>Loading your Pokémon…</div>
                    ) : party.length === 0 ? (
                        <div style={s.dim}>You have no Pokémon to battle with!</div>
                    ) : (
                        <div style={s.partyList}>
                            {party.map(p => (
                                <button key={p.id} style={s.partyRow} disabled={busy}
                                    onClick={() => switching ? switchTo(p) : startWith(p)}>
                                    <img src={spriteUrl(p.spriteKey)} alt={p.speciesName} style={{ width: 44, height: 44, objectFit: 'contain' }}
                                        onError={e => { e.target.style.display = 'none'; }} />
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nickname || p.speciesName}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>
                                            Lv.{p.pokemonLevel} · HP {p.hp}
                                            <TypeChip type={p.type1} /><TypeChip type={p.type2} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    <button style={s.closeBtn} onClick={() => onClose(false, false)}>Leave</button>
                </div>
            </div>
        );
    }

    if (!battle) return null;
    const wild = battle.wild;
    const me   = battle.player;

    // ── End screen ───────────────────────────────────────────────────────────
    if (phase === 'end') {
        const won = battle.outcome === 'WON';
        const fainted = battle.outcome === 'FAINTED';
        return (
            <div style={s.overlay}>
                <div style={s.panel}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ fontSize: 40 }}>{won ? '🏆' : fainted ? '💀' : '🏃'}</div>
                        <div style={{ fontWeight: 800, fontSize: 20, marginTop: 6 }}>
                            {won ? 'Victory!' : fainted ? 'Defeated…' : 'Got away'}
                        </div>
                    </div>
                    <div ref={logRef} style={{ ...s.logBox, height: 150 }}>
                        {log.map((l, i) => <div key={i} style={s.logLine}>{l}</div>)}
                    </div>
                    {won && <div style={s.dim}>The wild {wild.name} fainted — it can no longer be caught.</div>}
                    <button style={s.closeBtn} onClick={() => onClose(true, won)}>Continue</button>
                </div>
            </div>
        );
    }

    // ── Active battle ────────────────────────────────────────────────────────
    const myMoves = me.moves || [];
    const wildAnim = anim && anim.side === 'wild' ? (anim.kind === 'lunge' ? 'wbLungeDown' : 'wbHit') : '';
    const meAnim   = anim && anim.side === 'player' ? (anim.kind === 'lunge' ? 'wbLungeUp' : 'wbHit') : '';

    return (
        <div style={s.overlay}>
            <style>{KEYFRAMES}</style>
            <div style={s.battleField}>
                {/* Wild — top */}
                <div style={{ alignSelf: 'flex-start', width: '100%' }}>
                    <HpBar name={wild.name} level={wild.level} cur={dispWild} max={wild.maxHp} status={wild.status} />
                </div>
                <div style={{ alignSelf: 'flex-end', marginRight: 12 }}>
                    <img src={spriteUrl(wild.spriteKey)} alt={wild.name}
                        style={{ ...s.wildSprite, animation: wildAnim ? `${wildAnim} .5s ease` : 'none' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                </div>

                {/* Player — bottom */}
                <div style={{ alignSelf: 'flex-start', marginLeft: 12 }}>
                    <img src={spriteUrl(me.spriteKey)} alt={me.name}
                        style={{ ...s.mySprite, animation: meAnim ? `${meAnim} .5s ease` : 'none' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                </div>
                <div style={{ alignSelf: 'flex-end', width: '100%' }}>
                    <HpBar name={me.name} level={me.level} cur={dispMe} max={me.maxHp} status={me.status} />
                </div>
            </div>

            <div ref={logRef} style={s.logBox}>
                {log.map((l, i) => <div key={i} style={s.logLine}>{l}</div>)}
            </div>

            {menu === 'main' ? (
                <div style={s.actionGrid}>
                    <button style={{ ...s.actionBtn, background: '#ef4444', opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => setMenu('moves')}>⚔️ Fight</button>
                    <button style={{ ...s.actionBtn, background: '#22c55e', opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={goCatch}>🎯 Catch</button>
                    <button style={{ ...s.actionBtn, background: '#3b82f6', opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => setPhase('switch')}>🔄 Switch</button>
                    <button style={{ ...s.actionBtn, background: '#6b7280', opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={run}>🏃 Run</button>
                </div>
            ) : (
                <div style={s.moveGrid}>
                    {myMoves.map(m => (
                        <button key={m.slot || m.id} style={{ ...s.moveBtn, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => playMove(m.id)}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{m.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                                <TypeChip type={m.type} />
                                <span style={{ fontSize: 10, color: '#64748b' }}>
                                    {m.power > 0 ? `PWR ${m.power}` : 'Status'}{m.maxHits > 1 ? ` ·${m.minHits}-${m.maxHits}×` : ''}
                                </span>
                            </div>
                        </button>
                    ))}
                    <button style={{ ...s.moveBtn, gridColumn: '1 / -1', background: '#f1f5f9', textAlign: 'center' }}
                        disabled={busy} onClick={() => setMenu('main')}>← Back</button>
                </div>
            )}
        </div>
    );
}

const KEYFRAMES = `
@keyframes wbLungeDown { 0%{transform:translateY(0)} 40%{transform:translateY(22px)} 100%{transform:translateY(0)} }
@keyframes wbLungeUp   { 0%{transform:scaleX(-1) translateY(0)} 40%{transform:scaleX(-1) translateY(-22px)} 100%{transform:scaleX(-1) translateY(0)} }
@keyframes wbHit       { 0%,100%{opacity:1;transform:translateX(0)} 20%{opacity:.3;transform:translateX(-7px)} 40%{opacity:1;transform:translateX(7px)} 60%{opacity:.3;transform:translateX(-5px)} 80%{opacity:1;transform:translateX(5px)} }
`;

const s = {
    overlay:    { position: 'fixed', inset: 0, zIndex: 3000, background: 'linear-gradient(160deg,#0f172a,#1e293b)', display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box' },
    panel:      { background: 'white', borderRadius: 16, padding: 18, maxWidth: 460, width: '100%', margin: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,.5)' },
    wildHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
    partyList:  { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto' },
    partyRow:   { display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' },
    dim:        { color: '#94a3b8', textAlign: 'center', padding: 20, fontSize: 14 },
    closeBtn:   { width: '100%', marginTop: 14, padding: 12, borderRadius: 10, border: 'none', background: '#475569', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' },

    battleField:{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', maxWidth: 520, width: '100%', margin: '0 auto', gap: 4, minHeight: 0 },
    hpCard:     { background: 'white', borderRadius: 12, padding: '8px 12px', maxWidth: 240, boxShadow: '0 2px 8px rgba(0,0,0,.3)' },
    hpHeader:   { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
    hpTrack:    { height: 9, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
    hpFill:     { height: '100%', borderRadius: 6, transition: 'width .5s ease, background .5s' },
    statusBadge:{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: 'white', background: '#7c3aed', borderRadius: 4, padding: '1px 5px' },
    wildSprite: { width: 130, height: 130, objectFit: 'contain', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.5))' },
    mySprite:   { width: 150, height: 150, objectFit: 'contain', transform: 'scaleX(-1)', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.5))' },

    logBox:     { background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: '8px 12px', height: 84, overflowY: 'auto', fontSize: 13, color: '#1e293b', maxWidth: 520, width: '100%', margin: '8px auto', boxSizing: 'border-box' },
    logLine:    { padding: '1px 0', lineHeight: 1.35 },

    actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520, width: '100%', margin: '0 auto' },
    actionBtn:  { padding: '16px 0', borderRadius: 12, border: 'none', color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
    moveGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520, width: '100%', margin: '0 auto' },
    moveBtn:    { padding: '10px 12px', borderRadius: 12, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', textAlign: 'left' },
    typeChip:   { display: 'inline-block', color: 'white', padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 800, marginLeft: 4 },
};

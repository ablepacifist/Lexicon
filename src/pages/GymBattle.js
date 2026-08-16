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
const TEAM_COLOR = { VALOR: '#ef4444', MYSTIC: '#3b82f6', INSTINCT: '#eab308' };
const STATUS_LABEL = { PARALYZE: 'PAR', SLEEP: 'SLP', POISON: 'PSN', BURN: 'BRN', FREEZE: 'FRZ', CONFUSE: 'CNF' };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const spriteUrl = k => `${pokemonApiUrl}/api/pokemon/sprites/${k}`;
const hpColor = pct => (pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444');

function HpBar({ c, cur }) {
    if (!c) return null;
    const val = cur != null ? cur : c.curHp;
    const pct = c.maxHp > 0 ? Math.max(0, Math.round((val / c.maxHp) * 100)) : 0;
    return (
        <div style={s.hpCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>Lv.{c.level}</span>
                {c.status && <span style={s.statusBadge}>{STATUS_LABEL[c.status] || c.status}</span>}
            </div>
            <div style={s.hpTrack}><div style={{ ...s.hpFill, width: `${pct}%`, background: hpColor(pct) }} /></div>
            <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>{Math.max(0, Math.round(val))} / {c.maxHp}</div>
        </div>
    );
}

function TypeChip({ type }) {
    if (!type) return null;
    return <span style={{ ...s.typeChip, background: TYPE_COLORS[type] || '#9ca3af' }}>{type}</span>;
}

/**
 * Gym battle screen (Milestone 4). Props:
 *  - gym: { id, name, controllingTeam }
 *  - onClose(refresh): leave (refresh → reload map + stats)
 */
export default function GymBattle({ gym, onClose }) {
    const [phase, setPhase]   = useState('choose');   // choose | battle | switch | end
    const [party, setParty]   = useState(null);       // collection for the picker
    const [picked, setPicked] = useState([]);         // chosen caughtIds (max 6)
    const [battle, setBattle] = useState(null);
    const [log, setLog]       = useState([]);
    const [busy, setBusy]     = useState(false);
    const [menu, setMenu]     = useState('main');
    const [anim, setAnim]     = useState(null);        // { side:'def'|'me', kind:'lunge'|'hit' }
    const logRef = useRef(null);

    useEffect(() => {
        fetch(`${pokemonApiUrl}/api/pokemon/collection`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(list => setParty(Array.isArray(list) ? list : []))
            .catch(() => setParty([]));
    }, []);

    useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

    async function post(path, body) {
        const r = await fetch(`${pokemonApiUrl}/api/pokemon/gym/battle/${path}`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    const revealTurn = useCallback(async (state) => {
        const lines = state.log || [];
        const meName = state.activePlayer?.name;
        const defName = state.activeDefender?.name;
        for (const line of lines) {
            setLog(prev => [...prev, line]);
            const side = defName && line.startsWith(defName) ? 'def'
                       : meName && line.startsWith(meName) ? 'me' : null;
            if (/ used /.test(line) && side) setAnim({ side, kind: 'lunge' });
            else if (/took \d+ damage|hurt by|hit itself|recoil/.test(line) && side) setAnim({ side, kind: 'hit' });
            await sleep(line.match(/ used | took | fainted| claimed/) ? 720 : 480);
            setAnim(null);
        }
        setBattle(state);
        if (state.over) setPhase('end');
    }, []);

    function togglePick(id) {
        setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length >= 6 ? prev : [...prev, id]));
    }

    async function startBattle() {
        if (!picked.length) return;
        setBusy(true);
        try {
            const state = await post('start', { gymId: gym.id, team: picked });
            setBattle(state); setLog(state.log || []); setPhase('battle'); setMenu('main');
        } catch (e) { setLog(prev => [...prev, '⚠️ ' + e.message]); }
        finally { setBusy(false); }
    }

    async function playMove(moveId) {
        if (busy || !battle) return;
        setBusy(true); setMenu('main');
        try { await revealTurn(await post('turn', { battleId: battle.battleId, moveId })); }
        catch (e) { setLog(prev => [...prev, '⚠️ ' + e.message]); }
        finally { setBusy(false); }
    }

    async function switchTo(caughtId) {
        if (busy || !battle) return;
        setBusy(true); setPhase('battle'); setMenu('main');
        try { await revealTurn(await post('switch', { battleId: battle.battleId, caughtId })); }
        catch (e) { setLog(prev => [...prev, '⚠️ ' + e.message]); setPhase('battle'); }
        finally { setBusy(false); }
    }

    async function run() {
        if (busy) return;
        setBusy(true);
        try { if (battle) await post('end', { battleId: battle.battleId }); } catch {}
        onClose(true);
    }

    // ── Team picker ──────────────────────────────────────────────────────────
    if (phase === 'choose') {
        return (
            <div style={s.overlay}>
                <div style={s.panel}>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 30 }}>🏛️</div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{gym.name}</div>
                        <div style={{ fontSize: 13, color: TEAM_COLOR[gym.controllingTeam] || '#94a3b8', fontWeight: 700 }}>
                            Defended by Team {gym.controllingTeam}
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Pick up to 6 Pokémon ({picked.length}/6)</div>
                    </div>
                    {party === null ? <div style={s.dim}>Loading…</div>
                     : party.length === 0 ? <div style={s.dim}>You have no Pokémon!</div>
                     : (
                        <div style={s.partyList}>
                            {party.map(p => {
                                const cur = p.currentHp != null ? p.currentHp : p.hp;
                                const fainted = cur <= 0;
                                const on = picked.includes(p.id);
                                return (
                                    <button key={p.id} disabled={fainted}
                                        onClick={() => togglePick(p.id)}
                                        style={{ ...s.partyRow, opacity: fainted ? 0.45 : 1, border: on ? '2px solid #7c3aed' : '1px solid #e5e7eb', cursor: fainted ? 'not-allowed' : 'pointer' }}>
                                        <span style={{ width: 18 }}>{on ? '✅' : ''}</span>
                                        <img src={spriteUrl(p.spriteKey)} alt={p.speciesName} style={{ width: 40, height: 40, objectFit: 'contain', filter: fainted ? 'grayscale(1)' : 'none' }}
                                            onError={e => { e.target.style.display = 'none'; }} />
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nickname || p.speciesName} {fainted && <span style={{ color: '#ef4444', fontSize: 11 }}>FNT</span>}</div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>Lv.{p.pokemonLevel} · {Math.max(0, cur)}/{p.hp} HP<TypeChip type={p.type1} /><TypeChip type={p.type2} /></div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button style={{ ...s.closeBtn, flex: 1, background: '#475569' }} onClick={() => onClose(false)}>Leave</button>
                        <button style={{ ...s.closeBtn, flex: 2, background: picked.length ? '#7c3aed' : '#cbd5e1' }}
                            disabled={!picked.length || busy} onClick={startBattle}>⚔️ Battle</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!battle) return null;
    const me = battle.activePlayer;
    const def = battle.activeDefender;

    // ── End screen ───────────────────────────────────────────────────────────
    if (phase === 'end') {
        const won = battle.outcome === 'WON';
        return (
            <div style={s.overlay}>
                <div style={s.panel}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ fontSize: 40 }}>{won ? '🏆' : '💀'}</div>
                        <div style={{ fontWeight: 800, fontSize: 20, marginTop: 6 }}>{won ? 'Gym Claimed!' : 'Defeated…'}</div>
                        {won && battle.coinsAwarded > 0 && <div style={{ color: '#d97706', fontWeight: 800, marginTop: 4 }}>💰 +{battle.coinsAwarded} coins</div>}
                    </div>
                    <div ref={logRef} style={{ ...s.logBox, maxHeight: 180 }}>
                        {log.map((l, i) => <div key={i} style={s.logLine}>{l}</div>)}
                    </div>
                    <button style={s.closeBtn} onClick={() => onClose(true)}>Continue</button>
                </div>
            </div>
        );
    }

    // ── Active battle ────────────────────────────────────────────────────────
    const myMoves = me?.moves || [];
    const defAnim = anim?.side === 'def' ? (anim.kind === 'lunge' ? 'gbLungeDown' : 'gbHit') : '';
    const meAnim  = anim?.side === 'me'  ? (anim.kind === 'lunge' ? 'gbLungeUp'  : 'gbHit') : '';
    const remaining = battle.defendersRemaining != null ? battle.defendersRemaining : (battle.defenders || []).filter(d => !d.fainted).length;

    return (
        <div style={s.overlay}>
            <style>{KEYFRAMES}</style>

            <div style={{ textAlign: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
                🏛️ {battle.gymName} · Team {battle.defenderTeam} · {remaining}/{battle.defendersTotal} defenders left
            </div>

            {/* Defender row */}
            <div style={s.rowTop}>
                <div style={{ flex: 1, minWidth: 0 }}><HpBar c={def} /></div>
                <img src={spriteUrl(def?.spriteKey)} alt={def?.name}
                    style={{ ...s.wildSprite, animation: defAnim ? `${defAnim} .5s ease` : 'none' }}
                    onError={e => { e.target.style.display = 'none'; }} />
            </div>

            <div ref={logRef} style={s.logBox}>{log.map((l, i) => <div key={i} style={s.logLine}>{l}</div>)}</div>

            {/* Player row + party dots */}
            <div style={s.rowBottom}>
                <img src={spriteUrl(me?.spriteKey)} alt={me?.name}
                    style={{ ...s.mySprite, animation: meAnim ? `${meAnim} .5s ease` : 'none' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <HpBar c={me} />
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                        {(battle.party || []).map((p, i) => (
                            <span key={i} title={p.name} style={{ width: 10, height: 10, borderRadius: '50%',
                                background: p.curHp <= 0 ? '#64748b' : i === battle.activePlayerIdx ? '#22c55e' : '#a3e635' }} />
                        ))}
                    </div>
                </div>
            </div>

            {menu === 'main' ? (
                <div style={s.actionGrid}>
                    <button style={{ ...s.actionBtn, background: '#ef4444', opacity: busy ? .5 : 1 }} disabled={busy} onClick={() => setMenu('moves')}>⚔️ Fight</button>
                    <button style={{ ...s.actionBtn, background: '#3b82f6', opacity: busy ? .5 : 1 }} disabled={busy} onClick={() => setPhase('switch')}>🔄 Switch</button>
                    <button style={{ ...s.actionBtn, background: '#6b7280', opacity: busy ? .5 : 1, gridColumn: '1 / -1' }} disabled={busy} onClick={run}>🏃 Retreat</button>
                </div>
            ) : (
                <div style={s.moveGrid}>
                    {myMoves.map(m => (
                        <button key={m.slot || m.id} style={{ ...s.moveBtn, opacity: busy ? .5 : 1 }} disabled={busy} onClick={() => playMove(m.id)}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{m.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                                <TypeChip type={m.type} />
                                <span style={{ fontSize: 10, color: '#64748b' }}>{m.power > 0 ? `PWR ${m.power}` : 'Status'}</span>
                            </div>
                        </button>
                    ))}
                    <button style={{ ...s.moveBtn, gridColumn: '1 / -1', background: '#f1f5f9', textAlign: 'center' }} disabled={busy} onClick={() => setMenu('main')}>← Back</button>
                </div>
            )}

            {/* Switch overlay */}
            {phase === 'switch' && (
                <div style={s.switchOverlay} onClick={() => setPhase('battle')}>
                    <div style={s.panel} onClick={e => e.stopPropagation()}>
                        <div style={{ fontWeight: 800, marginBottom: 8 }}>Switch to…</div>
                        <div style={s.partyList}>
                            {(battle.party || []).map((p, i) => {
                                const fainted = p.curHp <= 0;
                                const active = i === battle.activePlayerIdx;
                                return (
                                    <button key={i} disabled={fainted || active}
                                        onClick={() => switchTo(p.refId)}
                                        style={{ ...s.partyRow, opacity: fainted || active ? 0.5 : 1, cursor: fainted || active ? 'not-allowed' : 'pointer' }}>
                                        <img src={spriteUrl(p.spriteKey)} alt={p.name} style={{ width: 38, height: 38, objectFit: 'contain', filter: fainted ? 'grayscale(1)' : 'none' }}
                                            onError={e => { e.target.style.display = 'none'; }} />
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name} {active && '(out)'} {fainted && <span style={{ color: '#ef4444', fontSize: 10 }}>FNT</span>}</div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>Lv.{p.level} · {Math.max(0, p.curHp)}/{p.maxHp} HP</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <button style={{ ...s.closeBtn, marginTop: 10, background: '#475569' }} onClick={() => setPhase('battle')}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const KEYFRAMES = `
@keyframes gbLungeDown { 0%{transform:translateY(0)} 40%{transform:translateY(20px)} 100%{transform:translateY(0)} }
@keyframes gbLungeUp   { 0%{transform:scaleX(-1) translateY(0)} 40%{transform:scaleX(-1) translateY(-20px)} 100%{transform:scaleX(-1) translateY(0)} }
@keyframes gbHit       { 0%,100%{opacity:1} 20%{opacity:.25} 40%{opacity:1} 60%{opacity:.25} 80%{opacity:1} }
`;

const s = {
    overlay:    { position: 'fixed', inset: 0, zIndex: 3000, background: 'linear-gradient(160deg,#1e1b4b,#0f172a)', display: 'flex', flexDirection: 'column', gap: 8, padding: 14, boxSizing: 'border-box', overflowY: 'auto' },
    switchOverlay: { position: 'fixed', inset: 0, zIndex: 3100, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 },
    panel:      { background: 'white', borderRadius: 16, padding: 18, maxWidth: 460, width: '100%', margin: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,.5)' },
    partyList:  { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '52vh', overflowY: 'auto' },
    partyRow:   { display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, background: 'white' },
    dim:        { color: '#94a3b8', textAlign: 'center', padding: 20, fontSize: 14 },
    closeBtn:   { width: '100%', padding: 12, borderRadius: 10, border: 'none', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' },

    rowTop:     { display: 'flex', alignItems: 'center', gap: 8, maxWidth: 520, width: '100%', margin: '0 auto', minHeight: 100 },
    rowBottom:  { display: 'flex', alignItems: 'center', gap: 8, maxWidth: 520, width: '100%', margin: '0 auto', minHeight: 108 },
    hpCard:     { background: 'white', borderRadius: 12, padding: '8px 12px', width: '100%', maxWidth: 260, boxShadow: '0 2px 8px rgba(0,0,0,.3)', boxSizing: 'border-box' },
    hpTrack:    { height: 9, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
    hpFill:     { height: '100%', borderRadius: 6, transition: 'width .5s ease, background .5s' },
    statusBadge:{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: 'white', background: '#7c3aed', borderRadius: 4, padding: '1px 5px' },
    wildSprite: { width: 94, height: 94, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.5))' },
    mySprite:   { width: 102, height: 102, objectFit: 'contain', flexShrink: 0, transform: 'scaleX(-1)', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.5))' },

    logBox:     { background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: '8px 12px', flex: 1, minHeight: 60, maxHeight: 130, overflowY: 'auto', fontSize: 13, color: '#1e293b', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' },
    logLine:    { padding: '1px 0', lineHeight: 1.35 },

    actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520, width: '100%', margin: '0 auto' },
    actionBtn:  { padding: '15px 0', borderRadius: 12, border: 'none', color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
    moveGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520, width: '100%', margin: '0 auto' },
    moveBtn:    { padding: '10px 12px', borderRadius: 12, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', textAlign: 'left' },
    typeChip:   { display: 'inline-block', color: 'white', padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 800, marginLeft: 4 },
};

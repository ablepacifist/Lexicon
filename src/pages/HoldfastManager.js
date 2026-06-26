import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { getApiUrls } from '../utils/apiUrls';
import './HoldfastManager.css';

const { alchemyApiUrl: API_URL } = getApiUrls();

function HoldfastManager() {
  const [holdfasts, setHoldfasts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('status');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventLog, setEventLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createGroup, setCreateGroup] = useState('');
  const [createName, setCreateName] = useState('');

  // Advance time
  const [advanceDays, setAdvanceDays] = useState(7);

  // Treasury
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawForm, setWithdrawForm] = useState({ gold: '', beer: '', wine: '', grain: '', tools: '' });

  // Farming
  const [replanting, setReplanting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/holdfast/all`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load holdfasts');
      const data = await res.json();
      setHoldfasts(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchStatus = useCallback(async (groupName) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/holdfast/${encodeURIComponent(groupName)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load holdfast status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchEventLog = useCallback(async (groupName) => {
    setLogLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/holdfast/${encodeURIComponent(groupName)}/events`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load event log');
      const data = await res.json();
      setEventLog(data);
    } catch (err) {
      setEventLog([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  const selectHoldfast = (h) => {
    setSelected(h);
    setEvents([]);
    setEventLog([]);
    setActiveTab('status');
    fetchStatus(h.groupName);
  };

  const handleCreate = async () => {
    if (!createGroup.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/holdfast/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupName: createGroup.trim(), holdfastName: createName.trim() || 'Lockwood' }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      const newH = await res.json();
      setShowCreate(false);
      setCreateGroup('');
      setCreateName('');
      await fetchAll();
      selectHoldfast(newH);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceTime = async () => {
    if (!selected || advanceDays <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/holdfast/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupName: selected.groupName, days: Number(advanceDays) }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      const data = await res.json();
      setEvents(data.events || []);
      await fetchStatus(selected.groupName);
      await fetchAll();
      await fetchEventLog(selected.groupName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuild = async (buildingType) => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/holdfast/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupName: selected.groupName, buildingType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Build failed');
      }
      await fetchStatus(selected.groupName);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!selected || !depositAmount) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/holdfast/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupName: selected.groupName, gold: Number(depositAmount) }),
      });
      if (!res.ok) throw new Error('Deposit failed');
      setDepositAmount('');
      await fetchStatus(selected.groupName);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        groupName: selected.groupName,
        gold: Number(withdrawForm.gold) || 0,
        beer: Number(withdrawForm.beer) || 0,
        wine: Number(withdrawForm.wine) || 0,
        grain: Number(withdrawForm.grain) || 0,
        tools: Number(withdrawForm.tools) || 0,
      };
      const res = await fetch(`${API_URL}/api/holdfast/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      setWithdrawForm({ gold: '', beer: '', wine: '', grain: '', tools: '' });
      await fetchStatus(selected.groupName);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm(`Delete holdfast "${selected.holdfastName}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/holdfast/${encodeURIComponent(selected.groupName)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setSelected(null);
      setStatus(null);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReplant = async (fieldType) => {
    if (!selected) return;
    setReplanting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/holdfast/replant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupName: selected.groupName, fieldType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Replant failed');
      await fetchStatus(selected.groupName);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setReplanting(false);
    }
  };

  const handleToggleFoodMarket = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/holdfast/toggle-food-market`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupName: selected.groupName }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      await fetchStatus(selected.groupName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const h = status?.holdfast;
  const buildings = status?.buildingMenu || [];
  const availableBuildings = buildings.filter(b => b.status === 'available');
  const lockedBuildings = buildings.filter(b => b.status === 'locked');
  const maxedBuildings = buildings.filter(b => b.status === 'maxed');

  return (
    <div className="holdfast-page">
      <Navbar />
      <div className="holdfast-layout">
        {/* Left Sidebar */}
        <aside className="holdfast-sidebar">
          <div className="sidebar-header">
            <h2>Holdfasts</h2>
            <button className="btn-create" onClick={() => setShowCreate(!showCreate)}>+ New</button>
          </div>

          {showCreate && (
            <div className="create-form">
              <input
                placeholder="Group name (unique)"
                value={createGroup}
                onChange={e => setCreateGroup(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <input
                placeholder="Holdfast name (e.g. Lockwood)"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <div className="create-actions">
                <button className="btn-primary" onClick={handleCreate} disabled={loading}>Create</button>
                <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="holdfast-list">
            {holdfasts.length === 0 && <p className="empty-hint">No holdfasts yet. Create one!</p>}
            {holdfasts.map(hf => (
              <div
                key={hf.groupName}
                className={`holdfast-item ${selected?.groupName === hf.groupName ? 'active' : ''}`}
                onClick={() => selectHoldfast(hf)}
              >
                <div className="hf-name">{hf.holdfastName}</div>
                <div className="hf-group">{hf.groupName}</div>
                <div className="hf-meta">
                  <span>Day {hf.daysElapsed}</span>
                  <span>{hf.gold?.toFixed(0)}g</span>
                  <span>{hf.population} pop</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Panel */}
        <main className="holdfast-main">
          {!selected && (
            <div className="holdfast-empty">
              <div className="empty-icon">🏰</div>
              <h3>Select or create a holdfast</h3>
              <p>Manage your D&amp;D settlement — buildings, resources, and time.</p>
            </div>
          )}

          {selected && (
            <>
              <div className="holdfast-header">
                <div>
                  <h2>{h?.holdfastName || selected.holdfastName}</h2>
                  <span className="group-badge">{selected.groupName}</span>
                </div>
                <button className="btn-danger-sm" onClick={handleDelete}>Delete</button>
              </div>

              {error && <div className="hf-error">{error} <button onClick={() => setError(null)}>✕</button></div>}

              <div className="hf-tabs">
                {['status', 'time', 'build', 'treasury', 'log', 'help'].map(tab => (
                  <button
                    key={tab}
                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab);
                      setError(null);
                      if (tab === 'log' && selected) fetchEventLog(selected.groupName);
                    }}
                  >
                    {tab === 'status' ? '📊 Status' : tab === 'time' ? '⏰ Time' : tab === 'build' ? '🏗️ Build' : tab === 'treasury' ? '💰 Treasury' : tab === 'log' ? '📜 Log' : '📖 Help'}
                  </button>
                ))}
              </div>

              {loading && <div className="hf-loading">Loading...</div>}

              {/* STATUS TAB */}
              {activeTab === 'status' && h && (
                <div className="tab-content">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">Days Elapsed</div>
                      <div className="stat-value">{h.daysElapsed} <span className="stat-sub">({Math.floor(h.daysElapsed / 7)}w {h.daysElapsed % 7}d)</span></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Castle</div>
                      <div className="stat-value">{h.castleType?.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Population</div>
                      <div className="stat-value">
                        {h.population}
                        {(() => {
                          const hist = status.populationHistory;
                          const rate = status.avgDailyGrowth;
                          if (!hist || hist.length < 2) return <span className="stat-sub"> tracking…</span>;
                          if (rate > 0.05)  return <span className="pop-trend up">↑ +{rate.toFixed(1)}/day</span>;
                          if (rate < -0.05) return <span className="pop-trend down">↓ {rate.toFixed(1)}/day</span>;
                          return <span className="pop-trend stable">→ stable</span>;
                        })()}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Happiness</div>
                      <div className="stat-value">{h.happiness?.toFixed(1)}<span className="stat-sub">/100 (target: {status.targetHappiness})</span></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Protection</div>
                      <div className="stat-value">{status.protection?.toFixed(1)}<span className="stat-sub"> (raid: {status.raidChance?.toFixed(1)}%)</span></div>
                    </div>
                    <div className="stat-card accent">
                      <div className="stat-label">Net Gold/Day</div>
                      <div className="stat-value">{status.netDailyGold > 0 ? '+' : ''}{status.netDailyGold?.toFixed(1)}g</div>
                      <div className="stat-sub">Income: {status.dailyIncome?.toFixed(1)}g | Upkeep: {status.dailyUpkeep?.toFixed(1)}g</div>
                    </div>
                  </div>

                  <div className="section-title">Resources</div>
                  <div className="resources-row">
                    <div className="resource-chip">💰 {h.gold?.toFixed(1)}g</div>
                    <div className={`resource-chip ${h.food === 0 ? 'resource-danger' : h.food < h.population * 2 ? 'resource-warn' : ''}`}>
                      🍞 {h.food} food
                      <span className="resource-rate">(-{Math.ceil(h.population * 0.2)}/day)</span>
                      {status.daysOfFood < 999 && <span className="food-days"> ≈{status.daysOfFood}d</span>}
                      {status.nextSpoilIn >= 0 && status.nextSpoilIn <= 7 && (
                        <span className="spoil-warn"> ⚠️ spoils in {status.nextSpoilIn}d</span>
                      )}
                    </div>
                    <div className="resource-chip">🪵 {h.wood} wood</div>
                    <div className="resource-chip">🪨 {h.stone} stone</div>
                    <div className="resource-chip">⚙️ {h.iron} iron</div>
                    <div className="resource-chip">🍺 {h.beer} beer</div>
                    <div className="resource-chip">🍷 {h.wine} wine</div>
                    <div className="resource-chip">🔧 {h.tools} tools</div>
                  </div>

                  {Object.entries(h.buildings || {}).some(([, v]) => v > 0) && (
                    <>
                      <div className="section-title">Buildings</div>
                      <div className="buildings-list">
                        {Object.entries(h.buildings).filter(([, v]) => v > 0).map(([type, count]) => (
                          <div key={type} className="building-tag">
                            {type.replace(/_/g, ' ')} ×{count}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {(() => {
                    const allCrops = [
                      { label: 'Wheat Fields (+20 food)',      days: h.wheatFieldPlantDays,     harvest: 14 },
                      { label: 'Rye Fields (+40 food)',        days: h.ryeFieldPlantDays,        harvest: 28 },
                      { label: 'Vegetable Gardens (+10 food)', days: h.vegetableGardenPlantDays, harvest: 10 },
                      { label: 'Berry Patches (+8 food)',      days: h.berryPatchPlantDays,      harvest: 7  },
                      { label: 'Mushroom Caves (+25 food)',    days: h.mushroomCavePlantDays,    harvest: 21 },
                      { label: 'Orchards (+8 food +40g)',      days: h.orchardPlantDays,         harvest: 30 },
                      { label: 'Vineyards (wine)',             days: h.vineyardPlantDays,        harvest: 90 },
                    ];
                    const growing = allCrops.filter(c => c.days?.length > 0);
                    const SEED_COSTS = { wheat_field: 10, rye_field: 12, vegetable_garden: 8 };
                    const fallowCrops = [
                      { type: 'wheat_field',      label: 'Wheat Fields',      seedCost: 10, built: h.buildings?.wheat_field || 0,      planted: h.wheatFieldPlantDays?.length || 0 },
                      { type: 'rye_field',        label: 'Rye Fields',        seedCost: 12, built: h.buildings?.rye_field || 0,        planted: h.ryeFieldPlantDays?.length || 0 },
                      { type: 'vegetable_garden', label: 'Vegetable Gardens', seedCost: 8,  built: h.buildings?.vegetable_garden || 0, planted: h.vegetableGardenPlantDays?.length || 0 },
                    ].filter(c => c.built - c.planted > 0);
                    return (
                      <>
                        {growing.length > 0 && (
                          <>
                            <div className="section-title">Growing Crops</div>
                            <div className="crops-grid">
                              {growing.map(({ label, days, harvest }) => (
                                <div key={label} className="crop-section">
                                  <div className="crop-label">{label}</div>
                                  {days.map((plantDay, i) => {
                                    const grown = h.daysElapsed - plantDay;
                                    const pct = Math.min(100, Math.round((grown / harvest) * 100));
                                    return (
                                      <div key={i} className="crop-bar">
                                        <div className="crop-bar-fill" style={{ width: pct + '%' }} />
                                        <span className="crop-bar-text">Field {i + 1}: {grown}/{harvest}d ({pct}%)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        {fallowCrops.length > 0 && (
                          <>
                            <div className="section-title">Fallow Fields — Need Replanting</div>
                            <div className="fallow-section">
                              {fallowCrops.map(c => (
                                <div key={c.type} className="fallow-item">
                                  <span>{c.label}: <strong>{c.built - c.planted}</strong> fallow</span>
                                  <button
                                    className="btn-replant"
                                    onClick={() => handleReplant(c.type)}
                                    disabled={replanting || loading}
                                  >
                                    Replant all — {(c.built - c.planted) * c.seedCost}g
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* TIME TAB */}
              {activeTab === 'time' && (
                <div className="tab-content">
                  <div className="section-title">Advance Time</div>
                  <div className="advance-form">
                    <label>Days to advance:</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={advanceDays}
                      onChange={e => setAdvanceDays(e.target.value)}
                    />
                    <button className="btn-primary" onClick={handleAdvanceTime} disabled={loading}>
                      {loading ? 'Processing...' : `Advance ${advanceDays} Day(s)`}
                    </button>
                  </div>

                  {events.length > 0 && (
                    <div className="event-log">
                      <div className="event-log-header">Event Log</div>
                      {events.map((ev, i) => (
                        <div key={i} className={`event-line ${ev.includes('RAID') ? 'event-danger' : ev.includes('grew') || ev.includes('harvested') || ev.includes('produced') ? 'event-success' : ''}`}>
                          {ev}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* BUILD TAB */}
              {activeTab === 'build' && (
                <div className="tab-content">
                  {availableBuildings.length > 0 && (
                    <>
                      <div className="section-title">Available to Build</div>
                      <div className="build-grid">
                        {availableBuildings.map(b => {
                          const rc = b.resourceCost;
                          const canAffordRes = !rc || Object.entries(rc).every(([res, amt]) => (h[res] || 0) >= amt);
                          return (
                          <div key={b.type} className={`build-card ${!canAffordRes ? 'build-card-res-blocked' : ''}`}>
                            <div className="build-card-name">{b.name}</div>
                            <div className="build-card-desc">{b.description}</div>
                            <div className="build-card-stats">
                              {b.dailySilver > 0 && <span className="stat-pos">+{b.dailySilver}s/d</span>}
                              {b.dailyUpkeep > 0 && <span className="stat-neg">-{b.dailyUpkeep}s/d</span>}
                              {b.happiness !== 0 && <span className={b.happiness > 0 ? 'stat-pos' : 'stat-neg'}>{b.happiness > 0 ? '+' : ''}{b.happiness} happiness</span>}
                              {b.harvestFood > 0 && <span className="stat-pos">+{b.harvestFood} food/{b.harvestDays}d</span>}
                              {b.productionItem && <span className="stat-pos">+{b.productionAmount} {b.productionItem}/{b.productionDays}d</span>}
                            </div>
                            {rc && (
                              <div className="build-resource-cost">
                                {Object.entries(rc).map(([res, amt]) => {
                                  const have = h[res] || 0;
                                  return (
                                    <span key={res} className={`res-req ${have >= amt ? 'res-ok' : 'res-missing'}`}>
                                      {res === 'wood' ? '🪵' : res === 'stone' ? '🪨' : res === 'iron' ? '⚙️' : res === 'beer' ? '🍺' : '📦'} {amt} {res} ({have})
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            <div className="build-card-footer">
                              <span className="build-count">{b.current}{b.max != null ? `/${b.max}` : ''}</span>
                              <button
                                className="btn-build"
                                onClick={() => handleBuild(b.type)}
                                disabled={loading}
                              >
                                Build — {b.cost}g
                              </button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {maxedBuildings.length > 0 && (
                    <>
                      <div className="section-title muted">Maxed Out</div>
                      <div className="locked-list">
                        {maxedBuildings.map(b => (
                          <div key={b.type} className="locked-item maxed">{b.name} ({b.current}/{b.max})</div>
                        ))}
                      </div>
                    </>
                  )}

                  {lockedBuildings.length > 0 && (
                    <>
                      <div className="section-title muted">Locked</div>
                      <div className="locked-list">
                        {lockedBuildings.map(b => (
                          <div key={b.type} className="locked-item">
                            <span>{b.name}</span>
                            <span className="lock-reason">{b.lockReason}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TREASURY TAB */}
              {activeTab === 'treasury' && h && (
                <div className="tab-content">
                  <div className="resources-row big">
                    <div className="resource-chip">💰 {h.gold?.toFixed(1)}g</div>
                    <div className={`resource-chip ${h.food === 0 ? 'resource-danger' : ''}`}>🍞 {h.food} food</div>
                    <div className="resource-chip">🪵 {h.wood} wood</div>
                    <div className="resource-chip">🪨 {h.stone} stone</div>
                    <div className="resource-chip">⚙️ {h.iron} iron</div>
                    <div className="resource-chip">🍺 {h.beer} beer</div>
                    <div className="resource-chip">🍷 {h.wine} wine</div>
                    <div className="resource-chip">🔧 {h.tools} tools</div>
                  </div>

                  {h.buildings?.food_market > 0 && (
                    <div className="market-toggle-section">
                      <div className="section-title">Food Market</div>
                      <div className="market-toggle-row">
                        <span>Status: <strong>{status.foodMarketEnabled ? '🟢 Selling' : '⚫ Off'}</strong></span>
                        <button
                          className={`btn-toggle ${status.foodMarketEnabled ? 'active' : ''}`}
                          onClick={handleToggleFoodMarket}
                          disabled={loading}
                        >
                          {status.foodMarketEnabled ? 'Disable' : 'Enable'}
                        </button>
                        <span className="market-rate">
                          Sells up to {h.buildings.food_market * 5} food/day → {(h.buildings.food_market * 5 * 0.8).toFixed(1)}g/day
                        </span>
                      </div>
                      <p className="market-note">Keeps a 14-day food reserve. Shelf life: {status.foodShelfLife}d.</p>
                    </div>
                  )}

                  <div className="treasury-sections">
                    <div className="treasury-section">
                      <div className="section-title">Deposit Gold</div>
                      <div className="treasury-form">
                        <input
                          type="number"
                          min={0}
                          placeholder="Amount"
                          value={depositAmount}
                          onChange={e => setDepositAmount(e.target.value)}
                        />
                        <button className="btn-primary" onClick={handleDeposit} disabled={loading || !depositAmount}>
                          Deposit
                        </button>
                      </div>
                    </div>

                    <div className="treasury-section">
                      <div className="section-title">Withdraw Resources</div>
                      <div className="withdraw-grid">
                        {['gold', 'beer', 'wine', 'grain', 'tools'].map(res => (
                          <label key={res}>
                            {res.charAt(0).toUpperCase() + res.slice(1)}
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={withdrawForm[res]}
                              onChange={e => setWithdrawForm(prev => ({ ...prev, [res]: e.target.value }))}
                            />
                          </label>
                        ))}
                      </div>
                      <button className="btn-primary" onClick={handleWithdraw} disabled={loading}>Withdraw</button>
                    </div>
                  </div>
                </div>
              )}
              {/* EVENT LOG TAB */}
              {activeTab === 'log' && (
                <div className="tab-content">
                  <div className="event-log-toolbar">
                    <span className="section-title">Event History ({eventLog.length} entries)</span>
                    <button className="btn-ghost btn-sm" onClick={() => fetchEventLog(selected.groupName)} disabled={logLoading}>
                      {logLoading ? '...' : '↻ Refresh'}
                    </button>
                  </div>
                  {logLoading && <div className="hf-loading">Loading events...</div>}
                  {!logLoading && eventLog.length === 0 && (
                    <p className="empty-hint">No events yet. Advance time to generate events.</p>
                  )}
                  {!logLoading && eventLog.length > 0 && (
                    <div className="event-log persistent">
                      {[...eventLog].reverse().map(ev => (
                        <div
                          key={ev.id}
                          className={`event-line ${
                            ev.message.includes('RAID') || ev.message.includes('FAMINE') ? 'event-danger' :
                            ev.message.includes('grew') || ev.message.includes('harvested') || ev.message.includes('produced') ? 'event-success' :
                            ev.message.includes('No food') || ev.message.includes('low!') ? 'event-warn' : ''
                          }`}
                        >
                          <span className="event-day">d{ev.day}</span>
                          <span>{ev.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'help' && (
                <div className="tab-content">
                  <div className="help-doc">
                    <h2>Holdfast Management — Game Guide</h2>
                    <p className="help-intro">
                      Your holdfast is a growing settlement in the D&D campaign world. Each group manages one holdfast — build structures, collect taxes, defend against raiders, and grow your population over time.
                    </p>

                    <h3>Economy</h3>
                    <ul>
                      <li><strong>Base income:</strong> 40g/day + 1g per 10 population</li>
                      <li><strong>Building income:</strong> each building produces daily silver (converted to gold)</li>
                      <li><strong>Market:</strong> adds +10% to all gold production</li>
                      <li><strong>Canal (major):</strong> adds +15% to all gold production</li>
                      <li><strong>Upkeep:</strong> buildings cost maintenance each day; net income = income − upkeep</li>
                      <li><strong>Festival Grounds:</strong> bonus +80g every 30 days</li>
                    </ul>

                    <h3>Buildings</h3>
                    <p>Build structures with gold from the Build tab. Costs increase with each additional copy. Some buildings have population requirements.</p>
                    <table className="help-table">
                      <thead><tr><th>Building</th><th>Min Pop</th><th>Base Cost</th><th>Effect</th></tr></thead>
                      <tbody>
                        <tr><td>Tavern</td><td>0</td><td>60g</td><td>+3 silver/day, produces 3 beer every 7 days</td></tr>
                        <tr><td>Blacksmith</td><td>0</td><td>100g</td><td>+2 silver/day, produces 2 tools every 14 days</td></tr>
                        <tr><td>Carpenter</td><td>40</td><td>120g</td><td>Reduces all build costs by 10%</td></tr>
                        <tr><td>Warehouse</td><td>0</td><td>80g</td><td>+storage capacity</td></tr>
                        <tr><td>Palisade</td><td>0</td><td>50g</td><td>+5 protection</td></tr>
                        <tr><td>Watch Tower / Guard Tower</td><td>0</td><td>70g</td><td>+8 protection</td></tr>
                        <tr><td>Barracks</td><td>60</td><td>150g</td><td>+15 protection</td></tr>
                        <tr><td>Stone Walls</td><td>80</td><td>500g</td><td>+25 protection</td></tr>
                        <tr><td>Castle Keep</td><td>80</td><td>800g</td><td>+30 protection, upgrades castle</td></tr>
                        <tr><td>Chapel</td><td>40</td><td>250g</td><td>+5 happiness</td></tr>
                        <tr><td>Bathhouse</td><td>80</td><td>350g</td><td>+8 happiness</td></tr>
                        <tr><td>Inn</td><td>60</td><td>180g</td><td>+4 silver/day, +3 happiness</td></tr>
                        <tr><td>Library</td><td>100</td><td>500g</td><td>+5 silver/day, +5 happiness</td></tr>
                        <tr><td>Alchemy Garden</td><td>80</td><td>300g</td><td>+6 silver/day, +10 happiness</td></tr>
                        <tr><td>Market</td><td>60</td><td>200g</td><td>+5 silver/day, +10% gold production</td></tr>
                        <tr><td>Festival Grounds</td><td>60</td><td>400g</td><td>+80g every 30 days</td></tr>
                        <tr><td>Wheat Field</td><td>0</td><td>30g</td><td>Harvest grain every 14 days → +50g</td></tr>
                        <tr><td>Vegetable Garden</td><td>0</td><td>40g</td><td>Harvest every 10 days → +30g</td></tr>
                        <tr><td>Orchard</td><td>40</td><td>80g</td><td>Harvest every 30 days → +80g, +2 silver/day</td></tr>
                        <tr><td>Vineyard</td><td>60</td><td>120g</td><td>Produces 2 wine every 7 days, +4 silver/day</td></tr>
                        <tr><td>Granary</td><td>0</td><td>60g</td><td>Increases grain storage</td></tr>
                        <tr><td>Herbalist</td><td>40</td><td>100g</td><td>+3 silver/day, +5 happiness</td></tr>
                        <tr><td>Stable</td><td>40</td><td>150g</td><td>+2 silver/day, +5 protection</td></tr>
                        <tr><td>Town Hall</td><td>80</td><td>1000g</td><td>+8 silver/day, boosts population growth</td></tr>
                        <tr><td>Trading Post</td><td>80</td><td>400g</td><td>+7 silver/day, +5% gold bonus</td></tr>
                        <tr><td>Canal (Major)</td><td>100</td><td>600g</td><td>+15% gold production</td></tr>
                        <tr><td>Palace</td><td>120</td><td>2000g</td><td>+15 silver/day, +20 happiness</td></tr>
                      </tbody>
                    </table>

                    <h3>Happiness & Population Growth</h3>
                    <ul>
                      <li>Happiness moves 0.5 points/day toward your <em>target happiness</em></li>
                      <li>Target happiness = 75 + building bonuses − crowding penalty (exponential: each person above 40 compounds at 4%/person)</li>
                      <li><strong>Population grows</strong> when happiness ≥ 65, checked every 7 days</li>
                      <li>Growth chance = (happiness − 65) / 100 + 10% base chance</li>
                      <li>Each growth event adds 1–3 people</li>
                    </ul>

                    <h3>Raids & Defense</h3>
                    <ul>
                      <li><strong>Protection score</strong> = 50 + towers + walls + barracks + castle bonuses − population penalty − wealth penalty</li>
                      <li><strong>Raid chance</strong> = max(0.5%, 8% − protection × 0.075)</li>
                      <li>When raided: bandits steal 30–40% of gold, destroy 1–3 random buildings, cause 5–15% population casualties</li>
                      <li>Build towers, walls, and barracks to reduce raid chance</li>
                    </ul>

                    <h3>Resources & Materials</h3>
                    <ul>
                      <li><strong>Food 🍞</strong> — produced by Wheat Fields (+20/14d), Vegetable Gardens (+10/10d), Orchards (+8/30d). Population consumes <em>0.2 food/person/day</em>. No food → pay <strong>2g per citizen per day</strong> in emergency rations. If no gold either → -3 happiness/day (famine).</li>
                      <li><strong>Wood 🪵</strong> — produced by Logging Camps (3/7d). Required by guard towers, stables, markets, and many other buildings.</li>
                      <li><strong>Stone 🪨</strong> — produced by Mines (2/7d). Required by walls, chapels, keeps, and major infrastructure.</li>
                      <li><strong>Iron ⚙️</strong> — produced by Mines (1/7d). Required by fortifications, hospitals, mints, aqueducts.</li>
                      <li><strong>Beer 🍺</strong> — Taverns produce 3 every 7 days</li>
                      <li><strong>Wine 🍷</strong> — Vineyards produce 2 every 7 days</li>
                      <li><strong>Tools 🔧</strong> — Blacksmiths produce 2 every 14 days</li>
                      <li>Wood/Stone/Iron are <strong>spent when building</strong>. Build Mines and Logging Camps first to gather them.</li>
                      <li>Food, Beer, Wine, Tools can be <strong>withdrawn</strong> from the Treasury tab to hand to players.</li>
                    </ul>

                    <h3>Advancing Time</h3>
                    <ul>
                      <li>Use the Time tab to advance days (1–365 at a time)</li>
                      <li>Each day: gold is produced, upkeep is deducted, happiness adjusts</li>
                      <li>Raid checks happen each day; population growth checks every 7 days</li>
                      <li>Event log shows raids, harvests, production, and growth as they happen</li>
                    </ul>

                    <h3>Treasury</h3>
                    <ul>
                      <li><strong>Deposit:</strong> add gold from campaign rewards or taxes</li>
                      <li><strong>Withdraw:</strong> pull gold/resources to hand out to players in-session</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default HoldfastManager;

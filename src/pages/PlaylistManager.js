import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { getApiUrls } from '../utils/apiUrls';
import '../styles/PlaylistManager.css';
import './PageStyles.css';
import Dialog from '../components/Dialog';
import ModalFrame from '../components/ModalFrame';
import { Toast, useToast } from '../components/Toast';
import devLog from '../utils/devLog';
import { NETWORK_ERROR, responseError } from '../utils/responseError';

const TYPES = [
    { value: 'ALL', label: 'All' },
    { value: 'MUSIC', label: 'Music' },
    { value: 'VIDEO', label: 'Video' },
    { value: 'AUDIOBOOK', label: 'Audiobooks' },
];
const TYPE_LABEL = { MUSIC: 'Music', VIDEO: 'Video', AUDIOBOOK: 'Audiobook' };
const EMPTY_FORM = { name: '', description: '', isPublic: false, mediaType: 'MUSIC' };

/**
 * A readable name for a media file. Many have no title (torrent and YouTube imports, old
 * uploads), and the page used to show nothing for them; the stored file name starts with an
 * upload stamp ("20261127_160046_5744b36b_") that means nothing to anyone.
 */
export function mediaTitle(media) {
    if (!media) return 'Untitled';
    const title = (media.title || '').trim();
    if (title) return title;
    const file = (media.originalFilename || media.filename || '').trim();
    if (file) {
        return file
            .replace(/^\d{8}_\d{6}_[0-9a-f]{8}_/i, '')
            .replace(/\.[a-z0-9]{2,5}$/i, '')
            .replace(/[._]+/g, ' ')
            .trim() || file;
    }
    return `Untitled #${media.id}`;
}

/** The server may send a date as text or as [year, month, day, ...]. */
export function formatDate(value) {
    if (!value) return '';
    const date = Array.isArray(value)
        ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1)
        : new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

function matchesPlaylistType(playlistType, media) {
    const type = media.mediaType || media.type || '';
    if (playlistType === 'MUSIC') return type === 'MUSIC' || type === 'AUDIO';
    return type === playlistType;
}

function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function PlaylistManager() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const { lexiconApiUrl } = getApiUrls();
    const { toast, show: showToast, dismiss: dismissToast } = useToast();

    const [mine, setMine] = useState([]);
    const [shared, setShared] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [tab, setTab] = useState('mine');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    const [selected, setSelected] = useState(null);
    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [busyItem, setBusyItem] = useState(null);

    const [form, setForm] = useState(null); // { mode: 'create' | 'edit', values }
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [adding, setAdding] = useState(false);

    const api = useCallback(async (path, options = {}) => {
        const resp = await fetch(`${lexiconApiUrl}${path}`, { credentials: 'include', ...options });
        if (resp.status === 401) {
            navigate('/login');
            throw new Error('signed out');
        }
        return resp;
    }, [lexiconApiUrl, navigate]);

    const loadPlaylists = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [own, pub] = await Promise.all([
                api(`/api/playlists/user/${user.id}`),
                api('/api/playlists/public'),
            ]);
            setMine(own.ok ? await own.json() : []);
            setShared(pub.ok ? await pub.json() : []);
            if (!own.ok) setLoadError("Couldn't load your playlists.");
        } catch (err) {
            if (err.message !== 'signed out') {
                devLog('Failed to load playlists:', err);
                setLoadError("Couldn't load your playlists.");
            }
        } finally {
            setLoading(false);
        }
    }, [api, user]);

    const loadItems = useCallback(async (playlistId) => {
        setItemsLoading(true);
        try {
            const resp = await api(`/api/playlists/${playlistId}`);
            if (resp.ok) {
                const full = await resp.json();
                setItems(full.items || []);
                setSelected((current) => (current && current.id === playlistId ? { ...current, ...full } : current));
            } else {
                showToast(await responseError(resp, "Couldn't open that playlist."), 'error');
            }
        } catch (err) {
            if (err.message !== 'signed out') showToast(NETWORK_ERROR, 'error');
        } finally {
            setItemsLoading(false);
        }
    }, [api, showToast]);

    useEffect(() => {
        if (user === undefined) return;
        if (user === null) {
            navigate('/login');
            return;
        }
        loadPlaylists();
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const isOwner = selected && user && selected.createdBy === user.id;

    const visible = useMemo(() => {
        const source = tab === 'mine' ? mine : shared.filter((p) => !user || p.createdBy !== user.id);
        const q = search.trim().toLowerCase();
        return source.filter((p) => (typeFilter === 'ALL' || p.mediaType === typeFilter)
            && (!q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)));
    }, [tab, mine, shared, user, search, typeFilter]);

    const openPlaylist = (playlist) => {
        setSelected(playlist);
        setItems([]);
        loadItems(playlist.id);
    };

    // ── create / edit ───────────────────────────────────────────────────────────────
    const savePlaylist = async (e) => {
        e.preventDefault();
        const { mode, values } = form;
        if (!values.name.trim()) return;
        setSaving(true);
        try {
            const resp = mode === 'create'
                ? await api(`/api/playlists?userId=${user.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, name: values.name.trim() }),
                })
                : await api(`/api/playlists/${selected.id}?userId=${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, name: values.name.trim() }),
                });
            if (!resp.ok) {
                showToast(await responseError(resp, mode === 'create' ? "Couldn't create the playlist." : "Couldn't save the playlist."), 'error');
                return;
            }
            const saved = await resp.json().catch(() => null);
            setForm(null);
            await loadPlaylists();
            if (mode === 'create' && saved?.id) {
                setTab('mine');
                openPlaylist(saved);
                showToast(`Created "${saved.name}".`);
            } else if (mode === 'edit') {
                setSelected((current) => ({ ...current, ...values, name: values.name.trim() }));
                showToast('Playlist saved.');
            }
        } catch (err) {
            if (err.message !== 'signed out') showToast(NETWORK_ERROR, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── delete ──────────────────────────────────────────────────────────────────────
    const deletePlaylist = async (deleteMediaFiles) => {
        const target = deleteTarget;
        setDeleteTarget(null);
        try {
            const params = new URLSearchParams({ userId: user.id, deleteMediaFiles });
            const resp = await api(`/api/playlists/${target.id}?${params}`, { method: 'DELETE' });
            if (!resp.ok) {
                showToast(await responseError(resp, "Couldn't delete the playlist."), 'error');
                return;
            }
            if (selected?.id === target.id) {
                setSelected(null);
                setItems([]);
            }
            showToast(deleteMediaFiles ? 'Playlist and its media deleted.' : 'Playlist deleted.');
            loadPlaylists();
        } catch (err) {
            if (err.message !== 'signed out') showToast(NETWORK_ERROR, 'error');
        }
    };

    // ── items ───────────────────────────────────────────────────────────────────────
    const removeItem = async (mediaFileId) => {
        setBusyItem(mediaFileId);
        try {
            const resp = await api(`/api/playlists/${selected.id}/items/${mediaFileId}?userId=${user.id}`, { method: 'DELETE' });
            if (resp.ok) {
                setItems((list) => list.filter((it) => it.mediaFile.id !== mediaFileId));
                loadPlaylists();
            } else {
                showToast(await responseError(resp, "Couldn't remove that."), 'error');
            }
        } catch (err) {
            if (err.message !== 'signed out') showToast(NETWORK_ERROR, 'error');
        } finally {
            setBusyItem(null);
        }
    };

    const moveItem = async (index, step) => {
        const target = index + step;
        if (target < 0 || target >= items.length) return;
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        const before = items;
        setItems(next); // move at once; put it back if the server says no
        try {
            const resp = await api(`/api/playlists/${selected.id}/reorder?userId=${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mediaFileIds: next.map((it) => it.mediaFile.id) }),
            });
            if (!resp.ok) {
                setItems(before);
                showToast(await responseError(resp, "Couldn't reorder the playlist."), 'error');
            }
        } catch (err) {
            setItems(before);
            if (err.message !== 'signed out') showToast(NETWORK_ERROR, 'error');
        }
    };

    /** Adds the files in order. Returns how many were added; the add window stays open. */
    const addToPlaylist = async (mediaFiles) => {
        let added = 0;
        for (const media of mediaFiles) {
            try {
                const resp = await api(`/api/playlists/${selected.id}/items?userId=${user.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mediaFileId: media.id }),
                });
                if (!resp.ok) {
                    showToast(await responseError(resp, `Couldn't add "${mediaTitle(media)}".`), 'error');
                    break;
                }
                added++;
                setItems((list) => [...list, { mediaFile: media, mediaFileId: media.id }]);
            } catch (err) {
                if (err.message !== 'signed out') showToast(NETWORK_ERROR, 'error');
                break;
            }
        }
        if (added > 0) {
            showToast(added === 1 ? `Added "${mediaTitle(mediaFiles[0])}".` : `Added ${added} items.`);
            loadPlaylists();
        }
        return added;
    };

    const closeAddWindow = () => {
        setAdding(false);
        if (selected) loadItems(selected.id); // pick up the server's order and details
    };

    // ── render ──────────────────────────────────────────────────────────────────────
    return (
        <div className="pl-page">
            <header className="pl-header">
                <button type="button" className="lx-btn lx-btn--secondary" onClick={() => navigate('/lexicon-dashboard')}>
                    <span aria-hidden="true">←</span> Lexicon
                </button>
                <h1>Playlists</h1>
                <button type="button" className="lx-btn lx-btn--primary" onClick={() => setForm({ mode: 'create', values: { ...EMPTY_FORM } })}>
                    New playlist
                </button>
            </header>

            <div className={`pl-layout ${selected ? 'pl-layout--detail' : ''}`}>
                <aside className="pl-sidebar" aria-label="Playlists">
                    <div className="pl-tabs" role="tablist" aria-label="Whose playlists">
                        <button type="button" role="tab" aria-selected={tab === 'mine'} className={`pl-tab ${tab === 'mine' ? 'is-active' : ''}`} onClick={() => setTab('mine')}>
                            Mine <span className="pl-count">{mine.length}</span>
                        </button>
                        <button type="button" role="tab" aria-selected={tab === 'public'} className={`pl-tab ${tab === 'public' ? 'is-active' : ''}`} onClick={() => setTab('public')}>
                            Public <span className="pl-count">{shared.filter((p) => !user || p.createdBy !== user.id).length}</span>
                        </button>
                    </div>

                    <label className="pl-sr-only" htmlFor="pl-search">Search playlists</label>
                    <input id="pl-search" className="pl-search" type="search" placeholder="Search playlists" value={search} onChange={(e) => setSearch(e.target.value)} />

                    <div className="pl-chips" role="group" aria-label="Filter by type">
                        {TYPES.map((t) => (
                            <button key={t.value} type="button" aria-pressed={typeFilter === t.value} className={`pl-chip ${typeFilter === t.value ? 'is-active' : ''}`} onClick={() => setTypeFilter(t.value)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {loadError && <div className="lx-alert lx-alert--error">{loadError}</div>}

                    {loading && mine.length === 0 && shared.length === 0 ? (
                        <div className="lx-state" aria-busy="true"><div className="lx-spinner" aria-hidden="true" /></div>
                    ) : visible.length === 0 ? (
                        <p className="pl-empty">
                            {search || typeFilter !== 'ALL' ? 'Nothing matches.'
                                : tab === 'mine' ? 'No playlists yet. Make one with New playlist.' : 'No public playlists from others yet.'}
                        </p>
                    ) : (
                        <ul className="pl-list">
                            {visible.map((p) => (
                                <li key={p.id}>
                                    <button type="button" className={`pl-row ${selected?.id === p.id ? 'is-active' : ''}`} aria-current={selected?.id === p.id ? 'true' : undefined} onClick={() => openPlaylist(p)}>
                                        <span className="pl-row__name" title={p.name}>{p.name}</span>
                                        <span className="pl-row__meta">
                                            {TYPE_LABEL[p.mediaType] || p.mediaType}
                                            {typeof p.itemCount === 'number' && <> · {plural(p.itemCount, 'item')}</>}
                                            {' · '}{p.isPublic ? 'Public' : 'Private'}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <section className="pl-detail" aria-label={selected ? selected.name : 'Playlist'}>
                    {!selected ? (
                        <div className="pl-placeholder">
                            <p>Choose a playlist to see what is in it.</p>
                        </div>
                    ) : (
                        <>
                            <button type="button" className="pl-back lx-btn lx-btn--secondary" onClick={() => setSelected(null)}>
                                <span aria-hidden="true">←</span> All playlists
                            </button>
                            <div className="pl-detail__head">
                                <div className="pl-detail__titles">
                                    <h2 title={selected.name}>{selected.name}</h2>
                                    <p className="pl-detail__meta">
                                        <span className="pl-badge">{TYPE_LABEL[selected.mediaType] || selected.mediaType}</span>
                                        <span>{selected.isPublic ? 'Public' : 'Private'}</span>
                                        <span>{plural(items.length, 'item')}</span>
                                        {formatDate(selected.createdDate) && <span>Created {formatDate(selected.createdDate)}</span>}
                                    </p>
                                    {selected.description && <p className="pl-detail__desc">{selected.description}</p>}
                                </div>
                                {isOwner && (
                                    <div className="pl-detail__actions">
                                        <button type="button" className="lx-btn lx-btn--primary" onClick={() => setAdding(true)}>Add media</button>
                                        <button type="button" className="lx-btn lx-btn--secondary" onClick={() => setForm({ mode: 'edit', values: { name: selected.name, description: selected.description || '', isPublic: !!selected.isPublic, mediaType: selected.mediaType } })}>Edit</button>
                                        <button type="button" className="lx-btn lx-btn--danger" onClick={() => setDeleteTarget(selected)}>Delete</button>
                                    </div>
                                )}
                            </div>

                            {itemsLoading && items.length === 0 ? (
                                <div className="lx-state" aria-busy="true"><div className="lx-spinner" aria-hidden="true" /></div>
                            ) : items.length === 0 ? (
                                <div className="pl-placeholder">
                                    <p>This playlist is empty.</p>
                                    {isOwner && <button type="button" className="lx-btn lx-btn--primary" onClick={() => setAdding(true)}>Add media</button>}
                                </div>
                            ) : (
                                <ol className="pl-items">
                                    {items.map((it, index) => {
                                        const name = mediaTitle(it.mediaFile);
                                        return (
                                            <li key={it.mediaFile.id} className="pl-item">
                                                <span className="pl-item__pos" aria-hidden="true">{index + 1}</span>
                                                <span className="pl-item__text">
                                                    <span className="pl-item__title" title={name}>{name}</span>
                                                    {it.mediaFile.description && <span className="pl-item__sub">{it.mediaFile.description}</span>}
                                                </span>
                                                {isOwner && (
                                                    <span className="pl-item__actions">
                                                        <button type="button" className="pl-icon" aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button>
                                                        <button type="button" className="pl-icon" aria-label={`Move ${name} down`} disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>↓</button>
                                                        <button type="button" className="pl-icon pl-icon--danger" aria-label={`Remove ${name}`} disabled={busyItem === it.mediaFile.id} onClick={() => removeItem(it.mediaFile.id)}>✕</button>
                                                    </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                        </>
                    )}
                </section>
            </div>

            {form && (
                <Dialog
                    title={form.mode === 'create' ? 'New playlist' : 'Edit playlist'}
                    onClose={() => setForm(null)}
                >
                    <form className="pl-form" onSubmit={savePlaylist}>
                        <div className="lx-field">
                            <label htmlFor="pl-name">Name</label>
                            <input id="pl-name" data-autofocus value={form.values.name} required maxLength={120}
                                onChange={(e) => setForm({ ...form, values: { ...form.values, name: e.target.value } })} />
                        </div>
                        <div className="lx-field">
                            <label htmlFor="pl-desc">Description</label>
                            <textarea id="pl-desc" rows={3} value={form.values.description}
                                onChange={(e) => setForm({ ...form, values: { ...form.values, description: e.target.value } })} />
                        </div>
                        <fieldset className="pl-types">
                            <legend>Type</legend>
                            {TYPES.filter((t) => t.value !== 'ALL').map((t) => (
                                <label key={t.value} className={`pl-chip ${form.values.mediaType === t.value ? 'is-active' : ''}`}>
                                    <input type="radio" name="pl-type" value={t.value} checked={form.values.mediaType === t.value}
                                        onChange={() => setForm({ ...form, values: { ...form.values, mediaType: t.value } })} />
                                    {t.label}
                                </label>
                            ))}
                        </fieldset>
                        <label className="pl-check">
                            <input type="checkbox" checked={form.values.isPublic}
                                onChange={(e) => setForm({ ...form, values: { ...form.values, isPublic: e.target.checked } })} />
                            Public: everyone signed in can see and play it
                        </label>
                        <div className="lx-dialog__actions">
                            <button type="button" className="lx-btn lx-btn--secondary" onClick={() => setForm(null)}>Cancel</button>
                            <button type="submit" className="lx-btn lx-btn--primary" disabled={saving || !form.values.name.trim()}>
                                {saving ? 'Saving…' : form.mode === 'create' ? 'Create' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog>
            )}

            {adding && selected && (
                <AddMediaWindow
                    api={api}
                    user={user}
                    playlist={selected}
                    inPlaylist={new Set(items.map((it) => it.mediaFile.id))}
                    onAdd={addToPlaylist}
                    onClose={closeAddWindow}
                />
            )}

            {deleteTarget && (
                <Dialog
                    title={`Delete "${deleteTarget.name}"?`}
                    size="sm"
                    onClose={() => setDeleteTarget(null)}
                    actions={(
                        <>
                            <button type="button" className="lx-btn lx-btn--secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button type="button" className="lx-btn lx-btn--secondary" data-autofocus onClick={() => deletePlaylist(false)}>Keep media files</button>
                            <button type="button" className="lx-btn lx-btn--danger" onClick={() => deletePlaylist(true)}>Delete media files too</button>
                        </>
                    )}
                >
                    <p>The playlist goes either way. Should its media files be deleted as well?</p>
                </Dialog>
            )}

            <Toast toast={toast} onDismiss={dismissToast} />
        </div>
    );
}

/**
 * Pick media to add. Stays open: tick several and add them together, or add one at a time;
 * whatever is added shows as "In playlist" and the window waits for Done. It used to close
 * after every single item.
 */
function AddMediaWindow({ api, user, playlist, inPlaylist, onAdd, onClose }) {
    const [media, setMedia] = useState(null); // null while loading
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [source, setSource] = useState('all');
    const [picked, setPicked] = useState(() => new Set());
    const [working, setWorking] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [own, pub] = await Promise.all([api(`/api/media/user/${user.id}`), api('/api/media/public')]);
                const all = new Map();
                if (own.ok) (await own.json()).forEach((m) => all.set(m.id, { ...m, mine: true }));
                if (pub.ok) (await pub.json()).forEach((m) => { if (!all.has(m.id)) all.set(m.id, m); });
                if (alive) {
                    setMedia([...all.values()]);
                    if (!own.ok && !pub.ok) setError("Couldn't load your media.");
                }
            } catch (err) {
                if (alive && err.message !== 'signed out') {
                    setError(NETWORK_ERROR);
                    setMedia([]);
                }
            }
        })();
        return () => { alive = false; };
    }, [api, user]);

    const candidates = useMemo(() => {
        if (!media) return [];
        const q = query.trim().toLowerCase();
        return media
            .filter((m) => matchesPlaylistType(playlist.mediaType, m))
            .filter((m) => source === 'all' || (source === 'mine' ? m.mine : !m.mine))
            .filter((m) => !q || mediaTitle(m).toLowerCase().includes(q) || m.description?.toLowerCase().includes(q))
            .sort((a, b) => mediaTitle(a).localeCompare(mediaTitle(b), undefined, { numeric: true }));
    }, [media, query, source, playlist.mediaType]);

    const addable = candidates.filter((m) => !inPlaylist.has(m.id));
    const pickedList = addable.filter((m) => picked.has(m.id));

    const toggle = (id) => setPicked((set) => {
        const next = new Set(set);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const add = async (list) => {
        setWorking(true);
        const added = await onAdd(list);
        setWorking(false);
        if (added > 0) {
            setPicked((set) => {
                const next = new Set(set);
                list.slice(0, added).forEach((m) => next.delete(m.id));
                return next;
            });
        }
    };

    const allPicked = addable.length > 0 && addable.every((m) => picked.has(m.id));

    return (
        <ModalFrame onClose={onClose} overlayClassName="lx-dialog-backdrop" className="pl-add" label={`Add media to ${playlist.name}`}>
            <div className="pl-add__head">
                <div>
                    <h2>Add to “{playlist.name}”</h2>
                    <p className="pl-add__hint">{TYPE_LABEL[playlist.mediaType] || ''} you can add. Tick several, or add them one by one.</p>
                </div>
                <button type="button" className="pl-icon" aria-label="Close" onClick={onClose}>✕</button>
            </div>

            <div className="pl-add__tools">
                <label className="pl-sr-only" htmlFor="pl-add-search">Search media</label>
                <input id="pl-add-search" data-autofocus className="pl-search" type="search" placeholder="Search media" value={query} onChange={(e) => setQuery(e.target.value)} />
                <div className="pl-chips" role="group" aria-label="Whose media">
                    {[['all', 'All'], ['mine', 'Mine'], ['public', 'Public']].map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={source === value} className={`pl-chip ${source === value ? 'is-active' : ''}`} onClick={() => setSource(value)}>{label}</button>
                    ))}
                </div>
            </div>

            {error && <div className="lx-alert lx-alert--error">{error}</div>}

            <div className="pl-add__list">
                {media === null ? (
                    <div className="lx-state" aria-busy="true"><div className="lx-spinner" aria-hidden="true" /></div>
                ) : candidates.length === 0 ? (
                    <p className="pl-empty">{query ? 'Nothing matches.' : 'No media of this type yet.'}</p>
                ) : (
                    <>
                        {addable.length > 1 && (
                            <label className="pl-pick pl-pick--all">
                                <input type="checkbox" checked={allPicked} disabled={working}
                                    onChange={() => setPicked(allPicked ? new Set() : new Set(addable.map((m) => m.id)))} />
                                <span>Select all {addable.length} shown</span>
                            </label>
                        )}
                        <ul>
                            {candidates.map((m) => {
                                const name = mediaTitle(m);
                                const already = inPlaylist.has(m.id);
                                return (
                                    <li key={m.id} className={`pl-pick ${already ? 'is-added' : ''}`}>
                                        <label className="pl-pick__label">
                                            <input type="checkbox" checked={already || picked.has(m.id)} disabled={already || working} onChange={() => toggle(m.id)} />
                                            <span className="pl-pick__text">
                                                <span className="pl-pick__title" title={name}>{name}</span>
                                                {m.description && <span className="pl-pick__sub">{m.description}</span>}
                                            </span>
                                        </label>
                                        {already ? (
                                            <span className="pl-pick__state">In playlist</span>
                                        ) : (
                                            <button type="button" className="lx-btn lx-btn--secondary pl-pick__add" disabled={working} onClick={() => add([m])} aria-label={`Add ${name}`}>Add</button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </div>

            <div className="pl-add__foot">
                <span className="pl-add__count" aria-live="polite">{pickedList.length > 0 ? `${pickedList.length} selected` : ''}</span>
                <button type="button" className="lx-btn lx-btn--primary" disabled={working || pickedList.length === 0} onClick={() => add(pickedList)}>
                    {working ? 'Adding…' : pickedList.length > 1 ? `Add ${pickedList.length}` : 'Add selected'}
                </button>
                <button type="button" className="lx-btn lx-btn--secondary" onClick={onClose}>Done</button>
            </div>
        </ModalFrame>
    );
}

export default PlaylistManager;

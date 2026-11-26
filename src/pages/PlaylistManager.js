import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { getApiUrls } from '../utils/apiUrls';
import '../styles/PlaylistManager.css';
import './PageStyles.css';
import Dialog from '../components/Dialog';
import devLog from '../utils/devLog';
import { NETWORK_ERROR, responseError } from '../utils/responseError';
import ModalFrame from '../components/ModalFrame';
import pressable from '../utils/pressable';

function PlaylistManager() {
    const { user } = useContext(UserContext);
    const [playlists, setPlaylists] = useState([]);
    const [publicPlaylists, setPublicPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistItems, setPlaylistItems] = useState([]);
    const [availableMedia, setAvailableMedia] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const { lexiconApiUrl } = getApiUrls();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPublic: false,
        mediaType: 'MUSIC'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [mediaSearchQuery, setMediaSearchQuery] = useState('');
    const [playlistTypeFilter, setPlaylistTypeFilter] = useState('ALL');

    useEffect(() => {
        if (user === undefined) return;
        if (user === null) {
            navigate('/login');
            return;
        }
        fetchPlaylists();
        // Don't fetch available media on mount — defer to add-media modal
    }, [user]);

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const [userResp, publicResp] = await Promise.all([
                fetch(`${lexiconApiUrl}/api/playlists/user/${user.id}`, { credentials: 'include' }),
                fetch(`${lexiconApiUrl}/api/playlists/public`, { credentials: 'include' })
            ]);

            if (userResp.status === 401 || publicResp.status === 401) {
                navigate('/login');
                return;
            }

            const userPlaylists = userResp.ok ? await userResp.json() : [];
            const publicPlaylistsData = publicResp.ok ? await publicResp.json() : [];

            setPlaylists(userPlaylists);
            setPublicPlaylists(publicPlaylistsData);
        } catch (err) {
            devLog('Failed to fetch playlists:', err);
            setError("Couldn't load your playlists.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableMedia = async () => {
        try {
            const [userResp, publicResp] = await Promise.all([
                fetch(`${lexiconApiUrl}/api/media/user/${user.id}`, { credentials: 'include' }),
                fetch(`${lexiconApiUrl}/api/media/public`, { credentials: 'include' })
            ]);

            if (!userResp.ok && !publicResp.ok) {
                setError('Failed to fetch media files');
                return;
            }

            const userMedia = userResp.ok ? await userResp.json() : [];
            const publicMedia = publicResp.ok ? await publicResp.json() : [];

            const combined = [...userMedia, ...publicMedia];
            const map = new Map();
            combined.forEach(item => map.set(item.id, item));
            const allMedia = Array.from(map.values());

            setAvailableMedia(allMedia);
        } catch (err) {
            devLog('Failed to fetch media:', err);
            setError("Couldn't load your media.");
        }
    };

    const fetchPlaylistItems = async (playlistId) => {
        try {
            const resp = await fetch(`${lexiconApiUrl}/api/playlists/${playlistId}`, { 
                credentials: 'include' 
            });

            if (resp.status === 401) {
                navigate('/login');
                return;
            }

            if (resp.ok) {
                const playlist = await resp.json();
                setPlaylistItems(playlist.items || []);
            }
        } catch (err) {
            devLog('Failed to fetch playlist items:', err);
            setError("Couldn't load that playlist.");
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const resp = await fetch(`${lexiconApiUrl}/api/playlists?userId=${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (resp.status === 401) {
                navigate('/login');
                return;
            }

            if (resp.ok) {
                setSuccess('Playlist created successfully!');
                setShowCreateForm(false);
                setFormData({ name: '', description: '', isPublic: false, mediaType: 'MUSIC' });
                fetchPlaylists();
            } else {
                setError(await responseError(resp, "Couldn't create the playlist."));
            }
        } catch (err) {
            devLog('Error creating playlist:', err);
            setError(NETWORK_ERROR);
        }
    };

    const handleUpdatePlaylist = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');


        try {
            const resp = await fetch(`${lexiconApiUrl}/api/playlists/${selectedPlaylist.id}?userId=${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (resp.status === 401) {
                navigate('/login');
                return;
            }

            if (resp.ok) {
                setSuccess('Playlist updated successfully!');
                setShowEditForm(false);
                await fetchPlaylists();
                // Refresh the selected playlist with updated data
                if (selectedPlaylist) {
                    const refreshResp = await fetch(`${lexiconApiUrl}/api/playlists/${selectedPlaylist.id}`, {
                        credentials: 'include'
                    });
                    if (refreshResp.ok) {
                        const refreshedPlaylist = await refreshResp.json();
                        setSelectedPlaylist(refreshedPlaylist);
                    }
                }
            } else {
                setError(await responseError(resp, "Couldn't save the playlist."));
            }
        } catch (err) {
            devLog('Error updating playlist:', err);
            setError(NETWORK_ERROR);
        }
    };

    // Asks what to do with the playlist's media. Resolves false (keep files), true (delete
    // them too) or null (cancel). It used to be a hand-built white innerHTML box outside React.
    const [deletePrompt, setDeletePrompt] = useState(null);
    const showDeletePlaylistDialog = () => new Promise((resolve) => setDeletePrompt({ resolve }));
    const settleDeletePrompt = (answer) => {
        deletePrompt?.resolve(answer);
        setDeletePrompt(null);
    };

    const handleDeletePlaylist = async (playlistId) => {
        setError('');
        setSuccess('');

        // Custom dialog to ask user about deleting media files
        const result = await showDeletePlaylistDialog();
        if (result === null) return; // User cancelled
        
        const deleteMediaFiles = result;

        try {
            const params = new URLSearchParams({
                userId: user.id,
                deleteMediaFiles: deleteMediaFiles
            });
            
            const resp = await fetch(`${lexiconApiUrl}/api/playlists/${playlistId}?${params}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (resp.status === 401) {
                navigate('/login');
                return;
            }

            if (resp.ok) {
                setSuccess(deleteMediaFiles ? 'Playlist and its media files deleted.' : 'Playlist deleted.');
                if (selectedPlaylist?.id === playlistId) {
                    setSelectedPlaylist(null);
                    setPlaylistItems([]);
                }
                fetchPlaylists();
            } else {
                setError(await responseError(resp, "Couldn't delete the playlist."));
            }
        } catch (err) {
            devLog('Error deleting playlist:', err);
            setError(NETWORK_ERROR);
        }
    };

    const handleAddMediaToPlaylist = async (mediaFileId) => {
        if (!selectedPlaylist) return;

        setError('');
        setSuccess('');

        try {
            const resp = await fetch(`${lexiconApiUrl}/api/playlists/${selectedPlaylist.id}/items?userId=${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mediaFileId })
            });

            if (resp.status === 401) {
                navigate('/login');
                return;
            }

            if (resp.ok) {
                setSuccess('Media added to playlist!');
                fetchPlaylistItems(selectedPlaylist.id);
                setShowAddMediaModal(false);
            } else {
                setError(await responseError(resp, "Couldn't add that to the playlist."));
            }
        } catch (err) {
            devLog('Error adding media:', err);
            setError(NETWORK_ERROR);
        }
    };

    const handleRemoveMediaFromPlaylist = async (mediaFileId) => {
        if (!selectedPlaylist) return;

        setError('');
        setSuccess('');

        try {
            const resp = await fetch(`${lexiconApiUrl}/api/playlists/${selectedPlaylist.id}/items/${mediaFileId}?userId=${user.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (resp.status === 401) {
                navigate('/login');
                return;
            }

            if (resp.ok) {
                setSuccess('Media removed from playlist!');
                fetchPlaylistItems(selectedPlaylist.id);
            } else {
                setError(await responseError(resp, "Couldn't remove that from the playlist."));
            }
        } catch (err) {
            devLog('Error removing media:', err);
            setError(NETWORK_ERROR);
        }
    };

    const handleMoveItem = async (index, direction) => {
        const newItems = [...playlistItems];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        // Swap items
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

        // Update positions
        const mediaFileIds = newItems.map(item => item.mediaFile.id);

        try {
            const resp = await fetch(`${lexiconApiUrl}/api/playlists/${selectedPlaylist.id}/reorder?userId=${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mediaFileIds })
            });

            if (resp.status === 401) {
                navigate('/login');
                return;
            }

            if (resp.ok) {
                fetchPlaylistItems(selectedPlaylist.id);
            } else {
                setError(await responseError(resp, "Couldn't reorder the playlist."));
            }
        } catch (err) {
            devLog('Error reordering:', err);
            setError(NETWORK_ERROR);
        }
    };

    const selectPlaylist = (playlist) => {
        setSelectedPlaylist(playlist);
        fetchPlaylistItems(playlist.id);
        setError('');
        setSuccess('');
    };

    const openEditForm = (playlist) => {
        setSelectedPlaylist(playlist);
        setFormData({
            name: playlist.name,
            description: playlist.description || '',
            isPublic: playlist.isPublic,
            mediaType: playlist.mediaType
        });
        setShowEditForm(true);
    };

    const filteredMedia = useMemo(() => {
        if (!selectedPlaylist) return [];
        
        const playlistMediaType = selectedPlaylist.mediaType;
        const mediaInPlaylist = new Set(playlistItems.map(item => item.mediaFile.id));

        let filtered = availableMedia.filter(media => {
            const mediaTypeValue = media.mediaType || media.type || '';
            const matchesType = 
                (playlistMediaType === 'MUSIC' && (mediaTypeValue === 'MUSIC' || mediaTypeValue === 'AUDIO')) ||
                (playlistMediaType === 'VIDEO' && mediaTypeValue === 'VIDEO') ||
                (playlistMediaType === 'AUDIOBOOK' && mediaTypeValue === 'AUDIOBOOK');
            
            return matchesType && !mediaInPlaylist.has(media.id);
        });

        // Apply search filter
        if (mediaSearchQuery.trim()) {
            const query = mediaSearchQuery.toLowerCase();
            filtered = filtered.filter(media => 
                media.title?.toLowerCase().includes(query) ||
                media.description?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [selectedPlaylist, playlistItems, availableMedia, mediaSearchQuery]);

    const getFilteredPlaylists = (playlistList) => {
        let result = playlistList;
        
        // Type filter
        if (playlistTypeFilter !== 'ALL') {
            result = result.filter(p => p.mediaType === playlistTypeFilter);
        }
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(playlist =>
                playlist.name?.toLowerCase().includes(query) ||
                playlist.description?.toLowerCase().includes(query)
            );
        }
        
        return result;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="playlist-manager-container">
            <div className="playlist-header">
                <h1>Playlist Manager</h1>
                <button onClick={() => navigate('/lexicon-dashboard')} className="back-button">
                    Back to Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="playlist-layout">
                {/* Left Panel - Playlists List */}
                <div className="playlists-panel">
                    <div className="panel-header">
                        <h2>My Playlists</h2>
                        <button 
                            onClick={() => setShowCreateForm(true)} 
                            className="create-button"
                        >
                            + Create New
                        </button>
                    </div>

                    {/* Search Box & Filters */}
                    <div className="search-filter-section">
                        <input
                            type="text"
                            placeholder="🔍 Search playlists..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        <div className="playlist-filter-pills">
                            {['ALL', 'MUSIC', 'VIDEO', 'AUDIOBOOK'].map(type => (
                                <button
                                    key={type}
                                    className={`playlist-filter-pill ${playlistTypeFilter === type ? 'active' : ''}`}
                                    onClick={() => setPlaylistTypeFilter(type)}
                                >
                                    {type === 'ALL' && '🎯 All'}
                                    {type === 'MUSIC' && '🎵 Music'}
                                    {type === 'VIDEO' && '🎬 Video'}
                                    {type === 'AUDIOBOOK' && '📚 Books'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="playlists-list">
                        {loading && playlists.length === 0 ? (
                            <div className="lx-state" aria-busy="true" style={{ minHeight: 160 }}><div className="lx-spinner" aria-hidden="true" /></div>
                        ) : getFilteredPlaylists(playlists).length === 0 ? (
                            <p className="no-data">
                                {searchQuery ? 'No playlists match your search' : 'No playlists yet. Create one!'}
                            </p>
                        ) : (
                            getFilteredPlaylists(playlists).map(playlist => (
                                <div
                                    key={playlist.id}
                                    className={`playlist-card ${selectedPlaylist?.id === playlist.id ? 'active' : ''}`} {...pressable(() => selectPlaylist(playlist))}
                                >
                                    <div className="playlist-card-header">
                                        <h3>{playlist.name}</h3>
                                        <span className="playlist-type">{playlist.mediaType}</span>
                                    </div>
                                    <p className="playlist-description">{playlist.description}</p>
                                    <div className="playlist-meta">
                                        <span>{playlist.isPublic ? '🌐 Public' : '🔒 Private'}</span>
                                        <span>Created: {formatDate(playlist.createdDate)}</span>
                                    </div>
                                    <div className="playlist-actions">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); openEditForm(playlist); }}
                                            className="edit-btn"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(playlist.id); }}
                                            className="delete-btn"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {publicPlaylists.length > 0 && (
                        <>
                            <div className="panel-header">
                                <h2>Public Playlists</h2>
                            </div>
                            <div className="playlists-list">
                                {getFilteredPlaylists(publicPlaylists).length === 0 ? (
                                    <p className="no-data">No public playlists match your search</p>
                                ) : (
                                    getFilteredPlaylists(publicPlaylists).map(playlist => (
                                    <div
                                        key={playlist.id}
                                        className={`playlist-card ${selectedPlaylist?.id === playlist.id ? 'active' : ''}`} {...pressable(() => selectPlaylist(playlist))}
                                    >
                                        <div className="playlist-card-header">
                                            <h3>{playlist.name}</h3>
                                            <span className="playlist-type">{playlist.mediaType}</span>
                                        </div>
                                        <p className="playlist-description">{playlist.description}</p>
                                        <div className="playlist-meta">
                                            <span>🌐 Public</span>
                                            <span>Created: {formatDate(playlist.createdDate)}</span>
                                        </div>
                                    </div>
                                ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Right Panel - Playlist Items */}
                <div className="playlist-items-panel">
                    {selectedPlaylist ? (
                        <>
                            <div className="panel-header">
                                <h2>{selectedPlaylist.name}</h2>
                                {selectedPlaylist.createdBy === user?.id && (
                                    <button 
                                        onClick={() => {
                                            setShowAddMediaModal(true);
                                            if (availableMedia.length === 0) fetchAvailableMedia();
                                        }}
                                        className="add-media-button"
                                    >
                                        + Add Media
                                    </button>
                                )}
                            </div>

                            <div className="playlist-items-list">
                                {playlistItems.length === 0 ? (
                                    <p className="no-data">No items in this playlist yet.</p>
                                ) : (
                                    playlistItems.map((item, index) => (
                                        <div key={item.mediaFile.id} className="playlist-item">
                                            <div className="item-position">{index + 1}</div>
                                            <div className="item-info">
                                                <h4>{item.mediaFile.title}</h4>
                                                <p>{item.mediaFile.description}</p>
                                            </div>
                                            {selectedPlaylist.createdBy === user?.id && (
                                                <div className="item-actions">
                                                    <button
                                                        onClick={() => handleMoveItem(index, 'up')}
                                                        disabled={index === 0}
                                                        className="move-btn"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveItem(index, 'down')}
                                                        disabled={index === playlistItems.length - 1}
                                                        className="move-btn"
                                                    >
                                                        ▼
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveMediaFromPlaylist(item.mediaFile.id)}
                                                        className="remove-btn"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="no-selection">
                            <p>Select a playlist to view its contents</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Playlist Modal */}
            {showCreateForm && (
                <ModalFrame onClose={() => setShowCreateForm(false)} overlayClassName="modal-overlay" className="modal-content">
                        <h2>Create New Playlist</h2>
                        <form onSubmit={handleCreatePlaylist}>
                            <div className="form-group">
                                <label>Name:</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description:</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows="3"
                                />
                            </div>
                            <div className="form-group">
                                <label>Media Type:</label>
                                <select
                                    value={formData.mediaType}
                                    onChange={(e) => setFormData({...formData, mediaType: e.target.value})}
                                >
                                    <option value="MUSIC">Music</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="AUDIOBOOK">Audiobook</option>
                                </select>
                            </div>
                            <div className="form-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.isPublic || false}
                                        onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                                    />
                                    Make Public
                                </label>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="submit-btn">Create</button>
                                <button type="button" onClick={() => setShowCreateForm(false)} className="cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </ModalFrame>
            )}

            {/* Edit Playlist Modal */}
            {showEditForm && (
                <ModalFrame onClose={() => setShowEditForm(false)} overlayClassName="modal-overlay" className="modal-content">
                        <h2>Edit Playlist</h2>
                        <form onSubmit={handleUpdatePlaylist}>
                            <div className="form-group">
                                <label>Name:</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description:</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows="3"
                                />
                            </div>
                            <div className="form-group">
                                <label>Media Type:</label>
                                <select
                                    value={formData.mediaType}
                                    onChange={(e) => setFormData({...formData, mediaType: e.target.value})}
                                >
                                    <option value="MUSIC">Music</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="AUDIOBOOK">Audiobook</option>
                                </select>
                            </div>
                            <div className="form-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.isPublic || false}
                                        onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                                    />
                                    Make Public
                                </label>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="submit-btn">Update</button>
                                <button type="button" onClick={() => setShowEditForm(false)} className="cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </ModalFrame>
            )}

            {/* Add Media Modal */}
            {showAddMediaModal && (
                <ModalFrame onClose={() => setShowAddMediaModal(false)} overlayClassName="modal-overlay" className="modal-content add-media-modal">
                        <div className="modal-top-bar">
                            <h2>Add Media to Playlist</h2>
                            <button 
                                className="modal-x-btn"
                                onClick={() => { setShowAddMediaModal(false); setMediaSearchQuery(''); }}
                            >
                                ✕
                            </button>
                        </div>
                        
                        {/* Media Search */}
                        <div className="modal-search-area">
                            <input
                                type="text"
                                placeholder="🔍 Search media files..."
                                value={mediaSearchQuery}
                                onChange={(e) => setMediaSearchQuery(e.target.value)}
                                className="search-input"
                                autoFocus
                            />
                            <span className="modal-result-count">
                                {filteredMedia.length} available
                            </span>
                        </div>

                        <div className="media-list-scrollable">
                            {filteredMedia.length === 0 ? (
                                <p className="no-data">
                                    {mediaSearchQuery ? 'No media matches your search' : 'No available media to add'}
                                </p>
                            ) : (
                                filteredMedia.map(media => (
                                    <div key={media.id} className="media-add-row">
                                        <div className="media-add-icon">
                                            {media.mediaType === 'VIDEO' ? '🎬' : media.mediaType === 'AUDIOBOOK' ? '📚' : '🎵'}
                                        </div>
                                        <div className="media-add-info">
                                            <span className="media-add-title">{media.title || media.originalFilename}</span>
                                            {media.description && (
                                                <span className="media-add-desc">{media.description}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleAddMediaToPlaylist(media.id)}
                                            className="add-btn"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </ModalFrame>
            )}

            {deletePrompt && (
                <Dialog
                    title="Delete playlist?"
                    size="sm"
                    onClose={() => settleDeletePrompt(null)}
                    actions={(
                        <>
                            <button type="button" className="lx-btn lx-btn--secondary" onClick={() => settleDeletePrompt(null)}>Cancel</button>
                            <button type="button" className="lx-btn lx-btn--secondary" data-autofocus onClick={() => settleDeletePrompt(false)}>Keep media files</button>
                            <button type="button" className="lx-btn lx-btn--danger" onClick={() => settleDeletePrompt(true)}>Delete media files too</button>
                        </>
                    )}
                >
                    <p>What would you like to do with the media files in this playlist?</p>
                </Dialog>
            )}
        </div>
    );
}

export default PlaylistManager;

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import '../styles/PlaylistManager.css';

function PlaylistManager() {
    const { user } = useContext(UserContext);
    const [playlists, setPlaylists] = useState([]);
    const [publicPlaylists, setPublicPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistItems, setPlaylistItems] = useState([]);
    const [availableMedia, setAvailableMedia] = useState([]);
    const [mediaType, setMediaType] = useState('MUSIC');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const lexiconApiUrl = process.env.REACT_APP_LEXICON_API_URL || 'http://localhost:36568';

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPublic: false,
        mediaType: 'MUSIC'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [mediaSearchQuery, setMediaSearchQuery] = useState('');

    useEffect(() => {
        if (user === undefined) return;
        if (user === null) {
            navigate('/login');
            return;
        }
        fetchPlaylists();
        fetchAvailableMedia();
    }, [user]);

    const fetchPlaylists = async () => {
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
            setError('Failed to fetch playlists: ' + err.message);
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
            setError('Failed to fetch media: ' + err.message);
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
            setError('Failed to fetch playlist items: ' + err.message);
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
                const error = await resp.text();
                setError('Failed to create playlist: ' + error);
            }
        } catch (err) {
            setError('Error creating playlist: ' + err.message);
        }
    };

    const handleUpdatePlaylist = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        console.log('Updating playlist with data:', formData);
        console.log('isPublic value being sent:', formData.isPublic, 'Type:', typeof formData.isPublic);

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
                const updated = await resp.json();
                console.log('Playlist updated response:', updated);
                console.log('Response isPublic:', updated.isPublic, 'Type:', typeof updated.isPublic);
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
                        console.log('Refreshed playlist:', refreshedPlaylist);
                        console.log('Refreshed isPublic:', refreshedPlaylist.isPublic, 'Type:', typeof refreshedPlaylist.isPublic);
                        setSelectedPlaylist(refreshedPlaylist);
                    }
                }
            } else {
                const error = await resp.text();
                setError('Failed to update playlist: ' + error);
            }
        } catch (err) {
            setError('Error updating playlist: ' + err.message);
        }
    };

    const showDeletePlaylistDialog = () => {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.5); z-index: 1000; 
                display: flex; align-items: center; justify-content: center;
            `;
            
            dialog.innerHTML = `
                <div style="
                    background: white; padding: 20px; border-radius: 8px; 
                    max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                ">
                    <h3 style="margin-top: 0; color: #333;">Delete Playlist</h3>
                    <p style="margin: 15px 0; color: #666;">
                        What would you like to do with the media files in this playlist?
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button id="deletePlaylistOnly" style="
                            padding: 10px 15px; border: 1px solid #ddd; background: #f8f9fa; 
                            border-radius: 4px; cursor: pointer; color: #333;
                        ">Keep Media Files</button>
                        <button id="deletePlaylistAndMedia" style="
                            padding: 10px 15px; border: 1px solid #dc3545; background: #dc3545; 
                            border-radius: 4px; cursor: pointer; color: white;
                        ">Delete Media Files Too</button>
                        <button id="cancelDelete" style="
                            padding: 10px 15px; border: 1px solid #6c757d; background: #6c757d; 
                            border-radius: 4px; cursor: pointer; color: white;
                        ">Cancel</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(dialog);
            
            const cleanup = () => document.body.removeChild(dialog);
            
            dialog.querySelector('#deletePlaylistOnly').onclick = () => {
                cleanup();
                resolve(false); // Don't delete media files
            };
            
            dialog.querySelector('#deletePlaylistAndMedia').onclick = () => {
                cleanup();
                resolve(true); // Delete media files too
            };
            
            dialog.querySelector('#cancelDelete').onclick = () => {
                cleanup();
                resolve(null); // Cancel
            };
            
            // Close on outside click
            dialog.onclick = (e) => {
                if (e.target === dialog) {
                    cleanup();
                    resolve(null);
                }
            };
        });
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
                const message = await resp.text();
                setSuccess(message);
                if (selectedPlaylist?.id === playlistId) {
                    setSelectedPlaylist(null);
                    setPlaylistItems([]);
                }
                fetchPlaylists();
            } else {
                const error = await resp.text();
                setError('Failed to delete playlist: ' + error);
            }
        } catch (err) {
            setError('Error deleting playlist: ' + err.message);
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
                const error = await resp.text();
                setError('Failed to add media: ' + error);
            }
        } catch (err) {
            setError('Error adding media: ' + err.message);
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
                const error = await resp.text();
                setError('Failed to remove media: ' + error);
            }
        } catch (err) {
            setError('Error removing media: ' + err.message);
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
                const error = await resp.text();
                setError('Failed to reorder: ' + error);
            }
        } catch (err) {
            setError('Error reordering: ' + err.message);
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

    const getFilteredMedia = () => {
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
    };

    const getFilteredPlaylists = (playlistList) => {
        if (!searchQuery.trim()) return playlistList;
        
        const query = searchQuery.toLowerCase();
        return playlistList.filter(playlist =>
            playlist.name?.toLowerCase().includes(query) ||
            playlist.description?.toLowerCase().includes(query) ||
            playlist.mediaType?.toLowerCase().includes(query)
        );
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

                    {/* Search Box */}
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="🔍 Search playlists..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="playlists-list">
                        {getFilteredPlaylists(playlists).length === 0 ? (
                            <p className="no-data">
                                {searchQuery ? 'No playlists match your search' : 'No playlists yet. Create one!'}
                            </p>
                        ) : (
                            getFilteredPlaylists(playlists).map(playlist => (
                                <div
                                    key={playlist.id}
                                    className={`playlist-card ${selectedPlaylist?.id === playlist.id ? 'active' : ''}`}
                                    onClick={() => selectPlaylist(playlist)}
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
                                        className={`playlist-card ${selectedPlaylist?.id === playlist.id ? 'active' : ''}`}
                                        onClick={() => selectPlaylist(playlist)}
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
                                        onClick={() => setShowAddMediaModal(true)}
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
                <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                </div>
            )}

            {/* Edit Playlist Modal */}
            {showEditForm && (
                <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                </div>
            )}

            {/* Add Media Modal */}
            {showAddMediaModal && (
                <div className="modal-overlay" onClick={() => setShowAddMediaModal(false)}>
                    <div className="modal-content add-media-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Add Media to Playlist</h2>
                        
                        {/* Media Search Box */}
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="🔍 Search media files..."
                                value={mediaSearchQuery}
                                onChange={(e) => setMediaSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="media-list">
                            {getFilteredMedia().length === 0 ? (
                                <p className="no-data">
                                    {mediaSearchQuery ? 'No media matches your search' : 'No available media to add'}
                                </p>
                            ) : (
                                getFilteredMedia().map(media => (
                                    <div key={media.id} className="media-item">
                                        <div className="media-info">
                                            <h4>{media.title}</h4>
                                            <p>{media.description}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddMediaToPlaylist(media.id)}
                                            className="add-btn"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="form-actions">
                            <button 
                                onClick={() => {
                                    setShowAddMediaModal(false);
                                    setMediaSearchQuery('');
                                }} 
                                className="cancel-btn"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PlaylistManager;

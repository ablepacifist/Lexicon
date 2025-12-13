import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import '../styles/MediaUploadDownload.css';

const API_URL = process.env.REACT_APP_LEXICON_API_URL || process.env.REACT_APP_API_URL;

const MediaUploadDownload = () => {
  const { user } = useContext(UserContext);
  const [activeMode, setActiveMode] = useState('file'); // 'file', 'link', 'playlist'
  
  // File upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [mediaType, setMediaType] = useState('OTHER');
  
  // Link upload state
  const [linkUrl, setLinkUrl] = useState('');
  const [downloadType, setDownloadType] = useState('AUDIO_ONLY');
  
  // Playlist import state
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [playlistIsPublic, setPlaylistIsPublic] = useState(true);
  const [mediaIsPublic, setMediaIsPublic] = useState(false);
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Browse/Download state
  const [mediaFiles, setMediaFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMediaType, setFilterMediaType] = useState('ALL');
  const [editingFile, setEditingFile] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setUploadFile(file);
    if (file && !uploadTitle) {
      // Auto-set title from filename
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadFile) {
      setMessage('Please select a file');
      return;
    }
    
    if (!uploadTitle.trim()) {
      setMessage('Please provide a title');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('userId', user.id);
    formData.append('title', uploadTitle);
    formData.append('description', uploadDescription);
    formData.append('isPublic', isPublic);
    formData.append('mediaType', mediaType);

    setIsUploading(true);
    setUploadProgress(0);
    setMessage('');

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      setIsUploading(false);
      if (xhr.status === 200) {
        setMessage('✅ File uploaded successfully!');
        setUploadFile(null);
        setUploadTitle('');
        setUploadDescription('');
        setUploadProgress(0);
      } else {
        setMessage(`❌ Upload failed: ${xhr.responseText}`);
        setUploadProgress(0);
      }
    });

    xhr.addEventListener('error', () => {
      setIsUploading(false);
      setUploadProgress(0);
      setMessage('❌ Error uploading file - connection failed');
    });

    xhr.addEventListener('timeout', () => {
      setIsUploading(false);
      setUploadProgress(0);
      setMessage('❌ Upload timed out - file may be too large');
    });

    xhr.open('POST', `${API_URL}/api/media/upload`);
    xhr.timeout = 30 * 60 * 1000; // 30 minutes
    xhr.withCredentials = true;
    xhr.send(formData);
  };

  const handleLinkUpload = async (e) => {
    e.preventDefault();
    
    if (!linkUrl.trim()) {
      setMessage('Please provide a URL');
      return;
    }
    
    if (!uploadTitle.trim()) {
      setMessage('Please provide a title');
      return;
    }

    const formData = new FormData();
    formData.append('url', linkUrl);
    formData.append('userId', user.id);
    formData.append('title', uploadTitle);
    formData.append('description', uploadDescription);
    formData.append('isPublic', isPublic);
    formData.append('mediaType', mediaType);
    formData.append('downloadType', downloadType);

    try {
      setLoading(true);
      setMessage('');
      const response = await fetch(`${API_URL}/api/media/upload-from-url`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        setMessage('✅ Media downloaded and uploaded successfully!');
        setLinkUrl('');
        setUploadTitle('');
        setUploadDescription('');
      } else {
        const error = await response.text();
        setMessage(`❌ Download failed: ${error}`);
      }
    } catch (error) {
      setMessage('❌ Error downloading from URL');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistImport = async (e) => {
    e.preventDefault();
    
    if (!playlistUrl.trim()) {
      setMessage('Please provide a playlist URL');
      return;
    }

    try {
      setLoading(true);
      setMessage('🔄 Starting playlist import... This may take several minutes.');
      
      const params = new URLSearchParams({
        url: playlistUrl,
        userId: user.id,
        isPublic: playlistIsPublic,
        mediaIsPublic: mediaIsPublic
      });
      
      if (playlistName.trim()) {
        params.append('playlistName', playlistName);
      }

      const response = await fetch(`${API_URL}/api/playlists/import-youtube?${params}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setMessage('✅ Playlist import started! Check your playlists in a few minutes.');
        setPlaylistUrl('');
        setPlaylistName('');
      } else {
        const error = await response.text();
        setMessage(`❌ Import failed: ${error}`);
      }
    } catch (error) {
      setMessage('❌ Error importing playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTypeChange = (newDownloadType) => {
    setDownloadType(newDownloadType);
    if (newDownloadType === 'AUDIO_ONLY') {
      setMediaType('MUSIC');
    } else if (newDownloadType === 'VIDEO') {
      setMediaType('VIDEO');
    }
  };

  const fetchMyMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/media/user/${user.id}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMediaFiles(data);
      }
    } catch (error) {
      setMessage('❌ Error fetching media');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/media/public`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMediaFiles(data);
      }
    } catch (error) {
      setMessage('❌ Error fetching public media');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setMessage('Please enter a search term');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/media/search?query=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMediaFiles(data);
      }
    } catch (error) {
      setMessage('❌ Error searching media');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (mediaId, filename) => {
    try {
      const response = await fetch(`${API_URL}/api/media/${mediaId}/download`, {
        credentials: 'include'
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      setMessage('❌ Error downloading file');
    }
  };

  const handleEdit = (file) => {
    setEditingFile(file);
    setEditTitle(file.title);
    setEditDescription(file.description || '');
    setEditIsPublic(file.isPublic);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`${API_URL}/api/media/${editingFile.id}?userId=${user.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          isPublic: editIsPublic
        })
      });
      if (response.ok) {
        setMessage('✅ File updated successfully!');
        setEditingFile(null);
        // Refresh the list
        if (mediaFiles.length > 0) {
          fetchMyMedia();
        }
      } else {
        const errorText = await response.text();
        setMessage('❌ Failed to update file: ' + (errorText || 'Permission denied'));
      }
    } catch (error) {
      setMessage('❌ Error updating file: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditTitle('');
    setEditDescription('');
    setEditIsPublic(true);
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/media/${mediaId}?userId=${user.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setMessage('✅ File deleted successfully!');
        // Refresh the list
        const updatedFiles = mediaFiles.filter(f => f.id !== mediaId);
        setMediaFiles(updatedFiles);
      } else {
        setMessage('❌ Failed to delete file');
      }
    } catch (error) {
      setMessage('❌ Error deleting file');
    }
  };

  const getFilteredFiles = () => {
    if (filterMediaType === 'ALL') return mediaFiles;
    return mediaFiles.filter(f => (f.mediaType || f.fileType) === filterMediaType);
  };

  return (
    <div className="upload-download-container">
      <div className="upload-header">
        <h1>Upload & Download Media</h1>
        <p>Manage your media files and import from YouTube</p>
        <Link to="/lexicon-dashboard" className="back-button">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="upload-content">
        {/* Mode Tabs */}
        <div className="upload-tabs">
          <div 
            className={`upload-tab ${activeMode === 'file' ? 'active' : ''}`}
            onClick={() => setActiveMode('file')}
          >
            📁 Upload File
          </div>
          <div 
            className={`upload-tab ${activeMode === 'link' ? 'active' : ''}`}
            onClick={() => setActiveMode('link')}
          >
            🔗 Download from Link
          </div>
          <div 
            className={`upload-tab ${activeMode === 'playlist' ? 'active' : ''}`}
            onClick={() => setActiveMode('playlist')}
          >
            📋 Import YouTube Playlist
          </div>
          <div 
            className={`upload-tab ${activeMode === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveMode('browse')}
          >
            🔍 Browse & Download
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="upload-card" style={{ 
            background: message.includes('✅') ? 'linear-gradient(135deg, #d4edda 0%, #c8e6c9 100%)' : 
                       message.includes('🔄') ? 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)' :
                       'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
            color: message.includes('✅') ? '#155724' : 
                   message.includes('🔄') ? '#0c5460' : '#721c24',
            fontWeight: '600',
            fontSize: '1.1rem',
            padding: '20px'
          }}>
            {message}
          </div>
        )}

        {/* File Upload Mode */}
        {activeMode === 'file' && (
          <div className="upload-card">
            <h2 style={{ marginBottom: '30px', color: '#333' }}>📁 Upload File</h2>
            <form className="upload-form" onSubmit={handleFileUpload}>
              {/* File Selector */}
              <div 
                className={`file-upload-area ${uploadFile ? 'has-file' : ''}`}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <div className="file-upload-icon">
                  {uploadFile ? '✅' : '📤'}
                </div>
                <div className="file-upload-text">
                  {uploadFile ? `Selected: ${uploadFile.name}` : 'Click to select a file'}
                </div>
                <div className="file-upload-hint">
                  {uploadFile ? `Size: ${(uploadFile.size / 1024 / 1024).toFixed(2)} MB` : 'Supports audio, video, and other media files'}
                </div>
                <input
                  id="fileInput"
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter a title for your media"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Add a description (optional)"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Media Type</label>
                <select
                  className="form-select"
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                >
                  <option value="OTHER">Other</option>
                  <option value="MUSIC">Music</option>
                  <option value="VIDEO">Video</option>
                  <option value="AUDIOBOOK">Audiobook</option>
                </select>
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="filePublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <label htmlFor="filePublic">Make this file public (visible to all users)</label>
              </div>

              {isUploading && (
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }}>
                    {uploadProgress}%
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="upload-button"
                disabled={!uploadFile || isUploading}
              >
                {isUploading ? `Uploading ${uploadProgress}%` : '📤 Upload File'}
              </button>
            </form>
          </div>
        )}

        {/* Link Upload Mode */}
        {activeMode === 'link' && (
          <div className="upload-card">
            <h2 style={{ marginBottom: '30px', color: '#333' }}>🔗 Download from Link</h2>
            <form className="upload-form" onSubmit={handleLinkUpload}>
              <div className="form-group">
                <label>URL *</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://youtube.com/watch?v=... or other media URL"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Download Type</label>
                <div className="upload-mode-selector">
                  <div 
                    className={`mode-button ${downloadType === 'AUDIO_ONLY' ? 'active' : ''}`}
                    onClick={() => handleDownloadTypeChange('AUDIO_ONLY')}
                  >
                    <div className="mode-icon">🎵</div>
                    Audio Only
                  </div>
                  <div 
                    className={`mode-button ${downloadType === 'VIDEO' ? 'active' : ''}`}
                    onClick={() => handleDownloadTypeChange('VIDEO')}
                  >
                    <div className="mode-icon">🎬</div>
                    Video + Audio
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter a title for your media"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Add a description (optional)"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Media Type</label>
                <select
                  className="form-select"
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                >
                  <option value="OTHER">Other</option>
                  <option value="MUSIC">Music</option>
                  <option value="VIDEO">Video</option>
                  <option value="AUDIOBOOK">Audiobook</option>
                </select>
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="linkPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <label htmlFor="linkPublic">Make this file public (visible to all users)</label>
              </div>

              <button 
                type="submit" 
                className="upload-button"
                disabled={loading}
              >
                {loading ? '⏳ Downloading...' : '🔽 Download & Upload'}
              </button>
            </form>
          </div>
        )}

        {/* Browse & Download Mode */}
        {activeMode === 'browse' && (
          <div className="upload-card">
            <h2 style={{ marginBottom: '30px', color: '#333' }}>🔍 Browse & Download Media</h2>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <button onClick={fetchMyMedia} className="upload-button" disabled={loading}>
                My Files
              </button>
              <button onClick={fetchPublicMedia} className="upload-button" disabled={loading}>
                Public Files
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1 }}
              />
              <button onClick={handleSearch} className="upload-button" disabled={loading}>
                🔍 Search
              </button>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#333' }}>Filter by Type:</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['ALL', 'MUSIC', 'VIDEO', 'AUDIOBOOK', 'OTHER'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterMediaType(type)}
                    style={{
                      padding: '10px 20px',
                      border: filterMediaType === type ? '3px solid #667eea' : '2px solid #e0e0e0',
                      borderRadius: '8px',
                      background: filterMediaType === type ? '#667eea' : 'white',
                      color: filterMediaType === type ? 'white' : '#333',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#667eea', fontSize: '1.2rem' }}>Loading...</div>}
            
            {!loading && mediaFiles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                No files to display. Click a button above to browse.
              </div>
            )}

            {!loading && getFilteredFiles().length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {getFilteredFiles().map((file) => (
                  <div
                    key={file.id}
                    style={{
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '2px solid #e0e0e0'
                    }}
                  >
                    {editingFile && editingFile.id === file.id ? (
                      /* Edit Mode */
                      <div>
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>Title *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>Description</label>
                          <textarea
                            className="form-textarea"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            style={{ minHeight: '100px' }}
                          />
                        </div>
                        <div className="checkbox-group" style={{ marginBottom: '15px' }}>
                          <input
                            type="checkbox"
                            id={`edit-public-${file.id}`}
                            checked={editIsPublic}
                            onChange={(e) => setEditIsPublic(e.target.checked)}
                          />
                          <label htmlFor={`edit-public-${file.id}`}>Make this file public (visible to all users)</label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={handleSaveEdit} className="upload-button" style={{ padding: '10px 20px' }}>
                            💾 Save Changes
                          </button>
                          <button 
                            onClick={handleCancelEdit} 
                            className="upload-button" 
                            style={{ padding: '10px 20px', background: '#6c757d' }}
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div>
                        <h3 style={{ color: '#667eea', marginBottom: '10px' }}>{file.title}</h3>
                        <p style={{ color: '#666', marginBottom: '10px' }}>{file.description || 'No description'}</p>
                        <p style={{ fontSize: '0.9rem', color: '#999', marginBottom: '15px' }}>
                          Type: {file.mediaType || file.fileType} | Size: {(file.fileSize / 1024 / 1024).toFixed(2)} MB | 
                          {file.isPublic ? ' Public' : ' Private'}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleDownload(file.id, file.originalFilename || file.title)}
                            className="upload-button"
                            style={{ padding: '10px 20px', fontSize: '1rem' }}
                          >
                            📥 Download
                          </button>
                          {file.uploadedBy === user.id && (
                            <>
                              <button
                                onClick={() => handleEdit(file)}
                                className="upload-button"
                                style={{ padding: '10px 20px', fontSize: '1rem', background: '#3498db' }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDelete(file.id)}
                                className="upload-button"
                                style={{ padding: '10px 20px', fontSize: '1rem', background: '#e74c3c' }}
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Playlist Import Mode */}
        {activeMode === 'playlist' && (
          <div className="upload-card">
            <h2 style={{ marginBottom: '30px', color: '#333' }}>📋 Import YouTube Playlist</h2>
            <form className="upload-form" onSubmit={handlePlaylistImport}>
              <div className="form-group">
                <label>Playlist URL *</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://music.youtube.com/playlist?list=..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Playlist Name (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Leave empty to use original playlist name"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                />
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="playlistPublic"
                  checked={playlistIsPublic}
                  onChange={(e) => setPlaylistIsPublic(e.target.checked)}
                />
                <label htmlFor="playlistPublic">Make playlist public (others can see and play it)</label>
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="mediaPublic"
                  checked={mediaIsPublic}
                  onChange={(e) => setMediaIsPublic(e.target.checked)}
                />
                <label htmlFor="mediaPublic">Make individual songs public (others can see them in library)</label>
              </div>

              <div className="playlist-import-note">
                <div className="note-title">
                  💡 How Playlist Import Works
                </div>
                <ul>
                  <li><strong>Playlist visibility:</strong> Controls who can see and play the playlist</li>
                  <li><strong>Song visibility:</strong> Controls who can see individual songs in the media library</li>
                  <li><strong>Recommended:</strong> Playlist Public ✓, Songs Private ✗</li>
                  <li><strong>Processing time:</strong> Large playlists may take 10-30 minutes to import</li>
                  <li><strong>All songs:</strong> Will be downloaded as audio files (music format)</li>
                </ul>
              </div>

              <button 
                type="submit" 
                className="upload-button"
                disabled={loading}
              >
                {loading ? '⏳ Starting Import...' : '📥 Import Playlist'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaUploadDownload;


import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import background from '../assets/images/dashboard_background.jpg';

// Use Lexicon server for media operations
const API_URL = process.env.REACT_APP_LEXICON_API_URL || process.env.REACT_APP_API_URL;

const MediaUploadDownload = () => {
  const { user } = useContext(UserContext);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Upload mode: 'file' or 'link'
  const [uploadMode, setUploadMode] = useState('file');
  
  // File upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [mediaType, setMediaType] = useState('OTHER');
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Link upload state
  const [linkUrl, setLinkUrl] = useState('');
  const [downloadType, setDownloadType] = useState('AUDIO_ONLY');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit state
  const [editingFile, setEditingFile] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Auto-set mediaType based on downloadType when in link mode
  const handleDownloadTypeChange = (newDownloadType) => {
    setDownloadType(newDownloadType);
    // Auto-set media type based on download type
    if (newDownloadType === 'AUDIO_ONLY') {
      setMediaType('MUSIC');
    } else if (newDownloadType === 'VIDEO') {
      setMediaType('VIDEO');
    }
  };

  const containerStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    padding: '2rem',
    color: '#fff',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem',
  };

  const cardStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '2rem',
    borderRadius: '10px',
    marginBottom: '2rem',
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.7)',
  };

  const buttonStyle = {
    padding: '0.75rem 2rem',
    margin: '0.5rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'transform 0.2s',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#9b59b6',
    color: '#fff',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3498db',
    color: '#fff',
  };

  const backButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#555',
    color: '#fff',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '5px',
    border: '1px solid #555',
    backgroundColor: '#222',
    color: '#fff',
    fontSize: '1rem',
  };

  const fileInputStyle = {
    marginBottom: '1rem',
    color: '#fff',
  };

  // Fetch user's media files
  const fetchMyMedia = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/media/user/${user.id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMediaFiles(data);
      } else {
        console.error('Failed to fetch media files');
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch public media files
  const fetchPublicMedia = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/media/public`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMediaFiles(data);
      } else {
        console.error('Failed to fetch public media');
      }
    } catch (error) {
      console.error('Error fetching public media:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search media files
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/media/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMediaFiles(data);
      } else {
        console.error('Search failed');
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload media file
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (uploadMode === 'file') {
      // File upload
      if (!uploadFile || !uploadTitle.trim()) {
        alert('Please provide a file and title');
        return;
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('isPublic', isPublic);
      formData.append('userId', user.id);
      formData.append('mediaType', mediaType);

      // Use XMLHttpRequest for progress tracking
      setIsUploading(true);
      setUploadProgress(0);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          alert('File uploaded successfully!');
          setUploadFile(null);
          setUploadTitle('');
          setUploadDescription('');
          setIsPublic(false);
          setMediaType('OTHER');
          setUploadProgress(0);
          fetchMyMedia(); // Refresh the list
        } else {
          alert(`Upload failed: ${xhr.responseText}`);
          setUploadProgress(0);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setIsUploading(false);
        setUploadProgress(0);
        alert('Error uploading file - connection failed');
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        setIsUploading(false);
        setUploadProgress(0);
        alert('Upload timed out - file may be too large');
      });

      // Configure and send request
      xhr.open('POST', `${API_URL}/api/media/upload`);
      xhr.timeout = 30 * 60 * 1000; // 30 minutes
      xhr.withCredentials = true;
      xhr.send(formData);
    } else {
      // Link upload
      if (!linkUrl.trim()) {
        alert('Please provide a URL');
        return;
      }
      
      if (!uploadTitle.trim()) {
        alert('Please provide a title');
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
        const response = await fetch(`${API_URL}/api/media/upload-from-url`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          alert('Media downloaded and uploaded successfully!');
          setLinkUrl('');
          setUploadTitle('');
          setUploadDescription('');
          setIsPublic(false);
          setMediaType('OTHER');
          setDownloadType('AUDIO_ONLY');
          fetchMyMedia(); // Refresh the list
        } else {
          const error = await response.text();
          alert(`Download failed: ${error}`);
        }
      } catch (error) {
        console.error('Error downloading from URL:', error);
        alert('Error downloading from URL');
      } finally {
        setLoading(false);
      }
    }
  };

  // Delete media file
  const handleDelete = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`${API_URL}/api/media/${mediaId}?userId=${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        alert('File deleted successfully');
        fetchMyMedia();
      } else {
        const error = await response.text();
        alert(`Delete failed: ${error}`);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting file');
    }
  };

  const handleEdit = (file) => {
    setEditingFile(file);
    setEditTitle(file.title);
    setEditDescription(file.description || '');
  };

  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      alert('Title is required');
      return;
    }

    try {
      const updatedMedia = {
        ...editingFile,
        title: editTitle,
        description: editDescription
      };

      const response = await fetch(`${API_URL}/api/media/${editingFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedMedia)
      });

      if (response.ok) {
        alert('Media updated successfully!');
        handleCancelEdit();
        fetchMyMedia();
      } else {
        const error = await response.text();
        alert(`Update failed: ${error}`);
      }
    } catch (error) {
      console.error('Error updating:', error);
      alert('Error updating media');
    }
  };

  // Download media file
  const handleDownload = async (mediaId, filename) => {
    try {
      const response = await fetch(`${API_URL}/api/media/${mediaId}/download`, {
        credentials: 'include',
      });

      // If server returned 204 (no content) or 404, inform the user
      if (response.status === 204) {
        alert('This file has no data stored on the server. Try re-uploading it.');
        return;
      }

      if (!response.ok) {
        alert('Failed to download file (status ' + response.status + ')');
        return;
      }

      const blob = await response.blob();
      // If blob size is zero, alert the user rather than creating an empty file
      if (!blob || blob.size === 0) {
        alert('Downloaded file was empty. The server returned no file data.');
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Error downloading file');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Upload & Download Media</h1>
        <p style={{ fontSize: '1.2rem', color: '#9b59b6' }}>Manage your media files</p>
        <Link to="/lexicon-dashboard">
          <button style={backButtonStyle}>← Back to Dashboard</button>
        </Link>
      </div>

      {/* Upload Section */}
      <div style={cardStyle}>
        <h2 style={{ marginBottom: '1rem' }}>Upload Media</h2>
        
        {/* Upload Mode Toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ marginRight: '1rem', color: '#fff' }}>
            <input
              type="radio"
              value="file"
              checked={uploadMode === 'file'}
              onChange={(e) => setUploadMode(e.target.value)}
              style={{ marginRight: '0.5rem' }}
            />
            Upload File
          </label>
          <label style={{ color: '#fff' }}>
            <input
              type="radio"
              value="link"
              checked={uploadMode === 'link'}
              onChange={(e) => setUploadMode(e.target.value)}
              style={{ marginRight: '0.5rem' }}
            />
            Download from Link (yt-dlp)
          </label>
        </div>
        
        <form onSubmit={handleUpload}>
          {/* Media Type Selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>
              Media Type:
            </label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              style={inputStyle}
            >
              <option value="OTHER">Other</option>
              <option value="MUSIC">Music</option>
              <option value="VIDEO">Video</option>
              <option value="AUDIOBOOK">Audiobook</option>
            </select>
          </div>
          
          {uploadMode === 'file' ? (
            // File Upload Mode
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files[0])}
              style={fileInputStyle}
              required
            />
          ) : (
            // Link Upload Mode
            <>
              <input
                type="url"
                placeholder="YouTube or media URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                style={inputStyle}
                required
              />
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>
                  Download:
                </label>
                <label style={{ color: '#fff' }}>
                  <input
                    type="radio"
                    value="AUDIO_ONLY"
                    checked={downloadType === 'AUDIO_ONLY'}
                    onChange={(e) => handleDownloadTypeChange(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Audio Only
                </label>
                <label style={{ color: '#fff' }}>
                  <input
                    type="radio"
                    value="VIDEO"
                    checked={downloadType === 'VIDEO'}
                    onChange={(e) => handleDownloadTypeChange(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Video + Audio
                </label>
              </div>
            </>
          )}
          
          <input
            type="text"
            placeholder="Title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            style={inputStyle}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            style={{ ...inputStyle, minHeight: '100px' }}
          />
          <label style={{ display: 'block', marginBottom: '1rem', color: '#fff' }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            Make Public
          </label>
          
          {/* Upload Progress Bar */}
          {isUploading && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                backgroundColor: '#333',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '30px',
                  backgroundColor: '#9b59b6',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold'
                }}>
                  {uploadProgress}%
                </div>
              </div>
              <div style={{ color: '#aaa', fontSize: '0.9rem', textAlign: 'center' }}>
                Uploading... This may take several minutes for large files
              </div>
            </div>
          )}
          
          <button type="submit" style={primaryButtonStyle} disabled={loading || isUploading}>
            {isUploading ? `Uploading ${uploadProgress}%` : loading ? 'Processing...' : (uploadMode === 'file' ? 'Upload File' : 'Download & Upload')}
          </button>
        </form>
      </div>

      {/* Browse Section */}
      <div style={cardStyle}>
        <h2 style={{ marginBottom: '1rem' }}>Browse Media</h2>
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={fetchMyMedia} style={secondaryButtonStyle}>
            My Files
          </button>
          <button onClick={fetchPublicMedia} style={secondaryButtonStyle}>
            Public Files
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ ...inputStyle, marginBottom: 0 }}
          />
          <button onClick={handleSearch} style={secondaryButtonStyle}>
            Search
          </button>
        </div>

        {loading && <p>Loading...</p>}
        
        {!loading && mediaFiles.length === 0 && (
          <p style={{ color: '#aaa' }}>No files to display. Click a button above to browse.</p>
        )}

        {!loading && mediaFiles.length > 0 && (
          <div>
            {mediaFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}
              >
                {editingFile && editingFile.id === file.id ? (
                  /* Edit Mode */
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9b59b6', fontWeight: 'bold' }}>
                        Title *
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={inputStyle}
                        placeholder="Enter title"
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9b59b6', fontWeight: 'bold' }}>
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                        placeholder="Enter description (optional)"
                      />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <button onClick={handleSaveEdit} style={primaryButtonStyle}>
                        💾 Save Changes
                      </button>
                      <button onClick={handleCancelEdit} style={backButtonStyle}>
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div>
                    <h3 style={{ color: '#9b59b6' }}>{file.title}</h3>
                    <p>{file.description || 'No description'}</p>
                    <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                      Type: {file.fileType} | Size: {(file.fileSize / 1024).toFixed(2)} KB | 
                      {file.isPublic ? ' Public' : ' Private'}
                    </p>
                    <div style={{ marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => handleDownload(file.id, file.originalFilename || file.title)}
                        style={secondaryButtonStyle}
                      >
                        📥 Download
                      </button>
                      {file.uploadedBy === user.id && (
                        <>
                          <button
                            onClick={() => handleEdit(file)}
                            style={{ ...buttonStyle, backgroundColor: '#3498db', color: '#fff' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(file.id)}
                            style={{ ...buttonStyle, backgroundColor: '#e74c3c', color: '#fff' }}
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
    </div>
  );
};

export default MediaUploadDownload;

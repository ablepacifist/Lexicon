import React, { useState, useContext } from 'react';
import { UserContext } from '../context/UserContext';

const API_URL = process.env.REACT_APP_LEXICON_API_URL || process.env.REACT_APP_API_URL;
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB threshold for chunked upload

const ChunkedUpload = ({ file, title, description, isPublic, mediaType, onSuccess, onError, onProgress }) => {
  const { user } = useContext(UserContext);
  const [uploadId, setUploadId] = useState(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedChunks, setUploadedChunks] = useState(new Set());

  const calculateMD5 = async (data) => {
    const crypto = window.crypto;
    if (crypto && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('MD5', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return null; // Fallback if crypto not available
  };

  const initializeUpload = async () => {
    try {
      const totalSize = file.size;
      const chunks = Math.ceil(totalSize / CHUNK_SIZE);
      
      const params = new URLSearchParams({
        filename: file.name,
        contentType: file.type,
        totalSize: totalSize,
        chunkSize: CHUNK_SIZE,
        userId: user.id,
        title: title,
        description: description || '',
        isPublic: isPublic,
        mediaType: mediaType
      });

      const response = await fetch(`${API_URL}/api/media/chunked/init?${params}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setUploadId(result.uploadId);
        setTotalChunks(result.totalChunks);
        setUploadStatus(`📋 Initialized upload: ${chunks} chunks`);
        return result.uploadId;
      } else {
        throw new Error('Failed to initialize chunked upload');
      }
    } catch (error) {
      onError(`Failed to initialize upload: ${error.message}`);
      return null;
    }
  };

  const uploadChunk = async (uploadId, chunkNumber) => {
    const start = chunkNumber * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkData = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('chunkNumber', chunkNumber);
    formData.append('chunk', new File([chunkData], `chunk_${chunkNumber}`));
    
    // Calculate chunk checksum if possible
    try {
      const arrayBuffer = await chunkData.arrayBuffer();
      const checksum = await calculateMD5(arrayBuffer);
      if (checksum) {
        formData.append('checksum', checksum);
      }
    } catch (e) {
      // Continue without checksum if crypto unavailable
    }

    const response = await fetch(`${API_URL}/api/media/chunked/upload/${uploadId}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      setUploadedChunks(prev => new Set([...prev, chunkNumber]));
      return result;
    } else {
      throw new Error(`Failed to upload chunk ${chunkNumber}`);
    }
  };

  const resumeUpload = async (uploadId) => {
    try {
      // Get missing chunks
      const response = await fetch(`${API_URL}/api/media/chunked/missing/${uploadId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        const missingChunks = result.missingChunks;
        
        if (missingChunks.length === 0) {
          setUploadStatus('✅ All chunks uploaded, finalizing...');
          await finalizeUpload(uploadId);
          return;
        }

        setUploadStatus(`🔄 Resuming upload, ${missingChunks.length} chunks remaining`);
        setCurrentChunk(Math.min(...missingChunks));
        
        // Continue uploading missing chunks
        for (const chunkNumber of missingChunks.sort((a, b) => a - b)) {
          if (isPaused) break;
          
          setCurrentChunk(chunkNumber);
          setUploadStatus(`📤 Uploading chunk ${chunkNumber + 1}/${totalChunks}`);
          
          const result = await uploadChunk(uploadId, chunkNumber);
          
          const progress = ((chunkNumber + 1) / totalChunks) * 100;
          setUploadProgress(progress);
          onProgress(progress);
          
          if (result.isComplete) {
            setUploadStatus('✅ All chunks uploaded, finalizing...');
            await finalizeUpload(uploadId);
            break;
          }
        }
      }
    } catch (error) {
      onError(`Resume failed: ${error.message}`);
    }
  };

  const finalizeUpload = async (uploadId) => {
    try {
      const response = await fetch(`${API_URL}/api/media/chunked/finalize/${uploadId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus('🎉 Upload completed successfully!');
        setUploadProgress(100);
        onProgress(100);
        onSuccess(result.mediaFile);
      } else {
        throw new Error('Failed to finalize upload');
      }
    } catch (error) {
      onError(`Finalization failed: ${error.message}`);
    }
  };

  const startUpload = async () => {
    setIsUploading(true);
    setIsPaused(false);
    setUploadProgress(0);
    
    try {
      let currentUploadId = uploadId;
      
      if (!currentUploadId) {
        currentUploadId = await initializeUpload();
        if (!currentUploadId) return;
      }

      // Start/resume uploading chunks
      await resumeUpload(currentUploadId);
      
    } catch (error) {
      onError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const pauseUpload = () => {
    setIsPaused(true);
    setUploadStatus('⏸️ Upload paused');
  };

  const resumeUploadManual = async () => {
    if (uploadId) {
      setIsPaused(false);
      setIsUploading(true);
      await resumeUpload(uploadId);
      setIsUploading(false);
    }
  };

  const cancelUpload = async () => {
    if (uploadId) {
      try {
        await fetch(`${API_URL}/api/media/chunked/${uploadId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        setUploadId(null);
        setCurrentChunk(0);
        setTotalChunks(0);
        setUploadProgress(0);
        setUploadedChunks(new Set());
        setUploadStatus('🗑️ Upload cancelled');
        onProgress(0);
      } catch (error) {
        onError(`Failed to cancel upload: ${error.message}`);
      }
    }
    setIsUploading(false);
    setIsPaused(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!file || file.size < LARGE_FILE_THRESHOLD) {
    return null; // Don't show chunked upload for small files
  }

  return (
    <div className="chunked-upload-container" style={{ marginTop: '20px', padding: '20px', border: '2px dashed #007bff', borderRadius: '10px', backgroundColor: '#f8f9fa' }}>
      <h4 style={{ color: '#007bff', marginBottom: '15px' }}>📦 Large File Upload</h4>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>File:</strong> {file.name}<br />
        <strong>Size:</strong> {formatFileSize(file.size)}<br />
        <strong>Chunks:</strong> {totalChunks > 0 ? `${uploadedChunks.size}/${totalChunks}` : 'Calculating...'}
      </div>

      {uploadStatus && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px', fontSize: '14px' }}>
          {uploadStatus}
        </div>
      )}

      {uploadProgress > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Progress:</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div style={{ width: '100%', backgroundColor: '#e9ecef', borderRadius: '10px', height: '20px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${uploadProgress}%`, 
                height: '100%', 
                backgroundColor: '#007bff',
                transition: 'width 0.3s ease',
                borderRadius: '10px'
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!isUploading && !uploadId && (
          <button 
            onClick={startUpload}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            🚀 Start Upload
          </button>
        )}

        {!isUploading && uploadId && !isPaused && uploadedChunks.size < totalChunks && (
          <button 
            onClick={resumeUploadManual}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            ▶️ Resume Upload
          </button>
        )}

        {isUploading && (
          <button 
            onClick={pauseUpload}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#ffc107', 
              color: 'black', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            ⏸️ Pause
          </button>
        )}

        {(uploadId || isUploading) && (
          <button 
            onClick={cancelUpload}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            🗑️ Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ChunkedUpload;
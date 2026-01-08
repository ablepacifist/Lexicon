import React, { useState, useEffect } from 'react';

/**
 * Enhanced Upload Progress Bar with speed and ETA calculations
 */
const UploadProgressBar = ({ 
  progress = 0, 
  bytesUploaded = 0, 
  totalBytes = 0, 
  status = 'uploading',
  filename = '',
  showDetails = true 
}) => {
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [previousBytes, setPreviousBytes] = useState(0);
  const [previousTime, setPreviousTime] = useState(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeDiff = (now - previousTime) / 1000; // seconds
    
    if (timeDiff > 0 && bytesUploaded > previousBytes) {
      const bytesDiff = bytesUploaded - previousBytes;
      const speed = bytesDiff / timeDiff; // bytes per second
      setUploadSpeed(speed);
      
      // Calculate ETA
      const remainingBytes = totalBytes - bytesUploaded;
      if (speed > 0) {
        setEta(remainingBytes / speed);
      }
    }
    
    setPreviousBytes(bytesUploaded);
    setPreviousTime(now);
  }, [bytesUploaded, totalBytes]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatEta = (seconds) => {
    if (!isFinite(seconds) || seconds <= 0) return '--';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'initializing': return '⏳';
      case 'uploading': return '📤';
      case 'assembling': return '🔧';
      case 'completed': return '✅';
      case 'paused': return '⏸️';
      case 'error': return '❌';
      default: return '📊';
    }
  };

  const getProgressColor = () => {
    if (status === 'completed') return '#28a745';
    if (status === 'error') return '#dc3545';
    if (status === 'paused') return '#ffc107';
    if (progress < 50) return '#007bff';
    if (progress < 80) return '#17a2b8';
    return '#28a745';
  };

  return (
    <div className="upload-progress-container" style={{
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      marginTop: '15px',
      border: '1px solid #e9ecef'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <span style={{ fontWeight: '600', color: '#333' }}>
          {getStatusIcon()} {filename || 'Uploading...'}
        </span>
        <span style={{ 
          fontWeight: 'bold', 
          color: getProgressColor(),
          fontSize: '1.1rem'
        }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '24px',
        backgroundColor: '#e9ecef',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: `${Math.min(progress, 100)}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${getProgressColor()} 0%, ${getProgressColor()}dd 100%)`,
          transition: 'width 0.3s ease',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {progress > 15 && (
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
              {Math.round(progress)}%
            </span>
          )}
        </div>
        
        {/* Animated stripes for uploading state */}
        {status === 'uploading' && progress < 100 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
            backgroundSize: '40px 40px',
            animation: 'progress-stripes 1s linear infinite',
            borderRadius: '12px'
          }} />
        )}
      </div>

      {/* Details */}
      {showDetails && totalBytes > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '10px',
          fontSize: '0.85rem',
          color: '#6c757d'
        }}>
          <span>
            📊 {formatBytes(bytesUploaded)} / {formatBytes(totalBytes)}
          </span>
          <span>
            ⚡ {formatSpeed(uploadSpeed)}
          </span>
          <span>
            ⏱️ ETA: {status === 'completed' ? 'Done!' : formatEta(eta)}
          </span>
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div style={{
          marginTop: '8px',
          fontSize: '0.9rem',
          color: status === 'error' ? '#dc3545' : '#6c757d',
          fontStyle: 'italic'
        }}>
          {status === 'initializing' && '🔧 Preparing upload...'}
          {status === 'uploading' && '📤 Upload in progress...'}
          {status === 'assembling' && '🔧 Assembling file chunks...'}
          {status === 'completed' && '✅ Upload complete!'}
          {status === 'paused' && '⏸️ Upload paused'}
          {status === 'error' && '❌ Upload failed'}
        </div>
      )}

      {/* Add CSS animation for stripes */}
      <style>
        {`
          @keyframes progress-stripes {
            0% { background-position: 40px 0; }
            100% { background-position: 0 0; }
          }
        `}
      </style>
    </div>
  );
};

export default UploadProgressBar;

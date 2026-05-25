import React, { useState, useEffect, useRef } from 'react';
import StreamLogger from '../utils/StreamLogger';

const LEVEL_COLORS = {
  info: '#61dafb',
  warn: '#f5a623',
  error: '#ff4444',
  success: '#4caf50',
};

function StreamLogPanel() {
  const [logs, setLogs] = useState(StreamLogger.getEntries());
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    return StreamLogger.subscribe(setLogs);
  }, []);

  if (!expanded) {
    const hasErrors = logs.some(l => l.level === 'error');
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed', bottom: 10, right: 10, zIndex: 9999,
          background: hasErrors ? '#ff4444' : '#333', color: '#fff',
          borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
          fontSize: 12, fontFamily: 'monospace', opacity: 0.85,
        }}
      >
        📋 Log ({logs.length}){hasErrors ? ' ⚠️' : ''}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 0, zIndex: 9999,
      width: '100%', maxWidth: 500, height: '50vh',
      background: '#1e1e1e', color: '#ddd', display: 'flex',
      flexDirection: 'column', borderTopLeftRadius: 8,
      fontFamily: 'monospace', fontSize: 11,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#333', borderTopLeftRadius: 8 }}>
        <span style={{ fontWeight: 'bold' }}>Stream Diagnostics ({logs.length})</span>
        <span>
          <button onClick={() => StreamLogger.clear()} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', marginRight: 8 }}>Clear</button>
          <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>✕</button>
        </span>
      </div>
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {logs.map(entry => (
          <div key={entry.id} style={{ marginBottom: 3, borderBottom: '1px solid #333', paddingBottom: 2 }}>
            <span style={{ color: '#888' }}>{entry.time}</span>{' '}
            <span style={{ color: LEVEL_COLORS[entry.level] || '#ddd', fontWeight: 'bold' }}>[{entry.level.toUpperCase()}]</span>{' '}
            <span style={{ color: '#aaa' }}>{entry.source}:</span>{' '}
            <span>{entry.message}</span>
            {entry.data && <div style={{ color: '#888', marginLeft: 16, whiteSpace: 'pre-wrap' }}>{typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}</div>}
          </div>
        ))}
        {logs.length === 0 && <div style={{ color: '#666', padding: 20, textAlign: 'center' }}>No log entries yet</div>}
      </div>
    </div>
  );
}

export default StreamLogPanel;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getApiUrls } from '../utils/apiUrls';
import './PrinterMonitor.css';

const formatTime = seconds => {
  if (typeof seconds !== 'number' || seconds < 0) return 'Unavailable';
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

const temperature = (actual, target) => {
  if (typeof actual !== 'number') return 'Unavailable';
  return `${actual.toFixed(1)} °C${typeof target === 'number' ? ` / ${target.toFixed(1)} °C` : ''}`;
};

export default function PrinterMonitor() {
  const { lexiconApiUrl } = getApiUrls();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let timer;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const response = await fetch(`${lexiconApiUrl}/api/printer-monitor/status`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) throw new Error('Your session has expired. Please sign in again.');
          const body = await response.json();
          throw new Error(body.error || 'Printer status is unavailable.');
        }
        const body = await response.json();
        if (active) {
          setStatus(body);
          setError('');
        }
      } catch (e) {
        if (active) {
          setStatus(null);
          setError(e.message || 'Could not reach the printer monitor.');
        }
      } finally {
        if (active) timer = setTimeout(poll, 10000);
      }
    };
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [lexiconApiUrl]);

  const fields = status && [
    ['Connection', status.connected ? 'Operational' : 'Not operational'],
    ['State', status.state || 'Unavailable'],
    ['Job', status.jobName || 'No active job'],
    ['Progress', typeof status.progress === 'number' ? `${status.progress.toFixed(1)}%` : 'Unavailable'],
    ['Elapsed', formatTime(status.elapsedSeconds)],
    ['Remaining', formatTime(status.remainingSeconds)],
    ['Nozzle (actual / target)', temperature(status.toolActual, status.toolTarget)],
    ['Bed (actual / target)', temperature(status.bedActual, status.bedTarget)],
  ];

  return (
    <div className="printer-page">
      <Navbar />
      <main className="printer-content">
        <Link to="/projects">← Projects</Link>
        <h1>3D Printer Monitor</h1>
        <p>Read-only camera and printer status.</p>
        <section className="printer-panel" aria-labelledby="camera-heading">
          <h2 id="camera-heading">Live camera</h2>
          {cameraError ? (
            <div role="alert">
              <p>Camera unavailable or stream interrupted.</p>
              <button type="button" onClick={() => { setCameraAttempt(n => n + 1); setCameraError(false); }}>Retry camera</button>
            </div>
          ) : (
            <img
              className="printer-camera"
              src={`${lexiconApiUrl}/api/printer-monitor/camera?attempt=${cameraAttempt}`}
              alt="Live view of the 3D printer"
              onError={() => setCameraError(true)}
            />
          )}
        </section>
        <section className="printer-panel" aria-labelledby="status-heading">
          <h2 id="status-heading">Printer status</h2>
          {error && <p role="alert">{error}</p>}
          {!error && !status && <p>Loading printer status…</p>}
          {fields && <dl className="printer-status">{fields.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}</dl>}
        </section>
      </main>
    </div>
  );
}

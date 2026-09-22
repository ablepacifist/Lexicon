import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { UserContext } from '../context/UserContext';
import { getApiUrls } from '../utils/apiUrls';
import Navbar from '../components/Navbar';
import background from '../assets/images/lexicon_room.jpg';

/**
 * Talk to Obrenna from a browser microphone.
 *
 * Aragon holds the mic, the wake word and the speech engines, but aragon is not
 * always somewhere a person can stand. This records a clip here and posts it to
 * /api/voice/turn, which relays it to Lexi on that machine and returns the
 * transcript, the answer, and the answer as audio.
 *
 * Push-to-talk on purpose: no wake word, no streaming, no socket. It exercises
 * the expensive part of the pipeline (transcribe -> brain -> speak) and nothing
 * else, which is what makes it a useful test surface.
 */

// MediaRecorder produces different containers per browser — Opus in WebM on
// Chrome and Firefox, AAC in MP4 on Safari. We do not normalise: the server
// sniffs the container, so we just pick whichever the browser actually supports.
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
};

const VoiceAssistant = () => {
  const { user } = useContext(UserContext);
  const { lexiconApiUrl } = getApiUrls();

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [turns, setTurns] = useState([]); // newest first
  const [relayReady, setRelayReady] = useState(null); // null = unknown

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // getUserMedia needs a secure context. Served over HTTPS this is fine; over
  // plain http on a LAN IP the browser blocks the mic with a confusing error,
  // so say so up front rather than after the user clicks.
  const secure = window.isSecureContext;

  useEffect(() => {
    let cancelled = false;
    fetch(`${lexiconApiUrl}/api/voice/status`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('status failed'))))
      .then((data) => { if (!cancelled) setRelayReady(Boolean(data.configured)); })
      .catch(() => { if (!cancelled) setRelayReady(false); });
    return () => { cancelled = true; };
  }, [lexiconApiUrl]);

  // Release the mic if the user navigates away mid-recording, otherwise the
  // browser keeps showing the recording indicator.
  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  const send = useCallback(async (blob) => {
    setBusy(true);
    setStatus('Transcribing and thinking…');
    setError('');
    try {
      const res = await fetch(`${lexiconApiUrl}/api/voice/turn`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: blob,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail || data.error || `Request failed (${res.status})`);
        return;
      }
      if (data.note === 'no speech detected') {
        setStatus('');
        setError('No speech detected — try again, closer to the mic.');
        return;
      }

      setTurns((prev) => [{ ...data, at: new Date().toLocaleTimeString() }, ...prev]);
      setStatus('');

      if (data.audio_wav_base64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio_wav_base64}`);
        audio.play().catch(() => {
          // Autoplay can be refused until the page has been interacted with.
          // The transcript is already on screen, so this is not fatal.
          setStatus('Answer ready — press play below.');
        });
      }
    } catch (e) {
      setError(`Could not reach the server: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }, [lexiconApiUrl]);

  const start = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size > 0) send(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setStatus('Listening — press again when you are done.');
    } catch (e) {
      setError(
        e.name === 'NotAllowedError'
          ? 'Microphone permission was denied.'
          : `Could not open the microphone: ${e.message}`
      );
    }
  }, [send]);

  const stop = useCallback(() => {
    setRecording(false);
    setStatus('');
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const blocked =
    (!secure && 'This page must be served over HTTPS for the browser to allow microphone access.') ||
    (typeof MediaRecorder === 'undefined' && 'This browser does not support MediaRecorder.') ||
    (relayReady === false && 'The server has no Lexi token configured, or Lexi is not running on aragon.') ||
    '';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
      }}
    >
      <Navbar />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 64px' }}>
        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>Voice assistant</h2>
          <p style={{ marginTop: 0, opacity: 0.8 }}>
            Hold a conversation with Obrenna using this device's microphone. Audio is sent to
            aragon, transcribed there, answered by Obrenna, and spoken back.
          </p>

          {blocked && <div style={warn}>{blocked}</div>}

          <button
            type="button"
            onClick={recording ? stop : start}
            disabled={Boolean(blocked) || busy || !user}
            style={{
              ...button,
              background: recording ? '#a33' : '#4a7',
              cursor: blocked || busy ? 'not-allowed' : 'pointer',
            }}
          >
            {recording ? '■ Stop and send' : busy ? 'Working…' : '● Record'}
          </button>

          {status && <div style={{ marginTop: 12, opacity: 0.85 }}>{status}</div>}
          {error && <div style={{ ...warn, marginTop: 12 }}>{error}</div>}
        </div>

        {turns.map((turn, i) => (
          <div key={`${turn.at}-${i}`} style={panel}>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{turn.at}</div>
            <p style={{ margin: '8px 0' }}><strong>You said:</strong> {turn.transcript}</p>
            <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>
              <strong>Obrenna:</strong> {turn.reply}
            </p>
            {turn.audio_wav_base64 && (
              <audio controls src={`data:audio/wav;base64,${turn.audio_wav_base64}`} style={{ width: '100%' }}>
                <track kind="captions" />
              </audio>
            )}
            {turn.timings && (
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
                transcribe {turn.timings.stt}s · think {turn.timings.brain}s · speak {turn.timings.tts}s
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const panel = {
  background: 'rgba(20, 18, 15, 0.86)',
  color: '#f3e7ce',
  border: '1px solid rgba(243, 231, 206, 0.18)',
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
};

const button = {
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
  padding: '12px 22px',
};

const warn = {
  background: 'rgba(160, 50, 50, 0.25)',
  border: '1px solid rgba(255, 120, 120, 0.4)',
  borderRadius: 8,
  padding: '10px 12px',
};

export default VoiceAssistant;

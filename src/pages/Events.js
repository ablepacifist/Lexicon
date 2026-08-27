import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { getApiUrls } from '../utils/apiUrls';
import Navbar from '../components/Navbar';
import background from '../assets/images/lexicon_room.jpg';
import './Events.css';

// One option per line for the seed-options textarea: trim, drop blank lines.
const parseSeedOptions = (raw) =>
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const Events = () => {
  const { user } = useContext(UserContext);
  const { lexiconApiUrl } = getApiUrls();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Create Event form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState(null); // { type: 'success' | 'error', text }

  // Shareable link "Copied!" confirmation, keyed by event id
  const [copiedId, setCopiedId] = useState(null);

  // Expandable "Add a poll" mini-form, one active at a time, keyed by event id
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollSeedText, setPollSeedText] = useState('');
  const [pollAllowAdd, setPollAllowAdd] = useState(true);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [pollStatus, setPollStatus] = useState(null); // { type: 'success' | 'error', text }

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${lexiconApiUrl}/api/events`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load events');
      setEvents(await res.json());
      setLoadError('');
    } catch (err) {
      console.error('Error fetching events:', err);
      setLoadError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [lexiconApiUrl]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const resetPollForm = () => {
    setPollQuestion('');
    setPollSeedText('');
    setPollAllowAdd(true);
    setPollStatus(null);
  };

  const togglePollForm = (eventId) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(eventId);
      resetPollForm();
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    setCreating(true);
    setCreateStatus(null);
    try {
      const res = await fetch(`${lexiconApiUrl}/api/events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          eventDate: eventDate || null,
          userId: user.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to create event');
      setTitle('');
      setDescription('');
      setEventDate('');
      setCreateStatus({ type: 'success', text: 'Event created!' });
      await fetchEvents();
    } catch (err) {
      console.error('Error creating event:', err);
      setCreateStatus({ type: 'error', text: 'Failed to create event.' });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (eventId) => {
    const link = `${window.location.origin}/events/${eventId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(eventId);
      setTimeout(() => {
        setCopiedId((current) => (current === eventId ? null : current));
      }, 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const handleAddPoll = async (e, eventId) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;
    setPollSubmitting(true);
    setPollStatus(null);
    try {
      const res = await fetch(`${lexiconApiUrl}/api/events/${eventId}/polls`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pollQuestion.trim(),
          allowAddOptions: pollAllowAdd,
          seedOptions: parseSeedOptions(pollSeedText),
        }),
      });
      if (!res.ok) throw new Error('Failed to create poll');
      resetPollForm();
      setExpandedEventId(null);
      await fetchEvents();
    } catch (err) {
      console.error('Error creating poll:', err);
      setPollStatus({ type: 'error', text: 'Failed to add poll.' });
    } finally {
      setPollSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div
      className="events-page"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.78)), url(${background})` }}
    >
      <Navbar />
      <div className="events-shell">
        <div className="events-header">
          <div>
            <h1 className="events-header-title">Events</h1>
            <p className="events-header-subtitle">
              Create an event, add polls, and share one link with friends.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="events-loading">Loading events…</p>
        ) : loadError ? (
          <p className="events-loading">{loadError}</p>
        ) : events.length === 0 ? (
          <p className="events-empty">No events yet — create one below.</p>
        ) : (
          <div className="events-list">
            {events.map((ev) => {
              const link = `${window.location.origin}/events/${ev.id}`;
              const isExpanded = expandedEventId === ev.id;
              const pollCount = ev.pollCount ?? 0;

              return (
                <div className="event-card" key={ev.id}>
                  <div className="event-card-header">
                    <h3 className="event-card-title">{ev.title}</h3>
                    {ev.eventDate && (
                      <span className="event-card-date">
                        {new Date(ev.eventDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {ev.description && <p className="event-card-desc">{ev.description}</p>}

                  <div className="event-card-meta">
                    <span className="event-card-poll-count">{pollCount}</span>
                    <span>{pollCount === 1 ? 'poll' : 'polls'}</span>
                    <Link to={`/events/${ev.id}`} className="events-view-btn">
                      View Event →
                    </Link>
                  </div>

                  <div className="events-share-row">
                    <span className="events-share-label">Link</span>
                    <input
                      className="events-share-link"
                      type="text"
                      readOnly
                      value={link}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      className={`events-copy-btn${copiedId === ev.id ? ' copied' : ''}`}
                      onClick={() => handleCopyLink(ev.id)}
                    >
                      {copiedId === ev.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div className="events-poll-section">
                    <button
                      type="button"
                      className="events-poll-toggle-btn"
                      onClick={() => togglePollForm(ev.id)}
                    >
                      {isExpanded ? '− Cancel' : '+ Add a poll'}
                    </button>

                    {isExpanded && (
                      <form className="events-poll-form" onSubmit={(e) => handleAddPoll(e, ev.id)}>
                        <div className="events-poll-form-row">
                          <label className="events-form-label" htmlFor={`poll-question-${ev.id}`}>
                            Question
                          </label>
                          <input
                            id={`poll-question-${ev.id}`}
                            className="events-poll-input"
                            type="text"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="e.g. Where should we eat?"
                            required
                          />
                        </div>

                        <div className="events-poll-form-row">
                          <label className="events-form-label" htmlFor={`poll-seed-${ev.id}`}>
                            Seed Options
                          </label>
                          <textarea
                            id={`poll-seed-${ev.id}`}
                            className="events-poll-seed-textarea"
                            value={pollSeedText}
                            onChange={(e) => setPollSeedText(e.target.value)}
                            placeholder={'Pizza\nSushi\nTacos'}
                          />
                          <p className="events-poll-seed-hint">One option per line. Blank lines are ignored.</p>
                        </div>

                        <label className="events-toggle-row">
                          <span className="events-toggle-label">Allow guests to add their own options</span>
                          <button
                            type="button"
                            className={`events-switch${pollAllowAdd ? ' on' : ''}`}
                            onClick={() => setPollAllowAdd((prev) => !prev)}
                            aria-pressed={pollAllowAdd}
                          >
                            <span className="events-switch-knob" />
                          </button>
                        </label>

                        <button
                          className="events-poll-submit-btn"
                          type="submit"
                          disabled={pollSubmitting || !pollQuestion.trim()}
                        >
                          {pollSubmitting ? 'Adding…' : 'Add Poll'}
                        </button>

                        {pollStatus && (
                          <p className={`events-form-msg ${pollStatus.type}`}>{pollStatus.text}</p>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="events-create-section">
          <h2 className="events-create-title">Create Event</h2>
          <form className="events-create-form" onSubmit={handleCreateEvent}>
            <div className="events-form-row">
              <label className="events-form-label" htmlFor="event-title">Title</label>
              <input
                id="event-title"
                className="events-form-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My Birthday Aug 7"
                required
              />
            </div>

            <div className="events-form-row">
              <label className="events-form-label" htmlFor="event-description">Description</label>
              <textarea
                id="event-description"
                className="events-form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details for your guests…"
              />
            </div>

            <div className="events-form-row">
              <label className="events-form-label" htmlFor="event-date">Event Date</label>
              <input
                id="event-date"
                className="events-form-input"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="events-form-actions">
              <button className="events-form-btn" type="submit" disabled={creating || !title.trim()}>
                {creating ? 'Creating…' : 'Create Event'}
              </button>
            </div>

            {createStatus && (
              <p className={`events-form-msg ${createStatus.type}`}>{createStatus.text}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Events;

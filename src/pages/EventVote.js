import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getApiUrls } from '../utils/apiUrls';
import Navbar from '../components/Navbar';
import './Events.css';

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Public event overview — route /events/:eventId, no PrivateRoute.
 *
 * Shows the event header and a list of its polls, each a real link to its own
 * dedicated route (/events/:eventId/polls/:pollId — see PollVote.js). Polls are
 * NOT switched in-place here: each one is its own page/route, so there is no
 * shared "which poll is active" state to race on and no way for a slow response
 * for one poll to ever clobber another poll's data.
 *
 * A single-poll event skips this picker entirely and goes straight to the poll.
 */
function EventVote() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { lexiconApiUrl } = getApiUrls();

  const [eventData, setEventData] = useState(null); // { event, polls }
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingEvent(true);
    setEventError('');
    fetch(`${lexiconApiUrl}/api/events/${eventId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setEventData(data);
        const polls = data.polls || [];
        if (polls.length === 1) {
          navigate(`/events/${eventId}/polls/${polls[0].id}`, { replace: true });
        }
      })
      .catch((err) => {
        if (!cancelled) setEventError(err.message || 'Failed to load this event.');
      })
      .finally(() => {
        if (!cancelled) setLoadingEvent(false);
      });
    return () => { cancelled = true; };
  }, [eventId, lexiconApiUrl, navigate]);

  if (loadingEvent) {
    return (
      <div className="poll-vote-page">
        <Navbar />
        <div className="poll-vote-shell">
          <p className="poll-loading">Loading event…</p>
        </div>
      </div>
    );
  }

  if (eventError || !eventData) {
    return (
      <div className="poll-vote-page">
        <Navbar />
        <div className="poll-vote-shell">
          <p className="poll-loading" style={{ color: '#e74c3c' }}>{eventError || 'Event not found.'}</p>
        </div>
      </div>
    );
  }

  const { event, polls = [] } = eventData;

  return (
    <div className="poll-vote-page">
      <Navbar />
      <div className="poll-vote-shell">
        <div className="poll-vote-card">
          <div className="poll-vote-header">
            <h1 className="poll-vote-title">{event.title}</h1>
            {event.eventDate && <p className="poll-vote-date">{formatEventDate(event.eventDate)}</p>}
            {event.description && <p className="poll-vote-desc">{event.description}</p>}
          </div>

          <div className="poll-picker-body">
            {polls.length === 0 ? (
              <p className="poll-empty">This event has no polls yet.</p>
            ) : (
              <>
                <p className="poll-picker-hint">Pick a poll to vote in:</p>
                <div className="poll-picker-list">
                  {polls.map((p) => (
                    <Link
                      key={p.id}
                      to={`/events/${eventId}/polls/${p.id}`}
                      className="poll-picker-card"
                    >
                      {p.question}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventVote;

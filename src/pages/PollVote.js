import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { useVoterIdentity } from '../hooks/useVoterIdentity';
import { getApiUrls } from '../utils/apiUrls';
import Navbar from '../components/Navbar';
import './Events.css';

// Removes the first occurrence of `value` from `arr` (used to drop the caller's own
// name out of a voters list on an optimistic un-vote, without touching same-name others).
function removeFirst(arr, value) {
  const idx = arr.indexOf(value);
  if (idx === -1) return arr;
  const copy = [...arr];
  copy.splice(idx, 1);
  return copy;
}

/**
 * Public poll voting page — route /events/:eventId/polls/:pollId, no PrivateRoute.
 *
 * One poll per page load, tied directly to the URL. This replaces an earlier
 * tab-switching design that kept "which poll is active" as in-component state:
 * that approach had no protection against out-of-order fetch responses, so a
 * slow response for a previously-active poll could resolve after a newer
 * request and silently overwrite the correct poll's data. Routing to a fresh
 * URL per poll removes the shared mutable state entirely — there is nothing
 * for a stale response to race against. The fetch effect below still carries
 * a cancellation guard (the same pattern used elsewhere in this app) as
 * defense in depth for rapid back/forward navigation.
 *
 * Viewing (header, sibling-poll links, and every option row including voter
 * names/counts) requires NO name and NO login. Only the two write actions —
 * checking an option, or adding a new option — require a voterName; if one
 * isn't available yet (logged-out guest with no stored name), the write is
 * deferred behind an inline name prompt and retried automatically once a
 * name is available.
 */
function PollVote() {
  const { eventId, pollId } = useParams();
  const location = useLocation();
  const { user } = useContext(UserContext);
  const { voterKey, voterName, isGuest, setGuestName } = useVoterIdentity(user);
  const { lexiconApiUrl } = getApiUrls();

  const [eventData, setEventData] = useState(null); // { event, polls } — for header + sibling links
  const [pollDetail, setPollDetail] = useState(null); // { poll, options }
  const [loading, setLoading] = useState(true);
  const [pollError, setPollError] = useState('');

  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // { type: 'toggle', optionId } | { type: 'addOption' }

  const [addOptionText, setAddOptionText] = useState('');
  const [addingOption, setAddingOption] = useState(false);

  const loginState = { from: location.pathname + location.search };

  // Load the event (header + sibling polls) and this specific poll's detail
  // together, on mount and whenever the route params or voter identity change.
  // Guarded with a cancellation flag so a slow/stale response from a previous
  // run can never overwrite a newer one.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPollError('');
    const qs = voterKey ? `?voterKey=${encodeURIComponent(voterKey)}` : '';
    Promise.all([
      fetch(`${lexiconApiUrl}/api/events/${eventId}`).then((res) => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      }),
      fetch(`${lexiconApiUrl}/api/events/${eventId}/polls/${pollId}${qs}`).then((res) => {
        if (!res.ok) throw new Error('Poll not found');
        return res.json();
      }),
    ])
      .then(([ev, poll]) => {
        if (cancelled) return;
        setEventData(ev);
        setPollDetail(poll);
      })
      .catch((err) => {
        if (!cancelled) setPollError(err.message || 'Failed to load this poll.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [lexiconApiUrl, eventId, pollId, voterKey]);

  // Recomputes the full checked-set for this poll and PUTs it optimistically.
  const doToggle = (optionId) => {
    if (!pollDetail) return;
    const { options } = pollDetail;
    const target = options.find((o) => o.id === optionId);
    if (!target) return;

    const nowVoted = !target.votedByMe;
    const newCheckedIds = options
      .filter((o) => (o.id === optionId ? nowVoted : o.votedByMe))
      .map((o) => o.id);

    const prevOptions = options;
    const updatedOptions = options.map((o) => {
      if (o.id !== optionId) return o;
      if (nowVoted) {
        return { ...o, votedByMe: true, voteCount: o.voteCount + 1, voters: [...o.voters, voterName] };
      }
      return {
        ...o,
        votedByMe: false,
        voteCount: Math.max(0, o.voteCount - 1),
        voters: removeFirst(o.voters, voterName),
      };
    });

    setPollDetail((pd) => ({ ...pd, options: updatedOptions }));

    fetch(`${lexiconApiUrl}/api/events/${eventId}/polls/${pollId}/votes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterKey, voterName, optionIds: newCheckedIds }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('save failed');
      })
      .catch(() => {
        setPollDetail((pd) => ({ ...pd, options: prevOptions }));
        setPollError('Your vote could not be saved — please try again.');
      });
  };

  const doAddOption = () => {
    const text = addOptionText.trim();
    if (!text) return;
    setAddingOption(true);
    fetch(`${lexiconApiUrl}/api/events/${eventId}/polls/${pollId}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voterKey, voterName }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('add failed');
        return res.json();
      })
      .then((newOption) => {
        setPollDetail((pd) => ({ ...pd, options: [...pd.options, newOption] }));
        setAddOptionText('');
      })
      .catch(() => setPollError('Could not add your idea — please try again.'))
      .finally(() => setAddingOption(false));
  };

  // Entry points for the two gated write actions — open the name prompt first if
  // there's no voterName yet, instead of letting the write fail silently.
  const handleToggleClick = (optionId) => {
    if (!voterName) {
      setPendingAction({ type: 'toggle', optionId });
      setNamePromptOpen(true);
      return;
    }
    doToggle(optionId);
  };

  const handleAddOptionClick = () => {
    if (!addOptionText.trim()) return;
    if (!voterName) {
      setPendingAction({ type: 'addOption' });
      setNamePromptOpen(true);
      return;
    }
    doAddOption();
  };

  const handleNamePromptSubmit = (e) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setGuestName(trimmed);
    setNameInput('');
  };

  // Once a name becomes available (guest submitted one, or a login resolved), retry
  // whatever write action was blocked on it — no need for the visitor to re-click.
  useEffect(() => {
    if (!pendingAction || !voterName) return;
    if (pendingAction.type === 'toggle') {
      doToggle(pendingAction.optionId);
    } else if (pendingAction.type === 'addOption') {
      doAddOption();
    }
    setPendingAction(null);
    setNamePromptOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voterName]);

  if (loading) {
    return (
      <div className="poll-vote-page">
        <Navbar />
        <div className="poll-vote-shell">
          <p className="poll-loading">Loading poll…</p>
        </div>
      </div>
    );
  }

  if (pollError && !pollDetail) {
    return (
      <div className="poll-vote-page">
        <Navbar />
        <div className="poll-vote-shell">
          <p className="poll-loading" style={{ color: '#e74c3c' }}>{pollError}</p>
        </div>
      </div>
    );
  }

  if (!pollDetail || !eventData) return null;

  const { event, polls = [] } = eventData;
  const { options } = pollDetail;
  const allowAddOptions = pollDetail.poll.allowAddOptions !== false;
  const otherPolls = polls.filter((p) => String(p.id) !== String(pollId));

  return (
    <div className="poll-vote-page">
      <Navbar />
      <div className="poll-vote-shell">
        <div className="poll-vote-card">
          <div className="poll-vote-header">
            <Link to={`/events/${eventId}`} className="poll-back-link">← {event.title}</Link>

            {isGuest && (
              <div className="poll-signin-row">
                <span className="poll-signin-hint">
                  {voterName ? `Voting as ${voterName}` : 'Voting as a guest'}
                </span>
                <Link className="poll-signin-link" to="/login" state={loginState}>
                  Sign in for quicker access
                </Link>
              </div>
            )}
          </div>

          {/* Sibling polls — real navigation, no shared "active poll" state to race on */}
          {otherPolls.length > 0 && (
            <div className="poll-tab-bar">
              {otherPolls.map((p) => (
                <Link
                  key={p.id}
                  to={`/events/${eventId}/polls/${p.id}`}
                  className="poll-tab"
                  title={p.question}
                >
                  {p.question}
                </Link>
              ))}
            </div>
          )}

          {/* Inline name prompt — appears only when a write is attempted with no name yet */}
          {namePromptOpen && (
            <div className="poll-name-prompt">
              <p className="poll-name-prompt-text">Enter your name to vote</p>
              <form className="poll-name-prompt-row" onSubmit={handleNamePromptSubmit}>
                <input
                  type="text"
                  className="poll-name-prompt-input"
                  placeholder="Your name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="poll-name-prompt-btn" disabled={!nameInput.trim()}>
                  Continue
                </button>
              </form>
              <p className="poll-name-prompt-signin">
                Already have an account? <Link to="/login" state={loginState}>Sign in</Link>
              </p>
            </div>
          )}

          <div className="poll-body">
            <h2 className="poll-question">{pollDetail.poll.question}</h2>

            {pollError && <p className="poll-loading" style={{ color: '#e74c3c' }}>{pollError}</p>}

            {/* Options table — text, live vote count, and voter names are ALL visible
                to any visitor unconditionally; only the checkbox action is gated. */}
            <div className="poll-options-table">
              {options.length === 0 ? (
                <p className="poll-empty">No options yet — be the first to add one!</p>
              ) : (
                options.map((option) => (
                  <div
                    key={option.id}
                    className={`poll-option-row ${option.votedByMe ? 'voted' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="poll-option-checkbox"
                      checked={!!option.votedByMe}
                      onChange={() => handleToggleClick(option.id)}
                    />
                    <div className="poll-option-main">
                      <div className="poll-option-top">
                        <span className="poll-option-text">
                          {option.text}
                          {option.addedByName && (
                            <span className="poll-option-added-by"> — added by {option.addedByName}</span>
                          )}
                        </span>
                        <span className="poll-option-count">{option.voteCount}</span>
                      </div>
                      {option.voters && option.voters.length > 0 && (
                        <div className="poll-voters">
                          {option.voters.map((name, i) => (
                            <span key={`${option.id}-${i}-${name}`} className="poll-voter-pill">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {allowAddOptions && (
              <div className="poll-add-option-row">
                <input
                  type="text"
                  className="poll-add-option-input"
                  placeholder="Add your own idea…"
                  value={addOptionText}
                  onChange={(e) => setAddOptionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOptionClick();
                    }
                  }}
                />
                <button
                  type="button"
                  className="poll-add-option-btn"
                  onClick={handleAddOptionClick}
                  disabled={!addOptionText.trim() || addingOption}
                >
                  {addingOption ? 'Adding…' : '+ Add'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PollVote;

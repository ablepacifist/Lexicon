import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import Navbar from '../components/Navbar';
import { alchemyFetch, alchemyError } from '../utils/alchemyApi';
import background from '../assets/images/dashboard_background.webp';
import './PageStyles.css';
import './AlchemyDashboard.css';

/** Every effect the player has discovered, grouped by ingredient. */
const KnowledgeBook = () => {
  const { user } = useContext(UserContext);
  const [knowledge, setKnowledge] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const playerId = user?.id;

  const fetchKnowledge = useCallback(async () => {
    if (playerId === undefined || playerId === null) return;
    setLoading(true);
    setError('');
    try {
      const response = await alchemyFetch(`/api/player/knowledge/${playerId}`);
      if (response.ok) {
        const data = await response.json();
        setKnowledge(Array.isArray(data) ? data : []);
      } else {
        // The raw response body used to be shown here as the error.
        setError(await alchemyError(response, "Couldn't load your knowledge book."));
      }
    } catch (e) {
      setError(e.message || "Couldn't reach the Alchemy server.");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => { fetchKnowledge(); }, [fetchKnowledge]);

  return (
    <>
      <Navbar />
      <main className="alchemy-page">
        <div className="alchemy-page__bg" style={{ backgroundImage: `url(${background})` }} aria-hidden="true" />
        <div className="alchemy-shell">
          <header className="alchemy-header">
            <div>
              <h1>Knowledge book</h1>
              <p>Every effect you have discovered, by ingredient.</p>
            </div>
          </header>

          {loading && knowledge.length === 0 && (
            <div className="lx-state" aria-busy="true" style={{ minHeight: '30vh' }}>
              <div className="lx-spinner" aria-hidden="true" />
            </div>
          )}

          {error && (
            <div className="lx-alert lx-alert--error" role="alert">
              {error}{' '}
              <button type="button" className="lx-btn lx-btn--secondary" onClick={fetchKnowledge}>Try again</button>
            </div>
          )}

          {!loading && !error && knowledge.length === 0 && (
            <section className="alchemy-panel">
              <p className="alchemy-muted">You haven't discovered any effects yet. Eat ingredients to learn what they do.</p>
            </section>
          )}

          {knowledge.length > 0 && (
            <div className="alchemy-panels">
              {knowledge.map((entry) => (
                <section className="alchemy-panel" key={entry.ingredientId ?? entry.ingredientName}>
                  <h2>{entry.ingredientName}</h2>
                  <ul className="item-modal__list">
                    {(entry.effects || []).map((eff) => (
                      <li key={eff.id}><strong>{eff.title}</strong>: {eff.description}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <div className="alchemy-footer">
            <Link className="lx-btn lx-btn--secondary" to="/alchemy-dashboard">Back to Alchemy</Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default KnowledgeBook;

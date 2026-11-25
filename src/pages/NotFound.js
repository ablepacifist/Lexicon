import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './PageStyles.css';

/**
 * A real "not found". The old catch-all quietly redirected to the home page, so a
 * mistyped or stale link looked like the site had ignored the click.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="page">
        <div className="lx-state">
          <h1>Page not found</h1>
          <p>That link doesn't lead anywhere — it may be old, or mistyped.</p>
          <div className="lx-state__actions">
            <Link className="lx-btn lx-btn--primary" to="/">Go to the home page</Link>
          </div>
        </div>
      </main>
    </>
  );
}

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import background from '../assets/images/background.webp';
import Navbar from '../components/Navbar';
import { getApiUrls } from '../utils/apiUrls';
import './PageStyles.css';
import './AuthPages.css';

const { lexiconApiUrl: API_URL } = getApiUrls();

/** The server's 400 reasons are written for people ("Passwords do not match"); show them. */
async function reasonFrom(response) {
  try {
    const text = (await response.text()).trim();
    if (text && text.length <= 200 && !text.startsWith('<')) return text;
  } catch {
    /* fall through */
  }
  return null;
}

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword }),
      });
      if (response.status === 400) {
        // e.g. "Username already exists" — the old page threw this away and said only
        // "Registration failed", which left people guessing.
        setError((await reasonFrom(response)) || 'Those details were not accepted. Please check them and try again.');
        return;
      }
      if (!response.ok) {
        // A 500 carries internal detail; it is not for the person filling in the form.
        setError('The server had a problem creating your account. Please try again in a moment.');
        return;
      }
      // Hand the success to the sign-in page, so it is said rather than just implied.
      navigate('/login', {
        replace: true,
        state: { ...location.state, registered: username },
      });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="auth-page">
        <div className="auth-page__bg" style={{ backgroundImage: `url(${background})` }} aria-hidden="true" />
        <div className="auth-card">
          <h1>Create an account</h1>
          <form onSubmit={handleSubmit} noValidate>
            <div className="lx-field">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="lx-field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="lx-field">
              <label htmlFor="register-confirm">Confirm password</label>
              <input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <div className="lx-alert lx-alert--error" role="alert">{error}</div>}
            <button
              type="submit"
              className="lx-btn lx-btn--primary"
              disabled={submitting || !username || !password || !confirmPassword}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login" state={location.state}>Sign in</Link>
          </p>
        </div>
      </main>
    </>
  );
};

export default Register;

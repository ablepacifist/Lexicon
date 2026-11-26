import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import background from '../assets/images/background.webp';
import Navbar from '../components/Navbar';
import { getApiUrls } from '../utils/apiUrls';
import { isNativePlatform } from '../utils/native';
import { apiFetch, setMobileToken } from '../utils/apiFetch';
import { toSessionUser } from '../utils/sessionUser';
import './PageStyles.css';
import './AuthPages.css';

const { lexiconApiUrl: API_URL } = getApiUrls();

const Login = () => {
  const location = useLocation();
  // Set by Register on success, so the new account is confirmed instead of implied.
  const registered = location.state?.registered;
  const [username, setUsername] = useState(registered || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { setUser } = useContext(UserContext);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const redirectTo = location.state?.from || '/app-selector';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // one request at a time; double-clicks used to send two
    setError('');
    setSubmitting(true);

    let response;
    try {
      const native = isNativePlatform();
      response = await apiFetch(`${API_URL}/api/auth/login`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // platform: 'mobile' asks the backend for a bearer token alongside the session
        body: JSON.stringify({ username, password, rememberMe, ...(native ? { platform: 'mobile' } : {}) }),
      });

      if (response.status === 429) {
        // Too many wrong passwords in a row: the server asks the person to wait before trying again
        setError('Too many failed attempts. Please wait a minute and try again.');
        return;
      }
      if (response.status === 401 || response.status === 400) {
        setError('Invalid username or password.');
        return;
      }
      if (!response.ok) {
        setError('The server had a problem signing you in. Please try again in a moment.');
        return;
      }

      const data = await response.json();

      // Android shell: persist the bearer token so the session survives app restarts
      if (native && data.mobileToken) {
        setMobileToken(data.mobileToken);
      }

      // Update context with session-based info - use 'id' field which AuthController returns
      setUser(toSessionUser(data));
      navigate(redirectTo, { replace: true });
    } catch {
      // A failed fetch is not a wrong password: say what actually happened.
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
          <h1>Sign in</h1>
          {registered
            ? <div className="lx-alert lx-alert--success" role="status">Account created. Sign in to get started.</div>
            : <p className="auth-card__lede">Welcome back.</p>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="lx-field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
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
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="auth-check">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>
            {error && <div className="lx-alert lx-alert--error" role="alert">{error}</div>}
            <button
              type="submit"
              className="lx-btn lx-btn--primary"
              disabled={submitting || !username || !password}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="auth-switch">
            Don't have an account? <Link to="/register" state={location.state}>Create one</Link>
          </p>
        </div>
      </main>
    </>
  );
};

export default Login;

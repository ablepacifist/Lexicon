// src/AppRoutes.js
import React, { Suspense, lazy, useContext, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import PokemonSessionGate from './components/PokemonSessionGate';
import Landing from './pages/Landing';
import { getApiUrls } from './utils/apiUrls';
import { toSessionUser } from './utils/sessionUser';
import { SESSION_EXPIRED_EVENT } from './utils/session';
import './pages/PageStyles.css';

// Every page but the landing page is split into its own chunk. Before this the whole
// site — three.js for the catch screen, leaflet for the map, 40-odd routes — was one
// 1.38 MB bundle that every visitor downloaded just to see the home page.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AppSelector = lazy(() => import('./pages/AppSelector'));
const AlchemyDashboard = lazy(() => import('./pages/AlchemyDashboard'));
const LexiconDashboard = lazy(() => import('./pages/LexiconDashboard'));
const MediaUploadDownload = lazy(() => import('./pages/MediaUploadDownload'));
const VideoPlayer = lazy(() => import('./pages/VideoPlayer'));
const AudioPlayer = lazy(() => import('./pages/AudioPlayer'));
const Audiobooks = lazy(() => import('./pages/Audiobooks'));
const About = lazy(() => import('./pages/About'));
const Profile = lazy(() => import('./components/Profile'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const KnowledgeBook = lazy(() => import('./pages/KnowledgeBook'));
const PlaylistManager = lazy(() => import('./pages/PlaylistManager'));
const MusicLiveStream = lazy(() => import('./pages/MusicLiveStream'));
const VideoLiveStream = lazy(() => import('./pages/VideoLiveStream'));
const QueueManager = lazy(() => import('./pages/QueueManager'));
const Career = lazy(() => import('./pages/Career'));
const Recipes = lazy(() => import('./pages/Recipes'));
const Blog = lazy(() => import('./pages/Blog'));
const Projects = lazy(() => import('./pages/Projects'));
const DndCampaigns = lazy(() => import('./pages/DndCampaigns'));
const HoldfastManager = lazy(() => import('./pages/HoldfastManager'));
const PokemonMap = lazy(() => import('./pages/PokemonMap'));
const Pokedex = lazy(() => import('./pages/Pokedex'));
const PokemonDetail = lazy(() => import('./pages/PokemonDetail'));
const PokemonShop = lazy(() => import('./pages/PokemonShop'));
const PokemonItems = lazy(() => import('./pages/PokemonItems'));
const MyPokemon = lazy(() => import('./pages/MyPokemon'));
const EggsPage = lazy(() => import('./pages/EggsPage'));
const Events = lazy(() => import('./pages/Events'));
const EventVote = lazy(() => import('./pages/EventVote'));
const PollVote = lazy(() => import('./pages/PollVote'));
const PrinterMonitor = lazy(() => import('./pages/PrinterMonitor'));
const NotFound = lazy(() => import('./pages/NotFound'));

const { lexiconApiUrl: API_URL } = getApiUrls();

/** How long the session check may take before the app stops waiting on it. */
const SESSION_CHECK_TIMEOUT_MS = 8000;

/** Shown while a page's code or the session is still arriving. */
function PageLoading({ label = 'Loading…' }) {
  return (
    <main className="page">
      <div className="lx-state" aria-busy="true">
        <div className="lx-spinner" aria-hidden="true" />
        <p>{label}</p>
      </div>
    </main>
  );
}

function PrivateRoute({ children }) {
  const { user } = useContext(UserContext);
  const location = useLocation();
  // Only private pages wait for the session check; public ones never did need to.
  if (user === undefined) return <PageLoading label="Checking your session…" />;
  if (!user) {
    // Save the attempted URL so login can redirect back
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return children;
}

/** Wraps a private page, plus the Pokémon session for PokéWorld pages. */
const priv = (page) => <PrivateRoute>{page}</PrivateRoute>;
const poke = (page) => <PrivateRoute><PokemonSessionGate>{page}</PokemonSessionGate></PrivateRoute>;

function AppRoutes() {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  // Who is signed in. Public pages render immediately instead of waiting on this — the
  // landing page used to sit on an unstyled "Loading session…" until the API answered,
  // and indefinitely if it never did.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);
    fetch(`${API_URL}/api/auth/me`, { credentials: 'include', signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('not authenticated');
        return res.json();
      })
      .then(data => setUser(toSessionUser(data)))
      .catch(() => setUser(null))
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [setUser]);

  // An expired session, reported by authFetch from any page, is handled here, once.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      const here = locationRef.current;
      if (here.pathname !== '/login') {
        navigate('/login', { replace: true, state: { from: here.pathname + here.search } });
      }
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [navigate, setUser]);

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/career" element={<Career />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/dnd" element={<DndCampaigns />} />
        <Route path="/events/:eventId" element={<EventVote />} />
        <Route path="/events/:eventId/polls/:pollId" element={<PollVote />} />

        {/* Signed in */}
        <Route path="/app-selector" element={priv(<AppSelector />)} />
        <Route path="/alchemy-dashboard" element={priv(<AlchemyDashboard />)} />
        <Route path="/knowledge" element={priv(<KnowledgeBook />)} />
        <Route path="/holdfast" element={priv(<HoldfastManager />)} />
        <Route path="/lexicon-dashboard" element={priv(<LexiconDashboard />)} />
        <Route path="/printer-monitor" element={priv(<PrinterMonitor />)} />
        <Route path="/media-upload" element={priv(<MediaUploadDownload />)} />
        <Route path="/video-player" element={priv(<VideoPlayer />)} />
        <Route path="/video-player/:id" element={priv(<VideoPlayer />)} />
        <Route path="/video-player/playlist/:playlistId" element={priv(<VideoPlayer />)} />
        <Route path="/audio-player" element={priv(<AudioPlayer />)} />
        <Route path="/audio-player/:id" element={priv(<AudioPlayer />)} />
        <Route path="/audio-player/playlist/:playlistId" element={priv(<AudioPlayer />)} />
        <Route path="/audiobooks" element={priv(<Audiobooks />)} />
        <Route path="/audiobooks/:id" element={priv(<Audiobooks />)} />
        <Route path="/playlist-manager" element={priv(<PlaylistManager />)} />
        <Route path="/music-stream" element={priv(<MusicLiveStream />)} />
        <Route path="/video-stream" element={priv(<VideoLiveStream />)} />
        <Route path="/live-stream" element={<Navigate to="/video-stream" replace />} />
        <Route path="/queue-manager" element={priv(<QueueManager />)} />
        <Route path="/profile" element={priv(<Profile />)} />
        <Route path="/admin/users" element={priv(<AdminUsers />)} />
        <Route path="/events" element={priv(<Events />)} />

        {/* PokéWorld */}
        <Route path="/pokemon" element={poke(<PokemonMap />)} />
        <Route path="/pokemon/pokedex" element={poke(<Pokedex />)} />
        <Route path="/pokemon/pokemon" element={poke(<MyPokemon />)} />
        <Route path="/pokemon/shop" element={poke(<PokemonShop />)} />
        <Route path="/pokemon/items" element={poke(<PokemonItems />)} />
        <Route path="/pokemon/eggs" element={poke(<EggsPage />)} />
        <Route path="/pokemon/:id" element={poke(<PokemonDetail />)} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;

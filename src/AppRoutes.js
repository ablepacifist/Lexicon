// src/AppRoutes.js
import React, { useEffect, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserContext } from './context/UserContext';

import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AppSelector from './pages/AppSelector';
import AlchemyDashboard from './pages/AlchemyDashboard';
import LexiconDashboard from './pages/LexiconDashboard';
import MediaUploadDownload from './pages/MediaUploadDownload';
import MediaPlayer from './pages/MediaPlayer';
import MediaStream from './pages/MediaStream';
import VideoPlayer from './pages/VideoPlayer';
import AudioPlayer from './pages/AudioPlayer';
import Audiobooks from './pages/Audiobooks';
import About from './pages/About';
import Profile from './components/Profile';
import KnowledgeBook from './pages/KnowledgeBook';
import PlaylistManager from './pages/PlaylistManager';
import MusicLiveStream from './pages/MusicLiveStream';
import VideoLiveStream from './pages/VideoLiveStream';
import QueueManager from './pages/QueueManager';

// New pages
import Career from './pages/Career';
import Recipes from './pages/Recipes';
import Blog from './pages/Blog';
import Projects from './pages/Projects';
import DndCampaigns from './pages/DndCampaigns';

// Use Lexicon API for session management so session works with media requests
const API_URL = process.env.REACT_APP_LEXICON_API_URL || process.env.REACT_APP_API_URL;

function PrivateRoute({ children }) {
  const { user } = useContext(UserContext);
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, setUser } = useContext(UserContext); 
  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('not authenticated');
        return res.json();
      })
      .then(data => {
        setUser({ id: data.id, username: data.username, displayName: data.displayName });
      })
      .catch(() => {
        setUser(null);
      });
  }, [setUser]);

  if (user === undefined) {
    return <div>Loading session…</div>; // <-- ADDED: Hold routes until session state is resolved
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app-selector" element={
        <PrivateRoute><AppSelector /></PrivateRoute>
      } />
      <Route path="/alchemy-dashboard" element={
        <PrivateRoute><AlchemyDashboard /></PrivateRoute>
      } />
      <Route path="/lexicon-dashboard" element={
        <PrivateRoute><LexiconDashboard /></PrivateRoute>
      } />
      <Route path="/media-upload" element={
        <PrivateRoute><MediaUploadDownload /></PrivateRoute>
      } />
      <Route path="/media-player" element={
        <PrivateRoute><MediaPlayer /></PrivateRoute>
      } />
      <Route path="/media-stream" element={
        <PrivateRoute><MediaStream /></PrivateRoute>
      } />
      <Route path="/video-player" element={
        <PrivateRoute><VideoPlayer /></PrivateRoute>
      } />
      <Route path="/audio-player" element={
        <PrivateRoute><AudioPlayer /></PrivateRoute>
      } />
      <Route path="/audiobooks" element={
        <PrivateRoute><Audiobooks /></PrivateRoute>
      } />
      <Route path="/playlist-manager" element={
        <PrivateRoute><PlaylistManager /></PrivateRoute>
      } />
      <Route path="/music-stream" element={
        <PrivateRoute><MusicLiveStream /></PrivateRoute>
      } />
      <Route path="/video-stream" element={
        <PrivateRoute><VideoLiveStream /></PrivateRoute>
      } />
      <Route path="/live-stream" element={<Navigate to="/video-stream" />} />
      <Route path="/queue-manager" element={
        <PrivateRoute><QueueManager /></PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute><Profile /></PrivateRoute>
      } />
      <Route path="/knowledge" element={
        <PrivateRoute><KnowledgeBook /></PrivateRoute>
      } />
      <Route path="/about" element={<About />} />

      {/* New public pages */}
      <Route path="/career" element={<Career />} />
      <Route path="/recipes" element={<Recipes />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/dnd" element={<DndCampaigns />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default AppRoutes;

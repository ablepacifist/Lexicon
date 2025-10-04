// src/AppRoutes.js
import React, { useEffect, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserContext } from './context/UserContext';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import Profile from './components/Profile';
import KnowledgeBook from './pages/KnowledgeBook';

const API_URL = process.env.REACT_APP_API_URL;

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
        setUser({ id: data.id, username: data.username });
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
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <PrivateRoute><Dashboard /></PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute><Profile /></PrivateRoute>
      } />
      <Route path="/knowledge" element={
        <PrivateRoute><KnowledgeBook /></PrivateRoute>
      } />
      <Route path="/about" element={<About />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default AppRoutes;

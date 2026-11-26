import React, { createContext, useContext } from 'react';
import { UserContext } from './UserContext';
import { useNotifications } from '../hooks/useNotifications';

/**
 * One notification connection for the whole visit.
 *
 * Every page renders its own <Navbar>, and the Navbar used to call useNotifications
 * itself, so each navigation tore down the EventSource and opened a new one, plus three
 * fetches for history, unread count and preferences. Held here, above the routes, the
 * stream opens once per signed-in user and survives page changes.
 */
const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useContext(UserContext);
  const value = useNotifications(user);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext() {
  return useContext(NotificationsContext);
}

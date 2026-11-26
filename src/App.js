import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import AppRoutes from './AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationsProvider } from './context/NotificationsContext';

/** Inside the router so a crash on one page clears as soon as the user navigates away. */
function RoutedApp() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <AppRoutes />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <UserProvider>
      <NotificationsProvider>
        <Router>
          <RoutedApp />
        </Router>
      </NotificationsProvider>
    </UserProvider>
  );
}

export default App;

import React from 'react';
import ReactDOM from 'react-dom/client';
// Inter, self-hosted. It used to come from fonts.googleapis.com through two render-
// blocking @imports, which the site's own CSP (font-src 'self') would block once it is
// enforced. Each weight's CSS declares unicode-range, so only the subsets a page uses
// are downloaded.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import './index.css';
import './responsive.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { installNativeFetchAuth } from './utils/apiFetch';

// Android shell only: attach the stored bearer token to Lexicon API requests.
// Must run before the first component fetch. No-op in a browser.
installNativeFetchAuth();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import '@fontsource/fraunces/latin-400.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-400-italic.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import './styles.css';
import { SessionProvider } from './lib/session';
import { Layout } from './components/Layout';
import { Join } from './pages/Join';
import { Taste } from './pages/Taste';
import { Results } from './pages/Results';
import { Qr } from './pages/Qr';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/join" replace />} />
            <Route path="/join" element={<Join />} />
            <Route path="/taste" element={<Taste />} />
            <Route path="/results" element={<Results />} />
            <Route path="/qr" element={<Qr />} />
            <Route
              path="*"
              element={
                <main className="page empty-state">
                  <h1>This table isn’t set.</h1>
                  <Link to="/join">Back to the beer hall</Link>
                </main>
              }
            />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);

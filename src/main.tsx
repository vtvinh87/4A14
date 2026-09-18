import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProgressMapFixturePage } from './components/progress/ProgressMapFixturePage';
import './styles.css';

const isProgressMapFixture = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('progress-map-fixture') === '1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isProgressMapFixture ? <ProgressMapFixturePage /> : <App />}
  </StrictMode>,
);

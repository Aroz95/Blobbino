import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import './boot.js';
import App from './ui/App.jsx';

// il gioco parte per primo (boot.js), poi React disegna le parti già convertite
createRoot(document.getElementById('react-root')).render(<StrictMode><App/></StrictMode>);

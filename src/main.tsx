import { createRoot } from 'react-dom/client';
import '@fontsource/cinzel/400.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(<App />);

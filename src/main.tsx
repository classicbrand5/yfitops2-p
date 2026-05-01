// Monaco worker environment — MUST be first before any monaco import
import './editor/monacoEnv';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

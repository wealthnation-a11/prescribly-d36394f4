import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n';

// Register service worker for PWA
import './registerSW';

// Initialize native plugins for Capacitor
import { initializeNativePlugins } from './lib/nativePlugins';

initializeNativePlugins();

createRoot(document.getElementById("root")!).render(<App />);

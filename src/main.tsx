import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdProvider } from "@/components/ads/AdProvider";
import App from './App.tsx'
import './index.css'
import './i18n';

// Register service worker for PWA
import './registerSW';

// Initialize native plugins for Capacitor
import { initializeNativePlugins } from './lib/nativePlugins';

initializeNativePlugins();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AdProvider>
      <App />
    </AdProvider>
  </QueryClientProvider>
);

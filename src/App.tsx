import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { ScanProvider } from './context/ScanContext';
import { store } from './store/store';
import { useEffect, lazy, Suspense } from 'react';

const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TradePage = lazy(() => import('./pages/TradePage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
import SyncManager from './components/SyncManager';

function App() {
  useEffect(() => {
    store.getSettings().then(settings => {
      if (settings.plainMode) {
        document.body.classList.add('plain-mode');
      } else {
        document.body.classList.remove('plain-mode');
      }
    });
  }, []);

  return (
    <ScanProvider>
      <BrowserRouter>
        <div className="min-h-screen w-full relative">
          <Suspense fallback={<div className="flex items-center justify-center h-full w-full bg-[#0B1120] text-white">Loading...</div>}>
            <Routes>
              <Route path="/" element={<CollectionPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/trade" element={<TradePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/friends" element={<FriendsPage />} />
            </Routes>
            <SyncManager />
          </Suspense>
          <BottomNav />
        </div>
      </BrowserRouter>
    </ScanProvider>
  );
}

export default App;

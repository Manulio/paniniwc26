import { useState, useEffect } from 'react';
import { Save, Download, Upload, MessageCircle, Settings as SettingsIcon, ArrowLeft, Cloud, LogOut, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { store } from '../store/store';
import stickersData from '../data/stickers.json';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import ScanHistoryModal from '../components/ScanHistoryModal';

export default function SettingsPage() {
  const [plainMode, setPlainMode] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [user, loading] = useAuthState(auth);
  const [syncStatus, setSyncStatus] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isClosingHistory, setIsClosingHistory] = useState(false);

  const handleCloseHistory = () => {
    setIsClosingHistory(true);
    setTimeout(() => {
      setShowHistoryModal(false);
      setIsClosingHistory(false);
    }, 400);
  };

  useEffect(() => {
    store.getSettings().then(settings => {
      setPlainMode(settings.plainMode || false);
    });
  }, []);

  const handleSaveSettings = async () => {
    await store.saveSettings({ plainMode });
    
    // Immediately apply to body
    if (plainMode) {
      document.body.classList.add('plain-mode');
    } else {
      document.body.classList.remove('plain-mode');
    }
    
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleExportJson = async () => {
    const collection = await store.getCollection();
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `album-2026-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await store.saveCollection(json);
        alert('Collection imported successfully!');
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleWhatsAppExport = async () => {
    const collection = await store.getCollection();
    const duplicates = Object.keys(collection).filter(id => collection[id].duplicates > 0);
    
    if (duplicates.length === 0) {
      alert('You have no duplicate stickers to share!');
      return;
    }

    let message = '🏆 *My Panini 2026 Duplicates* 🏆\n\n';
    
    // Group duplicates by team
    const byTeam: Record<string, string[]> = {};
    duplicates.forEach(id => {
      const sticker = stickersData.find(s => s.id === id);
      if (sticker) {
        if (!byTeam[sticker.team]) byTeam[sticker.team] = [];
        byTeam[sticker.team].push(`${sticker.number} (${collection[id].duplicates}x)`);
      }
    });

    Object.entries(byTeam).forEach(([team, list]) => {
      message += `*${team}*\n${list.join(', ')}\n\n`;
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Failed to login with Google.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSyncToCloud = async () => {
    if (!user) return;
    setSyncStatus('Syncing to cloud...');
    try {
      const collection = await store.getCollection();
      await setDoc(doc(db, 'users', user.uid), {
        collection,
        lastUpdated: new Date().toISOString()
      });
      setSyncStatus('Synced successfully!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('Sync failed.');
    }
  };

  const handleSyncFromCloud = async () => {
    if (!user) return;
    setSyncStatus('Downloading from cloud...');
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.collection) {
          await store.saveCollection(data.collection);
          setSyncStatus('Downloaded successfully!');
        } else {
          setSyncStatus('No collection found in cloud.');
        }
      } else {
        setSyncStatus('No collection found in cloud.');
      }
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('Download failed.');
    }
  };

  return (
    <div className="min-h-screen w-full pb-20">
      <div className="p-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] space-y-8 max-w-2xl mx-auto pb-24">
        <header className="mb-8 text-center relative">
          <div className="absolute left-0 top-0">
            <Link to="/" className="text-white/60 hover:text-white transition-colors apple-glass-button p-2 rounded-full inline-block">
              <ArrowLeft size={24} />
            </Link>
          </div>
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-full mb-4 apple-glass-panel">
            <SettingsIcon size={32} className="text-white/80" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white mb-2 drop-shadow-sm">
            Settings
          </h1>
          <p className="text-white/60 font-medium">Manage your data and API configurations.</p>
        </header>

        <section className="apple-glass-panel p-6 rounded-2xl space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-xl font-black text-white flex items-center">
            <Cloud className="mr-3 text-orange-400" size={24} /> Cloud Account
          </h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Sign in with Google to sync your collection across devices and keep it safe in the cloud.
          </p>
          
          {!loading && !user ? (
            <button
              onClick={handleLogin}
              className="w-full bg-white text-black font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center active:scale-95 shadow-md"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-3" />
              SIGN IN WITH GOOGLE
            </button>
          ) : !loading && user ? (
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-xl border border-white/10">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold">{user.email?.charAt(0).toUpperCase()}</div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{user.displayName || 'User'}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
                <button onClick={handleLogout} className="p-2 bg-red-500/20 text-red-400 rounded-lg active:scale-95">
                  <LogOut size={18} />
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSyncToCloud}
                  className="flex-1 apple-glass-button text-orange-400 font-bold py-3 px-2 rounded-xl transition-all flex items-center justify-center active:scale-95 text-sm"
                >
                  <Upload className="mr-2" size={16} />
                  SAVE TO CLOUD
                </button>
                <button
                  onClick={handleSyncFromCloud}
                  className="flex-1 apple-glass-button text-blue-400 font-bold py-3 px-2 rounded-xl transition-all flex items-center justify-center active:scale-95 text-sm"
                >
                  <Download className="mr-2" size={16} />
                  LOAD FROM CLOUD
                </button>
              </div>
              {syncStatus && (
                <p className="text-orange-300 text-center text-sm font-bold mt-2">
                  {syncStatus}
                </p>
              )}
            </div>
          ) : (
            <div className="w-full text-center py-4 text-white/50 font-bold">Loading...</div>
          )}
        </section>

        <section className="apple-glass-panel p-6 rounded-2xl space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-xl font-black text-white flex items-center">
            <History className="mr-3 text-purple-400" size={24} /> Scan History
          </h2>
          <p className="text-sm text-white/60 mb-6 leading-relaxed">
            View the history of your recent scans, including the date and the specific stickers you found.
          </p>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="w-full apple-glass-button text-purple-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center active:scale-95"
          >
            <History className="mr-2" size={20} />
            VIEW SCAN HISTORY
          </button>
        </section>

        <section className="apple-glass-panel p-6 rounded-2xl space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-xl font-black text-white mb-4 flex items-center">
            <MessageCircle className="mr-3 text-green-400" size={24} /> Export to WhatsApp
          </h2>
          <p className="text-sm text-white/60 mb-6 leading-relaxed">
            Generate a text list of all your duplicate stickers grouped by team and open WhatsApp to share it with your friends.
          </p>
          <button
            onClick={handleWhatsAppExport}
            className="w-full apple-glass-button text-green-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center active:scale-95"
          >
            <MessageCircle className="mr-2" size={20} />
            SHARE DUPLICATES
          </button>
        </section>

        <section className="apple-glass-panel p-6 rounded-2xl space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-xl font-black text-white flex items-center">
            <SettingsIcon className="mr-3 text-red-400" size={24} /> Application Settings
          </h2>
          
          <div className="pt-4 border-t border-white/10">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-500 rounded-md border-white/20 bg-white/10 focus:ring-blue-500"
                checked={plainMode}
                onChange={(e) => setPlainMode(e.target.checked)}
              />
              <span className="ml-3 text-white font-bold">Enable Plain Mode (HTML/Basic)</span>
            </label>
            <p className="text-xs text-white/50 mt-2 ml-8 font-medium">
              Removes all animations, colors, and modern styling for a bare-bones experience.
            </p>
          </div>
          <button
            onClick={handleSaveSettings}
            className="w-full apple-glass-button text-blue-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center active:scale-95"
          >
            <Save className="mr-2" size={20} />
            SAVE SETTINGS
          </button>
          {saveMessage && (
            <p className="text-green-400 text-center font-bold mt-2">
              {saveMessage}
            </p>
          )}
        </section>

        <section className="apple-glass-panel p-6 rounded-2xl space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-xl font-black text-white flex items-center">
            <Download className="mr-3 text-blue-400" size={24} /> Data Backup
          </h2>
          <p className="text-sm text-white/60 mb-6 leading-relaxed">
            Export your entire collection to a JSON file to back it up, or import a previous backup to restore your progress.
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleExportJson}
              className="flex-1 apple-glass-button text-blue-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center active:scale-95"
            >
              <Download className="mr-2" size={20} />
              EXPORT
            </button>
            
            <label className="flex-1 apple-glass-button text-red-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95">
              <Upload className="mr-2" size={20} />
              IMPORT
              <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            </label>
          </div>
        </section>
      </div>

      {showHistoryModal && (
        <ScanHistoryModal 
          onClose={handleCloseHistory} 
          isClosing={isClosingHistory} 
        />
      )}
    </div>
  );
}

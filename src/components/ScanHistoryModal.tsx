import { useState, useEffect } from 'react';
import { X, History, ImageIcon, Loader2 } from 'lucide-react';
import { store } from '../store/store';
import type { ScanHistoryEntry } from '../store/store';
import { getTeamEmoji } from '../utils/teamEmojis';
import { useScanContext } from '../context/ScanContext';

interface ScanHistoryModalProps {
  onClose: () => void;
  isClosing: boolean;
}

export default function ScanHistoryModal({ onClose, isClosing }: ScanHistoryModalProps) {
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const { isScanning, currentImage, progress, queueLength, recentlyFound } = useScanContext();

  useEffect(() => {
    const fetchHistory = () => {
      store.getScanHistory().then(setHistory).catch(console.error);
    };
    fetchHistory();

    if (typeof window !== 'undefined') {
      window.addEventListener('history-updated', fetchHistory);
      return () => window.removeEventListener('history-updated', fetchHistory);
    }
  }, []);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className={`fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-md ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={onClose}>
      <div className={`glass-panel bg-slate-900/60 w-full sm:max-w-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col rounded-t-3xl sm:rounded-3xl  sm:pb-0 max-h-[92vh] sm:max-h-[90vh] ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
          <h3 className="text-xl font-black text-white flex items-center">
            <History className="mr-3 text-purple-400" size={24} />
            Historial de Escaneos
          </h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white apple-glass-button rounded-full p-1.5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col space-y-4">

          {/* Active Scan Indicator */}
          {isScanning && (
            <div className="apple-glass-button border border-blue-400/30 rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="text-blue-400 animate-spin" />
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Procesando Escaneo en Vivo
                  </span>
                </div>
                <div className="flex gap-2">
                  {progress && (
                    <span className="text-xs font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">
                      Lote {progress.currentBatch}/{progress.totalBatches}
                    </span>
                  )}
                  {queueLength > 0 && (
                    <span className="text-xs font-bold text-slate-300 bg-slate-500/20 px-2 py-0.5 rounded-full">
                      +{queueLength} en cola
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                {currentImage && (
                  <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden border border-white/20 relative shadow-lg">
                    <img src={currentImage} alt="Scanning" className="w-full h-full object-cover grayscale opacity-80" />
                    <div className="absolute left-0 w-full h-[2px] bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" style={{ animation: 'scan-laser 2s infinite ease-in-out' }}></div>
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Figuritas detectadas hasta el momento:</p>
                  {recentlyFound.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {recentlyFound.map((s, i) => {
                        const team = s.id.split(' ')[0] || '';
                        return (
                          <div key={`${s.id}-${i}`} className="flex items-center gap-1.5 apple-glass-input px-2 py-1 rounded-lg border border-blue-400/30 bg-blue-500/10">
                            <span className="text-sm">{getTeamEmoji(team)}</span>
                            <span className="text-xs font-bold text-blue-100">{s.id}</span>
                            {s.isNew && <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_#4ade80]"></div>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs italic flex items-center"><Loader2 size={12} className="animate-spin mr-1" /> Analizando imagen...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isScanning && history.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <ImageIcon size={32} className="text-slate-500" />
              </div>
              <p className="text-slate-400 font-bold">Aún no hay escaneos registrados.</p>
            </div>
          ) : (
            history.map(entry => (
              <div key={entry.id} className="apple-glass-button border border-white/10 rounded-2xl p-4 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{formatDate(entry.timestamp)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">{entry.totalFound} escaneadas</span>
                    {entry.newFound > 0 && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">+{entry.newFound} nuevas</span>}
                  </div>
                </div>

                {entry.stickers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {entry.stickers.map((s, i) => {
                      const team = s.id.split(' ')[0] || '';
                      return (
                        <div key={`${s.id}-${i}`} className="flex items-center gap-1.5 apple-glass-input px-2 py-1 rounded-lg border border-white/10">
                          <span className="text-sm">{getTeamEmoji(team)}</span>
                          <span className="text-xs font-bold text-white/90">{s.id}</span>
                          {s.isNew && <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_#4ade80]"></div>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">No se encontraron figuritas válidas en este escaneo.</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

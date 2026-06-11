import React, { createContext, useContext, useState, useRef } from 'react';
import { recognizeStickersFromImages } from '../utils/ai';
import { store } from '../store/store';
import stickersData from '../data/stickers.json';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ScanContextType {
  addToQueue: (images: string[]) => void;
  isScanning: boolean;
  progress: { currentBatch: number; totalBatches: number; totalImages: number } | null;
  scanResult: { newFound: number; totalFound: number } | null;
  recentlyFound: { id: string; name: string; isNew: boolean }[];
  clearResult: () => void;
  queueLength: number;
  currentImage: string | null;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const useScanContext = () => {
  const context = useContext(ScanContext);
  if (!context) throw new Error("useScanContext must be used within ScanProvider");
  return context;
};

export const ScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<{ images: string[] }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<{ currentBatch: number; totalBatches: number; totalImages: number } | null>(null);
  const [scanResult, setScanResult] = useState<{ newFound: number; totalFound: number } | null>(null);
  const [recentlyFound, setRecentlyFound] = useState<{ id: string; name: string; isNew: boolean }[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const BATCH_SIZE = 1;
  const DELAY_BETWEEN_BATCHES_MS = 100; // Reducido drásticamente ya que el usuario tiene API de pago

  const queueRef = useRef<{ images: string[] }[]>([]);
  const isScanningRef = useRef(false);

  const addToQueue = (images: string[]) => {
    queueRef.current.push({ images });
    
    // Forzar render para actualizar UI de cola
    setQueue(prev => [...prev, { images }]);

    if (!isScanningRef.current) {
      setScanResult(null);
      setRecentlyFound([]);
      processQueueLoop();
    }
  };

  const clearResult = () => {
    setScanResult(null);
    setRecentlyFound([]);
  };

  const processQueueLoop = async () => {
    isScanningRef.current = true;
    setIsScanning(true);
    
    let totalNew = 0;
    let totalFound = 0;

    while (queueRef.current.length > 0) {
      const currentTask = queueRef.current[0];
      const { images } = currentTask;
    
      try {
        await store.getSettings();

        // Dividir en batches
        const batches: string[][] = [];
        for (let i = 0; i < images.length; i += BATCH_SIZE) {
          batches.push(images.slice(i, i + BATCH_SIZE));
        }

        setProgress({ currentBatch: 1, totalBatches: batches.length, totalImages: images.length });

        const collection = await store.getCollection();

        for (let i = 0; i < batches.length; i++) {
          setProgress({ currentBatch: i + 1, totalBatches: batches.length, totalImages: images.length });
          
          let batchFound = 0;
          let batchNew = 0;
          const batchStickers: { id: string; name: string; isNew: boolean }[] = [];

          try {
            const batchImages = batches[i];
            setCurrentImage(batchImages[0] || null);
            const response = await recognizeStickersFromImages(batchImages);
            const recognized = response.stickers;
            const detectedMode = response.mode; // 'album' | 'loose'
            
            batchFound = recognized.length;
            totalFound += batchFound;

            // Guardar cada figurita en el store local
            for (const sticker of recognized) {
              const normalizedInput = sticker.number ? sticker.number.toUpperCase().trim().replace(/[\s_]+/g, '-') : '';
              const dbSticker = stickersData.find(s => {
                const normalizedDbId = s.id.toUpperCase().trim();
                const normalizedDbNum = s.number.toUpperCase().trim().replace(/[\s_]+/g, '-');
                return normalizedDbId === normalizedInput || normalizedDbNum === normalizedInput;
              });
              
              if (dbSticker) {
                let isNew = false;
                const currentOwned = collection[dbSticker.id]?.owned || false;
                if (!currentOwned) {
                  collection[dbSticker.id] = { owned: true, duplicates: 0 };
                  totalNew++;
                  batchNew++;
                  isNew = true;
                } else {
                  if (detectedMode === 'loose') {
                    collection[dbSticker.id] = { 
                      owned: true, 
                      duplicates: (collection[dbSticker.id].duplicates || 0) + 1 
                    };
                  }
                }
                
                batchStickers.push({ id: dbSticker.number, name: dbSticker.name, isNew });
                // Exponer para la animación en vivo
                setRecentlyFound(prev => [...prev, { id: dbSticker.number, name: dbSticker.name, isNew }]);
              }
            }
            await store.saveCollection(collection);
            
            // Registrar este escaneo en el historial
            await store.addScanHistoryEntry({
              totalFound: batchFound,
              newFound: batchNew,
              stickers: batchStickers
            });
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('history-updated'));

          } catch (batchError) {
            console.error(`Error procesando lote ${i + 1}`, batchError);
            // Registrar escaneo fallido
            await store.addScanHistoryEntry({
              totalFound: 0,
              newFound: 0,
              stickers: []
            });
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('history-updated'));
          }

          // Wait before next batch to prevent Rate Limit
          if (i < batches.length - 1) {
            await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
          }
        }

      } catch (e) {
        console.error("Error processing scan queue task", e);
      }

      // Remover tarea completada de ambos estados
      queueRef.current.shift();
      setQueue(prev => prev.slice(1));
      
    } // End of while loop

    isScanningRef.current = false;
    setIsScanning(false);
    setProgress(null);
    setCurrentImage(null);
    setScanResult({ newFound: totalNew, totalFound: totalFound });
  };

  return (
    <ScanContext.Provider value={{ addToQueue, isScanning, progress, scanResult, recentlyFound, clearResult, queueLength: queue.length, currentImage }}>
      {children}
      
      {/* Indicadores Globales de Escaneo */}
      {isScanning && progress && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-[100] apple-glass-panel shadow-2xl border border-blue-400/30 rounded-full px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top-4">
          <Loader2 className="animate-spin text-blue-400" size={18} />
          <span className="text-sm font-bold text-white">
            Procesando... {queue.length > 1 ? `(+${queue.length - 1} pendientes)` : ''}
          </span>
        </div>
      )}

      {!isScanning && scanResult && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-[100] apple-glass-button border border-green-400/30 text-green-400 shadow-2xl rounded-full px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">
            ¡Agregadas {scanResult.newFound} figuritas nuevas!
          </span>
          <button onClick={clearResult} className="ml-2 text-white/50 hover:text-white font-bold">×</button>
        </div>
      )}
    </ScanContext.Provider>
  );
};

import { useState, useRef, useEffect } from 'react';
import { Camera, X, ImagePlus, Loader2 } from 'lucide-react';
import { useScanContext } from '../context/ScanContext';
import { useNavigate } from 'react-router-dom';

export default function ScanPage() {
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const navigate = useNavigate();
  const { addToQueue, recentlyFound, currentImage } = useScanContext();

  // Iniciar la cámara
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("La cámara no está soportada en este navegador.");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setCameraStream(stream);
      setHasPermission(true);
      setError(null);
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setHasPermission(false);
      setError("No se pudo acceder a la cámara. Revisa los permisos de tu navegador o sube una foto.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Detener la cámara
  const stopCamera = () => {
    setCameraStream(null);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Capturar frame manual
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Feedback visual (Flash)
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Obtener las dimensiones originales
    const width = video.videoWidth;
    const height = video.videoHeight;
    const maxWidth = 800;
    
    // Calcular nuevas dimensiones manteniendo el ratio
    let newWidth = width;
    let newHeight = height;
    if (width > maxWidth) {
      newHeight = Math.round((height * maxWidth) / width);
      newWidth = maxWidth;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Filtro para mejorar lectura de OCR
      ctx.filter = 'contrast(1.2) brightness(1.1)';
      ctx.drawImage(video, 0, 0, newWidth, newHeight);
      
      // Comprimir y añadir a la cola directamente
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      addToQueue([base64]);
    }
  };

  const compressImage = (file: File, maxWidth = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Reducir la resolución fuertemente para velocidad de red
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(img.src);
            return;
          }
          
          // Aplicar filtro para mejorar el contraste y el brillo
          ctx.filter = 'contrast(1.2) brightness(1.1)';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compresión JPEG a 70% para extrema velocidad
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    const loadedImages: string[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const base64 = await compressImage(file, 800);
          loadedImages.push(base64);
        } catch (err) {
          console.error("Error al leer archivo:", file.name, err);
        }
      }

      if (loadedImages.length > 0) {
        addToQueue(loadedImages);
      } else {
        setError('No se pudo cargar ninguna de las imágenes seleccionadas.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la carga de imágenes.');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExit = () => {
    stopCamera();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Salir (X) */}
      <div className="absolute top-10 left-6 z-20">
        <button 
          onClick={handleExit}
          className="apple-glass-button text-white p-3 rounded-full hover:bg-white/20 transition-colors shadow-lg"
        >
          <X size={28} />
        </button>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 text-center z-10">
            <Camera size={64} className="text-white/20 mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">Cámara Inaccesible</h2>
            <p className="text-white/60 mb-6">{error}</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="apple-glass-button bg-white/10 text-white px-6 py-3 rounded-full font-bold flex items-center space-x-2"
            >
              <ImagePlus size={20} />
              <span>Subir Fotos Manualmente</span>
            </button>
          </div>
        )}

        {hasPermission !== false && (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none border-[6px] border-white/20 m-4 rounded-[40px]"></div>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-72 border-2 border-dashed border-white/50 rounded-2xl"></div>
            </div>

            {/* HUD: Recently Found Floating Overlay */}
            {recentlyFound.length > 0 && (
              <div className="absolute top-28 left-6 right-20 pointer-events-none flex flex-col gap-2 max-h-64 overflow-hidden z-30">
                {recentlyFound.slice().reverse().slice(0, 3).map((sticker, idx) => (
                  <div 
                    key={`${sticker.id}-${idx}`} 
                    className="self-start px-3 py-2 rounded-xl apple-glass-panel border border-white/20 text-white shadow-lg flex items-center gap-2 animate-in slide-in-from-left-4 fade-in duration-300"
                  >
                    <span className="font-black text-sm tracking-wider text-white">
                      {sticker.id}
                    </span>
                    {sticker.isNew && (
                      <span className="apple-glass-button text-green-400 border border-green-400/30 text-[10px] px-1.5 rounded-full font-bold uppercase">
                        Nueva
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Live scanning image display */}
            {currentImage && (
              <div className="absolute top-28 right-6 w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden border-2 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)] z-30 animate-in slide-in-from-right-4 fade-in duration-300">
                <img src={currentImage} alt="Scanning" className="w-full h-full object-cover grayscale opacity-80" />
                <div 
                  className="absolute left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  style={{
                    animation: 'scan-laser 2s infinite ease-in-out'
                  }}
                >
                  <style>{`
                    @keyframes scan-laser {
                      0% { top: 0; }
                      50% { top: 100%; }
                      100% { top: 0; }
                    }
                  `}</style>
                </div>
                <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-md px-1 py-0.5 rounded text-[8px] font-black text-white text-center uppercase tracking-widest border border-white/10 flex items-center justify-center">
                  <Loader2 size={8} className="animate-spin mr-1" /> IA
                </div>
              </div>
            )}
            
            {/* Flash Effect */}
            <div className={`absolute inset-0 bg-white z-[60] transition-opacity duration-150 pointer-events-none ${flash ? 'opacity-100' : 'opacity-0'}`}></div>
          </>
        )}
      </div>
      
      {/* Controles Inferiores */}
      {hasPermission !== false && (
        <div className="pb-16 pt-8 flex items-center justify-center absolute bottom-0 w-full z-20 px-8">
          
          {/* Botón Subir Fotos (Abajo Izquierda) */}
          <div className="absolute left-8">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="apple-glass-button bg-white/10 backdrop-blur-md text-white p-4 rounded-full hover:bg-white/20 transition-colors shadow-lg flex flex-col items-center justify-center border border-white/20 active:scale-95"
            >
              <ImagePlus size={24} />
            </button>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/60 uppercase tracking-widest whitespace-nowrap">
              Galería
            </span>
          </div>

          {/* Botón Capturar (Centro) */}
          <div className="flex flex-col items-center">
            <button 
              onClick={captureFrame}
              className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-2 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-90 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-white"></div>
            </button>
            <span className="absolute -bottom-6 text-[10px] font-bold text-white/60 uppercase tracking-widest whitespace-nowrap">
              Escanear
            </span>
          </div>

        </div>
      )}

      {/* Hidden inputs */}
      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        className="hidden"
        onChange={handleSelectFiles}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

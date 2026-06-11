import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Camera, Menu, X, BarChart3, Upload, Share, Trash2, Download, ArrowRightLeft, Settings, BookOpen, History, Users } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [isClosingMenu, setIsClosingMenu] = useState(false);

  const handleCloseMenu = () => {
    setIsClosingMenu(true);
    setTimeout(() => {
      setShowNavMenu(false);
      setIsClosingMenu(false);
    }, 400);
  };

  useEffect(() => {
    if (showNavMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showNavMenu]);

  // Solo se muestran en el catálogo (la raíz)
  if (location.pathname !== '/') return null;

  const handleMenuAction = (action?: string, path?: string) => {
    handleCloseMenu();
    setTimeout(() => {
      if (path) {
        navigate(path);
      } else if (action) {
        navigate('/', { state: { action } });
      }
    }, 300);
  };

  return (
    <>
      {/* Floating Menu Button (Left) */}
      <div className="fixed bottom-6 left-6 z-40 transition-all duration-300 transform-gpu">
        <button
          onClick={() => setShowNavMenu(true)}
          className="w-16 h-16 apple-glass-panel rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <Menu size={28} />
        </button>
      </div>

      {/* Floating Scan Button (Right) */}
      <div className="fixed bottom-6 right-6 z-40 transition-all duration-300 transform-gpu">
        <NavLink
          to="/scan"
          className="w-16 h-16 apple-glass-panel rounded-full flex items-center justify-center text-blue-400 hover:text-blue-300 transition-all active:scale-95"
        >
          <Camera size={28} />
        </NavLink>
      </div>

      {/* Navigation Menu Modal */}
      {showNavMenu && (
        <div className={`fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-md transform-gpu ${isClosingMenu ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleCloseMenu}>
          <div className={`glass-panel bg-slate-900/60 w-full sm:max-w-sm shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col rounded-t-3xl sm:rounded-3xl transform-gpu ${isClosingMenu ? 'animate-slide-down' : 'animate-slide-up'}  sm:pb-0`} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-black text-white flex items-center">
                <Menu className="mr-3 text-slate-300" size={24} />
                Menú
              </h3>
              <button onClick={handleCloseMenu} className="text-slate-300 hover:text-white apple-glass-button rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => handleMenuAction(undefined, '/')}
                className="w-full p-3.5 rounded-xl font-bold bg-amber-600/10 hover:bg-amber-600/20 text-amber-300 hover:text-amber-200 border border-amber-500/20 flex items-center transition-all"
              >
                <BookOpen size={20} className="mr-3 text-amber-400" />
                Mi Álbum
              </button>

              <button
                onClick={() => handleMenuAction(undefined, '/trade')}
                className="w-full p-3.5 rounded-xl font-bold bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 hover:text-purple-200 border border-purple-500/20 flex items-center transition-all"
              >
                <ArrowRightLeft size={20} className="mr-3 text-purple-400" />
                Intercambios
              </button>

              <button
                onClick={() => handleMenuAction(undefined, '/friends')}
                className="w-full p-3.5 rounded-xl font-bold bg-orange-600/10 hover:bg-orange-600/20 text-orange-300 hover:text-orange-200 border border-orange-500/20 flex items-center transition-all"
              >
                <Users size={20} className="mr-3 text-orange-400" />
                Amigos
              </button>

              <button
                onClick={() => handleMenuAction(undefined, '/settings')}
                className="w-full p-3.5 rounded-xl font-bold bg-slate-600/10 hover:bg-slate-600/20 text-slate-300 hover:text-slate-200 border border-slate-500/20 flex items-center transition-all"
              >
                <Settings size={20} className="mr-3 text-slate-400" />
                Ajustes
              </button>

              <div className="h-px bg-slate-800/50 my-2"></div>

              <button
                onClick={() => handleMenuAction('openStats')}
                className="w-full p-3.5 rounded-xl font-bold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 flex items-center transition-all"
              >
                <BarChart3 size={20} className="mr-3 text-indigo-400" />
                Estadísticas
              </button>

              <button
                onClick={() => handleMenuAction('openScanHistory')}
                className="w-full p-3.5 rounded-xl font-bold bg-pink-600/10 hover:bg-pink-600/20 text-pink-300 hover:text-pink-200 border border-pink-500/20 flex items-center transition-all"
              >
                <History size={20} className="mr-3 text-pink-400" />
                Historial de Escaneos
              </button>

              <button
                onClick={() => handleMenuAction('openImport')}
                className="w-full p-3.5 rounded-xl font-bold bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 hover:text-blue-200 border border-blue-500/20 flex items-center transition-all"
              >
                <Upload size={20} className="mr-3 text-blue-400" />
                Importar Colección
              </button>

              <button
                onClick={() => handleMenuAction('openExport')}
                className="w-full p-3.5 rounded-xl font-bold bg-green-600/10 hover:bg-green-600/20 text-green-300 hover:text-green-200 border border-green-500/20 flex items-center transition-all"
              >
                <Share size={20} className="mr-3 text-green-400" />
                Exportar para Cambios
              </button>

              <div className="h-px bg-slate-800/50 my-2"></div>

              <button
                onClick={() => handleMenuAction('openClear')}
                className="w-full p-3.5 rounded-xl font-bold bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/20 flex items-center transition-all"
              >
                <Trash2 size={20} className="mr-3 text-red-500" />
                Borrar Colección
              </button>

              <button
                onClick={() => handleMenuAction('installApp')}
                className="w-full p-3.5 rounded-xl font-bold apple-glass-button text-slate-300 hover:text-white flex items-center transition-all"
              >
                <Download size={20} className="mr-3 text-slate-300" />
                Instalar App
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

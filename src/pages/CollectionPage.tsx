import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Search, ChevronLeft, ChevronRight, Trophy, Download, Filter, X, Share, LayoutGrid, Trash2, Upload, BarChart3, Plus, Minus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import StickerCard from '../components/StickerCard';
import { store } from '../store/store';
import type { Collection } from '../store/store';
import stickersData from '../data/stickers.json';
import { getTeamColors } from '../utils/teamColors';
import { getTeamEmoji } from '../utils/teamEmojis';
import ScanHistoryModal from '../components/ScanHistoryModal';

type FilterType = 'all' | 'missing' | 'got' | 'dupes';

export default function CollectionPage() {
  const location = useLocation();
  const [collection, setCollection] = useState<Collection>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportText, setExportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('overwrite');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showScanHistoryModal, setShowScanHistoryModal] = useState(false);
  const [statsTab, setStatsTab] = useState<'resumen' | 'equipos' | 'repetidas'>('resumen');
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const [isClosingIndex, setIsClosingIndex] = useState(false);
  const handleCloseIndex = () => {
    setIsClosingIndex(true);
    setTimeout(() => {
      setShowIndexModal(false);
      setIsClosingIndex(false);
    }, 400);
  };

  const [closingModal, setClosingModal] = useState<string | null>(null);
  const handleCloseModal = (modalName: string, setter: (val: boolean) => void) => {
    setClosingModal(modalName);
    setTimeout(() => {
      setter(false);
      setClosingModal(null);
    }, 400);
  };

  const headerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeaderVisible(entry.intersectionRatio >= 0.8);
      },
      { threshold: [0, 0.8] }
    );
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);



  useEffect(() => {
    if (location.state?.action) {
      const action = location.state.action;
      if (action === 'openStats') setShowStatsModal(true);
      if (action === 'openScanHistory') setShowScanHistoryModal(true);
      if (action === 'openImport') setShowImportModal(true);
      if (action === 'openExport') generateExportText();
      if (action === 'openClear') setShowClearConfirm(true);
      if (action === 'installApp') handleInstallClick();

      // Clear the state so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);



  const handleClearCollection = async () => {
    await store.clearCollection();
    setCollection({});
    setShowClearConfirm(false);
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Auto-show popup on mobile if not in standalone mode after a delay
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => setShowInstallPopup(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback manual popup
      setShowInstallPopup(true);
    }
  };

  useEffect(() => {
    const loadCollection = () => {
      store.getCollection().then(setCollection);
    };

    loadCollection();
    window.addEventListener('collection-updated', loadCollection);
    return () => window.removeEventListener('collection-updated', loadCollection);
  }, []);

  const fuse = useMemo(() => new Fuse(stickersData, {
    keys: ['number', 'name', 'team'],
    threshold: 0.3
  }), []);

  // Only recalculate on search/filter changes, NOT on every collection update
  const baseFilteredStickers = useMemo(() => {
    let result = stickersData;
    if (searchQuery.trim()) {
      result = fuse.search(searchQuery).map((res: any) => res.item);
    }
    return result;
  }, [searchQuery, fuse]);

  // Apply collection-dependent filters only when needed
  const filteredStickers = useMemo(() => {
    if (filterType === 'all') return baseFilteredStickers;
    if (filterType === 'missing') {
      return baseFilteredStickers.filter(s => !collection[s.id]?.owned);
    } else if (filterType === 'got') {
      return baseFilteredStickers.filter(s => collection[s.id]?.owned);
    } else if (filterType === 'dupes') {
      return baseFilteredStickers.filter(s => (collection[s.id]?.duplicates || 0) > 0);
    }
    return baseFilteredStickers;
  }, [baseFilteredStickers, filterType, collection]);

  // Group by team
  const teamsData = useMemo(() => {
    const groups: Record<string, typeof stickersData> = {};
    const order: string[] = [];

    filteredStickers.forEach(sticker => {
      if (!groups[sticker.team]) {
        groups[sticker.team] = [];
        order.push(sticker.team);
      }
      groups[sticker.team].push(sticker);
    });

    return { groups, order };
  }, [filteredStickers]);

  const totalStickers = stickersData.length;
  const ownedCount = useMemo(() => Object.values(collection).filter(s => s.owned).length, [collection]);
  const overallPercentage = Math.round((ownedCount / totalStickers) * 100) || 0;

  const handleToggleOwned = useCallback((id: string) => {
    setCollection(prev => {
      const currentState = prev[id]?.owned || false;
      const newCollection = {
        ...prev,
        [id]: { ...(prev[id] || { duplicates: 0 }), owned: !currentState }
      };
      store.saveCollection(newCollection).catch(console.error);
      return newCollection;
    });
  }, []);

  const handleUpdateDuplicates = useCallback((id: string, delta: number) => {
    setCollection(prev => {
      const currentDups = prev[id]?.duplicates || 0;
      const newDups = Math.max(0, currentDups + delta);
      const newCollection = {
        ...prev,
        [id]: { ...(prev[id] || { owned: false }), duplicates: newDups }
      };
      store.saveCollection(newCollection).catch(console.error);
      return newCollection;
    });
  }, []);

  const handleStartEditing = useCallback((id: string) => {
    setEditingStickerId(id);
  }, []);



  // Close editor on click outside
  useEffect(() => {
    if (!editingStickerId) return;
    const handleClick = () => setEditingStickerId(null);
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClick);
    };
  }, [editingStickerId]);

  const handleNextPage = () => {
    setSlideDirection('right');
    setCurrentPageIndex(prev => Math.min(prev + 1, teamsData.order.length - 1));
  };

  const handlePrevPage = () => {
    setSlideDirection('left');
    setCurrentPageIndex(prev => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    setCurrentPageIndex(0);
  }, [searchQuery]);



  const currentTeam = teamsData.order[currentPageIndex];
  const currentStickers = currentTeam ? teamsData.groups[currentTeam] : [];

  const currentTeamTotal = currentStickers.length;
  const currentTeamOwned = currentStickers.filter(s => collection[s.id]?.owned).length;
  const currentTeamPercentage = Math.round((currentTeamOwned / currentTeamTotal) * 100) || 0;

  const statsData = useMemo(() => {
    if (!showStatsModal) return null;

    let totalDups = 0;
    let totalDupStickers = 0; // number of stickers that have at least 1 dup
    const dupesList: { id: string; team: string; number: string; name: string; count: number }[] = [];

    const teamStats = teamsData.order.map(team => {
      const teamSticks = teamsData.groups[team];
      const tTotal = teamSticks.length;
      let tOwned = 0;
      let tDups = 0;
      teamSticks.forEach(s => {
        if (collection[s.id]?.owned) tOwned++;
        const d = collection[s.id]?.duplicates || 0;
        if (d > 0) {
          tDups += d;
          totalDups += d;
          totalDupStickers++;
          dupesList.push({ id: s.id, team: s.team, number: s.number, name: s.name, count: d });
        }
      });
      return {
        team,
        total: tTotal,
        owned: tOwned,
        missing: tTotal - tOwned,
        dups: tDups,
        percentage: Math.round((tOwned / tTotal) * 100) || 0
      };
    });

    const completedTeams = teamStats.filter(t => t.percentage === 100).length;
    const mostMissing = [...teamStats].sort((a, b) => b.missing - a.missing);
    const mostDups = [...teamStats].sort((a, b) => b.dups - a.dups).filter(t => t.dups > 0).slice(0, 5);
    const closestCompletion = [...teamStats]
      .filter(t => t.percentage < 100 && t.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
    const sortedDupesList = [...dupesList].sort((a, b) => b.count - a.count);

    // Completion tiers
    const teamsAt100 = teamStats.filter(t => t.percentage === 100);
    const teamsAt75 = teamStats.filter(t => t.percentage >= 75 && t.percentage < 100);
    const teamsAt50 = teamStats.filter(t => t.percentage >= 50 && t.percentage < 75);
    const teamsBelow50 = teamStats.filter(t => t.percentage > 0 && t.percentage < 50);
    const teamsAt0 = teamStats.filter(t => t.percentage === 0);

    // Potential trades: how many unique dupes
    const tradePotential = totalDupStickers;

    return {
      totalDups,
      totalDupStickers,
      tradePotential,
      teamStats,
      mostMissing,
      mostDups,
      closestCompletion,
      completedTeams,
      sortedDupesList,
      teamsAt100,
      teamsAt75,
      teamsAt50,
      teamsBelow50,
      teamsAt0
    };
  }, [collection, teamsData, showStatsModal]);

  // Get dynamic colors for the current team
  const teamColors = getTeamColors(currentTeam || 'FIFA');

  useEffect(() => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', '#020617');
    document.documentElement.style.backgroundColor = '#020617';
  }, []);

  const dynamicBackgroundStyle: React.CSSProperties = {
    background: `linear-gradient(to bottom, ${teamColors.primary}30 0%, #020617 80%)`,
  };

  // Helper to find a team's badge
  const getTeamBadge = (teamCode: string) => {
    const crest = getTeamColors(teamCode).crest;
    if (crest) return crest;
    if (teamCode === 'FIFA' || teamCode === 'Coca-Cola') {
      return (stickersData as any[]).find(s => s.team === teamCode)?.photoUrl || '';
    }
    return (stickersData as any[]).find(s => s.team === teamCode && s.type === 'badge')?.photoUrl ||
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Blank_shield.svg/800px-Blank_shield.svg.png';
  };

  const generateExportText = () => {
    const missing: Record<string, string[]> = {};
    const dupes: Record<string, string[]> = {};

    stickersData.forEach(s => {
      const isOwned = collection[s.id]?.owned || false;
      const duplicates = collection[s.id]?.duplicates || 0;

      const parts = s.number.split(' ');
      const prefix = parts.length > 1 ? parts[0] : s.team;
      const num = parts.length > 1 ? parts[1] : s.number;

      let displayPrefix = prefix;
      if (prefix === 'FWC') {
        const numVal = parseInt(num);
        if (num === '00' || (!isNaN(numVal) && numVal <= 8)) {
          displayPrefix = 'FWC 🏆';
        } else {
          displayPrefix = 'FWC 📜';
        }
      } else {
        const emoji = getTeamEmoji(prefix);
        if (emoji) {
          displayPrefix = `${prefix} ${emoji}`;
        }
      }

      if (!isOwned) {
        if (!missing[displayPrefix]) missing[displayPrefix] = [];
        missing[displayPrefix].push(num);
      }

      if (duplicates > 0) {
        if (!dupes[displayPrefix]) dupes[displayPrefix] = [];
        dupes[displayPrefix].push(duplicates > 1 ? `${num} (x${duplicates})` : num);
      }
    });

    let text = 'Me faltan\n';
    Object.keys(missing).forEach(team => {
      text += `${team}: ${missing[team].join(', ')}\n`;
    });

    if (Object.keys(dupes).length > 0) {
      text += '\nRepetidas\n';
      Object.keys(dupes).forEach(team => {
        text += `${team}: ${dupes[team].join(', ')}\n`;
      });
    }

    setExportText(text.trim());
    setShowExportModal(true);
  };

  const handleImportText = async () => {
    if (!importText.trim()) return;

    const parsedMissing = new Set<string>();
    const parsedDuplicates: Record<string, number> = {};
    let currentSection: 'missing' | 'duplicates' | null = null;

    const lines = importText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.toLowerCase().includes('me faltan')) {
        currentSection = 'missing';
        continue;
      } else if (trimmed.toLowerCase().includes('repetidas')) {
        currentSection = 'duplicates';
        continue;
      }

      const match = trimmed.match(/^([A-Z]{3})\s*(?:[^\w\s:]*)?:\s*(.*)$/);
      if (match && currentSection) {
        const teamCode = match[1];
        const numbersStr = match[2];

        const numberParts = numbersStr.split(',').map(s => s.trim());
        for (const part of numberParts) {
          if (!part) continue;

          let num = part;
          let count = 1;

          const xMatch = part.match(/(.*?)\s*\(x(\d+)\)/i);
          if (xMatch) {
            num = xMatch[1].trim();
            count = parseInt(xMatch[2], 10);
          }

          const stickerId = `${teamCode}-${num}`;

          if (currentSection === 'missing') {
            parsedMissing.add(stickerId);
          } else if (currentSection === 'duplicates') {
            parsedDuplicates[stickerId] = count;
          }
        }
      }
    }

    let newCollection = { ...collection };

    if (importMode === 'overwrite') {
      newCollection = {};
      stickersData.forEach(s => {
        newCollection[s.id] = { owned: true, duplicates: 0 };
      });
      parsedMissing.forEach(id => {
        if (newCollection[id]) newCollection[id].owned = false;
      });
      Object.entries(parsedDuplicates).forEach(([id, count]) => {
        if (newCollection[id]) {
          newCollection[id].owned = true;
          newCollection[id].duplicates = count;
        }
      });
    } else {
      parsedMissing.forEach(id => {
        if (newCollection[id]) newCollection[id].owned = false;
        else newCollection[id] = { owned: false, duplicates: 0 };
      });
      Object.entries(parsedDuplicates).forEach(([id, count]) => {
        if (newCollection[id]) {
          newCollection[id].duplicates = count;
          newCollection[id].owned = true;
        } else newCollection[id] = { owned: true, duplicates: count };
      });
    }

    await store.saveCollection(newCollection);
    setCollection(newCollection);
    setShowImportModal(false);
    setImportText('');
  };

  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      alert('¡Copiado al portapapeles!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleWhatsAppExport = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(exportText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col min-h-screen w-full page-transition relative">
      {/* Fixed background to avoid iOS Safari bugs and stretch beyond viewport */}
      <div
        className="fixed -top-[400px] -bottom-[400px] inset-x-0 pointer-events-none z-[-1] transform-gpu"
        style={dynamicBackgroundStyle}
      />
      {/* Emoji watermark — rendered small & scaled up for natural blur, no CSS filter needed */}
      <div
        className="fixed -top-[400px] -bottom-[400px] inset-x-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-70 transform-gpu"
        style={{ filter: 'blur(60px)' }}
      >
        <div key={currentTeam} className={`flex items-center justify-center w-full h-full ${slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
          <span
            className="leading-none select-none text-[80px] md:text-[120px] scale-x-[8] scale-y-[14] md:scale-x-[18] md:scale-y-[10]"
            style={{ transformOrigin: 'center center' }}
          >
            {getTeamEmoji(currentTeam || '') || (currentTeam === 'FIFA' ? '🏆' : '⚽️')}
          </span>
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className={`fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-md ${closingModal === 'clear' ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => handleCloseModal('clear', setShowClearConfirm)}>
          <div className={`glass-panel bg-slate-900/60 w-full sm:max-w-sm shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col rounded-t-3xl sm:rounded-3xl  sm:pb-0 ${closingModal === 'clear' ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
              <h3 className="text-xl font-black text-white flex items-center">
                <Trash2 className="mr-3 text-red-500" size={24} />
                ¿Borrar Todo?
              </h3>
              <button onClick={() => handleCloseModal('clear', setShowClearConfirm)} className="text-slate-300 hover:text-white apple-glass-button rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar text-center">
              <p className="text-slate-400 text-sm mb-6">Esta acción eliminará de forma permanente todo tu progreso, incluyendo faltantes y repetidas. No se puede deshacer.</p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCloseModal('clear', setShowClearConfirm)}
                  className="flex-1 py-3 apple-glass-button hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleClearCollection();
                    handleCloseModal('clear', setShowClearConfirm);
                  }}
                  className="flex-1 py-3 apple-glass-button text-red-400 font-bold rounded-xl transition-colors"
                >
                  Sí, borrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Install Popup Modal */}
      {showInstallPopup && (
        <div className={`fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-md ${closingModal === 'install' ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => handleCloseModal('install', setShowInstallPopup)}>
          <div className={`glass-panel bg-slate-900/60 w-full sm:max-w-sm shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col rounded-t-3xl sm:rounded-3xl  sm:pb-0 ${closingModal === 'install' ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
              <h3 className="text-xl font-black text-white flex items-center">
                <Download className="mr-3 text-blue-500" size={24} />
                Instalar App
              </h3>
              <button onClick={() => handleCloseModal('install', setShowInstallPopup)} className="text-slate-300 hover:text-white apple-glass-button rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar text-center">
              <p className="text-slate-400 text-sm mb-6">Instala la colección en tu pantalla de inicio para acceder rápidamente y sin conexión.</p>

              <div className="space-y-4 text-sm text-slate-300 apple-glass-input p-4 rounded-xl border border-white/10 text-left">
                <div>
                  <p className="font-bold text-white flex items-center mb-1">
                    <span className="apple-glass-button p-1 rounded mr-2">🍏</span> En iPhone/iPad:
                  </p>
                  <p className="pl-8">1. Toca el icono de Compartir <Share size={14} className="inline mx-1" /> en la barra inferior.</p>
                  <p className="pl-8">2. Selecciona <strong>"Añadir a la pantalla de inicio"</strong>.</p>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <p className="font-bold text-white flex items-center mb-1">
                    <span className="apple-glass-button p-1 rounded mr-2">🤖</span> En Android:
                  </p>
                  <p className="pl-8">1. Toca el menú (3 puntos) arriba a la derecha.</p>
                  <p className="pl-8">2. Selecciona <strong>"Instalar aplicación"</strong> o "Añadir a inicio".</p>
                </div>
              </div>

              <button
                onClick={() => handleCloseModal('install', setShowInstallPopup)}
                className="w-full mt-6 py-3 apple-glass-button text-white font-bold rounded-xl transition-colors hover:bg-slate-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Album Index Modal */}
      {showIndexModal && (() => {
        // Pre-compute all team progress once, not per-render-item
        const indexItems = teamsData.order.map((team, idx) => {
          const teamSticks = teamsData.groups[team];
          const tTotal = teamSticks.length;
          let tOwned = 0;
          for (const s of teamSticks) {
            if (collection[s.id]?.owned) tOwned++;
          }
          const tPercent = Math.round((tOwned / tTotal) * 100) || 0;
          return { team, idx, tPercent, isComplete: tPercent === 100 };
        });

        return (
          <div className={`fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-md ${isClosingIndex ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleCloseIndex}>
            <div className={`glass-panel bg-slate-900/60 w-full sm:max-w-sm shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col rounded-t-3xl sm:rounded-3xl ${isClosingIndex ? 'animate-slide-down' : 'animate-slide-up'}  sm:pb-0`} onClick={e => e.stopPropagation()}>

              {/* Header of Modal */}
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                <h3 className="text-xl font-black text-white flex items-center">
                  <LayoutGrid className="mr-3 text-slate-300" size={24} />
                  Índice
                </h3>
                <button
                  onClick={handleCloseIndex}
                  className="text-slate-300 hover:text-white apple-glass-button rounded-full p-1.5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Grid Content */}
              <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-3 gap-3">
                  {indexItems.map(({ team, idx, tPercent, isComplete }) => (
                    <button
                      key={team}
                      onClick={() => {
                        setCurrentPageIndex(idx);
                        handleCloseIndex();
                      }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 overflow-hidden active:scale-95 transition-all duration-300 ${idx === currentPageIndex
                        ? 'bg-yellow-500/20 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                        : 'apple-glass-button border-white/10 hover:border-slate-500 hover:bg-slate-700'
                        }`}
                    >
                      {isComplete && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/20 to-transparent pointer-events-none"></div>
                      )}

                      <div className="w-12 h-12 sm:w-14 sm:h-14 mb-2 flex items-center justify-center">
                        <img
                          src={getTeamBadge(team)}
                          alt={team}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Blank_shield.svg/800px-Blank_shield.svg.png' }}
                        />
                      </div>

                      <span className="font-black text-white text-sm sm:text-base mb-1 tracking-wider">
                        {team === 'FIFA' ? 'FWC' : team}
                      </span>

                      {/* Mini Progress */}
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${isComplete ? 'bg-yellow-400' : 'bg-blue-500'}`}
                          style={{ width: `${tPercent}%` }}
                        ></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Album Page Content */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 sm:p-6 pb-32 pt-[calc(env(safe-area-inset-top)+1rem)] relative z-10"
      >
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">

          <header ref={headerRef} className="mb-6 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-lg relative overflow-hidden">
            {/* Metallic shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>

            <div className="space-y-4 relative z-10">
              <div className="flex flex-row justify-between items-center gap-2">
                <div>
                  <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                    <LayoutGrid className="mr-2 sm:mr-3 text-yellow-400" size={24} />
                    Panini 2026
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Mi Colección Mundial</p>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    Progreso
                  </span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 drop-shadow-lg leading-none">
                      {overallPercentage}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full apple-glass-input h-2 sm:h-3 rounded-full overflow-hidden shadow-inner relative border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 transition-all duration-1000 ease-out relative shadow-[0_0_10px_rgba(250,204,21,0.8)]"
                  style={{ width: `${overallPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              <div className="relative group pt-2 max-w-2xl mx-auto w-full space-y-3">
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-white/70" size={18} />
                  </div>
                  <input
                    type="text"
                    className="w-full apple-glass-panel text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 placeholder-white/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] border border-white/10 transition-all font-medium text-sm backdrop-blur-sm"
                    placeholder="Buscar jugadores, equipos o números..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar scrollbar-hide">
                  <Filter size={16} className="text-white/80 mr-1 shrink-0" />
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'missing', label: 'Faltantes' },
                    { id: 'got', label: 'Conseguidas' },
                    { id: 'dupes', label: 'Repetidas' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFilterType(f.id as FilterType);
                        setCurrentPageIndex(0);
                      }}
                      className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border shrink-0 ${filterType === f.id
                        ? 'bg-white text-slate-900 border-white shadow-sm scale-105'
                        : 'apple-glass-button text-white/60 border-white/10 hover:text-white hover:border-white/20'
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>
          {teamsData.order.length > 0 ? (
            <div className="flex-1 flex flex-col ">

              {/* Pagination Controls / Team Plate */}
              <div
                className="flex items-center justify-between bg-slate-900/95 backdrop-blur-xl p-3 sm:p-4 rounded-3xl mb-6 shadow-lg border border-white/10 relative overflow-hidden"
              >
                {/* Metallic shine overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>

                {/* Left Arrow Button */}
                <div className="flex z-10">
                  <button onClick={handlePrevPage} disabled={currentPageIndex === 0} className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center apple-glass-button text-slate-300 rounded-full hover:bg-slate-700 transition-all duration-300 ${!isHeaderVisible || currentPageIndex === 0 ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'}`}>
                    <ChevronLeft size={24} />
                  </button>
                </div>

                <div className="flex-1 text-center px-4 flex flex-col items-center z-10">
                  <div className="group relative flex items-center justify-center focus:outline-none cursor-pointer" onClick={() => setShowIndexModal(true)}>
                    <h2
                      className={`font-black uppercase tracking-widest drop-shadow-sm transition-all duration-300 group-hover:scale-105 ${currentTeam === 'FIFA' ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-5xl'}`}
                      style={{ color: '#f8fafc', textShadow: `0 0 20px ${teamColors.primary}80` }}
                    >
                      {currentTeam === 'FIFA' ? 'FWC' : currentTeam}
                    </h2>
                    <LayoutGrid size={24} className="ml-3 text-white opacity-80 group-hover:opacity-100 transition-all drop-shadow-md" />
                  </div>
                  <div className="flex items-center justify-center mt-2 space-x-3 w-full max-w-xs apple-glass-panel p-2 rounded-full border border-white/10 shadow-inner">
                    <span className="text-xs font-black text-slate-400 min-w-[30px] text-right">
                      {currentTeamOwned}
                    </span>
                    <div className="flex-1 h-2 apple-glass-input rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        style={{ width: `${currentTeamPercentage}%`, backgroundColor: teamColors.secondary }}
                      ></div>
                    </div>
                    <span className="text-xs font-black text-slate-400 min-w-[30px] text-left">
                      {currentTeamTotal}
                    </span>
                  </div>
                </div>

                {/* Right Arrow Button */}
                <div className="flex z-10">
                  <button onClick={handleNextPage} disabled={currentPageIndex === teamsData.order.length - 1} className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center apple-glass-button text-slate-300 rounded-full hover:bg-slate-700 transition-all duration-300 ${!isHeaderVisible || currentPageIndex === teamsData.order.length - 1 ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'}`}>
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

              {/* Album Slots Grid */}
              <div
                className="p-6 sm:p-8 rounded-3xl shadow-lg border border-white/10 flex-1 relative overflow-hidden glass-panel"
              >
                {/* Paper texture overlay for the album backing */}
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 relative z-10 items-start ${slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`} key={currentTeam}>
                  {currentStickers.map((sticker) => (
                    <StickerCard
                      key={sticker.id}
                      id={sticker.id}
                      number={sticker.number}
                      name={sticker.name}
                      type={sticker.type}
                      photoUrl={(sticker as any).photoUrl}
                      owned={collection[sticker.id]?.owned || false}
                      duplicates={collection[sticker.id]?.duplicates || 0}
                      isEditing={editingStickerId === sticker.id}
                      onToggleOwned={handleToggleOwned}
                      onStartEditing={handleStartEditing}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center ">
              <div className="w-28 h-28 mb-6 rounded-full glass-panel apple-glass-button flex items-center justify-center text-slate-500 shadow-lg border border-white/10">
                <Search size={48} className="text-slate-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 drop-shadow-md">No results found</h3>
              <p className="text-slate-400 font-medium">We couldn't find any stickers matching "{searchQuery}"</p>
            </div>
          )}

          {/* CSS-only Floating Navigation Controls (Inside scrollable DOM tree) */}
          <div className={`fixed inset-0 z-40 pointer-events-none ${teamsData.order.length === 0 ? 'hidden' : ''}`}>

            {/* Left Nav */}
            <button
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
              className={`absolute left-6 top-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center apple-glass-button text-slate-300 rounded-full hover:bg-slate-700 touch-pan-y transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isHeaderVisible || currentPageIndex === 0 ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'}`}
            >
              <ChevronLeft size={32} />
            </button>

            {/* Right Nav */}
            <button
              onClick={handleNextPage}
              disabled={currentPageIndex === teamsData.order.length - 1}
              className={`absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center apple-glass-button text-slate-300 rounded-full hover:bg-slate-700 touch-pan-y transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isHeaderVisible || currentPageIndex === teamsData.order.length - 1 ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'}`}
            >
              <ChevronRight size={32} />
            </button>

            {/* Index Button */}
            <button
              onClick={() => setShowIndexModal(true)}
              className={`absolute right-6 bottom-[104px] w-16 h-16 flex items-center justify-center apple-glass-button text-white rounded-full hover:bg-slate-700 touch-pan-y transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isHeaderVisible ? 'translate-y-16 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 scale-100 pointer-events-auto'}`}
            >
              <LayoutGrid size={28} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Toast for Duplicate Editing — single instance, not per-card */}
      {editingStickerId && collection[editingStickerId]?.owned && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center apple-glass-panel rounded-full h-16 px-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 justify-center w-auto gap-2"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const dupes = collection[editingStickerId]?.duplicates || 0;
              if (dupes > 0) {
                handleUpdateDuplicates(editingStickerId, -1);
              } else {
                handleToggleOwned(editingStickerId);
                setEditingStickerId(null);
              }
            }}
            className="w-12 h-12 flex items-center justify-center rounded-full apple-glass-button text-white/80 hover:text-white active:scale-90 touch-manipulation shadow-sm"
          >
            {(collection[editingStickerId]?.duplicates || 0) === 0 ? <Trash2 size={20} className="text-red-400" /> : <Minus size={24} strokeWidth={2} />}
          </button>

          <div className="flex flex-col items-center justify-center px-2 min-w-[40px]">
            <span className="text-[9px] text-white/50 font-medium uppercase leading-none mb-0.5">Rep</span>
            <span className="text-xl font-semibold text-white leading-none">{collection[editingStickerId]?.duplicates || 0}</span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleUpdateDuplicates(editingStickerId, 1); }}
            className="w-12 h-12 flex items-center justify-center rounded-full apple-glass-button text-white/80 hover:text-white active:scale-90 touch-manipulation shadow-sm"
          >
            <Plus size={24} strokeWidth={2} />
          </button>
        </div>
      )}
      {showImportModal && (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-md ${closingModal === 'import' ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => handleCloseModal('import', setShowImportModal)}>
          <div className={`glass-panel bg-slate-900/60 w-full sm:max-w-lg shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col rounded-t-3xl sm:rounded-3xl pb-6 sm:pb-0 ${closingModal === 'import' ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
              <h3 className="text-xl font-black text-white flex items-center">
                <Upload className="mr-3 text-blue-500" size={24} />
                Importar Colección
              </h3>
              <button onClick={() => handleCloseModal('import', setShowImportModal)} className="text-slate-300 hover:text-white apple-glass-button rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar flex flex-col">
              <p className="text-slate-400 text-sm font-medium mb-4">
                Pega el texto de WhatsApp con tus faltantes y repetidas.
              </p>

              <div className="flex gap-2 mb-4 apple-glass-input p-1 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setImportMode('overwrite')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${importMode === 'overwrite' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Sobrescribir Todo
                </button>
                <button
                  onClick={() => setImportMode('merge')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${importMode === 'merge' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Solo Actualizar
                </button>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Me faltan&#10;KOR 🇰🇷: 16&#10;..."
                className="flex-1 w-full apple-glass-input text-slate-300 p-4 rounded-xl font-mono text-xs border border-white/10 custom-scrollbar resize-none min-h-[200px]"
              />

              <button
                onClick={handleImportText}
                className="w-full mt-6 py-3 apple-glass-button hover:bg-slate-700 text-blue-400 font-black rounded-xl transition-all shrink-0"
              >
                IMPORTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatsModal && (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-md ${closingModal === 'stats' ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => handleCloseModal('stats', setShowStatsModal)}>
          <div className={`glass-panel bg-slate-900/60 w-full sm:max-w-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col rounded-t-3xl sm:rounded-3xl pb-6 sm:pb-0 max-h-[92vh] sm:max-h-[90vh] ${closingModal === 'stats' ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
              <h3 className="text-xl font-black text-white flex items-center">
                <BarChart3 className="mr-3 text-indigo-400" size={24} />
                Estadísticas
              </h3>
              <button onClick={() => handleCloseModal('stats', setShowStatsModal)} className="text-slate-300 hover:text-white apple-glass-button rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col">

              {/* Tabs */}
              <div className="flex gap-1 apple-glass-input p-1 rounded-xl border border-white/10 mb-4">
                {(['resumen', 'equipos', 'repetidas'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatsTab(tab)}
                    className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${statsTab === tab ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-white/60 hover:text-white'
                      }`}
                  >
                    {tab === 'resumen' ? '📊 Resumen' : tab === 'equipos' ? '🌍 Equipos' : '🔄 Repetidas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-8 space-y-5">

              {/* ===== RESUMEN TAB ===== */}
              {statsTab === 'resumen' && statsData && (
                <>
                  {/* Big Progress Ring & Hero Numbers */}
                  <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 flex items-center gap-6">
                    <div className="relative w-24 h-24 shrink-0">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
                        <circle
                          cx="48" cy="48" r="40" fill="none"
                          stroke="#6366f1" strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallPercentage / 100)}`}
                          style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-white">{overallPercentage}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Progreso General</p>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-white">{ownedCount}</span>
                        <span className="text-slate-400 text-lg font-bold mb-1">/{totalStickers}</span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">figuritas conseguidas</p>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="apple-glass-button border border-red-500/20 rounded-2xl p-4 text-center">
                      <div className="text-3xl font-black text-red-400">{totalStickers - ownedCount}</div>
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Faltantes</div>
                    </div>
                    <div className="apple-glass-button border border-yellow-500/20 rounded-2xl p-4 text-center">
                      <div className="text-3xl font-black text-yellow-400">{statsData.totalDups}</div>
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Copias Extras</div>
                    </div>
                    <div className="apple-glass-button border border-green-500/20 rounded-2xl p-4 text-center">
                      <div className="text-3xl font-black text-green-400">{statsData.completedTeams}</div>
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Equipos 100%</div>
                    </div>
                    <div className="apple-glass-button border border-blue-500/20 rounded-2xl p-4 text-center">
                      <div className="text-3xl font-black text-blue-400">{statsData.totalDupStickers}</div>
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Para Canjear</div>
                    </div>
                  </div>

                  {/* Completion Tiers */}
                  <div className="apple-glass-button border border-white/10 rounded-2xl p-4 space-y-3">
                    <h3 className="text-white font-black text-sm uppercase tracking-wider mb-3">Distribución por Avance</h3>
                    {[
                      { label: 'Completados (100%)', count: statsData.teamsAt100.length, color: '#fbbf24', bg: 'from-yellow-500/20' },
                      { label: '75% – 99%', count: statsData.teamsAt75.length, color: '#22c55e', bg: 'from-green-500/20' },
                      { label: '50% – 74%', count: statsData.teamsAt50.length, color: '#3b82f6', bg: 'from-blue-500/20' },
                      { label: '1% – 49%', count: statsData.teamsBelow50.length, color: '#f97316', bg: 'from-orange-500/20' },
                      { label: 'Sin empezar (0%)', count: statsData.teamsAt0.length, color: '#6b7280', bg: 'from-slate-500/20' },
                    ].map(tier => (
                      <div key={tier.label} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: tier.color }}></div>
                        <span className="text-slate-400 text-xs flex-1">{tier.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 apple-glass-panel rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(tier.count / statsData.teamStats.length) * 100}%`, background: tier.color }}></div>
                          </div>
                          <span className="text-white font-black text-xs w-4 text-right">{tier.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Closest to 100% */}
                  {statsData.closestCompletion.length > 0 && (
                    <div>
                      <h3 className="text-white font-bold mb-3 flex items-center text-xs uppercase tracking-wider">
                        <Trophy className="text-yellow-400 mr-2" size={14} />
                        Más cerca de completarse
                      </h3>
                      <div className="space-y-2">
                        {statsData.closestCompletion.map((t, i) => (
                          <div key={t.team} className="apple-glass-button border border-white/10 rounded-xl p-3 flex items-center gap-3">
                            <span className="text-slate-500 font-black text-xs w-4">{i + 1}</span>
                            <span className="text-lg">{getTeamEmoji(t.team)}</span>
                            <span className="font-bold text-white text-sm flex-1">{t.team}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 apple-glass-panel rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-yellow-500 to-green-400 rounded-full" style={{ width: `${t.percentage}%` }}></div>
                              </div>
                              <span className="text-yellow-400 font-black text-xs w-9 text-right">{t.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ===== EQUIPOS TAB ===== */}
              {statsTab === 'equipos' && statsData && (
                <>
                  <p className="text-slate-500 text-xs">Todos los equipos ordenados por % de completitud (desc)</p>
                  <div className="space-y-2">
                    {[...statsData.teamStats].sort((a, b) => b.percentage - a.percentage).map((t, i) => (
                      <div key={t.team} className="apple-glass-button border border-white/10 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-slate-600 font-black text-[10px] w-5">{i + 1}</span>
                          <span className="text-base">{getTeamEmoji(t.team)}</span>
                          <span className="font-bold text-white text-sm flex-1">{t.team === 'FIFA' ? 'FWC' : t.team}</span>
                          <span
                            className="text-xs font-black px-2 py-0.5 rounded-full"
                            style={{
                              background: t.percentage === 100 ? 'rgba(250,204,21,0.15)' : t.percentage >= 75 ? 'rgba(34,197,94,0.15)' : t.percentage >= 50 ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.1)',
                              color: t.percentage === 100 ? '#fbbf24' : t.percentage >= 75 ? '#4ade80' : t.percentage >= 50 ? '#60a5fa' : '#f87171'
                            }}
                          >
                            {t.percentage}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 apple-glass-panel rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${t.percentage}%`,
                                background: t.percentage === 100 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : t.percentage >= 75 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : t.percentage >= 50 ? 'linear-gradient(90deg,#3b82f6,#2563eb)' : '#ef4444'
                              }}
                            ></div>
                          </div>
                          <span className="text-slate-500 text-[10px] font-bold w-20 text-right shrink-0">{t.owned}/{t.total} · {t.missing > 0 ? `faltan ${t.missing}` : '✅'}</span>
                        </div>
                        {t.dups > 0 && (
                          <div className="mt-1.5 text-[10px] text-yellow-500/80 font-semibold">
                            🔄 {t.dups} repetida{t.dups !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ===== REPETIDAS TAB ===== */}
              {statsTab === 'repetidas' && statsData && (
                <>
                  {statsData.sortedDupesList.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">🔄</div>
                      <p className="text-slate-400 font-bold">No tenés repetidas todavía.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        <div className="apple-glass-button border border-yellow-500/20 rounded-xl p-3 text-center">
                          <div className="text-2xl font-black text-yellow-400">{statsData.totalDupStickers}</div>
                          <div className="text-slate-500 text-[10px] uppercase tracking-wider mt-1">Figuritas únicas</div>
                        </div>
                        <div className="apple-glass-button border border-green-500/20 rounded-xl p-3 text-center">
                          <div className="text-2xl font-black text-green-400">{statsData.totalDups}</div>
                          <div className="text-slate-500 text-[10px] uppercase tracking-wider mt-1">Copias totales</div>
                        </div>
                        <div className="apple-glass-button border border-indigo-500/20 rounded-xl p-3 text-center">
                          <div className="text-2xl font-black text-indigo-400">{statsData.mostDups.length}</div>
                          <div className="text-slate-500 text-[10px] uppercase tracking-wider mt-1">Equipos rep.</div>
                        </div>
                      </div>

                      {/* Top teams with most dupes */}
                      {statsData.mostDups.length > 0 && (
                        <div className="apple-glass-button border border-white/10 rounded-2xl p-4 mb-2">
                          <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Top equipos con más repetidas</h3>
                          <div className="space-y-2">
                            {statsData.mostDups.map((t, i) => (
                              <div key={t.team} className="flex items-center gap-3">
                                <span className="text-slate-600 font-black text-[10px] w-4">{i + 1}</span>
                                <span>{getTeamEmoji(t.team)}</span>
                                <span className="text-white font-bold text-sm flex-1">{t.team === 'FIFA' ? 'FWC' : t.team}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 apple-glass-panel rounded-full overflow-hidden">
                                    <div className="h-full bg-white/60 rounded-full" style={{ width: `${Math.min(100, (t.dups / (statsData.mostDups[0]?.dups || 1)) * 100)}%` }}></div>
                                  </div>
                                  <span className="text-yellow-400 font-black text-xs">{t.dups}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Full sorted dupes list */}
                      <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-2">Lista completa de repetidas</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {statsData.sortedDupesList.map(d => (
                          <div key={d.id} className="flex items-center gap-2 px-3 py-2 apple-glass-button border border-white/10 rounded-lg">
                            <span className="text-sm">{getTeamEmoji(d.team)}</span>
                            <span className="text-slate-400 text-xs font-mono w-10 shrink-0">{d.number}</span>
                            <span className="text-slate-300 text-xs flex-1 truncate" title={d.name}>{d.name}</span>
                            <span className="text-yellow-400 font-black text-xs bg-yellow-400/10 px-2 py-0.5 rounded-full shrink-0">x{d.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-md ${closingModal === 'export' ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => handleCloseModal('export', setShowExportModal)}>
          <div className={`glass-panel bg-slate-900/60 w-full sm:max-w-lg shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col rounded-t-3xl sm:rounded-3xl pb-6 sm:pb-0 ${closingModal === 'export' ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
              <h3 className="text-xl font-black text-white flex items-center">
                <Share className="mr-3 text-green-500" size={24} />
                Modo Intercambio
              </h3>
              <button onClick={() => handleCloseModal('export', setShowExportModal)} className="text-slate-300 hover:text-white apple-glass-button rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar flex flex-col">
              <p className="text-slate-400 text-sm font-medium mb-4">
                Copia este resumen para mandarlo por WhatsApp o redes sociales.
              </p>

              <textarea
                readOnly
                value={exportText}
                className="flex-1 w-full apple-glass-input text-slate-300 p-4 rounded-xl font-mono text-xs border border-white/10 custom-scrollbar resize-none min-h-[200px]"
              />

              <div className="flex space-x-3 mt-6 shrink-0">
                <button onClick={handleCopyExport} className="flex-1 py-3 apple-glass-button text-white font-bold rounded-xl transition-all hover:bg-slate-700">COPIAR TEXTO</button>
                <button onClick={handleWhatsAppExport} className="flex-1 py-3 apple-glass-button text-green-400 font-bold rounded-xl transition-all hover:bg-slate-700">WHATSAPP</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScanHistoryModal && (
        <ScanHistoryModal
          onClose={() => handleCloseModal('scanHistory', setShowScanHistoryModal)}
          isClosing={closingModal === 'scanHistory'}
        />
      )}

    </div>
  );
}

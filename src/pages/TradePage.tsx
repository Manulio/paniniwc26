import { useState, useEffect } from 'react';
import { Plus, Calculator, X, ArrowRightLeft, Copy, User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { store } from '../store/store';
import type { Collection } from '../store/store';
import stickersData from '../data/stickers.json';
import {
  exportCollection,
  importCollection,
  calculateTrades
} from '../utils/tradeEngine';
import type {
  TradeParticipant,
  TradeSuggestion
} from '../utils/tradeEngine';

export default function TradePage() {
  const [participants, setParticipants] = useState<TradeParticipant[]>([]);
  const [suggestions, setSuggestions] = useState<TradeSuggestion[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantCode, setNewParticipantCode] = useState('');
  const [myExportCode, setMyExportCode] = useState('');

  const allStickersIds = stickersData.map(s => s.id);

  // Initialize "Me"
  useEffect(() => {
    store.getCollection().then((col: Collection) => {
      const code = exportCollection(col, allStickersIds);
      setMyExportCode(code);
      
      const meParticipant = importCollection(code, 'me', 'Yo');
      if (meParticipant) {
        setParticipants([meParticipant]);
      }
    });
  }, []);

  const handleCopyMyCode = async () => {
    try {
      await navigator.clipboard.writeText(myExportCode);
      alert('¡Código copiado al portapapeles!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim() || !newParticipantCode.trim()) return;
    
    const newId = `friend-${Date.now()}`;
    const newParticipant = importCollection(newParticipantCode, newId, newParticipantName);
    
    if (newParticipant) {
      setParticipants([...participants, newParticipant]);
      setShowAddModal(false);
      setNewParticipantName('');
      setNewParticipantCode('');
      setSuggestions([]); // reset suggestions when new person joins
    } else {
      alert('Código inválido. Asegúrate de copiar todo el texto.');
    }
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
    setSuggestions([]);
  };

  const handleCalculate = () => {
    const results = calculateTrades(participants);
    setSuggestions(results);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] page-transition pb-20">
      <header className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] shrink-0 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl border-b border-white/10 apple-glass-panel">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-3 sm:mr-4 text-slate-400 hover:text-white transition-colors apple-glass-button hover:bg-slate-700 p-2 rounded-full">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              <ArrowRightLeft className="text-yellow-400 mr-2 sm:mr-3 hidden sm:block" size={28} />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
                Intercambios
              </span>
            </h1>
          </div>
          
          <button
            onClick={handleCopyMyCode}
            className="px-3 py-1.5 rounded-full text-xs font-bold apple-glass-button text-green-400 flex items-center transition-all"
          >
            <Copy size={14} className="mr-1.5" />
            Copiar Mi Código
          </button>
        </div>
      </header>

      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Participants Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Participantes ({participants.length})</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-full text-xs font-bold apple-glass-button text-blue-400 flex items-center transition-all"
              >
                <Plus size={14} className="mr-1" />
                Añadir Amigo
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {participants.map(p => (
                <div key={p.id} className="glass-panel apple-glass-button p-4 rounded-2xl border border-white/10 relative flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center mr-4 shadow-inner border border-slate-600">
                    <User className="text-slate-400" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{p.name}</h3>
                    <p className="text-xs text-slate-400">
                      Faltan: {p.needs.length} | Repes: {Object.keys(p.dupes).length}
                    </p>
                  </div>
                  {p.id !== 'me' && (
                    <button 
                      onClick={() => handleRemoveParticipant(p.id)}
                      className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Action Button */}
          {participants.length > 1 && (
            <div className="flex justify-center my-8">
              <button
                onClick={handleCalculate}
                className="px-8 py-4 rounded-2xl text-lg font-black apple-glass-button text-yellow-400 border border-yellow-400/30 flex items-center transition-all hover:scale-105 active:scale-95"
              >
                <Calculator size={24} className="mr-3" />
                Calcular Intercambios
              </button>
            </div>
          )}

          {/* Results Section */}
          {suggestions.length > 0 && (
            <section className="space-y-6 ">
              <h2 className="text-2xl font-black text-white border-b border-white/10 pb-2">
                Sugerencias ({suggestions.length})
              </h2>
              
              <div className="space-y-4">
                {suggestions.map(sug => (
                  <div 
                    key={sug.id} 
                    className={`p-5 rounded-2xl border ${
                      sug.type === 'direct' ? 'bg-green-900/20 border-green-500/50' :
                      sug.type === 'multi-way' ? 'bg-blue-900/20 border-blue-500/50' :
                      'apple-glass-button border-white/10'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mr-3 ${
                        sug.type === 'direct' ? 'apple-glass-button text-green-400' :
                        sug.type === 'multi-way' ? 'apple-glass-button text-blue-400' :
                        'apple-glass-button text-white'
                      }`}>
                        {sug.type === 'direct' ? '1 a 1' : sug.type === 'multi-way' ? 'Cadena' : 'Regalo'}
                      </div>
                      <h3 className="font-bold text-white text-lg">{sug.description}</h3>
                    </div>
                    
                    <div className="space-y-3 mt-4">
                      {sug.actions.map((action, idx) => {
                        const fromName = participants.find(p => p.id === action.from)?.name;
                        const toName = participants.find(p => p.id === action.to)?.name;
                        
                        return (
                          <div key={idx} className="flex items-start apple-glass-input p-3 rounded-xl border border-white/10">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-300">
                                <span className="font-bold text-white">{fromName}</span> le da a <span className="font-bold text-white">{toName}</span>:
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {action.stickers.map(sticker => {
                                  const stickerData = stickersData.find(s => s.id === sticker);
                                  return (
                                    <span key={sticker} className="px-2 py-1 apple-glass-button border border-white/10 rounded text-xs font-bold text-white flex items-center">
                                      {stickerData?.number || sticker}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="apple-glass-panel border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white apple-glass-button rounded-full p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-black text-white mb-2 flex items-center">
              <Plus className="mr-3 text-blue-500" />
              Añadir Participante
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Pega el código que tu amigo generó desde su app.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Juan, María"
                  className="w-full apple-glass-input text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código de Colección</label>
                <textarea
                  placeholder="Me faltan&#10;MEX 🇲🇽: 1, 3&#10;&#10;Repetidas&#10;ARG 🇦🇷: 10 (x2)"
                  className="w-full h-32 apple-glass-input text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10 resize-none font-mono text-xs"
                  value={newParticipantCode}
                  onChange={(e) => setNewParticipantCode(e.target.value)}
                ></textarea>
              </div>

              <button
                onClick={handleAddParticipant}
                className="w-full py-4 mt-2 apple-glass-button text-blue-400 font-black rounded-xl transition-colors"
              >
                Añadir y Comparar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

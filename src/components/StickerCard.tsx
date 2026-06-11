import { Plus, Minus, Trash2 } from 'lucide-react';
import { memo, useCallback } from 'react';
import { getTeamColors } from '../utils/teamColors';

interface StickerCardProps {
  id: string;
  number: string;
  name: string;
  type: string;
  owned: boolean;
  duplicates: number;
  photoUrl?: string;
  isEditing: boolean;
  onToggleOwned: (id: string) => void;
  onUpdateDuplicates: (id: string, delta: number) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
}

const StickerCard = memo(function StickerCard({ 
  id,
  number, 
  name, 
  type, 
  owned, 
  duplicates,
  photoUrl,
  isEditing,
  onToggleOwned, 
  onUpdateDuplicates,
  onStartEditing,
  onStopEditing,
}: StickerCardProps) {
  
  const isBadge = type === 'badge';
  const isSpecial = type === 'special' || type === 'trophy';
  const isTeam = name.includes('Team Photo');
  const teamCode = number.split(' ')[0] || '';
  
  const displayUrl = photoUrl;
  const colors = getTeamColors(teamCode);

  const isShiny = isBadge || isSpecial || isTeam || teamCode === 'FIFA' || teamCode === 'Coca-Cola';

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!owned) {
      onToggleOwned(id);
    } else {
      onStartEditing(id);
    }
  }, [owned, id, onToggleOwned, onStartEditing]);

  const handleMinus = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (duplicates > 0) {
      onUpdateDuplicates(id, -1);
    } else {
      onToggleOwned(id);
      onStopEditing();
    }
  }, [duplicates, id, onUpdateDuplicates, onToggleOwned, onStopEditing]);

  const handlePlus = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateDuplicates(id, 1);
  }, [id, onUpdateDuplicates]);

  return (
    <div className="relative group">
      <div 
        onClick={handleCardClick}
        className={`relative ${displayUrl ? 'aspect-[3/4]' : 'min-h-[48px]'} overflow-hidden cursor-pointer touch-manipulation rounded-2xl transition-all duration-300 ${
          isEditing
            ? 'ring-4 ring-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)] scale-[1.05] z-20 bg-white/10'
            : owned 
              ? 'apple-glass-panel border-white/20 shadow-md' 
              : 'bg-white/5 border border-white/10 opacity-50'
        }`}
      >
        
        <div className="relative w-full h-full flex flex-col">
          
          {/* Header */}
          <div className="p-2 flex justify-between items-center z-10 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              {colors.crest && (
                <img 
                  src={colors.crest} 
                  alt={`${teamCode} crest`} 
                  className="w-4 h-4 object-contain" 
                  style={!owned ? { opacity: 0.5, filter: 'grayscale(100%)' } : undefined}
                />
              )}
              <span className={`font-semibold text-[10px] tracking-wide ${owned ? 'text-white/90' : 'text-white/50'}`}>{number}</span>
            </div>
            <div className="flex items-center gap-1">
              {duplicates > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm flex items-center justify-center border border-white/10">
                  +{duplicates}
                </span>
              )}
            </div>
          </div>
          
          {/* Image Container */}
          {displayUrl && (
            <div 
              className={`flex-1 relative flex items-center justify-center overflow-hidden ${!owned ? 'grayscale mix-blend-luminosity opacity-40' : ''}`}
            >
              {/* Minimalist Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <span className="text-8xl font-black mix-blend-overlay transform -rotate-12 text-white">
                  {teamCode}
                </span>
              </div>

              <img 
                src={(teamCode === 'Coca-Cola' || teamCode === 'FIFA') ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : displayUrl} 
                alt={name}
                loading="lazy"
                className={`w-full h-full ${
                  (teamCode === 'Coca-Cola' || teamCode === 'FIFA') ? 'object-contain' : 'object-cover'
                } ${
                  isBadge ? 'p-3 object-contain drop-shadow-md' : ''
                } ${isTeam ? 'object-contain scale-110' : ''}`}
              />

              {/* Minimal Shiny Overlay */}
              {owned && isShiny && (
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50"></div>
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="p-2 z-10 flex justify-center items-end border-t border-white/10">
            <span className={`font-medium text-[9px] uppercase text-center leading-tight tracking-widest truncate w-full px-1 ${owned ? 'text-white/80' : 'text-white/40'}`}>
              {name}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
});

export default StickerCard;

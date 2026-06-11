import { memo, useMemo } from 'react';
import stickersData from '../data/stickers.json';
import type { Collection } from '../store/store';

interface FriendProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  friendCode: string;
  collection: Collection;
}

interface FriendCardProps {
  friend: FriendProfile;
  myCollection: Collection;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const FriendCard = memo(function FriendCard({ friend, myCollection, isSelected, onToggleSelect }: FriendCardProps) {
  
  const { iCanGive, theyCanGive } = useMemo(() => {
    const iCanGiveList: typeof stickersData = [];
    const theyCanGiveList: typeof stickersData = [];

    stickersData.forEach(sticker => {
      const myState = myCollection[sticker.id] || { owned: false, duplicates: 0 };
      const theirState = friend.collection[sticker.id] || { owned: false, duplicates: 0 };

      // I have duplicates and they don't own it
      if (myState.duplicates > 0 && !theirState.owned) {
        iCanGiveList.push(sticker);
      }

      // They have duplicates and I don't own it
      if (theirState.duplicates > 0 && !myState.owned) {
        theyCanGiveList.push(sticker);
      }
    });

    return { iCanGive: iCanGiveList, theyCanGive: theyCanGiveList };
  }, [myCollection, friend.collection]);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={onToggleSelect}
      >
        <div className="flex items-center space-x-3">
          {friend.photoURL ? (
            <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center font-bold">
              {friend.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white">{friend.displayName || 'Unknown'}</p>
            <p className="text-xs text-purple-300 font-medium">{theyCanGive.length} they have for you</p>
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="p-4 border-t border-white/10 bg-black/20 space-y-4">
          <div>
            <p className="text-xs font-bold text-green-400 mb-2">THEY CAN GIVE YOU ({theyCanGive.length}):</p>
            {theyCanGive.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {theyCanGive.map(s => (
                  <span key={s.id} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-md border border-green-500/30">
                    {s.team} {s.number}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">Nothing you need right now.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-blue-400 mb-2">YOU CAN GIVE THEM ({iCanGive.length}):</p>
            {iCanGive.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {iCanGive.map(s => (
                  <span key={s.id} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md border border-blue-500/30">
                    {s.team} {s.number}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">Nothing they need right now.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default FriendCard;

import { useState, useEffect } from 'react';
import { Users, UserPlus, Copy, Search, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc, setDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { store, type Collection } from '../store/store';
import stickersData from '../data/stickers.json';

interface FriendProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  friendCode: string;
  collection: Collection;
}

export default function FriendsPage() {
  const [user, loading] = useAuthState(auth);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [addStatus, setAddStatus] = useState('');
  const [friendsList, setFriendsList] = useState<FriendProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [myCollection, setMyCollection] = useState<Collection>({});

  useEffect(() => {
    store.getCollection().then(setMyCollection);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchProfileAndFriends = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMyProfile(data);
        
        if (data.friends && data.friends.length > 0) {
          const friendsData: FriendProfile[] = [];
          for (const friendUid of data.friends) {
            const friendSnap = await getDoc(doc(db, 'users', friendUid));
            if (friendSnap.exists()) {
              friendsData.push({ uid: friendUid, ...friendSnap.data() } as FriendProfile);
            }
          }
          setFriendsList(friendsData);
        }
      }
    };
    fetchProfileAndFriends();
  }, [user]);

  const copyFriendCode = () => {
    if (myProfile?.friendCode) {
      navigator.clipboard.writeText(myProfile.friendCode);
      alert('Friend code copied to clipboard!');
    }
  };

  const handleAddFriend = async () => {
    if (!user || !friendCodeInput.trim()) return;
    setAddStatus('Searching...');
    
    try {
      const code = friendCodeInput.trim().toUpperCase();
      const codeDoc = await getDoc(doc(db, 'friendCodes', code));
      
      if (!codeDoc.exists()) {
        setAddStatus('Friend code not found.');
        return;
      }
      
      const friendUid = codeDoc.data().uid;
      
      if (friendUid === user.uid) {
        setAddStatus("You can't add yourself!");
        return;
      }

      if (myProfile?.friends?.includes(friendUid)) {
        setAddStatus('Already in your friends list!');
        return;
      }

      // Add friend to my list
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(friendUid)
      });
      
      // Add me to friend's list (mutual friendship)
      await updateDoc(doc(db, 'users', friendUid), {
        friends: arrayUnion(user.uid)
      });

      setAddStatus('Friend added successfully!');
      
      // Reload profile
      const friendSnap = await getDoc(doc(db, 'users', friendUid));
      if (friendSnap.exists()) {
        setFriendsList(prev => [...prev, { uid: friendUid, ...friendSnap.data() } as FriendProfile]);
        const meSnap = await getDoc(doc(db, 'users', user.uid));
        setMyProfile(meSnap.data());
      }
      
      setFriendCodeInput('');
      setTimeout(() => setAddStatus(''), 3000);
    } catch (error) {
      console.error(error);
      setAddStatus('Failed to add friend.');
    }
  };

  const calculateTradeMatches = (friend: FriendProfile) => {
    const iCanGive: typeof stickersData = [];
    const theyCanGive: typeof stickersData = [];

    stickersData.forEach(sticker => {
      const myState = myCollection[sticker.id] || { owned: false, duplicates: 0 };
      const theirState = friend.collection[sticker.id] || { owned: false, duplicates: 0 };

      // I have duplicates and they don't own it
      if (myState.duplicates > 0 && !theirState.owned) {
        iCanGive.push(sticker);
      }

      // They have duplicates and I don't own it
      if (theirState.duplicates > 0 && !myState.owned) {
        theyCanGive.push(sticker);
      }
    });

    return { iCanGive, theyCanGive };
  };

  if (loading) {
    return <div className="min-h-screen text-white flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full pb-20 flex flex-col items-center justify-center p-6 text-center">
        <Users size={64} className="text-orange-400 mb-6" />
        <h1 className="text-2xl font-black text-white mb-4">Friends & Trades</h1>
        <p className="text-white/60 mb-8">You need to sign in from the Settings page to use the friends system.</p>
        <Link to="/settings" className="apple-glass-button text-white font-bold py-4 px-8 rounded-xl">
          GO TO SETTINGS
        </Link>
      </div>
    );
  }

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
            <Users size={32} className="text-orange-400" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white mb-2 drop-shadow-sm">
            Friends
          </h1>
          <p className="text-white/60 font-medium">Add friends and find trades.</p>
        </header>

        {/* My Profile */}
        <section className="apple-glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-lg font-black text-white mb-4">My Friend Code</h2>
          <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
            <span className="text-2xl font-mono font-bold tracking-widest text-orange-400">
              {myProfile?.friendCode || '------'}
            </span>
            <button onClick={copyFriendCode} className="p-2 bg-orange-500/20 text-orange-400 rounded-lg active:scale-95">
              <Copy size={20} />
            </button>
          </div>
          <p className="text-xs text-white/50 mt-3">Share this code with friends so they can add you.</p>
        </section>

        {/* Add Friend */}
        <section className="apple-glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-lg font-black text-white mb-4 flex items-center">
            <UserPlus size={20} className="mr-2 text-blue-400" /> Add a Friend
          </h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter Friend Code" 
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono uppercase focus:outline-none focus:border-blue-400"
              maxLength={6}
            />
            <button 
              onClick={handleAddFriend}
              className="bg-blue-500 text-white font-bold px-6 rounded-xl active:scale-95"
            >
              Add
            </button>
          </div>
          {addStatus && <p className="text-sm mt-2 text-blue-300 font-bold">{addStatus}</p>}
        </section>

        {/* Friends List & Trade Matcher */}
        <section className="apple-glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-lg font-black text-white mb-4 flex items-center">
            <ArrowRightLeft size={20} className="mr-2 text-purple-400" /> Trade Matches
          </h2>
          
          {friendsList.length === 0 ? (
            <p className="text-white/50 text-center py-4">You haven't added any friends yet.</p>
          ) : (
            <div className="space-y-4">
              {friendsList.map(friend => {
                const { iCanGive, theyCanGive } = calculateTradeMatches(friend);
                const isSelected = selectedFriend?.uid === friend.uid;

                return (
                  <div key={friend.uid} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setSelectedFriend(isSelected ? null : friend)}
                    >
                      <div className="flex items-center space-x-3">
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full" />
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
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

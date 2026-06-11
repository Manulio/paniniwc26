import { useState, useEffect } from 'react';
import { Users, Copy, ArrowLeft, ArrowRightLeft, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { store, type Collection } from '../store/store';

import FriendCard from '../components/FriendCard';

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
  
  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
          const friendPromises = data.friends.map((friendUid: string) => getDoc(doc(db, 'users', friendUid)));
          const friendSnaps = await Promise.all(friendPromises);
          
          const friendsData: FriendProfile[] = [];
          friendSnaps.forEach((snap) => {
            if (snap.exists()) {
              friendsData.push({ uid: snap.id, ...snap.data() } as FriendProfile);
            }
          });
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

  const handleSearchUsers = async () => {
    if (!user || !friendCodeInput.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setAddStatus('');
    
    try {
      const term = friendCodeInput.trim();
      const upperTerm = term.toUpperCase();
      let foundUsers: any[] = [];

      const usersRef = collection(db, 'users');

      // 1. Try by Email exact match
      if (term.includes('@')) {
        const emailQuery = query(usersRef, where('email', '==', term.toLowerCase()));
        const snap = await getDocs(emailQuery);
        snap.forEach(doc => foundUsers.push({ uid: doc.id, ...doc.data() }));
      } 
      // 2. Try by Friend Code
      else if (term.length === 6 && !term.includes(' ')) {
        const codeDoc = await getDoc(doc(db, 'friendCodes', upperTerm));
        if (codeDoc.exists()) {
          const uSnap = await getDoc(doc(db, 'users', codeDoc.data().uid));
          if (uSnap.exists()) foundUsers.push({ uid: uSnap.id, ...uSnap.data() });
        }
      }

      // 3. Try by Name Prefix
      if (foundUsers.length === 0) {
        // Name prefix search requires the exact capitalization or we try exact exact. 
        // We'll query where displayName >= term and <= term + '\uf8ff'
        const nameQuery = query(usersRef, where('displayName', '>=', term), where('displayName', '<=', term + '\uf8ff'));
        const snap = await getDocs(nameQuery);
        snap.forEach(doc => foundUsers.push({ uid: doc.id, ...doc.data() }));
      }

      // Filter out self and deduplicate
      const uniqueUsers = Array.from(new Map(foundUsers.filter(u => u.uid !== user.uid).map(item => [item.uid, item])).values());
      
      setSearchResults(uniqueUsers);
      if (uniqueUsers.length === 0) {
        setAddStatus('No se encontraron usuarios.');
      }
    } catch (error) {
      console.error(error);
      setAddStatus('Error al buscar usuarios.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFoundUser = async (targetUid: string) => {
    if (!user) return;
    
    if (myProfile?.friends?.includes(targetUid)) {
      alert('Already in your friends list!');
      return;
    }

    try {
      // Add friend to my list
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(targetUid)
      });
      // Add me to friend's list (mutual)
      await updateDoc(doc(db, 'users', targetUid), {
        friends: arrayUnion(user.uid)
      });

      // Update local state
      const friendSnap = await getDoc(doc(db, 'users', targetUid));
      if (friendSnap.exists()) {
        setFriendsList(prev => [...prev, { uid: targetUid, ...friendSnap.data() } as FriendProfile]);
        const meSnap = await getDoc(doc(db, 'users', user.uid));
        setMyProfile(meSnap.data());
      }
      
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.uid !== targetUid));
      alert('Amigo añadido exitosamente!');
    } catch (error) {
      console.error(error);
      alert('Error al añadir amigo.');
    }
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
            <Search size={20} className="mr-2 text-blue-400" /> Buscar Amigos
          </h2>
          <p className="text-xs text-white/50 mb-4">Busca por nombre, correo o código exacto.</p>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Nombre, Email o Código" 
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
            />
            <button 
              onClick={handleSearchUsers}
              disabled={isSearching}
              className="bg-blue-500 text-white font-bold px-6 rounded-xl active:scale-95 disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Buscar'}
            </button>
          </div>
          {addStatus && <p className="text-sm mt-2 text-blue-300 font-bold">{addStatus}</p>}
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              <p className="text-xs font-bold text-slate-400 mb-2">RESULTADOS:</p>
              {searchResults.map(res => {
                const isAlreadyFriend = myProfile?.friends?.includes(res.uid);
                return (
                  <div key={res.uid} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center space-x-3">
                      {res.photoURL ? (
                        <img src={res.photoURL} alt={res.displayName} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs">
                          {res.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-white">{res.displayName}</p>
                        <p className="text-[10px] text-white/40">{res.friendCode}</p>
                      </div>
                    </div>
                    {isAlreadyFriend ? (
                      <span className="text-xs text-green-400 font-bold bg-green-500/10 px-2 py-1 rounded">Ya es amigo</span>
                    ) : (
                      <button 
                        onClick={() => handleAddFoundUser(res.uid)}
                        className="text-xs bg-blue-500 hover:bg-blue-400 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Añadir
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
              {friendsList.map(friend => (
                <FriendCard 
                  key={friend.uid}
                  friend={friend}
                  myCollection={myCollection}
                  isSelected={selectedFriend?.uid === friend.uid}
                  onToggleSelect={() => setSelectedFriend(selectedFriend?.uid === friend.uid ? null : friend)}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

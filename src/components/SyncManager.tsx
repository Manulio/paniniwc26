import { useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { store, type Collection } from '../store/store';

export default function SyncManager() {
  const [user, loading] = useAuthState(auth);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial Sync when user logs in
  useEffect(() => {
    if (loading || !user) return;

    const performInitialSync = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        const localCollection = await store.getCollection();
        let finalCollection = { ...localCollection };
        let cloudData: { collection?: Collection, displayName?: string, photoURL?: string, friendCode?: string, friends?: string[] } = {};

        if (docSnap.exists()) {
          cloudData = docSnap.data();
          const cloudCollection = cloudData.collection || {};
          
          // Merge collections: prioritize owned status and highest duplicates
          const allKeys = new Set([...Object.keys(localCollection), ...Object.keys(cloudCollection)]);
          
          allKeys.forEach(id => {
            const local = localCollection[id] || { owned: false, duplicates: 0 };
            const cloud = cloudCollection[id] || { owned: false, duplicates: 0 };
            
            finalCollection[id] = {
              owned: local.owned || cloud.owned,
              duplicates: Math.max(local.duplicates, cloud.duplicates)
            };
          });
        } else {
          // New user in Firestore, let's generate a friend code
          const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          cloudData = { friendCode, friends: [] };
          // Save the mapping for easy friend code lookup
          await setDoc(doc(db, 'friendCodes', friendCode), { uid: user.uid });
        }

        // Save merged collection locally without triggering an upload loop
        await store.saveCollection(finalCollection, true);

        // Upload the merged initial state to cloud
        await setDoc(docRef, {
          collection: finalCollection,
          lastUpdated: new Date().toISOString(),
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL || '',
          email: user.email || '',
          friendCode: cloudData.friendCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
          friends: cloudData.friends || []
        }, { merge: true });

      } catch (error) {
        console.error("Error during initial sync:", error);
      }
    };

    performInitialSync();
  }, [user, loading]);

  // Listen to local changes and upload to cloud
  useEffect(() => {
    const handleLocalUpdate = (e: Event) => {
      if (!user) return;
      
      const customEvent = e as CustomEvent<Collection>;
      const newCollection = customEvent.detail;
      
      if (!newCollection) return;

      // Debounce the upload to avoid spamming Firestore
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            collection: newCollection,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
          console.log("Auto-synced to cloud!");
        } catch (error) {
          console.error("Auto-sync failed:", error);
        }
      }, 2000); // Wait 2 seconds of inactivity before uploading
    };

    window.addEventListener('collection-updated', handleLocalUpdate);
    return () => {
      window.removeEventListener('collection-updated', handleLocalUpdate);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [user]);

  return null; // Headless component
}

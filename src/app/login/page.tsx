'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { useAuth, useUser, FirestorePermissionError, errorEmitter } from '@/firebase';
import { signInAnonymously, UserCredential } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType } from '@/lib/types';


// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to generate and export keys
async function generateAndStoreKeys(uid: string) {
  if (typeof window === 'undefined' || !window.crypto) {
    throw new Error('Crypto API is not available in this environment.');
  }
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  // Export public key
  const publicKeySpki = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyB64 = arrayBufferToBase64(publicKeySpki);

  // Export and store private key, now namespaced by UID
  if (typeof window.localStorage !== 'undefined') {
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
    localStorage.setItem(`privateKey_${uid}`, JSON.stringify(privateKeyJwk));
  }
  
  return { publicKeyB64 };
}


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);
  
  const handleSignIn = async () => {
    if (!auth || !firestore) {
      toast({ variant: 'destructive', title: 'Firebase nicht initialisiert.' });
      return;
    }

    if (password !== '66578') {
      toast({
        variant: 'destructive',
        title: 'Falsches Passwort',
        description: 'Das eingegebene Passwort ist nicht korrekt.',
      });
      return;
    }

    const trimmedPhoneNumber = phoneNumber.trim();

    if (!trimmedPhoneNumber) {
      toast({
        variant: 'destructive',
        title: 'Telefonnummer erforderlich',
        description: 'Bitte gib eine Telefonnummer ein, um fortzufahren.',
      });
      return;
    }

    setIsSigningIn(true);
    
    try {
      // Step 1: Always sign in anonymously first to get a new session UID.
      const cred = await signInAnonymously(auth);
      const newSessionUid = cred.user.uid;

      // Step 2: Always generate and store keys for the new session.
      const { publicKeyB64 } = await generateAndStoreKeys(newSessionUid);

      // Step 3: Check if a user with this phone number already exists.
      const usersQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', trimmedPhoneNumber));
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        // --- NEW USER CREATION FLOW ---
        const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * 5)].imageUrl;
        const randomName = `User-${Math.random().toString(36).substring(2, 8)}`;
        
        const newUser: UserType = {
          id: newSessionUid, // The document ID is the new session UID
          name: randomName,
          avatar: randomAvatar,
          onlineStatus: 'online',
          publicKey: publicKeyB64,
          phoneNumber: trimmedPhoneNumber,
          readReceiptsEnabled: true,
        };
        
        // Create the new user document with the new session UID.
        const newUserRef = doc(firestore, 'users', newSessionUid);
        await setDoc(newUserRef, newUser);

        toast({
          title: "Willkommen!",
          description: "Dein neues Konto wurde erfolgreich erstellt.",
        });

      } else {
        // --- EXISTING USER SIGN-IN FLOW ---
        const existingUserDoc = userSnapshot.docs[0];
        const existingUserId = existingUserDoc.id;
        
        // Reference the *existing* document to update it.
        const userDocRef = doc(firestore, 'users', existingUserId);

        // Update the existing document with the new public key and link it to the new session ID.
        // Using setDoc with merge is safer than updateDoc as it won't fail if the doc is unexpectedly missing.
        await setDoc(userDocRef, {
            id: newSessionUid, // Link the existing profile to the new auth session UID
            publicKey: publicKeyB64, // Update the public key
        }, { merge: true });
        
         toast({
          title: "Anmeldung erfolgreich",
          description: "Willkommen zurück!",
        });
      }
      
      // The onAuthStateChanged listener in the provider will handle redirecting to '/'
      // for both new and existing users.

    } catch (error: any) {
        console.error("Sign-in or user creation error:", error);
        
        // This is a fallback error handler.
        // With the corrected logic, we don't expect a permission error here anymore,
        // but it's good practice to keep it.
        const permissionError = new FirestorePermissionError({
          path: `users/some_path`, // This path will be wrong, but we need the error to fire
          operation: 'create', // This might be create or update
          requestResourceData: { phoneNumber: trimmedPhoneNumber },
        });
        errorEmitter.emit('permission-error', permissionError);

    } finally {
        setIsSigningIn(false);
    } 
  };


  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-8 text-center">
      <div className="flex items-center gap-4 mb-8">
        <Logo className="w-16 h-16" />
        <h1 className="font-headline text-5xl font-bold text-primary">Crazzle</h1>
      </div>
      <p className="text-lg text-white max-w-md mb-8">
        Willkommen beim sichersten Messenger der Welt. Deine Privatsphäre ist unsere Priorität.
      </p>
      <div className="w-full max-w-sm space-y-4">
        <Input
            type="tel"
            placeholder="Deine Telefonnummer"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="text-center"
            disabled={isSigningIn}
        />
        <Input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-center"
            disabled={isSigningIn}
        />
        <Button size="lg" onClick={handleSignIn} className="w-full" disabled={isSigningIn}>
            {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sicher & Anonym beitreten
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Durch die Teilnahme stimmst du unseren nicht vorhandenen Nutzungsbedingungen zu.
      </p>
    </div>
  );
}

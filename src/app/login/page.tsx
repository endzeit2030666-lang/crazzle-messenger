'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { useAuth, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
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
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  // Export public key
  const publicKeySpki = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyB64 = arrayBufferToBase64(publicKeySpki);

  // Export and store private key, now namespaced by UID
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  localStorage.setItem(`privateKey_${uid}`, JSON.stringify(privateKeyJwk));
  
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
    if (!auth || !firestore) return;
    
    if (password !== '66578') {
      toast({
        variant: "destructive",
        title: "Falsches Passwort",
        description: "Das eingegebene Passwort ist nicht korrekt.",
      });
      return;
    }

    const trimmedPhoneNumber = phoneNumber.trim();

    if (!trimmedPhoneNumber) {
        toast({
            variant: "destructive",
            title: "Telefonnummer erforderlich",
            description: "Bitte gib eine Telefonnummer ein, um fortzufahren.",
        });
        return;
    }
    setIsSigningIn(true);
    
    try {
      // Step 1: Check if a user with this phone number already exists
      const usersQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', trimmedPhoneNumber));
      const userSnapshot = await getDocs(usersQuery);

      if (!userSnapshot.empty) {
        // User exists. "Log them in" by signing in anonymously to get a session, then route to main page.
        // The useUser hook will pick up the auth state and existing user data.
        await signInAnonymously(auth); // Create a session
        router.push('/');

      } else {
        // New user. Sign in anonymously to get a new UID.
        const cred = await signInAnonymously(auth);
        const newUserRef = doc(firestore, 'users', cred.user.uid);
        
        // Create their profile document in Firestore
        const { publicKeyB64 } = await generateAndStoreKeys(cred.user.uid);
        
        const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * 5)].imageUrl;
        const randomName = `User-${Math.random().toString(36).substring(2, 8)}`;
        
        const newUser: UserType = {
          id: cred.user.uid,
          name: randomName,
          avatar: randomAvatar,
          onlineStatus: 'online',
          publicKey: publicKeyB64,
          phoneNumber: trimmedPhoneNumber,
          readReceiptsEnabled: true,
        };

        const newUserCreationData = {
          ...newUser
        };
        
        // Use setDoc to create the new user document.
        await setDoc(newUserRef, newUserCreationData);
        // The onAuthStateChanged listener in the provider will handle the redirect.
      }
    } catch (error: any) {
      console.error('Sign-in failed', error);
      toast({
          variant: "destructive",
          title: "Anmeldung fehlgeschlagen",
          description: "Es konnte kein Account erstellt oder gefunden werden. Bitte versuche es erneut.",
      });
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

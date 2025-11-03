'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { useAuth, useUser, FirestorePermissionError, errorEmitter } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
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
  // We check for localStorage existence for SSR safety.
  if (typeof window !== 'undefined' && window.localStorage) {
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
      toast({ variant: "destructive", title: "Firebase nicht initialisiert."});
      return;
    };
    
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
      const usersQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', trimmedPhoneNumber));
      const userSnapshot = await getDocs(usersQuery);

      // Regardless of whether user exists or not, we need an auth session.
      const cred = await signInAnonymously(auth);

      if (userSnapshot.empty) {
        // User does not exist, create a new one with the UID from the new session.
        const newUserRef = doc(firestore, 'users', cred.user.uid);
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
        
        // This setDoc is the likely point of failure.
        await setDoc(newUserRef, newUser);
        
      }
      
      // If user exists, we just signed them in anonymously.
      // The useUser hook will now detect the new auth state and navigate.
       toast({
          title: "Anmeldung erfolgreich",
          description: "Willkommen!",
      });

    } catch (error: any) {
        console.error("Anmeldefehler:", error); // Log the original error for inspection

        // This is the correct error handling architecture.
        // It creates a rich, contextual error and emits it globally.
        const permissionError = new FirestorePermissionError({
          path: `users/${auth.currentUser?.uid || 'unknown_uid'}`,
          operation: 'create',
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

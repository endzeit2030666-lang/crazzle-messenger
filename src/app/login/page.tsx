'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
async function generateAndStoreKeys() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  // Export public key
  const publicKeySpki = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyB64 = arrayBufferToBase64(publicKeySpki);

  // Export and store private key
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  localStorage.setItem('privateKey', JSON.stringify(privateKeyJwk));
  
  return { publicKeyB64 };
}


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);
  
  // A simple but deterministic way to create a "uid" from a phone number for this demo
  const createUidFromPhoneNumber = (phone: string) => {
    return `user_${phone.replace(/\+/g, '')}`;
  }

  const handleSignIn = async () => {
    if (!auth || !firestore) return;
    if (!phoneNumber.trim()) {
        toast({
            variant: "destructive",
            title: "Telefonnummer erforderlich",
            description: "Bitte gib eine Telefonnummer ein, um fortzufahren.",
        });
        return;
    }
    setIsSigningIn(true);
    
    try {
      // This is not a real UID, but a deterministic ID based on the phone number for this demo app.
      const pseudoUid = createUidFromPhoneNumber(phoneNumber.trim());
      
      const userRef = doc(firestore, 'users', pseudoUid);
      const userDoc = await getDoc(userRef);

      const cred = await signInAnonymously(auth);

      if (!userDoc.exists()) {
        // New user, create them
        const { publicKeyB64 } = await generateAndStoreKeys();
        
        const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * 5)].imageUrl;
        const randomName = `User-${Math.random().toString(36).substring(2, 8)}`;
        
        const newUser: UserType = {
          id: cred.user.uid, // We use the real auth UID here now
          name: randomName,
          avatar: randomAvatar,
          onlineStatus: 'online',
          publicKey: publicKeyB64,
          phoneNumber: phoneNumber.trim(),
          readReceiptsEnabled: true,
        };

        // Important: Create the user doc with the REAL auth UID
        await setDoc(doc(firestore, 'users', cred.user.uid), newUser);

      } 
      // If userDoc exists, we just sign in anonymously. 
      // The useUser hook will pick up the auth state and redirect.
      // A more robust solution would link the phone number to the auth user.

    } catch (error) {
      console.error('Sign-in failed', error);
      toast({
          variant: "destructive",
          title: "Anmeldung fehlgeschlagen",
          description: "Es konnte kein Account erstellt oder gefunden werden. Bitte versuche es erneut.",
      });
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

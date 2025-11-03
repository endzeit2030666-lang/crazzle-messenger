'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const handleAnonymousSignIn = async () => {
    if (!auth || !firestore) return;
    try {
      const { publicKeyB64 } = await generateAndStoreKeys();
      
      const cred = await signInAnonymously(auth);
      const userRef = doc(firestore, 'users', cred.user.uid);
      
      const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * 5)].imageUrl;
      const randomName = `User-${Math.random().toString(36).substring(2, 8)}`;

      await setDoc(userRef, {
        id: cred.user.uid,
        name: randomName,
        avatar: randomAvatar,
        onlineStatus: 'online',
        publicKey: publicKeyB64,
      }, { merge: true });

    } catch (error) {
      console.error('Anonymous sign-in failed', error);
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
      <Button size="lg" onClick={handleAnonymousSignIn}>
        Sicher & Anonym beitreten
      </Button>
      <p className="text-xs text-muted-foreground mt-4">
        Durch die Teilnahme stimmst du unseren nicht vorhandenen Nutzungsbedingungen zu.
      </p>
    </div>
  );
}

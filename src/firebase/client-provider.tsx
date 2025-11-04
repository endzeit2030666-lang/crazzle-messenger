'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// Define a type for the Firebase services
type FirebaseServices = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // State to hold the initialized services
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // Initialize Firebase on the client side, once per component mount.
    // This ensures client-side APIs are available and prevents server-side execution.
    const services = initializeFirebase();
    setFirebaseServices(services);
  }, []); // Empty dependency array ensures this runs only once on mount

  // Render a loading state or null until services are initialized
  if (!firebaseServices) {
    return null; 
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}

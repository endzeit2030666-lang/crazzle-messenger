'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';

export interface UseUserResult {
  user: User | null;
  isUserLoading: boolean;
}

/**
 * React hook to get the current authenticated user.
 *
 * @returns {UseUserResult} Object with user and loading state.
 */
export const useUser = (): UseUserResult => {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isUserLoading, setIsUserLoading] = useState<boolean>(!auth.currentUser);

  useEffect(() => {
    // If there's already a user on initial mount, no need to set loading to true
    if (auth.currentUser) {
        setUser(auth.currentUser);
        setIsUserLoading(false);
    } else {
        setIsUserLoading(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, isUserLoading };
};


'use client';

import { useContext } from 'react';
import { FirebaseContext, UserHookResult } from '@/firebase/provider';

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 */
export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);

  // If the context is not available (i.e., not within a FirebaseProvider),
  // return a default "loading" state.
  if (context === undefined) {
    return {
      user: null,
      isUserLoading: true,
      userError: null,
    };
  }

  // Return the user-related state from the context.
  return {
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

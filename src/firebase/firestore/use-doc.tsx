'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
import { supabase } from '@/lib/supabase';
import { extractTableAndId, toCamelCase } from '@/lib/supabase-adapter';

export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const { table, id } = extractTableAndId(memoizedDocRef);
    if (!table || !id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchDoc = async () => {
      try {
        const { data: row, error: fetchErr } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!isMounted) return;

        if (fetchErr) {
          setError(fetchErr as any);
          setData(null);
        } else if (row) {
          setData(toCamelCase(row) as any);
          setError(null);
        } else {
          setData(null);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDoc();

    const channel = supabase
      .channel(`doc_${table}_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `id=eq.${id}` },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'DELETE') {
            setData(null);
          } else {
            setData(toCamelCase(payload.new) as any);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}
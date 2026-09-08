
'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

import { supabase } from '@/lib/supabase';
import { extractTableAndId, toSnakeCase } from '@/lib/supabase-adapter';

export function setDocumentNonBlocking(docRef: any, data: any, options?: any) {
  const { table, id } = extractTableAndId(docRef);
  if (!table) return;

  const payload = toSnakeCase(data);
  if (id) payload.id = id;

  const promise = supabase.from(table).upsert(payload).then(({ error }) => {
    if (error) {
      console.error(`Error en setDoc (${table}):`, error);
      throw error;
    }
  });
  return promise;
}

export function addDocumentNonBlocking(colRef: any, data: any) {
  const { table } = extractTableAndId(colRef);
  if (!table) return Promise.resolve({ id: '' } as any);

  const payload = toSnakeCase(data);
  const promise = supabase.from(table).insert(payload).select().single().then(({ data: created, error }) => {
    if (error) {
      console.error(`Error en addDoc (${table}):`, error);
      throw error;
    }
    return { id: created?.id || '' };
  });
  return promise;
}

export function updateDocumentNonBlocking(docRef: any, data: any) {
  const { table, id } = extractTableAndId(docRef);
  if (!table || !id) return;

  const payload = toSnakeCase(data);
  const promise = supabase.from(table).update(payload).eq('id', id).then(({ error }) => {
    if (error) {
      console.error(`Error en updateDoc (${table}):`, error);
      throw error;
    }
  });
  return promise;
}

export function deleteDocumentNonBlocking(docRef: any) {
  const { table, id } = extractTableAndId(docRef);
  if (!table || !id) return;

  const promise = supabase.from(table).delete().eq('id', id).then(({ error }) => {
    if (error) {
      console.error(`Error en deleteDoc (${table}):`, error);
      throw error;
    }
  });
  return promise;
}

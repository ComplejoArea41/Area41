'use client';

import React, { useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from "./header";
import { InstallPwaDialog } from "./install-pwa-dialog";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { BackgroundImage } from "@/lib/types";

const DEFAULT_BACKGROUND_URL = "https://storage.googleapis.com/aif-public-images/soccer-field-dark.jpg";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const firestore = useFirestore();

  const isSpecialPage = pathname === '/login';

  // Sistema de corrección para ChunkLoadError (recarga la página si falla un archivo de script)
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      if (e.message && (e.message.includes('Loading chunk') || e.message.includes('ChunkLoadError'))) {
        console.log('Detectado fallo de carga, recargando aplicación...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleChunkError);
    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  const activeBgQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'background_images'), where('isActive', '==', true)) : null),
    [firestore]
  );
  const { data: activeImages, isLoading } = useCollection<BackgroundImage>(activeBgQuery);

  const activeImageUrl = useMemo(() => {
    if (activeImages && activeImages.length > 0) {
      return activeImages[0].imageUrl;
    }
    if (!isLoading && (!activeImages || activeImages.length === 0)) {
        return DEFAULT_BACKGROUND_URL;
    }
    return null; 
  }, [activeImages, isLoading]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background relative">
      {activeImageUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{ 
              backgroundImage: `url(${activeImageUrl})`,
            }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 h-full">
        {!isSpecialPage && <Header />}
        <div className="flex flex-1 flex-col">
          {children}
          {!isSpecialPage && (
            <footer className="relative z-10 w-full p-4 text-center text-xs text-muted-foreground">
                © 2024 Complejo Deportivo Area41. Todos los derechos reservados.
            </footer>
          )}
        </div>
        <InstallPwaDialog />
      </div>
    </div>
  );
}


'use client';

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { LogoImage } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import React, { useMemo } from "react";


export function DynamicLogo() {
  const firestore = useFirestore();

  const activeLogoQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'logo_images'), where('isActive', '==', true)) : null),
    [firestore]
  );
  const { data: activeLogoImages, isLoading } = useCollection<LogoImage>(activeLogoQuery);

  const { logoUrl, logoDescription } = useMemo(() => {
    if (activeLogoImages && activeLogoImages.length > 0) {
      return { logoUrl: activeLogoImages[0].imageUrl, logoDescription: activeLogoImages[0].name };
    }
    
    // Logo por defecto: Escudo oficial Área 41
    return { logoUrl: '/logo-escudo.jpg', logoDescription: 'Escudo Área 41' };

  }, [activeLogoImages, isLoading, firestore]);

  return (
    <div className="relative group inline-block">
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/40 to-emerald-500/30 opacity-70 blur-xl group-hover:opacity-100 transition duration-500" />
      <img 
        src={logoUrl || '/logo-escudo.jpg'}
        alt={logoDescription || 'Escudo Área 41'}
        className="relative h-36 w-36 md:h-44 md:w-44 rounded-2xl object-cover ring-2 ring-primary/60 shadow-2xl transition-all duration-300 transform group-hover:scale-105"
      />
    </div>
  );
}

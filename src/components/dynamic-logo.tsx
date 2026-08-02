
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
    if (!firestore || isLoading) {
      return { logoUrl: null, logoDescription: null };
    }

    if (activeLogoImages && activeLogoImages.length > 0) {
      return { logoUrl: activeLogoImages[0].imageUrl, logoDescription: activeLogoImages[0].name };
    }
    
    return { logoUrl: null, logoDescription: null };

  }, [activeLogoImages, isLoading, firestore]);

  if (!logoUrl) {
    return <div className="h-32 w-32" />;
  }

  return (
    <img 
        src={logoUrl}
        alt={logoDescription!}
        className="h-32 w-32 object-contain"
    />
  );
}

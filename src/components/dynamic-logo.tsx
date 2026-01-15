
'use client';

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { LogoImage } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import React, { useMemo } from "react";
import NextImage from "next/image";


export function DynamicLogo() {
  const firestore = useFirestore();

  const activeLogoQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'logo_images'), where('isActive', '==', true)) : null),
    [firestore]
  );
  const { data: activeLogoImages, isLoading } = useCollection<LogoImage>(activeLogoQuery);

  const { logoUrl, logoDescription } = useMemo(() => {
    // If firestore is not ready, or we are loading, we can't do anything yet.
    if (!firestore || isLoading) {
      return { logoUrl: null, logoDescription: null };
    }

    // If we have an active logo from the database, use it.
    if (activeLogoImages && activeLogoImages.length > 0) {
      return { logoUrl: activeLogoImages[0].imageUrl, logoDescription: activeLogoImages[0].name };
    }
    
    // If we are done loading and there's no active logo, show nothing.
    return { logoUrl: null, logoDescription: null };

  }, [activeLogoImages, isLoading, firestore]);

  // If there's no logo to display, render nothing or a placeholder.
  if (!logoUrl) {
    // We render a transparent div to maintain layout space but show nothing.
    return <div className="h-32 w-32" />;
  }

  return (
    <NextImage 
        src={logoUrl}
        alt={logoDescription!}
        width={128}
        height={128}
        className="h-32 w-32 object-contain"
    />
  );
}


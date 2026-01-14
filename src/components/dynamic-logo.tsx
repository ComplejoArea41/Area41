

'use client';

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { LogoImage } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import React, { useMemo } from "react";
import NextImage from "next/image";

const DEFAULT_LOGO_URL = "https://storage.googleapis.com/aif-public-images/area-41-logo.png";
const DEFAULT_LOGO_DESCRIPTION = "Area 41 Logo";

export function DynamicLogo() {
  const firestore = useFirestore();

  const activeLogoQuery = useMemoFirebase(
    () => query(collection(firestore, 'logo_images'), where('isActive', '==', true)),
    [firestore]
  );
  const { data: activeLogoImages, isLoading } = useCollection<LogoImage>(activeLogoQuery);

  const { logoUrl, logoDescription } = useMemo(() => {
    // If we have an active logo from the database, use it.
    if (activeLogoImages && activeLogoImages.length > 0) {
      return { logoUrl: activeLogoImages[0].imageUrl, logoDescription: activeLogoImages[0].name };
    }
    // If we are done loading and there's no active logo, use the default.
    if (!isLoading && (!activeLogoImages || activeLogoImages.length === 0)) {
        return { logoUrl: DEFAULT_LOGO_URL, logoDescription: DEFAULT_LOGO_DESCRIPTION };
    }
    // If still loading, return nulls to wait.
    return { logoUrl: null, logoDescription: null };
  }, [activeLogoImages, isLoading]);

  if (isLoading || !logoUrl) {
    // You can return a placeholder skeleton loader here if you want
    return <div className="h-32 w-32 animate-pulse bg-muted/30 rounded-full" />;
  }

  return (
    <NextImage 
        src={logoUrl}
        alt={logoDescription!}
        width={128}
        height={128}
        className="h-32 w-32"
    />
  );
}

    
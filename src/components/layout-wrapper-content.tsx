
'use client';

import React, { useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { BackgroundImage } from "@/lib/types";

const DEFAULT_BACKGROUND_URL = "https://storage.googleapis.com/aif-public-images/soccer-field-dark.jpg";

export default function LayoutWrapperContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const firestore = useFirestore();

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
    return null; // Return null while loading
  }, [activeImages, isLoading]);
  
  return (
    <div className="flex flex-1 flex-col relative">
      {activeImageUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{ backgroundImage: `url(${activeImageUrl})` }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 h-full">{children}</div>
    </div>
  );
}

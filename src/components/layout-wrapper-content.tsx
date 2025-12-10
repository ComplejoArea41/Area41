
'use client';

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { BackgroundImage } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import React, { useMemo } from "react";

const DEFAULT_BACKGROUND_URL = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1935&auto=format&fit=crop";

export default function LayoutWrapperContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const firestore = useFirestore();

  const activeBgQuery = useMemoFirebase(
    () => query(collection(firestore, 'background_images'), where('isActive', '==', true)),
    [firestore]
  );
  const { data: activeBgImages, isLoading } = useCollection<BackgroundImage>(activeBgQuery);

  const activeBgUrl = useMemo(() => {
    // If we have an active image from the database, use it.
    if (activeBgImages && activeBgImages.length > 0) {
      return activeBgImages[0].imageUrl;
    }
    // If we are done loading and there are no active images, use the default.
    if (!isLoading && (!activeBgImages || activeBgImages.length === 0)) {
        return DEFAULT_BACKGROUND_URL;
    }
    // If still loading, return null to wait.
    return null;
  }, [activeBgImages, isLoading]);

  return (
    <div className="flex flex-1 flex-col relative">
      {activeBgUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{ backgroundImage: `url(${activeBgUrl})` }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 h-full">{children}</div>
    </div>
  );
}

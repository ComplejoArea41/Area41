
'use client';

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { BackgroundImage } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo } from "react";

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
  const { data: activeBgImages } = useCollection<BackgroundImage>(activeBgQuery);

  const activeBgUrl = useMemo(() => {
    if (activeBgImages && activeBgImages.length > 0) {
      return activeBgImages[0].imageUrl;
    }
    return null;
  }, [activeBgImages]);

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
      <main className="flex-1 flex flex-col relative z-10">{children}</main>
    </div>
  );
}

    
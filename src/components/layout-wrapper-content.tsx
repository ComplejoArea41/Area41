'use client';

import { usePathname, useRouter } from "next/navigation";
import React from "react";

export default function LayoutWrapperContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const showBackButton = false; // The header component now handles this

  return (
    <div className="flex flex-1 flex-col">
      {/* The back button has been removed from here and integrated into the new Header component */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

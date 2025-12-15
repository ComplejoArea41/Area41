
'use client';

import React from "react";

const DEFAULT_BACKGROUND_URL = "https://storage.googleapis.com/aif-public-images/soccer-field-dark.jpg";

export default function LayoutWrapperContent({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <div className="flex flex-1 flex-col relative">
      {DEFAULT_BACKGROUND_URL && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{ backgroundImage: `url(${DEFAULT_BACKGROUND_URL})` }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 h-full">{children}</div>
    </div>
  );
}

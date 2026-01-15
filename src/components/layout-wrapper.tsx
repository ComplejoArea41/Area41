
'use client';

import React from 'react';

// This component is simplified to directly render children without dynamic imports.
export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

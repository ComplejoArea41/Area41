
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the component that uses client-side hooks
const LayoutWrapperContent = dynamic(
  () => import('./layout-wrapper-content'),
  { ssr: false } // This is the key: disable server-side rendering
);

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutWrapperContent>{children}</LayoutWrapperContent>;
}

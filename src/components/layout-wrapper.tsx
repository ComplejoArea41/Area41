'use client';

import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LayoutWrapper({
  children,
  showBackButton = true,
}: {
  children: React.ReactNode;
  showBackButton?: boolean;
}) {
  const router = useRouter();

  return (
    <>
      {showBackButton && (
        <header className="p-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </header>
      )}
      <main className="flex-1">{children}</main>
    </>
  );
}

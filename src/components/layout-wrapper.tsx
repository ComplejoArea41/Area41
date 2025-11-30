'use client';

import Image from "next/image";
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
    <div className="relative flex min-h-screen w-full flex-col dark">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1511886121199-75121262a324?q=80&w=2070&auto=format&fit=crop"
          alt="Estadio de futbol"
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-10"
          data-ai-hint="soccer stadium"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
      </div>
      <div className="relative z-10 flex flex-1 flex-col">
        {showBackButton && (
          <header className="p-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </header>
        )}
        <main className="flex-1">{children}</main>
        <footer className="w-full p-4 text-center text-xs text-muted-foreground">
            © 2024 Complejo Deportivo Area41. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}

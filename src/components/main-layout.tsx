
'use client';

import Image from 'next/image';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
       <Image
        src="https://storage.googleapis.com/aif-public-images/messi-maradona-bg.jpg"
        alt="Fondo de Messi y Maradona"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-black/60 z-0"></div>
      <div className="relative z-10 flex flex-1 flex-col">
        {children}
        <footer className="w-full p-4 text-center text-xs text-muted-foreground">
            © 2024 Complejo Deportivo Area41. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}

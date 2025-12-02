
'use client';

import Header from "./header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent relative">
      {/* The main content is now responsible for its own background */}
      <Header />
      <div className="flex flex-1 flex-col">
        {children}
        <footer className="relative z-10 w-full p-4 text-center text-xs text-muted-foreground">
            © 2024 Complejo Deportivo Area41. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}

    
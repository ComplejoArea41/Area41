
'use client';

import Header from "./header";
import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isTournamentPublicPage = /^\/tournaments\/[^/]+$/.test(pathname);
  const isLoginPage = pathname === '/login';

  if (isTournamentPublicPage || isLoginPage) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent relative">
            {children}
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent relative">
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


'use client';

import Header from "./header";
import LayoutWrapper from "./layout-wrapper";
import { usePathname } from 'next/navigation';
import { DynamicLogo } from "./dynamic-logo";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isSpecialPage = pathname === '/login';

  if (isSpecialPage) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent relative">
            <LayoutWrapper>{children}</LayoutWrapper>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent relative">
      <LayoutWrapper>
        <Header />
        <div className="flex flex-1 flex-col">
          {children}
          <footer className="relative z-10 w-full p-4 text-center text-xs text-muted-foreground">
              © 2024 Complejo Deportivo Area41. Todos los derechos reservados.
          </footer>
        </div>
      </LayoutWrapper>
      <div className="fixed bottom-4 right-4 z-20 opacity-50 pointer-events-none">
        <DynamicLogo />
      </div>
    </div>
  );
}

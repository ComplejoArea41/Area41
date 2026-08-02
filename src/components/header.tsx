'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  User as UserIcon,
  Shield,
  LogOut,
  Home,
  Smartphone,
  Utensils,
} from 'lucide-react';
import { doc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Header() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth();
  const { toast } = useToast();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Instrucciones manuales para cuando el navegador no soporta el prompt automático (como iOS Safari)
      toast({
        title: "Instalar App / Crear Acceso Directo",
        description: "En iPhone: toca el botón de 'Compartir' y luego 'Agregar a inicio'. En Android: toca los tres puntos del menú y 'Instalar aplicación'.",
      });
    }
  };

  const handleSignOut = () => {
    signOut(auth).then(() => router.push('/login'));
  };

  const navLinks = [
    { href: '/', label: 'Inicio', icon: <Home className="h-4 w-4" /> },
    { href: '/reservations', label: 'Reservar', icon: <Calendar className="h-4 w-4" /> },
    { href: '/buffet', label: 'Buffet', icon: <Utensils className="h-4 w-4" /> },
    { href: '/profile', label: 'Perfil', icon: <UserIcon className="h-4 w-4" /> },
  ];

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <nav className="flex items-center gap-1 sm:gap-2 text-sm">
        {navLinks.map((link) => (
          <Button
            key={link.href}
            variant={pathname === link.href ? 'default' : 'ghost'}
            asChild
            className="hidden md:flex"
          >
            <Link href={link.href}>
              {link.icon}
              {link.label}
            </Link>
          </Button>
        ))}

        <Button 
          variant="outline" 
          onClick={handleInstallClick} 
          className="hidden md:flex border-primary/50 text-primary h-8"
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Instalar App
        </Button>

        <div className="flex md:hidden items-center gap-1">
            {navLinks.map((link) => (
                <Button key={`${link.href}-mobile`} variant={pathname === link.href ? 'default' : 'ghost'} size="icon" asChild>
                    <Link href={link.href}>
                        {link.icon}
                    </Link>
                </Button>
            ))}
            <Button variant="ghost" size="icon" onClick={handleInstallClick} className="text-primary">
                <Smartphone className="h-4 w-4" />
            </Button>
        </div>
      </nav>
      
      <div className="flex items-center gap-2">
        {isUserLoading || isProfileLoading ? (
          <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
        ) : (
          <>
            {user && userProfile?.isAdmin && (
              <Button
                variant={pathname.startsWith('/admin') ? 'secondary' : 'outline'}
                asChild
                className="h-8 px-3"
              >
                <Link href="/admin">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Admin</span>
                </Link>
              </Button>
            )}
            {user ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
              </Button>
            ) : (
               <Button onClick={() => router.push('/login')} className="h-8">
                  Ingresar
               </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}

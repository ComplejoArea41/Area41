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
  Utensils,
  User as UserIcon,
  Shield,
  LogOut,
  Home,
  LogIn,
  Download,
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
  const [isInstallable, setIsInstallable] = useState(false);

  const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevenir que el navegador muestre su propio aviso
      e.preventDefault();
      // Guardar el evento para dispararlo más tarde
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar si ya está instalada o si es iOS (donde no hay beforeinstallprompt)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      // Si no hay evento (como en iOS), mostramos un mensaje de ayuda
      toast({
        title: "Cómo instalar en iPhone",
        description: "Toca el botón 'Compartir' (el cuadrado con la flecha arriba) en Safari y selecciona 'Agregar a inicio'.",
      });
    }
  };

  const handleSignOut = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  const navLinks = [
    { href: '/', label: 'Inicio', icon: <Home className="h-4 w-4" /> },
    { href: '/reservations', label: 'Reservar', icon: <Calendar className="h-4 w-4" /> },
    { href: '/buffet', label: 'Buffet', icon: <Utensils className="h-4 w-4" /> },
    { href: '/profile', label: 'Perfil', icon: <UserIcon className="h-4 w-4" /> },
  ];

  // Don't render header on login page
  if (pathname === '/login') {
    return null;
  }

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

        {/* Botón de Instalación Desktop */}
        <Button 
          variant="outline" 
          onClick={handleInstallClick} 
          className="hidden md:flex border-primary/50 text-primary hover:bg-primary/10"
        >
          <Download className="h-4 w-4 mr-2" />
          Instalar App
        </Button>

        {/* Mobile-friendly icons */}
        <div className="flex md:hidden items-center gap-1">
            {navLinks.map((link) => (
                <Button key={`${link.href}-mobile`} variant={pathname === link.href ? 'default' : 'ghost'} size="icon" asChild>
                    <Link href={link.href}>
                        {link.icon}
                        <span className='sr-only'>{link.label}</span>
                    </Link>
                </Button>
            ))}
            <Button variant="ghost" size="icon" onClick={handleInstallClick} className="text-primary">
                <Download className="h-4 w-4" />
                <span className='sr-only'>Instalar App</span>
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
              >
                <Link href="/admin">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
            {user ? (
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Cerrar sesión</span>
              </Button>
            ) : (
               <Button onClick={handleSignIn}>
                  <LogIn className="mr-2 h-4 w-4"/>
                  Iniciar Sesión
               </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}

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
  Trophy,
  User as UserIcon,
  Shield,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { doc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';

export default function Header() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth();

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

  const isAdmin = userProfile?.isAdmin === true;

  const handleSignOut = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };

  const navLinks = [
    { href: '/reservations', label: 'Reservar', icon: <Calendar className="h-4 w-4" /> },
    { href: '/buffet', label: 'Buffet', icon: <Utensils className="h-4 w-4" /> },
    { href: '/tournaments', label: 'Torneos', icon: <Trophy className="h-4 w-4" /> },
    { href: '/profile', label: 'Perfil', icon: <UserIcon className="h-4 w-4" /> },
  ];

  const isLoading = isUserLoading || isProfileLoading;

  // Don't render header on login page or while loading
  if (pathname === '/login' || pathname === '/') {
    return null;
  }


  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <nav className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Volver</span>
        </Button>
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
      </nav>
      
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
        ) : (
          isAdmin && (
            <Button
              variant={pathname === '/admin' ? 'secondary' : 'outline'}
              asChild
            >
              <Link href="/admin">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )
        )}
         <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Cerrar sesión</span>
          </Button>
      </div>
    </header>
  );
}

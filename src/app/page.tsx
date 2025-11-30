'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Calendar, Utensils, Trophy } from 'lucide-react';

export default function WelcomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background dark p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo />
        <h1 className="text-4xl font-bold text-primary-foreground">
          ÁREA 41
        </h1>
        <p className="text-lg text-muted-foreground">COMPLEJO DEPORTIVO</p>
      </div>

      <div className="mt-12 grid w-full max-w-xs gap-4">
        <Button size="lg" onClick={() => router.push('/reservations')}>
          <Calendar className="mr-2 h-5 w-5" />
          Reservas
        </Button>
        <Button size="lg" onClick={() => router.push('/buffet')}>
          <Utensils className="mr-2 h-5 w-5" />
          Buffet
        </Button>
        <Button size="lg" onClick={() => router.push('/tournaments')}>
          <Trophy className="mr-2 h-5 w-5" />
          Torneos
        </Button>
      </div>
    </div>
  );
}

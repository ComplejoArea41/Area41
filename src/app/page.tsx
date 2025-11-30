'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Utensils, Trophy } from 'lucide-react';
import LayoutWrapper from '@/components/layout-wrapper';

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
    <LayoutWrapper showBackButton={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-center p-4">
            <div className='mb-4'>
                <h1 className="text-5xl font-bold text-primary-foreground tracking-tight">
                ÁREA 41
                </h1>
                <p className="text-xl text-muted-foreground">TU COMPLEJO DEPORTIVO</p>
            </div>

            <div className="grid w-full max-w-md gap-4">
                <Button size="lg" className="h-16 text-lg" onClick={() => router.push('/reservations')}>
                    <Calendar className="mr-4 h-6 w-6" />
                    Reservar Cancha
                </Button>
                <Button size="lg" className="h-16 text-lg" onClick={() => router.push('/buffet')}>
                    <Utensils className="mr-4 h-6 w-6" />
                    Menú del Buffet
                </Button>
                <Button size="lg" className="h-16 text-lg" onClick={() => router.push('/tournaments')}>
                    <Trophy className="mr-4 h-6 w-6" />
                    Ver Torneos
                </Button>
            </div>
        </div>
    </LayoutWrapper>
  );
}

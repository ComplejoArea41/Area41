'use client';
import { Button } from '@/components/ui/button';
import { Calendar, Utensils, Trophy } from 'lucide-react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';

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

            <div className="grid w-full max-w-md gap-6">
                <div className="flex flex-col gap-2 rounded-lg bg-card/50 p-4 border border-border">
                    <Button size="lg" className="h-16 text-lg" onClick={() => router.push('/reservations')}>
                        <Calendar className="mr-4 h-6 w-6" />
                        Reservar Cancha
                    </Button>
                    <p className="text-sm text-muted-foreground">Asegura tu lugar y diviértete con amigos.</p>
                </div>
                <div className="flex flex-col gap-2 rounded-lg bg-card/50 p-4 border border-border">
                    <Button size="lg" className="h-16 text-lg" onClick={() => router.push('/buffet')}>
                        <Utensils className="mr-4 h-6 w-6" />
                        Menú del Buffet
                    </Button>
                    <p className="text-sm text-muted-foreground">Recarga energías con nuestras deliciosas opciones.</p>
                </div>
                <div className="flex flex-col gap-2 rounded-lg bg-card/50 p-4 border border-border">
                    <Button size="lg" className="h-16 text-lg" onClick={() => router.push('/tournaments')}>
                        <Trophy className="mr-4 h-6 w-6" />
                        Ver Torneos
                    </Button>
                     <p className="text-sm text-muted-foreground">Compite por la gloria y siéntete un campeón.</p>
                </div>
            </div>
        </div>
    </LayoutWrapper>
  );
}

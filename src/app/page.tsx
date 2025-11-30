'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
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
    <div className="flex min-h-screen w-full flex-col bg-background dark">
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-foreground">
            Bienvenido a Area 41
          </h1>
          <p className="text-lg text-muted-foreground">"Complejo deportivo"</p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Link href="/reservations" passHref>
            <Card className="cursor-pointer transition-colors hover:bg-card/80">
              <CardHeader>
                <CardTitle>Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Reserva tu cancha de fútbol.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/buffet" passHref>
            <Card className="cursor-pointer transition-colors hover:bg-card/80">
              <CardHeader>
                <CardTitle>Buffet</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Consulta nuestro menú de comidas y bebidas.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tournaments" passHref>
            <Card className="cursor-pointer transition-colors hover:bg-card/80">
              <CardHeader>
                <CardTitle>Torneos</CardTitle>
              </Header>
              <CardContent>
                <CardDescription>
                  Infórmate sobre los próximos torneos.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}

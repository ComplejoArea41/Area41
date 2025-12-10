'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useCollection,
  useFirestore,
  useUser,
} from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Reservation, Court } from '@/lib/types';
import { format } from 'date-fns';
import { useMemoFirebase } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Video, Film } from "lucide-react";

export default function MyMatchesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const reservationsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'reservations'), where('userId', '==', user.uid))
        : null,
    [user, firestore]
  );
  const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsQuery);
  const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
  const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsRef);

  const getCourtDescription = (courtId: string) => {
    const court = courts?.find(c => c.id === courtId);
    return court ? `${court.courtType} - Cancha ${court.courtNumber}` : 'Cancha Desconocida';
  }

  if (isUserLoading || areReservationsLoading || areCourtsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Cargando tus partidos...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }
  
  return (
    <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                Mis Partidos
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                Revive tus mejores momentos. Aquí encontrarás el historial de tus reservas y las grabaciones de tus partidos.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reservations && reservations.length > 0 ? (
                reservations.map(reservation => {
                    const reservationDate = reservation.reservationDateTime && (reservation.reservationDateTime as any).toDate ? (reservation.reservationDateTime as any).toDate() : new Date(reservation.reservationDateTime);
                    const isUpcoming = reservationDate > new Date();

                    return (
                        <Card key={reservation.id} className="bg-card/80 backdrop-blur-sm flex flex-col">
                            <CardHeader>
                                <CardTitle>{getCourtDescription(reservation.courtIds[0])}</CardTitle>
                                <CardDescription>{format(reservationDate, 'dd/MM/yyyy')} a las {format(reservationDate, 'HH:mm')}hs</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <Badge variant={isUpcoming ? "secondary" : "outline"}>
                                    {isUpcoming ? "Próxima" : "Finalizada"}
                                </Badge>
                            </CardContent>
                            <CardFooter>
                                {reservation.videoUrl ? (
                                    <Button className="w-full" onClick={() => router.push(`/reservations/${reservation.id}`)}>
                                        <Video className="mr-2 h-4 w-4"/>
                                        Ver Grabación
                                    </Button>
                                ) : (
                                    <Button className="w-full" variant="outline" disabled>
                                        <Film className="mr-2 h-4 w-4" />
                                        Grabación no disponible
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })
            ) : (
                <div className="col-span-full text-center py-16 bg-card/60 rounded-lg">
                    <h2 className="text-2xl font-bold">No tienes reservas</h2>
                    <p className="text-muted-foreground mt-2">
                        ¡Reserva tu primera cancha para empezar a jugar!
                    </p>
                    <Button onClick={() => router.push('/reservations')} className="mt-4">
                        Ir a Reservas
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

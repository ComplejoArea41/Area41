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
import { useMemo, useState } from 'react';
import { Reservation, Court } from '@/lib/types';
import { format } from 'date-fns';
import { useMemoFirebase } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { Video, Film, Camera } from "lucide-react";

export default function MyMatchesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  // 1. Get all courts, but we only care about Futbol 5
  const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
  const { data: allCourts, isLoading: areCourtsLoading } = useCollection<Court>(courtsRef);

  const futbol5Courts = useMemo(() => {
    return allCourts?.filter(c => c.courtType === 'Futbol 5').sort((a,b) => a.courtNumber - b.courtNumber) || [];
  }, [allCourts]);

  // 2. Get reservations ONLY for the selected court and current user
  const reservationsQuery = useMemoFirebase(
    () =>
      user && selectedCourt
        ? query(
            collection(firestore, 'reservations'), 
            where('userId', '==', user.uid),
            where('courtIds', 'array-contains', selectedCourt.id)
          )
        : null,
    [user, selectedCourt, firestore]
  );
  const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsQuery);
  
  // 3. Filter reservations to only include those with videos and within the specified time range
  const filteredRecordings = useMemo(() => {
    if (!reservations) return [];
    return reservations.filter(res => {
      if (!res.videoUrl) return false;
      const reservationDate = res.reservationDateTime && (res.reservationDateTime as any).toDate ? (res.reservationDateTime as any).toDate() : new Date(res.reservationDateTime);
      const hour = reservationDate.getHours();
      // Valid hours are 18, 19, 20, 21, 22, 23, 0 (midnight)
      return hour >= 18 || hour === 0;
    }).sort((a, b) => {
        const dateA = (a.reservationDateTime as any).toDate();
        const dateB = (b.reservationDateTime as any).toDate();
        return dateB.getTime() - dateA.getTime();
    });
  }, [reservations]);


  const isLoading = isUserLoading || areCourtsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Cargando canchas...</p>
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
                Mis Partidos Grabados
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                Selecciona una cancha para ver el historial de grabaciones de tus partidos.
            </p>
        </div>

        {/* Court Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {futbol5Courts.map(court => (
            <Button 
              key={court.id}
              variant={selectedCourt?.id === court.id ? "default" : "outline"}
              onClick={() => setSelectedCourt(court)}
              className="py-6 text-lg"
            >
              <Camera className="mr-2 h-5 w-5"/>
              {`Cancha ${court.courtNumber}`}
            </Button>
          ))}
        </div>

        {/* Recordings List */}
        {selectedCourt && (
           <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center">Grabaciones en {`Cancha ${selectedCourt.courtNumber}`}</h2>
              {areReservationsLoading ? (
                  <p className="text-center text-muted-foreground">Buscando grabaciones...</p>
              ) : filteredRecordings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecordings.map(reservation => {
                      const reservationDate = reservation.reservationDateTime && (reservation.reservationDateTime as any).toDate ? (reservation.reservationDateTime as any).toDate() : new Date(reservation.reservationDateTime);

                      return (
                          <Card key={reservation.id} className="bg-card/80 backdrop-blur-sm flex flex-col">
                              <CardHeader>
                                  <CardTitle>Partido del {format(reservationDate, 'dd/MM/yyyy')}</CardTitle>
                                  <CardDescription>A las {format(reservationDate, 'HH:mm')}hs</CardDescription>
                              </CardHeader>
                              <CardContent className="flex-grow">
                                  {/* You can add more details here if needed */}
                              </CardContent>
                              <CardFooter>
                                  <Button className="w-full" onClick={() => router.push(`/reservations/${reservation.id}`)}>
                                      <Video className="mr-2 h-4 w-4"/>
                                      Ver Grabación
                                  </Button>
                              </CardFooter>
                          </Card>
                      )
                  })}
                </div>
              ) : (
                  <div className="col-span-full text-center py-16 bg-card/60 rounded-lg">
                      <h2 className="text-2xl font-bold">No tienes grabaciones</h2>
                      <p className="text-muted-foreground mt-2">
                          No se encontraron partidos grabados para ti en esta cancha.
                      </p>
                      <Button onClick={() => router.push('/reservations')} className="mt-4">
                          Reservar un Partido
                      </Button>
                  </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}

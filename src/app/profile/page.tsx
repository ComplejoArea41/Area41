'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images.json';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, query, setDoc, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Reservation } from '@/lib/types';
import { courts } from '@/lib/data';
import { format } from 'date-fns';
import { useMemoFirebase } from '@/firebase/provider';
import { Badge } from '@/components/ui/badge';


export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

  const reservationsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, "reservations"), where("userId", "==", user.uid)) : null),
    [user, firestore]
  );
  const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsQuery);


  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
    }
  }, [userProfile]);

  const handleSaveChanges = () => {
    if (userRef) {
      setDoc(
        userRef,
        {
          firstName,
          lastName,
          phoneNumber,
        },
        { merge: true }
      ).then(() => {
        toast({
            title: "¡Éxito!",
            description: "Tu perfil ha sido actualizado.",
        })
      }).catch((error) => {
        console.error("Error updating profile: ", error);
         toast({
            title: "Error",
            description: "No se pudo actualizar tu perfil.",
            variant: "destructive"
        })
      });
    }
  };

  const userAvatar = placeholderImages.find((p) => p.id === 'user-avatar');
  const userFullName = `${firstName} ${lastName}`;

  const getCourtDescription = (courtIds: string[]) => {
      if (courtIds.length > 1) {
          const sortedIds = [...courtIds].sort();
          if (sortedIds.join(',') === 'c1,c2') return "Fútbol 7 (Canchas 1 y 2)";
          if (sortedIds.join(',') === 'c3,c4') return "Fútbol 7 (Canchas 3 y 4)";
          return `Fútbol 7 (${courtIds.length} canchas)`
      }
      const court = courts.find(c => c.id === courtIds[0]);
      return court ? `Fútbol 5 - Cancha ${court.courtNumber}` : 'Cancha Desconocida';
  }

  const sortedReservations = useMemo(() => {
    if (!reservations) return [];
    return [...reservations].sort((a, b) => {
      const dateA = (a.reservationDateTime as any).toDate();
      const dateB = (b.reservationDateTime as any).toDate();
      return dateB.getTime() - dateA.getTime();
    });
  }, [reservations]);


  if (isUserLoading || isProfileLoading || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Cargando perfil...</p>
      </div>
    );
  }

  return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-8 md:grid-cols-3 w-full max-w-6xl">
          <div className="md:col-span-1">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-col items-center gap-4 text-center">
                {userAvatar && (
                  <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage
                      src={userAvatar.imageUrl}
                      alt={userFullName}
                      data-ai-hint={userAvatar.imageHint}
                      width={96}
                      height={96}
                    />
                    <AvatarFallback>
                      {firstName.charAt(0)}
                      {lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="grid gap-1">
                  <CardTitle className="text-2xl">{userFullName}</CardTitle>
                  <CardDescription>{userProfile.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={userProfile.email} disabled />
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleSaveChanges}>Guardar Cambios</Button>
              </CardFooter>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Mis Reservas</CardTitle>
                <CardDescription>
                  Aquí encontrarás el historial de todas tus batallas épicas en nuestras canchas. ¡Revisa tus próximos partidos y revive tus victorias!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cancha</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areReservationsLoading ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">Cargando reservas...</TableCell>
                        </TableRow>
                    ) : sortedReservations.length > 0 ? (
                      sortedReservations.map(reservation => {
                        const reservationDate = (reservation.reservationDateTime as any).toDate();
                        const isUpcoming = reservationDate > new Date();
                        return(
                          <TableRow key={reservation.id}>
                            <TableCell>{getCourtDescription(reservation.courtIds)}</TableCell>
                            <TableCell>{format(reservationDate, 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{format(reservationDate, 'HH:mm')}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={isUpcoming ? "secondary" : "outline"}>
                                {isUpcoming ? "Próxima" : "Finalizada"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">No hay reservas todavía.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
  );
}

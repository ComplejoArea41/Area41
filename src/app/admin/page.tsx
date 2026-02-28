'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, where, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ShieldAlert, ArrowRight, Utensils, Goal, ImageIcon, Award, Calendar, CalendarClock, AlertTriangle } from "lucide-react";
import { startOfDay, addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Reservation, User } from "@/lib/types";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

    // Query for next Sunday's reservations to notify admin
    const nextSunday = useMemo(() => {
        let date = new Date();
        while (date.getDay() !== 0) {
            date = addDays(date, 1);
        }
        return startOfDay(date);
    }, []);

    const sundayReservationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const endOfSunday = addDays(nextSunday, 1);
        return query(
            collection(firestore, 'reservations'),
            where('reservationDateTime', '>=', Timestamp.fromDate(nextSunday)),
            where('reservationDateTime', '<', Timestamp.fromDate(endOfSunday))
        );
    }, [firestore, nextSunday]);

    const { data: sundayReservations } = useCollection<Reservation>(sundayReservationsQuery);

    const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: allUsers } = useCollection<User>(usersRef);

    const reservationsWithUsers = useMemo(() => {
        if (!sundayReservations || !allUsers) return [];
        return sundayReservations.map(res => ({
            ...res,
            user: allUsers.find(u => u.id === res.userId)
        }));
    }, [sundayReservations, allUsers]);

    useEffect(() => {
        if (isUserLoading || isProfileLoading) {
            return;
        }
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    if (isUserLoading || isProfileLoading || (user && !userProfile)) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Verificando acceso...</p>
            </div>
          );
    }
  
  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-4xl">
            <Card className="bg-card/80 backdrop-blur-sm w-full mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        Panel de Administración
                    </CardTitle>
                    <CardDescription>
                        Aquí podrás gestionar los precios y otras configuraciones del complejo.
                    </CardDescription>
                </CardHeader>
            </Card>

            {reservationsWithUsers.length > 0 && (
                <Card className="bg-orange-500/10 border-orange-500 mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-500">
                            <AlertTriangle className="h-5 w-5" />
                            Atención: Reservas para el Domingo
                        </CardTitle>
                        <CardDescription className="text-orange-200">
                            Se detectaron {reservationsWithUsers.length} reserva(s) para el próximo domingo ({format(nextSunday, 'dd/MM', { locale: es })}). 
                            Como ahora el complejo cierra los domingos, debes contactar a estos clientes y cancelar sus turnos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {reservationsWithUsers.map(res => (
                                <li key={res.id} className="text-sm bg-orange-500/20 p-2 rounded flex justify-between items-center">
                                    <span>
                                        <strong>{res.user?.firstName} {res.user?.lastName}</strong> - {format((res.reservationDateTime as any).toDate(), 'HH:mm')} hs
                                    </span>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push('/admin/reservations')}>
                                        Gestionar
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Goal />Gestión de Canchas</CardTitle>
                        <CardDescription>
                            Modifica los precios y la disponibilidad de las canchas de Fútbol 5 y Fútbol 7.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/admin/courts')}>
                            Administrar Canchas <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Utensils />Gestión de Buffet</CardTitle>
                        <CardDescription>
                           Añade o modifica los precios y artículos del menú del buffet.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/buffet')}>
                            Administrar Menú <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon />Gestión de Fondos</CardTitle>
                        <CardDescription>
                           Añade o modifica la imagen de fondo de la aplicación.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/backgrounds')}>
                            Administrar Fondos <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                 <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Award />Gestión de Logo</CardTitle>
                        <CardDescription>
                           Añade o modifica el logo de la aplicación.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/logo')}>
                            Administrar Logo <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
                
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar />Gestión de Reservas</CardTitle>
                        <CardDescription>
                           Visualiza el historial completo de reservas y busca por cliente.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/reservations')}>
                            Ver Reservas <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CalendarClock />Gestión de Turnos Fijos</CardTitle>
                        <CardDescription>
                           Crea y gestiona reservas recurrentes para clientes habituales.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/fixed-reservations')}>
                            Administrar Turnos Fijos <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
      </div>
  );
}

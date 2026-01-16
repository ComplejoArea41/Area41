
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Reservation, User, Court } from '@/lib/types';
import { format, startOfWeek, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

type FullReservation = Reservation & {
    user: User | null;
    court: Court | null;
};

const hours = Array.from({ length: 18 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

export default function AdminReservationsCalendarPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState<FullReservation | null>(null);
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

    const reservationsRef = useMemoFirebase(() => collection(firestore, 'reservations'), [firestore]);
    const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsRef);

    const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersRef);

    const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
    const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsRef);

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    }, [weekStart]);

    const reservationsByDayAndCourt = useMemo(() => {
        if (!reservations || !users || !courts) return {};

        const usersMap = new Map(users.map(u => [u.id, u]));
        const courtsMap = new Map(courts.map(c => [c.id, c]));
        
        const grouped: { [key: string]: FullReservation[] } = {};

        reservations.forEach(res => {
            const resDate = (res.reservationDateTime as any).toDate();
            const dayKey = format(resDate, 'yyyy-MM-dd');

            res.courtIds.forEach(courtId => {
                const court = courtsMap.get(courtId);
                 if (court && (court.courtType === 'Futbol 5' || court.courtType === 'Futbol 7')) {
                    const parentF7 = court.courtType === 'Futbol 5' ? courts.find(c => c.courtType === 'Futbol 7' && (c.courtNumber * 2 - 1 === court.courtNumber || c.courtNumber * 2 === court.courtNumber)) : undefined;
                    if (parentF7 && res.courtIds.includes(parentF7.id)) return;


                    const fullRes: FullReservation = {
                        ...res,
                        user: usersMap.get(res.userId) || null,
                        court,
                    };
                    
                    if (!grouped[dayKey]) {
                        grouped[dayKey] = [];
                    }
                    grouped[dayKey].push(fullRes);
                }
            });
        });
        return grouped;
    }, [reservations, users, courts]);


    const isLoading = isUserLoading || isProfileLoading || areReservationsLoading || areUsersLoading || areCourtsLoading;

    if (isLoading || (user && !userProfile)) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
                <p className="text-primary-foreground">Cargando calendario de reservas...</p>
            </div>
        );
    }
    
    const sortedCourts = courts?.filter(c => c.courtType === 'Futbol 5' || c.courtType === 'Futbol 7').sort((a, b) => {
        if (a.courtType < b.courtType) return -1;
        if (a.courtType > b.courtType) return 1;
        return a.courtNumber - b.courtNumber;
    }) || [];

    const getReservationForSlot = (day: Date, hour: string, courtId: string): FullReservation | undefined => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayReservations = reservationsByDayAndCourt[dayKey];
        if (!dayReservations) return undefined;
        
        return dayReservations.find(res => {
            const resDate = (res.reservationDateTime as any).toDate();
            const resHour = format(resDate, 'HH:00');
            return res.court?.id === courtId && resHour === hour;
        });
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full">
                <CardHeader>
                    <CardTitle>Calendario de Reservas</CardTitle>
                    <CardDescription>
                        Vista semanal de todas las reservas del complejo. Haz clic en una reserva para ver los detalles.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-4">
                        <Button variant="outline" onClick={() => setCurrentDate(subDays(currentDate, 7))}>
                            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                        </Button>
                        <h3 className="text-xl font-semibold text-center">
                            Semana del {format(weekStart, 'd \'de\' LLLL', { locale: es })}
                        </h3>
                        <Button variant="outline" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                            Siguiente <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                        <div className="grid grid-cols-[auto_repeat(7,minmax(140px,1fr))]">
                            <div className="sticky left-0 bg-card z-10 p-2 border-r border-b font-semibold text-center">Cancha</div>
                            {weekDays.map(day => (
                                <div key={day.toString()} className="p-2 border-b font-semibold text-center">
                                    {format(day, 'EEE d', { locale: es })}
                                </div>
                            ))}
                            {sortedCourts.map((court) => (
                                <React.Fragment key={court.id}>
                                    <div className="sticky left-0 bg-card z-10 p-2 border-r flex items-center justify-center text-center font-medium">
                                        {court.courtType} {court.courtNumber}
                                    </div>
                                    {weekDays.map((day) => (
                                        <div key={`${day.toString()}-${court.id}`} className="border-b p-1 space-y-1 relative">
                                            {hours.map(hour => {
                                                const reservation = getReservationForSlot(day, hour, court.id);
                                                return (
                                                    <div key={hour} className="text-xs rounded-md">
                                                        {reservation ? (
                                                            <button
                                                                onClick={() => setSelectedReservation(reservation)}
                                                                className="w-full text-left p-1 rounded-md bg-primary/90 text-primary-foreground hover:bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                                                            >
                                                                <div className="font-semibold truncate">{reservation.user?.firstName}</div>
                                                                <div className="opacity-80">{hour}</div>
                                                            </button>
                                                        ) : (
                                                            <div className="p-1">
                                                                <span className="text-muted-foreground">{hour}: </span>
                                                                <span className="text-muted-foreground/50">Libre</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedReservation} onOpenChange={(isOpen) => { if (!isOpen) setSelectedReservation(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Reserva</DialogTitle>
                        <DialogDescription>
                            Información completa de la reserva y el cliente.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReservation && (
                        <div className="space-y-3 text-sm">
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Cliente</h4>
                                <p className="text-base">{selectedReservation.user?.firstName} {selectedReservation.user?.lastName}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Email</h4>
                                <p>{selectedReservation.user?.email}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Teléfono</h4>
                                <p>{selectedReservation.user?.phoneNumber}</p>
                            </div>
                            <Separator className="my-4" />
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Cancha</h4>
                                <p>{selectedReservation.court?.courtType} {selectedReservation.court?.courtNumber}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Fecha y Hora</h4>
                                <p>{format((selectedReservation.reservationDateTime as any).toDate(), "EEEE d 'de' LLLL 'a las' HH:mm 'hs'", { locale: es })}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedReservation(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

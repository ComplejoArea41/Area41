'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, set, Timestamp } from 'firebase/firestore';
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
import { ChevronLeft, ChevronRight, ArrowLeft, Goal } from 'lucide-react';
import type { Reservation, User, Court, FixedReservation } from "@/lib/types";
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

type FullReservation = Reservation & {
    user: User | null;
    court: Court | null; // The court of the current calendar context
    isFixed?: boolean;
};

const hours = Array.from({ length: 18 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

export default function AdminReservationsCalendarPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState<FullReservation | null>(null);
    
    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

    const reservationsRef = useMemoFirebase(() => collection(firestore, 'reservations'), [firestore]);
    const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsRef);

    const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersRef);

    const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
    const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsRef);

    const fixedReservationsRef = useMemoFirebase(() => collection(firestore, 'fixed_reservations'), [firestore]);
    const { data: fixedReservations, isLoading: areFixedReservationsLoading } = useCollection<FixedReservation>(fixedReservationsRef);

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    }, [weekStart]);
    
    const getReservationForSlot = (day: Date, hour: string, courtId: string): FullReservation | undefined => {
        if (!courts) return undefined;
        
        const [hourNum] = hour.split(':').map(Number);
        const slotDateTime = new Date(day);
        slotDateTime.setHours(hourNum, 0, 0, 0);

        const courtToDisplay = courts.find(c => c.id === courtId);
        if (!courtToDisplay) return undefined;
    
        // 1. Check for regular reservations
        if (reservations && users) {
            const usersMap = new Map(users.map(u => [u.id, u]));
            const reservationsInSlot = reservations.filter(res => {
                const resDateTime = (res.reservationDateTime as any).toDate();
                return resDateTime.getTime() === slotDateTime.getTime();
            });
    
            for (const reservation of reservationsInSlot) {
                let isBlocked = false;
                for (const reservedCourtId of reservation.courtIds) {
                     if (reservedCourtId === courtId) {
                        isBlocked = true;
                        break;
                     }
        
                     const reservedCourt = courts.find(c => c.id === reservedCourtId);
                     if (!reservedCourt) continue;
        
                    if (courtToDisplay.courtType === 'Futbol 5' && reservedCourt.courtType === 'Futbol 7') {
                        const f7Number = reservedCourt.courtNumber;
                        const f5Equivalent1 = (f7Number * 2) - 1;
                        const f5Equivalent2 = f7Number * 2;
                        if (courtToDisplay.courtNumber === f5Equivalent1 || courtToDisplay.courtNumber === f5Equivalent2) {
                            isBlocked = true;
                            break;
                        }
                    }
                    
                    if (courtToDisplay.courtType === 'Futbol 7' && reservedCourt.courtType === 'Futbol 5') {
                         const f7TargetNumber = courtToDisplay.courtNumber;
                         const f5Equivalent1 = (f7TargetNumber * 2) - 1;
                         const f5Equivalent2 = f7TargetNumber * 2;
                         if (reservedCourt.courtNumber === f5Equivalent1 || reservedCourt.courtNumber === f5Equivalent2) {
                            isBlocked = true;
                            break;
                         }
                    }
                }
        
                if (isBlocked) {
                    return {
                        ...reservation,
                        user: usersMap.get(reservation.userId) || null,
                        court: courtToDisplay,
                        isFixed: false,
                    };
                }
            }
        }

        // 2. Check for fixed reservations
        if (fixedReservations) {
            const dayOfWeek = day.getDay();
            const matchingFixedReservations = fixedReservations.filter(fr => fr.isActive && fr.dayOfWeek === dayOfWeek && fr.time === hour);
            
            for (const fixedRes of matchingFixedReservations) {
                let isBlocked = false;
                const fixedCourt = courts.find(c => c.id === fixedRes.courtId);
                if (!fixedCourt) continue;

                if (fixedCourt.id === courtId) {
                    isBlocked = true;
                } else if (courtToDisplay.courtType === 'Futbol 5' && fixedCourt.courtType === 'Futbol 7') {
                    const f7Number = fixedCourt.courtNumber;
                    const f5Equivalent1 = (f7Number * 2) - 1;
                    const f5Equivalent2 = f7Number * 2;
                    if (courtToDisplay.courtNumber === f5Equivalent1 || courtToDisplay.courtNumber === f5Equivalent2) isBlocked = true;
                } else if (courtToDisplay.courtType === 'Futbol 7' && fixedCourt.courtType === 'Futbol 5') {
                    const f7TargetNumber = courtToDisplay.courtNumber;
                    const f5Equivalent1 = (f7TargetNumber * 2) - 1;
                    const f5Equivalent2 = f7TargetNumber * 2;
                    if (fixedCourt.courtNumber === f5Equivalent1 || fixedCourt.courtNumber === f5Equivalent2) isBlocked = true;
                }

                if (isBlocked) {
                    return {
                        id: fixedRes.id,
                        userId: 'fixed-user',
                        courtIds: [fixedRes.courtId],
                        reservationDateTime: Timestamp.fromDate(slotDateTime) as any,
                        durationMinutes: 60,
                        user: {
                            id: 'fixed-user',
                            firstName: fixedRes.clientName,
                            lastName: '(Turno Fijo)',
                            email: 'N/A',
                            phoneNumber: fixedRes.phoneNumber || 'N/A'
                        },
                        court: courtToDisplay,
                        isFixed: true
                    }
                }
            }
        }
    
        return undefined;
    };
    
    const sortedCourts = useMemo(() => courts?.filter(c => c.courtType === 'Futbol 5' || c.courtType === 'Futbol 7').sort((a, b) => {
        if (a.courtType < b.courtType) return -1;
        if (a.courtType > b.courtType) return 1;
        return a.courtNumber - b.courtNumber;
    }) || [], [courts]);

    const isLoading = isUserLoading || isProfileLoading || areReservationsLoading || areUsersLoading || areCourtsLoading || areFixedReservationsLoading;

    if (isLoading || (user && !userProfile)) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
                <p className="text-primary-foreground">Cargando gestión de reservas...</p>
            </div>
        );
    }
    
    if (!selectedCourt) {
        const futbol5Courts = sortedCourts.filter(c => c.courtType === 'Futbol 5');
        const futbol7Courts = sortedCourts.filter(c => c.courtType === 'Futbol 7');

        return (
            <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
                <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
                    <CardHeader>
                        <CardTitle>Seleccionar Cancha</CardTitle>
                        <CardDescription>
                            Elige una cancha para ver su calendario de reservas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                         <div>
                            <h3 className="text-2xl font-bold mb-4">Canchas de Fútbol 5</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {futbol5Courts.map(court => (
                                    <Button key={court.id} variant="outline" className="h-20 text-lg" onClick={() => setSelectedCourt(court)}>
                                        <Goal className="mr-2" /> Cancha {court.courtNumber}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-4">Canchas de Fútbol 7</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {futbol7Courts.map(court => (
                                    <Button key={court.id} variant="outline" className="h-20 text-lg" onClick={() => setSelectedCourt(court)}>
                                       <Goal className="mr-2" /> Cancha {court.courtNumber}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full">
                <CardHeader>
                    <div className="flex items-center gap-4">
                         <Button variant="outline" size="icon" onClick={() => setSelectedCourt(null)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <CardTitle>Calendario de Reservas</CardTitle>
                            <CardDescription>
                                {`Mostrando reservas para ${selectedCourt.courtType} - Cancha ${selectedCourt.courtNumber}`}
                            </CardDescription>
                        </div>
                    </div>
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
                            <div className="sticky left-0 bg-card z-10 p-2 border-r border-b font-semibold text-center">Hora</div>
                            {weekDays.map(day => (
                                <div key={day.toString()} className="p-2 border-b font-semibold text-center">
                                    {format(day, 'EEE d', { locale: es })}
                                </div>
                            ))}
                            {hours.map((hour) => (
                                <React.Fragment key={hour}>
                                    <div className="sticky left-0 bg-card z-10 p-2 border-r flex items-center justify-center text-center font-medium">
                                        {hour}
                                    </div>
                                    {weekDays.map((day) => {
                                        const reservation = getReservationForSlot(day, hour, selectedCourt.id);
                                        return (
                                            <div key={`${day.toString()}-${hour}`} className="border-b p-1 h-16 flex items-center justify-center">
                                                {reservation ? (
                                                    <button
                                                        onClick={() => setSelectedReservation(reservation)}
                                                        className={`w-full h-full text-left p-2 rounded-md ${reservation.isFixed ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : 'bg-primary/90 text-primary-foreground hover:bg-primary'} transition-colors focus:outline-none focus:ring-2 focus:ring-ring`}
                                                    >
                                                        <div className="font-semibold truncate">{reservation.user?.firstName}</div>
                                                        <div className="text-xs opacity-80 truncate">{reservation.user?.lastName}</div>
                                                    </button>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground/50">Libre</div>
                                                )}
                                            </div>
                                        );
                                    })}
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
                                <p>{selectedCourt.courtType} {selectedCourt.courtNumber}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Fecha y Hora</h4>
                                <p>{format((selectedReservation.reservationDateTime as any).toDate(), "EEEE d 'de' LLLL 'a las' HH:mm 'hs'", { locale: es })}</p>
                            </div>
                             {selectedReservation.isFixed && <p className="text-center font-bold text-secondary-foreground bg-secondary p-2 rounded-md">Este es un turno fijo semanal.</p>}
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

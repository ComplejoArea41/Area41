
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { addDays, format, set, startOfDay, isBefore, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { collection, query, where, Timestamp, doc, addDoc } from 'firebase/firestore';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, useCollection, useDoc, useFirestore, useUser, useMemoFirebase, FirestorePermissionError, errorEmitter } from "@/firebase";
import { useRouter } from "next/navigation";
import type { Court, Reservation, FixedReservation } from "@/lib/types";
import { ChevronUp } from "lucide-react";


export default function ReservationPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [courtToReserve, setCourtToReserve] = useState<Court | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

  const courtsCollectionRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
  const { data: allCourts, isLoading: areCourtsLoading } = useCollection<Court>(courtsCollectionRef);

  const fixedReservationsRef = useMemoFirebase(() => collection(firestore, 'fixed_reservations'), [firestore]);
  const { data: fixedReservations, isLoading: areFixedReservationsLoading } = useCollection<FixedReservation>(fixedReservationsRef);

  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedDate) return null;
    const start = startOfDay(selectedDate);
    const end = addDays(start, 1);
    return query(
      collection(firestore, 'reservations'),
      where('reservationDateTime', '>=', Timestamp.fromDate(start)),
      where('reservationDateTime', '<', Timestamp.fromDate(end))
    );
  }, [firestore, selectedDate]);

  const { data: reservations, isLoading: areReservationsLoading, error } = useCollection<Reservation>(reservationsQuery);
  
  useEffect(() => {
    if (isUserLoading) return;
    if (!user) router.push('/login');
  }, [user, isUserLoading, router]);

  const dateScrollerDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, i) => addDays(today, i));
  }, []);

  const availableTimes = useMemo(() => {
    const slots = [];
    for (let i = 8; i < 24; i++) slots.push(`${String(i).padStart(2, '0')}:00`);
    for (let i = 0; i < 3; i++) slots.push(`${String(i).padStart(2, '0')}:00`);
    return slots;
  }, []);

  const isSlotBlocked = useCallback((time: string, courtId: string, forDate: Date): { isReserved: boolean, isFixed: boolean } => {
    if (!allCourts) return { isReserved: false, isFixed: false };

    const [hour, minute] = time.split(':').map(Number);
    const slotDateTime = set(forDate, { hours: hour, minutes: minute }).getTime();
    const courtToCheck = allCourts.find(c => c.id === courtId);
    if (!courtToCheck) return { isReserved: false, isFixed: false };

    // Check fixed reservations
    if (fixedReservations) {
        const dayOfWeek = forDate.getDay();
        for (const fixedRes of fixedReservations) {
            if (!fixedRes.isActive || fixedRes.dayOfWeek !== dayOfWeek || fixedRes.time !== time) continue;
            const fixedCourt = allCourts.find(c => c.id === fixedRes.courtId);
            if (!fixedCourt) continue;
            let isBlocked = false;
            if (fixedCourt.id === courtId) isBlocked = true;
            else if (courtToCheck.courtType === 'Futbol 5' && fixedCourt.courtType === 'Futbol 7') {
                if (courtToCheck.courtNumber === (fixedCourt.courtNumber * 2) - 1 || courtToCheck.courtNumber === fixedCourt.courtNumber * 2) isBlocked = true;
            } else if (courtToCheck.courtType === 'Futbol 7' && fixedCourt.courtType === 'Futbol 5') {
                if (fixedCourt.courtNumber === (courtToCheck.courtNumber * 2) - 1 || fixedCourt.courtNumber === courtToCheck.courtNumber * 2) isBlocked = true;
            }
            if (isBlocked) return { isReserved: false, isFixed: true };
        }
    }

    // Check regular reservations
    if (reservations) {
        const reservationsForSlot = reservations.filter(res => res.reservationDateTime && (res.reservationDateTime as any).toDate().getTime() === slotDateTime);
        for (const reservation of reservationsForSlot) {
            for (const reservedCourtId of reservation.courtIds) {
                if (reservedCourtId === courtId) return { isReserved: true, isFixed: false };
                const reservedCourt = allCourts.find(c => c.id === reservedCourtId);
                if (!reservedCourt) continue;
                if (courtToCheck.courtType === 'Futbol 5' && reservedCourt.courtType === 'Futbol 7') {
                    if (courtToCheck.courtNumber === (reservedCourt.courtNumber * 2) - 1 || courtToCheck.courtNumber === reservedCourt.courtNumber * 2) return { isReserved: true, isFixed: false };
                } else if (courtToCheck.courtType === 'Futbol 7' && reservedCourt.courtType === 'Futbol 5') {
                    if (reservedCourt.courtNumber === (courtToCheck.courtNumber * 2) - 1 || reservedCourt.courtNumber === courtToCheck.courtNumber * 2) return { isReserved: true, isFixed: false };
                }
            }
        }
    }
    return { isReserved: false, isFixed: false };
  }, [reservations, allCourts, fixedReservations]);

  const availableCourts = useMemo(() => {
    if (!selectedDate || !selectedTime || !allCourts) return [];
    return allCourts.filter(court => {
        const { isReserved, isFixed } = isSlotBlocked(selectedTime, court.id, selectedDate);
        return !isReserved && !isFixed;
    }).sort((a,b) => {
        if (a.courtType < b.courtType) return -1;
        if (a.courtType > b.courtType) return 1;
        return a.courtNumber - b.courtNumber;
    });
  }, [selectedDate, selectedTime, allCourts, isSlotBlocked]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };
  
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleReserveCourt = (court: Court) => {
    if (!user) {
        router.push('/login');
        return;
    }
    if (!userProfile || !userProfile.firstName || !userProfile.lastName || !userProfile.phoneNumber) {
        toast({ title: 'Perfil Incompleto', description: 'Por favor completa tu nombre, apellido y teléfono en tu perfil antes de reservar.', variant: 'destructive', action: (<Button onClick={() => router.push('/profile')}>Ir al Perfil</Button>) });
        return;
    }
    setCourtToReserve(court);
    setIsDialogOpen(true);
  }

  async function confirmReservation() {
    if (!user || !allCourts || !firestore || !selectedDate || !selectedTime || !courtToReserve) return;
    
    let courtIdsToReserve = [courtToReserve.id];
    if(courtToReserve.courtType === 'Futbol 7') {
        const f7Number = courtToReserve.courtNumber;
        const f5Court1 = allCourts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === (f7Number * 2) - 1);
        const f5Court2 = allCourts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === f7Number * 2);
        if(f5Court1) courtIdsToReserve.push(f5Court1.id);
        if(f5Court2) courtIdsToReserve.push(f5Court2.id);
    }
  
    const reservationsCollection = collection(firestore, 'reservations');
    const [hour, minute] = selectedTime.split(':').map(Number);
    const reservationDateTime = set(selectedDate, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
      
    const reservationData = {
      userId: user.uid,
      courtIds: courtIdsToReserve, 
      reservationDateTime: Timestamp.fromDate(reservationDateTime),
      durationMinutes: 60,
    };

    try {
      await addDoc(reservationsCollection, reservationData).catch(error => {
        const permissionError = new FirestorePermissionError({
          path: reservationsCollection.path,
          operation: 'create',
          requestResourceData: reservationData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw error;
      });
    } catch(e) {
      toast({ title: 'Error en la Reserva', description: 'No se pudo registrar la reserva. Por favor, inténtalo de nuevo.', variant: 'destructive'});
      setIsDialogOpen(false); 
      return; 
    }

    const courtDescription = `${courtToReserve.courtType} - Cancha ${courtToReserve.courtNumber}`;
    const fullName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`;
    const phone = userProfile.phoneNumber || 'No especificado';
    const totalCost = courtToReserve.price;
  
    const message = encodeURIComponent(
      `¡Hola! Quiero confirmar mi reserva:\n\n` +
      `*Cancha:* ${courtDescription}\n` +
      `*Fecha:* ${format(selectedDate, 'dd/MM/yyyy')}\n` +
      `*Horario:* ${selectedTime}\n` +
      `*Total a Pagar:* $${totalCost.toLocaleString('es-AR')}\n\n` +
      `*Nombre:* ${fullName}\n` +
      `*Teléfono:* ${phone}`
    );
  
    const whatsappUrl = `https://wa.me/2324610433?text=${message}`;
    window.open(whatsappUrl, '_blank');
  
    setSelectedTime(null);
    setCourtToReserve(null);
    setIsDialogOpen(false); 
  }

  const isLoadingPage = isUserLoading || isProfileLoading || areCourtsLoading;

  if (isLoadingPage || (user && !userProfile)) {
    return (<div className="flex min-h-screen items-center justify-center dark bg-background"><p className="text-primary-foreground">Cargando disponibilidad...</p></div>);
  }
  
  if (error) {
    return (<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8"><Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl"><CardHeader><CardTitle>Error de Permisos</CardTitle><CardDescription>No hemos podido cargar la disponibilidad. Contacta al administrador.</CardDescription></CardHeader><CardContent><p className="text-destructive">{error.message}</p></CardContent></Card></div>)
  }

  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        <Card className="bg-card/80 backdrop-blur-sm w-full max-w-md">
          <Tabs defaultValue="reservar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reservar">RESERVAR</TabsTrigger>
              <TabsTrigger value="info" disabled>INFO GENERAL</TabsTrigger>
            </TabsList>
            <TabsContent value="reservar">
              <div className="p-1">
                {/* Date Scroller */}
                <div className="flex items-center space-x-2 py-4">
                    <div className="p-2 rounded-md border border-input">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div className="flex space-x-3 overflow-x-auto pb-2">
                    {dateScrollerDays.map(day => (
                        <button key={day.toString()} onClick={() => handleDateSelect(day)}
                            className={cn("flex flex-col items-center justify-center p-2 rounded-md shrink-0 w-16 h-16 transition-colors",
                            isSameDay(day, selectedDate) ? 'bg-primary/20 text-primary' : 'hover:bg-accent'
                            )}
                        >
                            <span className="text-xs font-semibold uppercase">{isSameDay(day, new Date()) ? 'Hoy' : format(day, 'E', { locale: es })}</span>
                            <span className={cn("text-2xl font-bold", isSameDay(day, selectedDate) ? 'text-primary' : '')}>{format(day, 'd')}</span>
                            <span className="text-xs uppercase">{format(day, 'MMM', { locale: es })}</span>
                        </button>
                    ))}
                    </div>
                </div>

                {/* Time Grid */}
                <p className="text-xs text-muted-foreground mb-4">*Solo estás viendo los horarios que tienen turnos disponibles</p>
                <div className="grid grid-cols-4 md:grid-cols-5 gap-2 mb-6">
                    {availableTimes.map(time => {
                        const [hour] = time.split(':').map(Number);
                        const timeDate = set(selectedDate, { hours: hour, minutes: 0 });
                        const isPast = isBefore(timeDate, new Date());
                        
                        // A time is disabled if it's in the past
                        const isDisabled = isPast;

                        return (
                            <Button key={time} type="button" size="sm" 
                                variant={selectedTime === time ? "default" : "outline"}
                                onClick={() => handleTimeSelect(time)}
                                disabled={isDisabled}
                            >
                                {time}
                            </Button>
                        );
                    })}
                </div>

                {/* Available Courts */}
                {selectedDate && selectedTime && (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Reservar una cancha</h3>
                        {areReservationsLoading || areFixedReservationsLoading ? (
                            <p>Buscando canchas...</p>
                        ) : availableCourts.length > 0 ? (
                           availableCourts.map(court => (
                            <button key={court.id} onClick={() => handleReserveCourt(court)} className="w-full text-left">
                                <Card className="hover:bg-accent transition-colors">
                                    <CardContent className="p-3 flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold">{court.courtType} - Cancha {court.courtNumber}</p>
                                        <p className="text-sm text-muted-foreground">Césped sintético</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-primary text-lg">${court.price.toLocaleString('es-AR')}</p>
                                        <p className="text-xs text-muted-foreground">60 min</p>
                                      </div>
                                    </CardContent>
                                </Card>
                            </button>
                           ))
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No hay canchas disponibles en este horario.</p>
                        )}
                    </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="info">
                <Card className="m-2">
                    <CardHeader>
                        <CardTitle>Información del Complejo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Próximamente encontrarás aquí más información sobre el complejo, ubicación, y más.</p>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </Card>
         <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Tu Reserva</AlertDialogTitle>
                <AlertDialogDescription>
                ¡Estás a un paso de asegurar tu cancha! Se generará un mensaje de WhatsApp para que envíes y confirmes. Te recordamos que, para cancelar sin costo, es necesario avisar con la debida antelación. En caso de no presentarse, el valor de la reserva deberá ser abonado en tu próxima visita. ¡Gracias por tu compromiso!
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={confirmReservation}>
                Aceptar y Enviar WhatsApp
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}

    
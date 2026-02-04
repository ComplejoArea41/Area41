'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { addDays, format, startOfDay, isBefore, set, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { collection, query, where, Timestamp, doc, addDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { Court, Reservation, FixedReservation } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Loader2 } from 'lucide-react';


export default function ReservationPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [selectedCourtType, setSelectedCourtType] = useState<'Futbol 5' | 'Futbol 7'>('Futbol 5');
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<{time: string, date: Date}>({ time: '', date: new Date()});
  const [isConfirming, setIsConfirming] = useState(false);

  const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

  const courtsCollectionRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
  const { data: allCourts, isLoading: areCourtsLoading } = useCollection<Court>(courtsCollectionRef);

  const fixedReservationsRef = useMemoFirebase(() => query(collection(firestore, 'fixed_reservations'), where('isActive', '==', true)), [firestore]);
  const { data: fixedReservations, isLoading: areFixedReservationsLoading } = useCollection<FixedReservation>(fixedReservationsRef);
  
  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedDate) return null;
    const start = startOfDay(selectedDate);
    // Fetch for two days to cover overnight bookings for the selected date.
    const end = addDays(start, 2);
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

  const courtsForType = useMemo(() => {
    if (!allCourts) return [];
    return allCourts.filter(c => c.courtType === selectedCourtType).sort((a,b) => a.courtNumber - b.courtNumber);
  }, [allCourts, selectedCourtType]);
  
  // Reset dependent selections when a higher-level selection changes
  useEffect(() => {
      setSelectedCourtId(null);
  }, [selectedCourtType]);

  const availableTimes = useMemo(() => {
    const slots = [];
    for (let i = 8; i < 24; i++) slots.push(`${String(i).padStart(2, '0')}:00`);
    for (let i = 0; i < 3; i++) slots.push(`${String(i).padStart(2, '0')}:00`);
    return slots;
  }, []);

  const nextFourteenDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  }, []);

  const isSlotBlocked = useCallback((time: string, courtId: string, forDate: Date): { isBlocked: boolean; isFixed: boolean } => {
    if (!allCourts || !forDate) return { isBlocked: false, isFixed: false };
  
    const [hour, minute] = time.split(':').map(Number);
    let checkDate = forDate;
    
    // If the time is in the early morning, it's for the next calendar day
    if (hour >= 0 && hour < 8) {
        checkDate = addDays(forDate, 1);
    }

    const slotDateTime = set(checkDate, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 }).getTime();
    const courtToCheck = allCourts.find(c => c.id === courtId);
    if (!courtToCheck) return { isBlocked: false, isFixed: false };
  
    // Check fixed reservations
    if (fixedReservations) {
      const dayOfWeek = checkDate.getDay();
      for (const fixedRes of fixedReservations) {
        if (!fixedRes.isActive || fixedRes.dayOfWeek !== dayOfWeek || fixedRes.time !== time) continue;
        
        const fixedCourt = allCourts.find(c => c.id === fixedRes.courtId);
        if (!fixedCourt) continue;
        
        let isBlockedByFixed = false;
        if (fixedCourt.id === courtId) isBlockedByFixed = true;
        else if (courtToCheck.courtType === 'Futbol 5' && fixedCourt.courtType === 'Futbol 7') {
          if (courtToCheck.courtNumber === (fixedCourt.courtNumber * 2) - 1 || courtToCheck.courtNumber === fixedCourt.courtNumber * 2) isBlockedByFixed = true;
        } else if (courtToCheck.courtType === 'Futbol 7' && fixedCourt.courtType === 'Futbol 5') {
          if (fixedCourt.courtNumber === (courtToCheck.courtNumber * 2) - 1 || fixedCourt.courtNumber === (courtToCheck.courtNumber * 2)) isBlockedByFixed = true;
        }
        if (isBlockedByFixed) return { isBlocked: true, isFixed: true };
      }
    }
  
    // Check regular reservations
    if (reservations) {
      for (const reservation of reservations) {
        if (!reservation.reservationDateTime) continue;
        const resDateTime = (reservation.reservationDateTime as any).toDate().getTime();

        if (resDateTime === slotDateTime) {
            for (const reservedCourtId of reservation.courtIds) {
                if (reservedCourtId === courtId) return { isBlocked: true, isFixed: false };
                const reservedCourt = allCourts.find(c => c.id === reservedCourtId);
                if (!reservedCourt) continue;
                if (courtToCheck.courtType === 'Futbol 5' && reservedCourt.courtType === 'Futbol 7') {
                    if (courtToCheck.courtNumber === (reservedCourt.courtNumber * 2) - 1 || courtToCheck.courtNumber === reservedCourt.courtNumber * 2) return { isBlocked: true, isFixed: false };
                } else if (courtToCheck.courtType === 'Futbol 7' && reservedCourt.courtType === 'Futbol 5') {
                    if (reservedCourt.courtNumber === (courtToCheck.courtNumber * 2) - 1 || reservedCourt.courtNumber === (courtToCheck.courtNumber * 2)) return { isBlocked: true, isFixed: false };
                }
            }
        }
      }
    }
    
    return { isBlocked: false, isFixed: false };
  }, [reservations, allCourts, fixedReservations]);

  const handleTimeSelect = (time: string) => {
    if (!user) {
        router.push('/login');
        return;
    }
    if (!userProfile || !userProfile.firstName || !userProfile.lastName || !userProfile.phoneNumber) {
        toast({ title: 'Perfil Incompleto', description: 'Por favor completa tu nombre, apellido y teléfono en tu perfil antes de reservar.', variant: 'destructive', action: (<Button onClick={() => router.push('/profile')}>Ir al Perfil</Button>) });
        return;
    }
    
    const [hour] = time.split(':').map(Number);
    let reservationDate = selectedDate!;
    if (hour >= 0 && hour < 8) { // Assuming hours 0-7 are for the next day
      reservationDate = addDays(selectedDate!, 1);
    }

    setDialogData({
      time: time,
      date: reservationDate,
    });
    setIsDialogOpen(true);
  }

  async function confirmReservation() {
    if (!user || !allCourts || !firestore || !selectedCourtId || !userProfile) return;
  
    setIsConfirming(true);
    const { time, date } = dialogData;
  
    const courtToReserve = allCourts.find(c => c.id === selectedCourtId);
    if (!courtToReserve) {
        setIsConfirming(false);
        setIsDialogOpen(false);
        return;
    }
  
    let courtIdsToReserve = [courtToReserve.id];
    if (courtToReserve.courtType === 'Futbol 7') {
      const f7Number = courtToReserve.courtNumber;
      const f5Court1 = allCourts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === (f7Number * 2) - 1);
      const f5Court2 = allCourts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === f7Number * 2);
      if (f5Court1) courtIdsToReserve.push(f5Court1.id);
      if (f5Court2) courtIdsToReserve.push(f5Court2.id);
    }
  
    const reservationsCollection = collection(firestore, 'reservations');
  
    const [hour, minute] = time.split(':').map(Number);
    const reservationFullDate = set(date, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
  
    const reservationData = {
      userId: user.uid,
      courtIds: courtIdsToReserve,
      reservationDateTime: Timestamp.fromDate(reservationFullDate),
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
    } catch (e) {
      toast({ title: 'Error en la Reserva', description: 'No se pudo registrar la reserva. Por favor, inténtalo de nuevo.', variant: 'destructive' });
      setIsConfirming(false);
      return;
    }
  
    const courtDescription = `${courtToReserve.courtType} - Cancha ${courtToReserve.courtNumber}`;
    const fullName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`;
    const phone = userProfile.phoneNumber || 'No especificado';
    const totalCost = courtToReserve.price;
  
    const message = encodeURIComponent(
      `¡Hola! Quiero confirmar mi reserva:\n\n` +
      `*Cancha:* ${courtDescription}\n` +
      `*Fecha:* ${format(reservationFullDate, 'dd/MM/yyyy')}\n` +
      `*Horario:* ${time}\n` +
      `*Total a Pagar:* $${totalCost.toLocaleString('es-AR')}\n\n` +
      `*Nombre:* ${fullName}\n` +
      `*Teléfono:* ${phone}`
    );
  
    const whatsappUrl = `https://wa.me/2324500029?text=${message}`;
    window.location.assign(whatsappUrl);
  
    setIsDialogOpen(false);
  }
  
  const isLoadingPage = isUserLoading || isProfileLoading || areCourtsLoading || areFixedReservationsLoading;

  if (isLoadingPage || (user && !userProfile)) {
    return (<div className="flex min-h-screen items-center justify-center dark bg-background"><p className="text-primary-foreground">Cargando disponibilidad...</p></div>);
  }
  
  if (error) {
    return (<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8"><Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl"><CardHeader><CardTitle>Error de Permisos</CardTitle><CardDescription>No hemos podido cargar la disponibilidad. Contacta al administrador.</CardDescription></CardHeader><CardContent><p className="text-destructive">{error.message}</p></CardContent></Card></div>)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
      <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Reserva Tu Cancha</CardTitle>
          <CardDescription>¿Listos para el partido? Asegura tu lugar en Area41.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div>
            <h3 className="mb-4 text-lg font-semibold">1. Selecciona el tipo de cancha</h3>
            <Tabs value={selectedCourtType} onValueChange={(value) => setSelectedCourtType(value as 'Futbol 5' | 'Futbol 7')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="Futbol 5">Fútbol 5</TabsTrigger>
                <TabsTrigger value="Futbol 7">Fútbol 7</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div>
            <h3 className="mb-4 text-lg font-semibold">2. Elige la cancha</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {courtsForType.map(court => (
                    <Button 
                        key={court.id} 
                        variant={selectedCourtId === court.id ? 'default' : 'outline'}
                        onClick={() => setSelectedCourtId(court.id)}
                    >
                        Cancha {court.courtNumber}
                    </Button>
                ))}
            </div>
          </div>
          
          {selectedCourtId && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">3. Elige la fecha</h3>
              <Carousel
                opts={{
                  align: "start",
                  dragFree: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2">
                  {nextFourteenDays.map((day, index) => {
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    let dayLabel = format(day, 'EEE', { locale: es }).toUpperCase();
                    if (isSameDay(day, new Date())) {
                      dayLabel = 'HOY';
                    } else if (isSameDay(day, addDays(new Date(), 1))) {
                      dayLabel = 'MAÑ';
                    }
                    const monthLabel = format(day, 'MMM', { locale: es }).replace('.', '').toUpperCase();
                    
                    return (
                      <CarouselItem key={index} className="basis-1/4 sm:basis-1/5 md:basis-[12.5%] pl-2">
                        <div className="p-1">
                          <Button
                            variant={isSelected ? 'default' : 'outline'}
                            className="flex h-20 w-full flex-col items-center justify-center gap-1 p-1 text-center"
                            onClick={() => setSelectedDate(day)}
                            disabled={isBefore(day, startOfDay(new Date()))}
                          >
                            <span className="text-xs font-medium ">{dayLabel}</span>
                            <span className="text-2xl font-bold">{format(day, 'd')}</span>
                            <span className="text-xs font-medium ">{monthLabel}</span>
                          </Button>
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 hidden sm:flex" />
                <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 hidden sm:flex" />
              </Carousel>
            </div>
          )}

          {selectedCourtId && selectedDate && (
            <div>
                <h3 className="mb-4 text-lg font-semibold">4. Elige el horario</h3>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {areReservationsLoading ? (
                    <p>Cargando horarios...</p>
                ) : (
                    availableTimes.map(time => {
                        const [hour] = time.split(':').map(Number);
                        
                        let dateForThisTime = selectedDate!;
                        if (hour >= 0 && hour < 8) {
                          dateForThisTime = addDays(dateForThisTime, 1);
                        }
                        
                        const timeDate = set(dateForThisTime, { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 });
                        const isPast = isBefore(timeDate, new Date());
                        
                        const { isBlocked, isFixed } = isSlotBlocked(time, selectedCourtId, selectedDate!);
                        
                        if (isBlocked) {
                            if (isFixed) {
                                return (
                                    <Button
                                        key={time}
                                        variant="secondary"
                                        disabled
                                        className="bg-[#800000] hover:bg-[#800000]/90 text-white w-full opacity-100"
                                        aria-label="Turno fijo"
                                    >
                                        Fijo
                                    </Button>
                                );
                            } else {
                                const bgColor = selectedCourtType === 'Futbol 5' ? 'bg-red-600' : 'bg-orange-500';
                                return (
                                    <Button
                                        key={time}
                                        disabled
                                        className={cn("w-full text-white opacity-100 border-0", bgColor)}
                                        aria-label="Reservado"
                                    >
                                        Reservado
                                    </Button>
                                );
                            }
                        }
                        
                        return (
                            <Button 
                                key={time} 
                                variant='outline'
                                disabled={isPast}
                                onClick={() => handleTimeSelect(time)}
                                aria-label={`Reservar a las ${time}`}
                            >
                                {time}
                            </Button>
                        );
                    })
                )}
                </div>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) setIsConfirming(false);
          setIsDialogOpen(isOpen);
        }}>
          <AlertDialogContent>
            {isConfirming ? (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h3 className="text-xl font-semibold">Procesando tu reserva...</h3>
                <p className="text-muted-foreground">
                  Espera un momento, te estamos redirigiendo a WhatsApp para que confirmes tu turno.
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

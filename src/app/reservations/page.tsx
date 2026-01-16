
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addDays, format, set, startOfDay, isBefore, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { collection, query, where, Timestamp, doc, addDoc }from 'firebase/firestore';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import type { Court, Reservation, FixedReservation } from "@/lib/types";


const reservationFormSchema = z.object({
  courtId: z.string().min(1, { message: "Debes seleccionar una cancha." }),
  date: z.date({
    required_error: "La fecha es requerida.",
  }),
  times: z.array(z.string()).refine((value) => value.length > 0, {
    message: "Debes seleccionar al menos un horario.",
  }),
});

type ReservationFormValues = z.infer<typeof reservationFormSchema>;


const TimeSlotButton = React.memo(({ time, selectedCourtId, selectedTimes, areReservationsLoading, isReserved, isFixed, onTimeClick, isDisabledByTime }: {
    time: string;
    selectedCourtId: string;
    selectedTimes: string[];
    areReservationsLoading: boolean;
    isReserved: boolean;
    isFixed: boolean;
    onTimeClick: (time: string) => void;
    isDisabledByTime: boolean;
}) => {
    const isDisabled = !selectedCourtId || isReserved || isFixed || areReservationsLoading || isDisabledByTime;

    return (
        <Button
            key={time}
            type="button"
            size="sm"
            variant={selectedTimes.includes(time) ? "default" : "outline"}
            onClick={() => onTimeClick(time)}
            disabled={isDisabled}
            className={cn("w-full justify-center text-xs md:text-sm", { 
                "bg-secondary text-secondary-foreground hover:bg-secondary/90 cursor-not-allowed": isFixed,
                "bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-not-allowed": isReserved,
            })}
        >
            {areReservationsLoading && selectedCourtId ? "..." : (isFixed ? "Turno Fijo" : isReserved ? "Reservado" : time)}
        </Button>
    );
});
TimeSlotButton.displayName = 'TimeSlotButton';


export default function ReservationPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [selectedCourtType, setSelectedCourtType] = useState<'Futbol 5' | 'Futbol 7'>('Futbol 5');

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

  const courtsCollectionRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
  const {data: allCourts, isLoading: areCourtsLoading} = useCollection<Court>(courtsCollectionRef);

  const fixedReservationsRef = useMemoFirebase(() => collection(firestore, 'fixed_reservations'), [firestore]);
  const { data: fixedReservations, isLoading: areFixedReservationsLoading } = useCollection<FixedReservation>(fixedReservationsRef);


  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      courtId: "",
      times: [],
      date: startOfDay(new Date()),
    },
  });
  
  const selectedDate = form.watch("date");
  const selectedCourtId = form.watch("courtId");
  const selectedTimes = form.watch("times");

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

  const { totalCost, courtPrice } = useMemo(() => {
    if (!selectedCourtId || !allCourts) return { totalCost: 0, courtPrice: 0 };
    const court = allCourts.find((c) => c.id === selectedCourtId);
    if (!court) return { totalCost: 0, courtPrice: 0 };
    return {
      totalCost: court.price * selectedTimes.length,
      courtPrice: court.price,
    };
  }, [selectedCourtId, selectedTimes.length, allCourts]);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    useEffect(() => {
      // Set date to today by default, and when court type changes
      form.setValue('date', startOfDay(new Date()));
  }, [selectedCourtType, form]);

  const isSlotBlocked = useCallback((time: string, courtId: string): { isReserved: boolean, isFixed: boolean } => {
    if (!selectedDate || !allCourts || !courtId) return { isReserved: false, isFixed: false };

    const [hour, minute] = time.split(':').map(Number);
    const slotDateTime = set(selectedDate, { hours: hour, minutes: minute }).getTime();

    const courtToCheck = allCourts.find(c => c.id === courtId);
    if (!courtToCheck) return { isReserved: false, isFixed: false };

    // Check fixed reservations
    if (!areFixedReservationsLoading && fixedReservations) {
        const dayOfWeek = selectedDate.getDay();
        for (const fixedRes of fixedReservations) {
            if (!fixedRes.isActive || fixedRes.dayOfWeek !== dayOfWeek || fixedRes.time !== time) continue;

            const fixedCourt = allCourts.find(c => c.id === fixedRes.courtId);
            if (!fixedCourt) continue;

            let isBlocked = false;
            if (fixedCourt.id === courtId) isBlocked = true;
            else if (courtToCheck.courtType === 'Futbol 5' && fixedCourt.courtType === 'Futbol 7') {
                const f7Number = fixedCourt.courtNumber;
                const f5Equivalent1 = (f7Number * 2) - 1;
                const f5Equivalent2 = f7Number * 2;
                if (courtToCheck.courtNumber === f5Equivalent1 || courtToCheck.courtNumber === f5Equivalent2) isBlocked = true;
            } else if (courtToCheck.courtType === 'Futbol 7' && fixedCourt.courtType === 'Futbol 5') {
                const f7TargetNumber = courtToCheck.courtNumber;
                const f5Equivalent1 = (f7TargetNumber * 2) - 1;
                const f5Equivalent2 = f7TargetNumber * 2;
                if (fixedCourt.courtNumber === f5Equivalent1 || fixedCourt.courtNumber === f5Equivalent2) isBlocked = true;
            }
            if (isBlocked) return { isReserved: false, isFixed: true };
        }
    }

    // Check regular reservations
    if (!areReservationsLoading && reservations) {
        const reservationsForSlot = reservations.filter(res => {
            if (!res.reservationDateTime) return false;
            return (res.reservationDateTime as any).toDate().getTime() === slotDateTime;
        });

        if (reservationsForSlot.length > 0) {
            for (const reservation of reservationsForSlot) {
                for (const reservedCourtId of reservation.courtIds) {
                    if (reservedCourtId === courtId) return { isReserved: true, isFixed: false };

                    const reservedCourt = allCourts.find(c => c.id === reservedCourtId);
                    if (!reservedCourt) continue;

                    if (courtToCheck.courtType === 'Futbol 5' && reservedCourt.courtType === 'Futbol 7') {
                        const f7Number = reservedCourt.courtNumber;
                        const f5Equivalent1 = (f7Number * 2) - 1;
                        const f5Equivalent2 = f7Number * 2;
                        if (courtToCheck.courtNumber === f5Equivalent1 || courtToCheck.courtNumber === f5Equivalent2) return { isReserved: true, isFixed: false };
                    }
                    
                    if (courtToCheck.courtType === 'Futbol 7' && reservedCourt.courtType === 'Futbol 5') {
                        const f7TargetNumber = courtToCheck.courtNumber;
                        const f5Equivalent1 = (f7TargetNumber * 2) - 1;
                        const f5Equivalent2 = f7TargetNumber * 2;
                        if (reservedCourt.courtNumber === f5Equivalent1 || reservedCourt.courtNumber === f5Equivalent2) return { isReserved: true, isFixed: false };
                    }
                }
            }
        }
    }

    return { isReserved: false, isFixed: false };
}, [reservations, areReservationsLoading, selectedDate, allCourts, fixedReservations, areFixedReservationsLoading]);

  const handleTimeClick = useCallback((time: string) => {
    const currentTimes = form.getValues("times");
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter((t) => t !== time)
      : [...currentTimes, time];
    form.setValue("times", newTimes.sort(), { shouldValidate: true });
  }, [form]);

  async function onSubmit(data: ReservationFormValues) {
    if (!user || !allCourts || !firestore) {
      toast({ title: 'Error', description: 'Debes iniciar sesión para hacer una reserva.', variant: 'destructive'});
      router.push('/login');
      return;
    }
    if (!userProfile || !userProfile.firstName || !userProfile.lastName || !userProfile.phoneNumber) {
      toast({ title: 'Perfil Incompleto', description: 'Por favor completa tu nombre, apellido y teléfono en tu perfil antes de reservar.', variant: 'destructive', action: (<Button onClick={() => router.push('/profile')}>Ir al Perfil</Button>) });
      setIsDialogOpen(false);
      return;
    }

    let courtIdsToReserve = [data.courtId];
    const selectedCourt = allCourts.find(c => c.id === data.courtId);
    
    // If a Futbol 7 court is selected, also "reserve" its constituent Futbol 5 courts
    if(selectedCourt?.courtType === 'Futbol 7') {
        const f7Number = selectedCourt.courtNumber;
        const f5Number1 = (f7Number * 2) - 1;
        const f5Number2 = f7Number * 2;
        const f5Court1 = allCourts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === f5Number1);
        const f5Court2 = allCourts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === f5Number2);
        if(f5Court1) courtIdsToReserve.push(f5Court1.id);
        if(f5Court2) courtIdsToReserve.push(f5Court2.id);
    }
  
    const reservationsCollection = collection(firestore, 'reservations');
    const reservationPromises = data.times.map((time) => {
      const [hour, minute] = time.split(':').map(Number);
      const reservationDateTime = set(data.date, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
      
      return addDoc(reservationsCollection, {
        userId: user.uid,
        courtIds: courtIdsToReserve, 
        reservationDateTime: Timestamp.fromDate(reservationDateTime),
        durationMinutes: 60,
      });
    });
  
    try {
        await Promise.all(reservationPromises);
    } catch(e) {
      toast({ title: 'Error en la Reserva', description: 'Algunos o todos los horarios no pudieron ser reservados. Por favor, inténtalo de nuevo.', variant: 'destructive'});
      setIsDialogOpen(false); 
      return; 
    }

    const court = allCourts?.find((c) => c.id === data.courtId);
    const courtDescription = court ? `${court.courtType} - Cancha ${court.courtNumber}` : "Cancha no especificada";
    const timesString = data.times.join(', ');
    const fullName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`;
    const phone = userProfile.phoneNumber || 'No especificado';
  
    const message = encodeURIComponent(
      `¡Hola! Quiero confirmar mi reserva:\n\n` +
      `*Cancha:* ${courtDescription}\n` +
      `*Fecha:* ${format(data.date, 'dd/MM/yyyy')}\n` +
      `*Horarios:* ${timesString}\n` +
      `*Total a Pagar:* $${totalCost.toLocaleString('es-AR')}\n\n` +
      `*Nombre:* ${fullName}\n` +
      `*Teléfono:* ${phone}`
    );
  
    const whatsappUrl = `https://wa.me/2324610433?text=${message}`;
    window.open(whatsappUrl, '_blank');
  
    form.reset(); 
    setIsDialogOpen(false); 
  }

  const handleConfirmClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    const isValid = await form.trigger();
    if (isValid) {
      setIsDialogOpen(true);
    } else {
      toast({ title: 'Formulario incompleto', description: 'Por favor, selecciona una cancha y al menos un horario.', variant: 'destructive' });
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 8; i < 24; i++) {
        slots.push(`${String(i).padStart(2, '0')}:00`);
    }
    for (let i = 0; i < 3; i++) {
        slots.push(`${String(i).padStart(2, '0')}:00`);
    }
    return slots;
  };
  const availableTimes = generateTimeSlots();


  const courtsForType = useMemo(() => {
    return allCourts?.filter(c => c.courtType === selectedCourtType).sort((a,b) => a.courtNumber - b.courtNumber) || [];
  }, [allCourts, selectedCourtType]);

  const isLoadingPage = isUserLoading || isProfileLoading || areCourtsLoading;

  const today = startOfDay(new Date());
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  if (isLoadingPage || (user && !userProfile)) {
    return (
        <div className="flex min-h-screen items-center justify-center dark bg-background">
          <p className="text-primary-foreground">Cargando disponibilidad...</p>
        </div>
      );
  }
  
  if (error) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
                <CardHeader>
                    <CardTitle>Error de Permisos</CardTitle>
                    <CardDescription>
                        No hemos podido cargar la disponibilidad de las canchas. Es posible que las reglas de seguridad no estén configuradas correctamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error.message}</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Reserva Tu Cancha</CardTitle>
            <CardDescription>
              ¿Listos para el partido? Asegura tu lugar en Area41.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-8">
                <div className="space-y-4">
                  <FormLabel className="text-base font-semibold">1. Selecciona el tipo y número de cancha</FormLabel>
                   <div className="flex gap-4 pt-2">
                        <Button
                            type="button"
                            variant={selectedCourtType === 'Futbol 5' ? 'default' : 'outline'}
                            onClick={() => {
                                setSelectedCourtType('Futbol 5');
                                form.setValue('courtId', '');
                                form.setValue('times', []);
                            }}
                            className="flex-1 py-6 text-lg"
                        >
                            Fútbol 5
                        </Button>
                        <Button
                            type="button"
                            variant={selectedCourtType === 'Futbol 7' ? 'default' : 'outline'}
                            onClick={() => {
                                setSelectedCourtType('Futbol 7');
                                form.setValue('courtId', '');
                                form.setValue('times', []);
                            }}
                            className="flex-1 py-6 text-lg"
                        >
                            Fútbol 7
                        </Button>
                    </div>
                </div>

                <FormField
                  control={form.control}
                  name="courtId"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {areCourtsLoading ? (
                             Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-md" />)
                          ) : (
                            courtsForType.map((court) => (
                                <Button
                                key={court.id}
                                variant={selectedCourtId === court.id ? "default" : "outline"}
                                onClick={() => {
                                    form.setValue("courtId", court.id, { shouldValidate: true });
                                    form.setValue("times", []);
                                }}
                                type="button"
                                >
                                {`Cancha ${court.courtNumber}`}
                                </Button>
                            ))
                          )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">2. Elige la fecha</FormLabel>
                        <div className="flex space-x-2 pt-2 pb-2 overflow-x-auto">
                            {dates.map((date, index) => (
                                <Button
                                    key={date.toString()}
                                    type="button"
                                    variant={isSameDay(field.value, date) ? "default" : "outline"}
                                    onClick={() => {
                                        field.onChange(date);
                                        form.setValue("times", []); // Reset times
                                    }}
                                    className="flex flex-col h-auto p-3 w-20 flex-shrink-0"
                                >
                                    <span className="text-xs font-normal capitalize">
                                        {index === 0 ? 'Hoy' : index === 1 ? 'Mañana' : format(date, 'EEE', { locale: es })}
                                    </span>
                                    <span className="text-xl font-bold">{format(date, 'd')}</span>
                                    <span className="text-xs font-normal capitalize">{format(date, 'MMM', { locale: es })}</span>
                                </Button>
                            ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                  )}
                />
                
                
                <div className="space-y-4">
                    <FormLabel className="text-base font-semibold">3. Elige el horario</FormLabel>
                    <FormField
                    control={form.control}
                    name="times"
                    render={() => (
                        <FormItem>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                {availableTimes.map(time => {
                                    const { isReserved, isFixed } = isSlotBlocked(time, selectedCourtId);
                                    const [hour, minute] = time.split(':').map(Number);
                                    const timeDate = set(selectedDate, { hours: hour, minutes: minute });
                                    const isPastTime = isBefore(timeDate, new Date());
                                    return (
                                    <TimeSlotButton
                                        key={time}
                                        time={time}
                                        selectedCourtId={selectedCourtId}
                                        selectedTimes={selectedTimes}
                                        areReservationsLoading={areReservationsLoading || areFixedReservationsLoading}
                                        isReserved={isReserved}
                                        isFixed={isFixed}
                                        onTimeClick={handleTimeClick}
                                        isDisabledByTime={isPastTime}
                                    />
                                    )
                                })}
                            </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-xl font-bold text-center">Resumen de tu Reserva</h3>
                    {selectedTimes.length > 0 && selectedCourtId ? (
                        <div className="text-center mt-2 text-muted-foreground">
                            <p>Has seleccionado {selectedTimes.length} turno(s) de 1 hora para el {format(selectedDate, "PPPP", { locale: es })}.</p>
                            <p className="text-lg">Precio por turno (1 hr): ${ (courtPrice).toLocaleString('es-AR')}</p>
                            <p className="text-3xl font-bold text-foreground mt-2">Total: ${totalCost.toLocaleString('es-AR')}</p>
                        </div>
                    ) : (
                        <p className="text-center mt-4 text-muted-foreground">
                            Completa los pasos anteriores para ver el resumen de tu reserva.
                        </p>
                    )}
                </div>

                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button type="button" className="w-full mt-8 text-lg py-6" onClick={handleConfirmClick} disabled={!form.formState.isValid}>
                            Confirmar Reserva
                        </Button>
                    </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Tu Reserva</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¡Estás a un paso de asegurar tu cancha! Se generará un mensaje de WhatsApp para que envíes y confirmes. Te recordamos que, para cancelar sin costo, es necesario avisar con la debida antelación. En caso de no presentarse, el valor de la reserva deberá ser abonado en tu próxima visita. ¡Gracias por tu compromiso!
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Volver</AlertDialogCancel>
                      <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
                        Aceptar y Enviar WhatsApp
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
  );
}


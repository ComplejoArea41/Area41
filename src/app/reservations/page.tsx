
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addDays, format, set, startOfDay } from "date-fns";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { collection, query, where, Timestamp, doc }from 'firebase/firestore';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { addDocumentNonBlocking, useCollection, useDoc, useFirestore, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import type { Court, Reservation } from "@/lib/types";
import { useMemoFirebase } from "@/firebase/provider";


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


const TimeSlotButton = React.memo(({ time, selectedCourtId, selectedTimes, areReservationsLoading, isTimeSlotReserved, onTimeClick }: {
    time: string;
    selectedCourtId: string;
    selectedTimes: string[];
    areReservationsLoading: boolean;
    isTimeSlotReserved: (time: string, courtId: string) => boolean;
    onTimeClick: (time: string) => void;
}) => {
    const isReserved = isTimeSlotReserved(time, selectedCourtId);
    const isDisabled = !selectedCourtId || isReserved || areReservationsLoading;

    return (
        <Button
            key={time}
            type="button"
            variant={selectedTimes.includes(time) ? "default" : "outline"}
            onClick={() => onTimeClick(time)}
            disabled={isDisabled}
            className={cn({ "bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-not-allowed": isReserved })}
        >
            {areReservationsLoading && selectedCourtId ? "Cargando..." : time}
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
  const { data: userProfile } = useDoc(userRef);

  const courtsCollectionRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
  const {data: allCourts, isLoading: areCourtsLoading} = useCollection<Court>(courtsCollectionRef);


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
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isTimeSlotReserved = useCallback((time: string, courtId: string) => {
    if (areReservationsLoading || !reservations || !selectedDate || !allCourts || !courtId) return false;

    const [hour, minute] = time.split(':').map(Number);
    const slotDateTime = set(selectedDate, { hours: hour, minutes: minute }).getTime();

    const reservationsForSlot = reservations.filter(res => {
        if (!res.reservationDateTime) return false;
        const resDateTime = (res.reservationDateTime as any).toDate().getTime();
        return resDateTime === slotDateTime;
    });

    if (reservationsForSlot.length === 0) return false;

    const courtToCheck = allCourts.find(c => c.id === courtId);
    if (!courtToCheck) return false;

    for (const reservation of reservationsForSlot) {
        for (const reservedCourtId of reservation.courtIds) {
            const reservedCourt = allCourts.find(c => c.id === reservedCourtId);
            if (!reservedCourt) continue;

            // Case 1: Checking a Futbol 5 court
            if (courtToCheck.courtType === 'Futbol 5') {
                // If it's directly reserved
                if (reservedCourtId === courtId) return true;
                
                // If a related Futbol 7 court is reserved
                if (reservedCourt.courtType === 'Futbol 7') {
                    const f7Number = reservedCourt.courtNumber;
                    const f5Number1 = (f7Number * 2) - 1;
                    const f5Number2 = f7Number * 2;
                    if (courtToCheck.courtNumber === f5Number1 || courtToCheck.courtNumber === f5Number2) {
                        return true;
                    }
                }
            }
            
            // Case 2: Checking a Futbol 7 court
            if (courtToCheck.courtType === 'Futbol 7') {
                 // If it's directly reserved
                 if (reservedCourtId === courtId) return true;

                 // If a related Futbol 5 court is reserved
                 if (reservedCourt.courtType === 'Futbol 5') {
                    const f7Number = courtToCheck.courtNumber;
                    const f5Number1 = (f7Number * 2) - 1;
                    const f5Number2 = f7Number * 2;
                     if (reservedCourt.courtNumber === f5Number1 || reservedCourt.courtNumber === f5Number2) {
                        return true;
                     }
                 }
            }
        }
    }

    return false;
}, [reservations, areReservationsLoading, selectedDate, allCourts]);

  const handleTimeClick = (time: string) => {
    const currentTimes = form.getValues("times");
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter((t) => t !== time)
      : [...currentTimes, time];
    form.setValue("times", newTimes.sort(), { shouldValidate: true });
  };

  async function onSubmit(data: ReservationFormValues) {
    if (!user || !allCourts) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para hacer una reserva.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }
    if (
      !userProfile ||
      !userProfile.firstName ||
      !userProfile.lastName ||
      !userProfile.phoneNumber
    ) {
      toast({
        title: 'Perfil Incompleto',
        description:
          'Por favor completa tu nombre, apellido y teléfono en tu perfil antes de reservar.',
        variant: 'destructive',
        action: (
            <Button onClick={() => router.push('/profile')}>Ir al Perfil</Button>
        )
      });
      setIsDialogOpen(false);
      return;
    }

    let courtIdsToReserve = [data.courtId];
    const selectedCourt = allCourts.find(c => c.id === data.courtId);
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
      const reservationDateTime = set(data.date, {
        hours: hour,
        minutes: minute,
        seconds: 0,
        milliseconds: 0,
      });
      return addDocumentNonBlocking(reservationsCollection, {
        userId: user.uid,
        courtIds: courtIdsToReserve, 
        reservationDateTime: Timestamp.fromDate(reservationDateTime),
        durationMinutes: 60,
      });
    });
  
    const results = await Promise.allSettled(reservationPromises);
    
    const failedReservations = results.filter(result => result.status === 'rejected');

    if (failedReservations.length > 0) {
      toast({
        title: 'Error en la Reserva',
        description: 'Algunos o todos los horarios no pudieron ser reservados. Por favor, revisa los errores o inténtalo de nuevo.',
        variant: 'destructive',
      });
      setIsDialogOpen(false); 
      return; 
    }

    const court = allCourts?.find((c) => c.id === data.courtId);
    const courtDescription = court ? `${court.courtType} - Cancha ${court.courtNumber}` : "Cancha no especificada";
  
    const timesString = data.times.join(', ');
    const fullName = `${userProfile.firstName || ''} ${
      userProfile.lastName || ''
    }`;
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
    event.preventDefault(); // Always prevent default to control dialog manually
    const isValid = await form.trigger();
    if (isValid) {
      setIsDialogOpen(true);
    } else {
      toast({
        title: 'Formulario incompleto',
        description: 'Por favor, selecciona una cancha y al menos un horario.',
        variant: 'destructive',
      });
    }
  };

  const availableTimes: string[] = [];
    for (let i = 8; i < 24; i++) {
        availableTimes.push(`${String(i).padStart(2, '0')}:00`);
    }
    availableTimes.push("00:00", "01:00", "02:00");


  const courtsForType = useMemo(() => {
    return allCourts?.filter(c => c.courtType === selectedCourtType).sort((a,b) => a.courtNumber - b.courtNumber) || [];
  }, [allCourts, selectedCourtType]);

  const isLoadingPage = isUserLoading || !user || areCourtsLoading;

  if (isLoadingPage) {
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Reserva Tu Cancha</CardTitle>
            <CardDescription>
              ¿Listos para el partido? Asegura tu lugar en Area41. Selecciona la cancha, la fecha y la hora. ¡El fútbol te espera!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-8">
                  <FormField
                  control={form.control}
                  name="courtId"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">1. Selecciona el tipo y número de cancha</FormLabel>
                        <FormDescription>
                          Elige el tipo de cancha y luego selecciona una de las disponibles.
                        </FormDescription>
                      </div>
                       <div className="flex gap-4">
                            <Button
                                type="button"
                                variant={selectedCourtType === 'Futbol 5' ? 'default' : 'outline'}
                                onClick={() => {
                                    setSelectedCourtType('Futbol 5');
                                    form.setValue('courtId', '');
                                    form.setValue('times', []);
                                }}
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
                            >
                                Fútbol 7
                            </Button>
                        </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
                          <FormLabel className="text-base mb-4">2. Elige la Fecha</FormLabel>
                          <FormControl>
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date);
                                }
                                form.setValue("times", []);
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                              className="rounded-md border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="times"
                      render={() => (
                        <FormItem>
                           <div className="flex justify-between items-center">
                            <div>
                                <FormLabel className="text-base">3. Selecciona el Horario</FormLabel>
                                <FormDescription>
                                    Cada turno dura 60 minutos.
                                </FormDescription>
                            </div>
                            {courtPrice > 0 && (
                                <div className="text-sm font-medium text-muted-foreground">
                                    Precio por turno: ${courtPrice.toLocaleString('es-AR')}
                                </div>
                            )}
                          </div>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                                {availableTimes.map(time => (
                                    <TimeSlotButton
                                        key={time}
                                        time={time}
                                        selectedCourtId={selectedCourtId}
                                        selectedTimes={selectedTimes}
                                        areReservationsLoading={areReservationsLoading}
                                        isTimeSlotReserved={isTimeSlotReserved}
                                        onTimeClick={handleTimeClick}
                                    />
                                ))}
                            </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <div className="mt-8 pt-4 border-t">
                    <h3 className="text-lg font-bold text-center">Resumen de tu Reserva</h3>
                    {selectedTimes.length > 0 && selectedCourtId ? (
                        <div className="text-center mt-2 text-muted-foreground">
                            <p>Has seleccionado {selectedTimes.length} turno(s).</p>
                            <p className="text-2xl font-bold text-foreground">Total: ${totalCost.toLocaleString('es-AR')}</p>
                        </div>
                    ) : (
                        <p className="text-center mt-2 text-muted-foreground">
                            Selecciona una cancha y al menos un horario para ver el total.
                        </p>
                    )}
                </div>

                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button type="button" className="w-full mt-8" onClick={handleConfirmClick} disabled={!form.formState.isValid}>
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

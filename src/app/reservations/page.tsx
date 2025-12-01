
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addDays, format, set, startOfDay } from "date-fns";
import React, { useEffect, useState } from "react";
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
import { Court, Reservation } from "@/lib/types";
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

export default function ReservationPage() {
  const { toast } = useToast();
  const [courtType, setCourtType] = React.useState<'Futbol 5' | 'Futbol 7'>('Futbol 5');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc(userRef);

  const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
  const {data: allCourts, isLoading: areCourtsLoading} = useCollection<Court>(courtsRef);


  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      courtId: "",
      times: [],
      date: new Date(),
    },
  });
  
  const selectedDate = form.watch("date");
  const selectedCourtId = form.watch("courtId");
  const selectedTimes = form.watch("times");

  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedDate || isUserLoading || !user) return null;
    const start = startOfDay(selectedDate);
    const end = addDays(start, 1);
    return query(
      collection(firestore, 'reservations'),
      where('reservationDateTime', '>=', Timestamp.fromDate(start)),
      where('reservationDateTime', '<', Timestamp.fromDate(end))
    );
  }, [firestore, selectedDate, user, isUserLoading]);

  const { data: reservations, isLoading: areReservationsLoading, error } = useCollection<Reservation>(reservationsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isTimeSlotReserved = (time: string, courtId: string) => {
    if (areReservationsLoading || !reservations) return false;
    
    const [hour, minute] = time.split(':').map(Number);
    const slotDateTime = set(selectedDate, { hours: hour, minutes: minute }).getTime();

    return reservations.some(res => {
      const resDateTime = (res.reservationDateTime as any).toDate().getTime();
      // Check if the time matches and the reservation includes the selected court
      return resDateTime === slotDateTime && res.courtIds.includes(courtId);
    });
  };


  const handleCourtTypeChange = (type: 'Futbol 5' | 'Futbol 7') => {
    setCourtType(type);
    form.setValue("courtId", "", { shouldValidate: true });
    form.setValue("times", []);
  }

  const handleTimeClick = (time: string) => {
    const currentTimes = form.getValues("times");
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter((t) => t !== time)
      : [...currentTimes, time];
    form.setValue("times", newTimes.sort(), { shouldValidate: true });
  };

  async function onSubmit(data: ReservationFormValues) {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para hacer una reserva.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }
    if (
      !userProfile?.firstName ||
      !userProfile?.lastName ||
      !userProfile?.phoneNumber
    ) {
      toast({
        title: 'Perfil Incompleto',
        description:
          'Por favor completa tu nombre, apellido y teléfono en tu perfil antes de reservar.',
        variant: 'destructive',
      });
      router.push('/profile');
      return;
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
        courtIds: [data.courtId], // Now it's always a single court
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
    const courtDescription = `${court?.courtType} - Cancha ${court?.courtNumber}`;
  
    const timesString = data.times.join(', ');
    const fullName = `${userProfile.firstName || ''} ${
      userProfile.lastName || ''
    }`;
    const phone = userProfile.phoneNumber || 'No especificado';
  
    const message = encodeURIComponent(
      `¡Hola! Quiero confirmar mi reserva:\n\n` +
        `*Cancha:* ${courtDescription}\n` +
        `*Fecha:* ${format(data.date, 'dd/MM/yyyy')}\n` +
        `*Horarios:* ${timesString}\n\n` +
        `*Nombre:* ${fullName}\n` +
        `*Teléfono:* ${phone}`
    );
  
    const whatsappUrl = `https://wa.me/2324610433?text=${message}`;
    window.open(whatsappUrl, '_blank');
  
    form.reset(); 
    setIsDialogOpen(false); 
  }

  const availableTimes = ["13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "01:00", "02:00"];

  const courtsForType = allCourts?.filter(c => c.courtType === courtType).sort((a,b) => a.courtNumber - b.courtNumber) || [];

  const isLoading = isUserLoading || !user || areCourtsLoading;

  if (isLoading) {
    return (
        <div className="flex min-h-screen items-center justify-center dark bg-background">
          <p className="text-primary-foreground">Cargando...</p>
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
              ¿Listos para el partido? Asegura tu lugar en Area41. Selecciona el tipo de cancha, la fecha y la hora. ¡El fútbol te espera!
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
                        <FormLabel className="text-base">1. Tipo de Cancha</FormLabel>
                        <FormDescription>
                          Elige entre Fútbol 5 o Fútbol 7.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <Button
                            type="button"
                            variant={courtType === 'Futbol 5' ? "default" : "outline"}
                            onClick={() => handleCourtTypeChange('Futbol 5')}
                            className="text-lg py-6"
                          >
                            Fútbol 5
                          </Button>
                          <Button
                            type="button"
                            variant={courtType === 'Futbol 7' ? "default" : "outline"}
                            onClick={() => handleCourtTypeChange('Futbol 7')}
                            className="text-lg py-6"
                          >
                            Fútbol 7
                          </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                          {courtsForType.map((court) => (
                              <Button
                              key={court.id}
                              variant={selectedCourtId === court.id ? "default" : "outline"}
                              onClick={() => form.setValue("courtId", court.id, { shouldValidate: true })}
                              type="button"
                              >
                              Cancha {court.courtNumber}
                              </Button>
                          ))}
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
                                form.setValue("times", []); // Reset times when date changes
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
                          <FormLabel className="text-base">3. Selecciona el Horario</FormLabel>
                            <FormDescription>
                                Elige una o más horas para tu partido.
                            </FormDescription>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                                {availableTimes.map(time => {
                                    const isReserved = isTimeSlotReserved(time, selectedCourtId);
                                    const isDisabled = !selectedCourtId || isReserved || areReservationsLoading;
                                    
                                    return (
                                        <Button
                                            key={time}
                                            type="button"
                                            variant={selectedTimes.includes(time) ? "default" : "outline"}
                                            onClick={() => handleTimeClick(time)}
                                            disabled={isDisabled}
                                            className={cn({ "bg-destructive text-destructive-foreground hover:bg-destructive/90": isReserved })}
                                        >
                                            {areReservationsLoading && selectedCourtId ? "Cargando..." : time}
                                        </Button>
                                    )
                                })}
                            </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <Button type="button" className="w-full mt-8" disabled={form.formState.isSubmitting || selectedTimes.length === 0 || !selectedCourtId} onClick={() => setIsDialogOpen(true)}>
                      {form.formState.isSubmitting ? "Confirmando..." : "Confirmar Reserva"}
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Tu Reserva</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¡Estás a un paso de asegurar tu cancha! Te recordamos que, para cancelar sin costo, es necesario avisar con la debida antelación. En caso de no presentarse, el valor de la reserva deberá ser abonado en tu próxima visita. ¡Gracias por tu compromiso!
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
                        Aceptar y Confirmar
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

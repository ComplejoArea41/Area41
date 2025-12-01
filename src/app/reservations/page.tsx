
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addDays, format, set, startOfDay } from "date-fns";
import React, { useState } from "react";
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
import { courts as staticCourts } from "@/lib/data";
import { addDocumentNonBlocking, useCollection, useDoc, useFirestore, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Reservation } from "@/lib/types";
import { useMemoFirebase } from "@/firebase/provider";


const reservationFormSchema = z.object({
  courtIds: z.array(z.string()).refine((value) => value.length > 0, {
    message: "Debes seleccionar al menos una cancha.",
  }),
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
  const [isFutbol7, setIsFutbol7] = React.useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc(userRef);


  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      courtIds: [],
      times: [],
      date: new Date(),
    },
  });
  
  const selectedDate = form.watch("date");
  const selectedCourtIds = form.watch("courtIds");
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


  const isTimeSlotReserved = (time: string, courtId: string) => {
    if (areReservationsLoading || !reservations) return false;
    
    const [hour, minute] = time.split(':').map(Number);
    const slotDateTime = set(selectedDate, { hours: hour, minutes: minute }).getTime();

    return reservations.some(res => {
      // Check if the time matches
      const resDateTime = (res.reservationDateTime as any).toDate().getTime();
      if (resDateTime !== slotDateTime) {
        return false;
      }
      
      // Check if the court is directly included in the reservation
      if (res.courtIds.includes(courtId)) {
        return true;
      }
      
      // Handle Futbol 7 cases
      const isFutbol7Combo1 = res.courtIds.length === 2 && res.courtIds.includes('c1') && res.courtIds.includes('c2');
      const isFutbol7Combo2 = res.courtIds.length === 2 && res.courtIds.includes('c3') && res.courtIds.includes('c4');

      if ((isFutbol7Combo1 && (courtId === 'c1' || courtId === 'c2')) || (isFutbol7Combo2 && (courtId === 'c3' || courtId === 'c4'))) {
        return true;
      }

      return false;
    });
  };


  const handleCourtTypeChange = (is7: boolean) => {
    setIsFutbol7(is7);
    form.setValue("courtIds", [], { shouldValidate: true });
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
            title: "Error",
            description: "Debes iniciar sesión para hacer una reserva.",
            variant: "destructive",
        });
        router.push("/login");
        return;
    }
     if (!userProfile) {
      toast({
        title: "Perfil Incompleto",
        description: "Por favor completa tu perfil antes de reservar.",
        variant: "destructive",
      });
      router.push("/profile");
      return;
    }

    const reservationsCollection = collection(firestore, "reservations");
    const reservationPromises = [];

    for (const time of data.times) {
        const [hour, minute] = time.split(':').map(Number);
        const reservationDateTime = set(data.date, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
        
        const promise = addDocumentNonBlocking(reservationsCollection, {
            userId: user.uid,
            courtIds: data.courtIds,
            reservationDateTime: Timestamp.fromDate(reservationDateTime),
            durationMinutes: 60,
        }).catch(error => {
            // The non-blocking function will emit a global error, but we still need to
            // catch the promise rejection here to prevent an unhandled rejection error.
            // We can log it for local debugging if needed, but the user will see the
            // Next.js error overlay triggered by the FirebaseErrorListener.
            console.error(`Error al reservar el horario ${time}. El error fue manejado globalmente.`, error);
            // We re-throw the error to make sure Promise.all fails.
            throw error;
        });
        reservationPromises.push(promise);
    }

    try {
        // Promise.all will reject if any of the reservation promises reject.
        await Promise.all(reservationPromises);
        
        let courtDescription = "";
        if(isFutbol7) {
            if(data.courtIds.includes("c1")) {
                courtDescription = "Fútbol 7 (Canchas 1 y 2)";
            } else {
                courtDescription = "Fútbol 7 (Canchas 3 y 4)";
            }
        } else {
            const court = staticCourts.find(c => c.id === data.courtIds[0]);
            courtDescription = `Fútbol 5 - Cancha ${court?.courtNumber}`;
        }
    
        const timesString = data.times.join(", ");
        const fullName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`;
        const phone = userProfile.phoneNumber || 'No especificado';

        const message = encodeURIComponent(
          `¡Hola! Quiero confirmar mi reserva:\n\n` +
          `*Cancha:* ${courtDescription}\n` +
          `*Fecha:* ${format(data.date, "dd/MM/yyyy")}\n` +
          `*Horarios:* ${timesString}\n\n` +
          `*Nombre:* ${fullName}\n` +
          `*Teléfono:* ${phone}`
        );

        const whatsappUrl = `https://wa.me/2324610433?text=${message}`;
        window.open(whatsappUrl, '_blank');

        form.setValue("times", []);

    } catch (error) {
        // This catch block will now execute if any reservation fails, including due to permission errors.
        // We don't need to show a toast here because the global error handler will display the Next.js overlay.
        console.error("No se pudieron completar todas las reservas.", error);
    }
  }

  const availableTimes = ["13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "01:00", "02:00"];

  const futbol5Courts = staticCourts.filter(c => c.courtType === "Futbol 5");

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
                  name="courtIds"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">1. Tipo de Cancha</FormLabel>
                        <FormDescription>
                          Selecciona Fútbol 5 para una cancha o elige dos canchas contiguas (1-2 o 3-4) para jugar Fútbol 7.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <Button
                            type="button"
                            variant={!isFutbol7 ? "default" : "outline"}
                            onClick={() => handleCourtTypeChange(false)}
                            className="text-lg py-6"
                          >
                            Fútbol 5
                          </Button>
                          <Button
                            type="button"
                            variant={isFutbol7 ? "default" : "outline"}
                            onClick={() => handleCourtTypeChange(true)}
                            className="text-lg py-6"
                          >
                            Fútbol 7
                          </Button>
                      </div>

                      {!isFutbol7 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                          {futbol5Courts.map((court) => (
                              <Button
                              key={court.id}
                              variant={selectedCourtIds.includes(court.id) ? "default" : "outline"}
                              onClick={() => form.setValue("courtIds", [court.id], { shouldValidate: true })}
                              type="button"
                              >
                              Cancha {court.courtNumber}
                              </Button>
                          ))}
                          </div>
                      )}
                      
                      {isFutbol7 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                              <Button
                                  variant={selectedCourtIds.includes('c1') && selectedCourtIds.includes('c2') ? 'default' : 'outline'}
                                  onClick={() => form.setValue("courtIds", ['c1', 'c2'], { shouldValidate: true })}
                                  type="button"
                              >
                                  Canchas 1 y 2
                              </Button>
                              <Button
                                  variant={selectedCourtIds.includes('c3') && selectedCourtIds.includes('c4') ? 'default' : 'outline'}
                                  onClick={() => form.setValue("courtIds", ['c3', 'c4'], { shouldValidate: true })}
                                  type="button"
                              >
                                  Canchas 3 y 4
                              </Button>
                          </div>
                      )}
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
                                    const isReserved = selectedCourtIds.some(courtId => isTimeSlotReserved(time, courtId));
                                    const isDisabled = selectedCourtIds.length === 0 || isReserved || areReservationsLoading;
                                    
                                    return (
                                        <Button
                                            key={time}
                                            type="button"
                                            variant={selectedTimes.includes(time) ? "default" : "outline"}
                                            onClick={() => handleTimeClick(time)}
                                            disabled={isDisabled}
                                            className={cn({ "bg-destructive text-destructive-foreground hover:bg-destructive/90": isReserved })}
                                        >
                                            {areReservationsLoading && selectedCourtIds.length > 0 ? "Cargando..." : time}
                                        </Button>
                                    )
                                })}
                            </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" className="w-full mt-8" disabled={form.formState.isSubmitting || selectedTimes.length === 0 || selectedCourtIds.length === 0}>
                      {form.formState.isSubmitting ? "Confirmando..." : "Confirmar Reserva"}
                    </Button>
                  </AlertDialogTrigger>
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

    
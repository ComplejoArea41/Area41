"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import React from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { courts } from "@/lib/data";

const reservationFormSchema = z.object({
  courtIds: z.array(z.string()).refine((value) => value.length > 0, {
    message: "Debes seleccionar al menos una cancha.",
  }),
  date: z.date({
    required_error: "La fecha es requerida.",
  }),
  time: z.string({
    required_error: "Debes seleccionar un horario.",
  }),
});

type ReservationFormValues = z.infer<typeof reservationFormSchema>;

export default function ReservationPage() {
  const { toast } = useToast();
  const [isFutbol7, setIsFutbol7] = React.useState(false);

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      courtIds: [],
    },
  });

  const selectedCourts = form.watch("courtIds");

  const handleCourtTypeChange = (is7: boolean) => {
    setIsFutbol7(is7);
    form.setValue("courtIds", [], { shouldValidate: true });
  }

  function onSubmit(data: ReservationFormValues) {
    let courtDescription = "";
    if(isFutbol7) {
        if(data.courtIds.includes("c1")) {
            courtDescription = "Fútbol 7 (Canchas 1 y 2)";
        } else {
            courtDescription = "Fútbol 7 (Canchas 3 y 4)";
        }
    } else {
        const court = courts.find(c => c.id === data.courtIds[0]);
        courtDescription = `Fútbol 5 - Cancha ${court?.courtNumber}`;
    }

    toast({
      title: "¡Reserva Exitosa!",
      description: `Has reservado ${courtDescription} el ${format(data.date, "PPP")} a las ${data.time}.`,
    });
    form.reset();
    setIsFutbol7(false);
  }

  const availableTimes = ["18:00", "19:00", "20:00", "21:00", "22:00"];

  const futbol5Courts = courts.filter(c => c.courtType === "Futbol 5");

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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                              variant={selectedCourts.includes(court.id) ? "default" : "outline"}
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
                                  variant={selectedCourts.includes('c1') ? 'default' : 'outline'}
                                  onClick={() => form.setValue("courtIds", ['c1', 'c2'], { shouldValidate: true })}
                                  type="button"
                              >
                                  Canchas 1 y 2
                              </Button>
                              <Button
                                  variant={selectedCourts.includes('c3') ? 'default' : 'outline'}
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
                          onSelect={field.onChange}
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
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">3. Selecciona el Horario</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un horario disponible" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTimes.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full mt-8">Confirmar Reserva</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, set, isBefore, startOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Court, Reservation, FixedReservation, User } from '@/lib/types';
import {
  Cake,
  Calendar,
  Clock,
  ArrowLeft,
  Trash2,
  Plus,
  Phone,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  ExternalLink,
  Loader2,
  Sparkles
} from 'lucide-react';

const OPERATING_HOURS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  '21:00', '22:00'
];

export default function AdminBirthdaysPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

  const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
  const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsRef);

  const reservationsRef = useMemoFirebase(() => collection(firestore, 'reservations'), [firestore]);
  const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsRef);

  const fixedReservationsRef = useMemoFirebase(() => collection(firestore, 'fixedReservations'), [firestore]);
  const { data: fixedReservations } = useCollection<FixedReservation>(fixedReservationsRef);

  // Estado del formulario para nuevo cumpleaños
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [startHour, setStartHour] = useState<string>('16:00');
  const [birthdayKid, setBirthdayKid] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Estado para cancelación
  const [deleteGroup, setDeleteGroup] = useState<{ name: string; date: string; time: string; ids: string[] } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirección si no es admin
  React.useEffect(() => {
    if (isUserLoading || isProfileLoading) return;
    if (!user) {
      router.push('/login');
    } else if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  // Cálculo de los horarios del festejo (2 horas)
  const { hour1, hour2, endHourFormatted } = useMemo(() => {
    const startNum = parseInt(startHour.split(':')[0], 10);
    const h1 = `${String(startNum).padStart(2, '0')}:00`;
    const h2 = `${String(startNum + 1).padStart(2, '0')}:00`;
    const end = `${String(startNum + 2).padStart(2, '0')}:00`;
    return { hour1: h1, hour2: h2, endHourFormatted: end };
  }, [startHour]);

  // Detección de posibles conflictos en las 2 horas seleccionadas
  const conflicts = useMemo(() => {
    if (!selectedDate || !reservations || !courts) return [];
    const dateObj = parseISO(selectedDate);
    const dayOfWeek = dateObj.getDay();

    const issues: string[] = [];

    [hour1, hour2].forEach(targetHour => {
      // 1. Reservas existentes
      const matchingRes = reservations.filter(r => {
        if (!r.reservationDateTime) return false;
        const resDate = r.reservationDateTime.toDate ? r.reservationDateTime.toDate() : new Date(r.reservationDateTime);
        const rDateStr = format(resDate, 'yyyy-MM-dd');
        const rHourStr = format(resDate, 'HH:mm');
        return rDateStr === selectedDate && rHourStr === targetHour;
      });

      matchingRes.forEach(r => {
        const cName = r.customerName || 'Cliente';
        issues.push(`A las ${targetHour} hs ya hay una reserva: "${cName}"`);
      });

      // 2. Turnos fijos
      if (fixedReservations) {
        const matchingFixed = fixedReservations.filter(fr => fr.isActive && fr.dayOfWeek === dayOfWeek && fr.time === targetHour);
        matchingFixed.forEach(fr => {
          issues.push(`A las ${targetHour} hs hay un Turno Fijo: "${fr.clientName || 'Sin Nombre'}"`);
        });
      }
    });

    return issues;
  }, [selectedDate, hour1, hour2, reservations, fixedReservations, courts]);

  // Agrupación de cumpleaños existentes
  const birthdayGroups = useMemo(() => {
    if (!reservations) return [];

    const isBirthdayRes = (r: Reservation) => {
      const name = r.customerName || '';
      return (
        (r as any).reservation_type === 'cumpleanos' ||
        (r as any).reservationType === 'cumpleanos' ||
        name.includes('🎂') ||
        name.toUpperCase().includes('CUMPLE')
      );
    };

    const bReservations = reservations.filter(isBirthdayRes);

    // Agrupar por fecha y nombre
    const map = new Map<string, {
      date: string;
      dateObj: Date;
      customerName: string;
      customerPhone: string;
      times: string[];
      ids: string[];
    }>();

    bReservations.forEach(r => {
      const resDate = r.reservationDateTime?.toDate ? r.reservationDateTime.toDate() : new Date(r.reservationDateTime || r.date || '');
      if (isNaN(resDate.getTime())) return;

      const dateStr = format(resDate, 'yyyy-MM-dd');
      const timeStr = format(resDate, 'HH:mm');
      const rawName = (r.customerName || 'Cumpleaños').replace(/^🎂\s*/, '').trim();
      const phone = r.customerPhone || 'No especificado';

      const key = `${dateStr}_${rawName.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          date: dateStr,
          dateObj: resDate,
          customerName: rawName,
          customerPhone: phone,
          times: [timeStr],
          ids: [r.id],
        });
      } else {
        const existing = map.get(key)!;
        if (!existing.times.includes(timeStr)) {
          existing.times.push(timeStr);
        }
        if (!existing.ids.includes(r.id)) {
          existing.ids.push(r.id);
        }
      }
    });

    const groups = Array.from(map.values()).map(g => {
      g.times.sort();
      const startTime = g.times[0] || '00:00';
      const lastTime = g.times[g.times.length - 1] || startTime;
      const endHourNum = parseInt(lastTime.split(':')[0], 10) + 1;
      const endTimeStr = `${String(endHourNum).padStart(2, '0')}:00`;
      return {
        ...g,
        displayRange: `${startTime} a ${endTimeStr} hs (${g.times.length * 1} hs)`,
      };
    });

    // Ordenar cronológicamente
    groups.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    return groups;
  }, [reservations]);

  // Manejador para crear la reserva de 2 horas en ambas canchas
  const handleCreateBirthday = async () => {
    if (!birthdayKid.trim()) {
      toast({
        title: 'Faltan datos',
        description: 'Por favor ingresa el nombre del cumpleañero/a o festejo.',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !courts || courts.length === 0) {
      toast({
        title: 'Error',
        description: 'No se encontraron las canchas del complejo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Bloquear todas las canchas (ambas Canchas de 7 y de 5) para que nadie juegue al lado
      const allCourtIds = courts.map(c => c.id);
      const dateObj = parseISO(selectedDate);
      const startNum = parseInt(startHour.split(':')[0], 10);

      const formattedName = `🎂 ${birthdayKid.trim()}`;
      const phone = contactPhone.trim() || 'No especificado';

      // Hora 1
      const dt1 = set(dateObj, { hours: startNum, minutes: 0, seconds: 0, milliseconds: 0 });
      const record1 = {
        user_id: user.uid,
        customer_name: formattedName,
        customer_phone: phone,
        court_ids: allCourtIds,
        reservation_date_time: dt1.toISOString(),
        duration_minutes: 60,
        date: format(dt1, 'yyyy-MM-dd'),
        time: hour1,
      };

      // Hora 2
      const dt2 = set(dateObj, { hours: startNum + 1, minutes: 0, seconds: 0, milliseconds: 0 });
      const record2 = {
        user_id: user.uid,
        customer_name: formattedName,
        customer_phone: phone,
        court_ids: allCourtIds,
        reservation_date_time: dt2.toISOString(),
        duration_minutes: 60,
        date: format(dt2, 'yyyy-MM-dd'),
        time: hour2,
      };

      // Inserción directa en Supabase
      const { error: insertError } = await supabase
        .from('reservations')
        .insert([record1, record2]);

      if (insertError) throw insertError;

      toast({
        title: '🎂 ¡Cumpleaños Registrado!',
        description: `Se reservaron las 2 horas (${hour1} a ${endHourFormatted} hs) y ambas canchas para ${birthdayKid.trim()}.`,
      });

      // Limpiar formulario y cerrar modal
      setBirthdayKid('');
      setContactPhone('');
      setIsCreateOpen(false);
    } catch (err: any) {
      console.error('Error registrando cumpleaños:', err);
      toast({
        title: 'Error al reservar',
        description: err.message || 'No se pudo guardar la reserva.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejador para eliminar el cumpleaños completo (ambas horas y canchas)
  const handleConfirmDelete = async () => {
    if (!deleteGroup || deleteGroup.ids.length === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .in('id', deleteGroup.ids);

      if (error) throw error;

      toast({
        title: 'Cumpleaños Cancelado',
        description: `Se liberaron las dos horas y ambas canchas del complejo para el día ${deleteGroup.date}.`,
      });

      setDeleteGroup(null);
    } catch (err: any) {
      console.error('Error cancelando cumpleaños:', err);
      toast({
        title: 'Error al cancelar',
        description: 'No se pudo eliminar el cumpleaños.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isUserLoading || isProfileLoading || areCourtsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* Barra superior de navegación */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/admin')}
            className="h-10 w-10 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-white">
              <span className="p-1.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg text-white shadow-md">
                <Cake className="h-6 w-6" />
              </span>
              Gestión de Cumpleaños y Eventos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reserva exclusiva del complejo por 2 horas consecutivas bloqueando ambas canchas de 7.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/reservations')}
            className="text-xs"
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Ver Calendario
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white hover:brightness-110 font-bold text-xs shadow-md"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Cumpleaños
          </Button>
        </div>
      </div>

      {/* Tarjeta explicativa de la lógica del negocio */}
      <Card className="w-full border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-card/80 to-indigo-950/20 shadow-md">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-purple-600/20 text-purple-300 rounded-xl border border-purple-500/30 mt-0.5 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Reserva Exclusiva de Complejo Completo (2 Horas)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Al agendar un cumpleaños, el sistema reserva <strong>automáticamente 2 horas consecutivas</strong> y <strong>bloquea ambas Canchas de 7</strong> (Cancha 1 y Cancha 2). Nadie podrá alquilar una cancha de fútbol al lado mientras se festeja el cumpleaños.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="w-full md:w-auto shrink-0 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 h-10 shadow"
          >
            🎂 Agendar Cumpleaños
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Cumpleaños Agendados */}
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-purple-400" />
            Cumpleaños y Eventos Programados ({birthdayGroups.length})
          </h2>
          <span className="text-xs text-muted-foreground">Mostrando todos los festejos agendados</span>
        </div>

        {birthdayGroups.length === 0 ? (
          <Card className="w-full bg-card/50 border-dashed border-border/80 p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="p-4 bg-purple-600/10 text-purple-400 rounded-full">
              <Cake className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">No hay cumpleaños programados</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Aún no tienes cumpleaños registrados en el sistema. Toca el botón para agendar un nuevo evento de 2 horas.
            </p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Agendar Primer Cumpleaños
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {birthdayGroups.map((group) => {
              const isPast = isBefore(group.dateObj, startOfDay(new Date()));
              return (
                <Card
                  key={`${group.date}_${group.customerName}`}
                  className={cn(
                    "border-purple-500/40 bg-card/90 backdrop-blur-sm transition-all hover:border-purple-400 relative overflow-hidden shadow-sm",
                    isPast && "opacity-60"
                  )}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-700 via-purple-500 to-indigo-600" />
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                            🎂 Cumpleaños (2 Horas)
                          </span>
                          {isPast && (
                            <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              Finalizado
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg font-bold text-yellow-300">
                          {group.customerName}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteGroup({
                            name: group.customerName,
                            date: group.date,
                            time: group.displayRange,
                            ids: group.ids,
                          })
                        }
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Cancelar cumpleaños y liberar canchas"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <div>
                        <span className="text-[11px] text-muted-foreground block font-medium">Fecha:</span>
                        <p className="font-bold capitalize text-foreground">
                          {format(group.dateObj, "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block font-medium">Horario:</span>
                        <p className="font-bold text-purple-300 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {group.displayRange}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        🏟️ <strong>Canchas:</strong> Complejo Completo (F7 Cancha 1 y 2)
                      </span>
                    </div>

                    {group.customerPhone && group.customerPhone !== 'No especificado' && (
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {group.customerPhone}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] text-emerald-400 hover:text-emerald-300 p-0 font-bold"
                          onClick={() => {
                            const cleanPhone = group.customerPhone.replace(/\D/g, '');
                            const msg = encodeURIComponent(`¡Hola! Te contactamos de Complejo Area 41 sobre el cumpleaños de ${group.customerName}.`);
                            window.open(`https://wa.me/549${cleanPhone}?text=${msg}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* DIÁLOGO: NUEVO CUMPLEAÑOS (2 HORAS, AMBAS CANCHAS) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <span className="p-1.5 bg-gradient-to-br from-purple-700 to-indigo-600 rounded-lg text-white">
                <Cake className="h-5 w-5" />
              </span>
              Reservar Cumpleaños (2 Horas)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Elige el día y la hora de inicio. Se bloquearán automáticamente 2 horas consecutivas y ambas canchas de fútbol 7.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Selector de Día */}
            <div className="space-y-1.5">
              <Label htmlFor="date-input" className="font-bold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                1. Elige el Día del Festejo (Lunes a Domingo):
              </Label>
              <Input
                id="date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="h-10 text-sm font-semibold bg-background"
              />
            </div>

            {/* Selector de Horario de Inicio */}
            <div className="space-y-1.5">
              <Label className="font-bold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                2. Horario de Inicio del Festejo:
              </Label>
              <Select value={startHour} onValueChange={setStartHour}>
                <SelectTrigger className="h-10 text-sm font-semibold bg-background">
                  <SelectValue placeholder="Selecciona un horario" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {OPERATING_HOURS.map((h) => (
                    <SelectItem key={h} value={h} className="text-xs font-semibold">
                      {h} hs (Durará hasta las {String(parseInt(h.split(':')[0], 10) + 2).padStart(2, '0')}:00 hs)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Banner resumen de lo que se va a reservar */}
            <div className="bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 p-3 rounded-lg space-y-1 text-purple-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1">
                  🎉 Duración total: 2 Horas
                </span>
                <span className="text-[11px] font-extrabold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                  {hour1} a {endHourFormatted} hs
                </span>
              </div>
              <p className="text-[11px] text-purple-300">
                Se reservarán los turnos de las <strong>{hour1} hs</strong> y de las <strong>{hour2} hs</strong> para las <strong>dos Canchas de 7</strong> simultáneamente.
              </p>
            </div>

            {/* Alerta de posibles conflictos si ya hay turnos reservados */}
            {conflicts.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-lg text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Turnos existentes en este horario:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-300/90">
                  {conflicts.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
                <p className="text-[10.5px] text-amber-400 font-medium pt-1">
                  Nota: Al confirmar, el complejo se reservará para el cumpleaños.
                </p>
              </div>
            )}

            {/* Nombre del Cumpleañero / Festejo */}
            <div className="space-y-1.5">
              <Label htmlFor="kid-name" className="font-bold">
                3. Nombre del Cumpleañero/a o Festejo:
              </Label>
              <Input
                id="kid-name"
                placeholder="Ej: Cumple de Bautista (8 años)"
                value={birthdayKid}
                onChange={(e) => setBirthdayKid(e.target.value)}
                className="h-10 text-sm bg-background"
              />
            </div>

            {/* Teléfono de Contacto */}
            <div className="space-y-1.5">
              <Label htmlFor="phone-input" className="font-bold">
                4. Teléfono del Cliente / Contacto (opcional):
              </Label>
              <Input
                id="phone-input"
                placeholder="Ej: 2324-555555"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="h-10 text-sm bg-background"
              />
            </div>
          </div>

          <DialogFooter className="mt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateBirthday}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white font-bold hover:brightness-110 shadow-md"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar y Bloquear Complejo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTA: CONFIRMAR CANCELACIÓN DE CUMPLEAÑOS */}
      <AlertDialog open={Boolean(deleteGroup)} onOpenChange={(open) => !open && setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              ¿Cancelar este festejo de cumpleaños?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2 text-xs">
              <p>
                Estás a punto de cancelar el cumpleaños de <strong>"{deleteGroup?.name}"</strong> correspondiente al día <strong>{deleteGroup?.date}</strong> ({deleteGroup?.time}).
              </p>
              <div className="bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/30 font-medium">
                Esta acción eliminará las reservas de las <strong>2 horas</strong> y liberará <strong>ambas canchas de 7</strong> en el complejo.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, Cancelar Cumpleaños
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

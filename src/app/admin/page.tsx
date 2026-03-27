
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, where, Timestamp, onSnapshot, orderBy, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { ShieldAlert, ArrowRight, Utensils, Goal, ImageIcon, Award, Calendar, CalendarClock, AlertTriangle, Bell, BellOff, X } from "lucide-react";
import { startOfDay, addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Reservation, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [alerts, setAlerts] = useState<any[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isFirstRun = useRef(true);

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

    // Query for next Sunday's reservations to notify admin
    const nextSunday = useMemo(() => {
        let date = new Date();
        while (date.getDay() !== 0) {
            date = addDays(date, 1);
        }
        return startOfDay(date);
    }, []);

    const sundayReservationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const endOfSunday = addDays(nextSunday, 1);
        return query(
            collection(firestore, 'reservations'),
            where('reservationDateTime', '>=', Timestamp.fromDate(nextSunday)),
            where('reservationDateTime', '<', Timestamp.fromDate(endOfSunday))
        );
    }, [firestore, nextSunday]);

    const { data: sundayReservations } = useCollection<Reservation>(sundayReservationsQuery);

    const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: allUsers } = useCollection<User>(usersRef);

    const reservationsWithUsers = useMemo(() => {
        if (!sundayReservations || !allUsers) return [];
        return sundayReservations.map(res => ({
            ...res,
            user: allUsers.find(u => u.id === res.userId)
        }));
    }, [sundayReservations, allUsers]);

    useEffect(() => {
        if (isUserLoading || isProfileLoading) {
            return;
        }
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    // Real-time listener for NEW reservations to play sound
    useEffect(() => {
        if (!firestore || !notificationsEnabled || !userProfile?.isAdmin) return;

        const reservationsRef = collection(firestore, 'reservations');
        const q = query(reservationsRef, orderBy('reservationDateTime', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isFirstRun.current) {
                isFirstRun.current = false;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const newRes = change.doc.data();
                    
                    // Play sound
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.log("Audio play blocked", e));
                    }
                    
                    // Add to local alerts list
                    setAlerts(prev => [{
                        id: change.doc.id,
                        time: new Date().toLocaleTimeString(),
                        data: newRes
                    }, ...prev]);

                    // Show Browser Notification
                    if (Notification.permission === "granted") {
                        new Notification("⚽ Nueva Reserva en Area41", {
                            body: "¡Alguien acaba de reservar una cancha!",
                        });
                    }

                    toast({
                        title: "¡Nueva Reserva!",
                        description: "Se ha registrado un nuevo turno en el complejo.",
                    });
                }
            });
        });

        return () => unsubscribe();
    }, [firestore, notificationsEnabled, userProfile, toast]);

    const toggleNotifications = async () => {
        if (!notificationsEnabled) {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                setNotificationsEnabled(true);
                toast({ title: "Alertas activadas", description: "Recibirás un sonido y aviso cuando entre una reserva." });
            } else {
                toast({ variant: "destructive", title: "Permiso denegado", description: "Debes permitir las notificaciones en tu navegador." });
            }
        } else {
            setNotificationsEnabled(false);
            setAlerts([]);
            toast({ title: "Alertas desactivadas" });
        }
    };

    const removeAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const testSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(e => toast({ variant: 'destructive', title: 'Error de audio', description: 'Tu navegador bloqueó el sonido. Interactúa con la página primero.' }));
            toast({ title: "Prueba de sonido", description: "Si escuchaste el silbato, las alertas están funcionando bien." });
        }
    };

    if (isUserLoading || isProfileLoading || (user && !userProfile)) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Verificando acceso...</p>
            </div>
          );
    }
  
  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
        
        <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-4 gap-2">
                <Button variant="outline" size="sm" onClick={testSound}>
                    Probar Sonido
                </Button>
                <Button 
                    variant={notificationsEnabled ? "default" : "outline"} 
                    className={notificationsEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={toggleNotifications}
                >
                    {notificationsEnabled ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                    {notificationsEnabled ? "Alertas Activadas" : "Activar Alertas de Reservas"}
                </Button>
            </div>

            {/* Real-time Alerts List */}
            {alerts.length > 0 && (
                <div className="mb-6 space-y-2">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex items-center justify-between animate-bounce">
                            <div className="flex items-center gap-3">
                                <Goal className="h-6 w-6" />
                                <div>
                                    <p className="font-bold">¡NUEVA RESERVA RECIBIDA!</p>
                                    <p className="text-xs opacity-90">Entró a las {alert.time}. Revisa el calendario para ver detalles.</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeAlert(alert.id)} className="hover:bg-primary-foreground/20">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <Card className="bg-card/80 backdrop-blur-sm w-full mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        Panel de Administración
                    </CardTitle>
                    <CardDescription>
                        Gestiona las reservas, precios y configuraciones del complejo.
                    </CardDescription>
                </CardHeader>
            </Card>

            {reservationsWithUsers.length > 0 && (
                <Card className="bg-orange-500/10 border-orange-500 mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-500">
                            <AlertTriangle className="h-5 w-5" />
                            Atención: Reservas para el Domingo
                        </CardTitle>
                        <CardDescription className="text-orange-200">
                            Se detectaron {reservationsWithUsers.length} reserva(s) para el próximo domingo ({format(nextSunday, 'dd/MM', { locale: es })}). 
                            Debes contactar a estos clientes y cancelar sus turnos ya que el complejo cierra.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {reservationsWithUsers.map(res => (
                                <li key={res.id} className="text-sm bg-orange-500/20 p-2 rounded flex justify-between items-center">
                                    <span>
                                        <strong>{res.user?.firstName} {res.user?.lastName}</strong> - {format((res.reservationDateTime as any).toDate(), 'HH:mm')} hs
                                    </span>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push('/admin/reservations')}>
                                        Gestionar
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Goal />Gestión de Canchas</CardTitle>
                        <CardDescription>
                            Modifica los precios y la disponibilidad de las canchas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/admin/courts')}>
                            Administrar Canchas <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Utensils />Gestión de Buffet</CardTitle>
                        <CardDescription>
                           Añade o modifica los precios y artículos del menú.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/buffet')}>
                            Administrar Menú <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon />Gestión de Fondos</CardTitle>
                        <CardDescription>
                           Modifica la imagen de fondo de la aplicación.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/backgrounds')}>
                            Administrar Fondos <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                 <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Award />Gestión de Logo</CardTitle>
                        <CardDescription>
                           Cambia el logo de la aplicación.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/logo')}>
                            Administrar Logo <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
                
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar />Gestión de Reservas</CardTitle>
                        <CardDescription>
                           Visualiza y edita el historial completo de reservas.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/reservations')}>
                            Ver Reservas <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CalendarClock />Gestión de Turnos Fijos</CardTitle>
                        <CardDescription>
                           Crea y gestiona reservas recurrentes semanales.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/fixed-reservations')}>
                            Administrar Turnos Fijos <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
      </div>
  );
}

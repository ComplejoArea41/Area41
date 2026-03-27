
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
import { ShieldAlert, ArrowRight, Utensils, Goal, ImageIcon, Award, Calendar, CalendarClock, AlertTriangle, Bell, BellOff, X, Volume2 } from "lucide-react";
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
    const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

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

    // Real-time listener for NEW reservations
    useEffect(() => {
        if (!firestore || !notificationsEnabled || !userProfile?.isAdmin) return;

        const reservationsRef = collection(firestore, 'reservations');
        // Listen to the most recent reservation added
        const q = query(reservationsRef, orderBy('reservationDateTime', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isFirstRun.current) {
                isFirstRun.current = false;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const newRes = change.doc.data();
                    
                    // Trigger Alarm
                    setIsAlarmPlaying(true);
                    if (audioRef.current) {
                        audioRef.current.loop = true;
                        audioRef.current.play().catch(e => {
                            console.log("Audio play blocked by browser", e);
                            toast({
                                variant: "destructive",
                                title: "¡Nueva Reserva!",
                                description: "El navegador bloqueó el sonido. Toca la pantalla para activar el audio.",
                            });
                        });
                    }
                    
                    // Add to local alerts list
                    setAlerts(prev => [{
                        id: change.doc.id,
                        time: new Date().toLocaleTimeString(),
                        data: newRes
                    }, ...prev]);

                    // Browser System Notification
                    if (Notification.permission === "granted") {
                        new Notification("⚽ AREA41: ¡Nueva Reserva!", {
                            body: "Se ha registrado un nuevo turno. Entra para ver los detalles.",
                            icon: "/icon.png",
                            tag: "new-reservation",
                            renotify: true
                        });
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [firestore, notificationsEnabled, userProfile, toast]);

    const stopAlarm = () => {
        setIsAlarmPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const toggleNotifications = async () => {
        if (!notificationsEnabled) {
            const permission = await Notification.requestPermission();
            setNotificationsEnabled(true);
            toast({ 
                title: "Alertas activadas", 
                description: "Tu celular sonará y vibrará cuando entre una reserva. Mantén esta pestaña abierta." 
            });
        } else {
            setNotificationsEnabled(false);
            stopAlarm();
            toast({ title: "Alertas desactivadas" });
        }
    };

    const removeAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
        if (alerts.length <= 1) {
            stopAlarm();
        }
    };

    const testAlarm = () => {
        if (audioRef.current) {
            audioRef.current.loop = false;
            audioRef.current.play().catch(e => toast({ 
                variant: 'destructive', 
                title: 'Error de audio', 
                description: 'El navegador bloqueó el sonido. Toca cualquier parte de la página primero.' 
            }));
            toast({ title: "Prueba de sonido", description: "Sonando silbato de prueba..." });
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
        {/* Sound file: Whistle sound */}
        <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
        
        <div className="w-full max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full animate-pulse", notificationsEnabled ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-sm font-medium">
                        Estado del Monitor: {notificationsEnabled ? "ESCUCHANDO RESERVAS" : "APAGADO"}
                    </span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={testAlarm} className="border-primary/50">
                        <Volume2 className="mr-2 h-4 w-4" /> Probar Alarma
                    </Button>
                    <Button 
                        variant={notificationsEnabled ? "default" : "outline"} 
                        className={cn("transition-all", notificationsEnabled ? "bg-green-600 hover:bg-green-700" : "border-primary")}
                        onClick={toggleNotifications}
                    >
                        {notificationsEnabled ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                        {notificationsEnabled ? "Alertas Activadas" : "Activar Alertas"}
                    </Button>
                </div>
            </div>

            {/* Real-time Alerts List - Persistent UI */}
            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-primary text-primary-foreground p-6 rounded-xl shadow-2xl flex items-center justify-between border-4 border-white animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="bg-white p-2 rounded-full">
                                    <Goal className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black">¡NUEVA RESERVA!</p>
                                    <p className="text-sm opacity-90">Recibida a las {alert.time}. Toca para silenciar.</p>
                                </div>
                            </div>
                            <Button variant="secondary" size="lg" onClick={() => removeAlert(alert.id)} className="font-bold">
                                ENTENDIDO / SILENCIAR
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        Panel de Control Area41
                    </CardTitle>
                    <CardDescription>
                        Administra tu complejo desde este celular. Mantén esta pantalla encendida para recibir avisos al instante.
                    </CardDescription>
                </CardHeader>
            </Card>

            {reservationsWithUsers.length > 0 && (
                <Card className="bg-orange-500/10 border-orange-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-500">
                            <AlertTriangle className="h-5 w-5" />
                            Turnos el Domingo (Cerrado)
                        </CardTitle>
                        <CardDescription className="text-orange-200">
                            Hay {reservationsWithUsers.length} reserva(s) para el próximo domingo {format(nextSunday, 'dd/MM', { locale: es })}. 
                            Por favor cancelalas y avisa a los clientes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {reservationsWithUsers.map(res => (
                                <li key={res.id} className="text-sm bg-orange-500/20 p-3 rounded-lg flex justify-between items-center">
                                    <span>
                                        <strong>{res.user?.firstName} {res.user?.lastName}</strong> - {format((res.reservationDateTime as any).toDate(), 'HH:mm')} hs
                                    </span>
                                    <Button size="sm" variant="outline" className="h-8 text-xs bg-background/50" onClick={() => router.push('/admin/reservations')}>
                                        Gestionar
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <AdminNavCard 
                    title="Reservas" 
                    desc="Calendario y gestión" 
                    icon={<Calendar className="h-6 w-6" />} 
                    path="/admin/reservations" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Turnos Fijos" 
                    desc="Reservas semanales" 
                    icon={<CalendarClock className="h-6 w-6" />} 
                    path="/admin/fixed-reservations" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Canchas" 
                    desc="Precios y ajustes" 
                    icon={<Goal className="h-6 w-6" />} 
                    path="/admin/courts" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Buffet" 
                    desc="Menú y productos" 
                    icon={<Utensils className="h-6 w-6" />} 
                    path="/admin/buffet" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Fondos" 
                    desc="Imagen de la web" 
                    icon={<ImageIcon className="h-6 w-6" />} 
                    path="/admin/backgrounds" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Logo" 
                    desc="Logo de la marca" 
                    icon={<Award className="h-6 w-6" />} 
                    path="/admin/logo" 
                    router={router} 
                />
            </div>
        </div>
      </div>
  );
}

function AdminNavCard({ title, desc, icon, path, router }: { title: string, desc: string, icon: React.ReactNode, path: string, router: any }) {
    return (
        <Card className="bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push(path)}>
            <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {icon}
                    </div>
                    {title}
                </CardTitle>
                <CardDescription className="text-xs">{desc}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex justify-end">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
        </Card>
    );
}

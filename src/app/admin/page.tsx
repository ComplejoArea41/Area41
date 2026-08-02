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
import { ShieldAlert, ArrowRight, Megaphone, Goal, ImageIcon, Award, Calendar, CalendarClock, AlertTriangle, Bell, BellOff, Volume2, Smartphone } from "lucide-react";
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
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    useEffect(() => {
        if ('setAppBadge' in navigator) {
            if (alerts.length > 0) {
                (navigator as any).setAppBadge(alerts.length).catch(console.error);
            } else {
                (navigator as any).clearAppBadge().catch(console.error);
            }
        }
    }, [alerts]);

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
                    setIsAlarmPlaying(true);
                    if (audioRef.current) {
                        audioRef.current.loop = true;
                        audioRef.current.play().catch(e => console.log(e));
                    }
                    setAlerts(prev => [{ id: change.doc.id, time: new Date().toLocaleTimeString(), data: newRes }, ...prev]);
                    if (Notification.permission === "granted") {
                        new Notification("⚽ AREA41: ¡Nueva Reserva!", {
                            body: "Se ha registrado un nuevo turno.",
                            icon: "/icon.png",
                            tag: "new-reservation",
                        });
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [firestore, notificationsEnabled, userProfile]);

    const stopAlarm = () => {
        setIsAlarmPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const toggleNotifications = async () => {
        if (!notificationsEnabled) {
            await Notification.requestPermission();
            setNotificationsEnabled(true);
            toast({ title: "Alertas activadas" });
        } else {
            setNotificationsEnabled(false);
            stopAlarm();
            setAlerts([]);
            toast({ title: "Alertas desactivadas" });
        }
    };

    const removeAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
        if (alerts.length <= 1) stopAlarm();
    };

    if (isUserLoading || isProfileLoading || (user && !userProfile)) {
        return <div className="flex min-h-screen items-center justify-center dark bg-background">Cargando...</div>;
    }
  
  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
        
        <div className="w-full max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/20">
                <div className="flex items-center gap-3">
                    <div className={cn("h-4 w-4 rounded-full", notificationsEnabled ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">Monitor: {notificationsEnabled ? "CONECTADO" : "OFF"}</span>
                    </div>
                </div>
                <Button 
                    variant={notificationsEnabled ? "default" : "outline"} 
                    className="h-8"
                    onClick={toggleNotifications}
                >
                    {notificationsEnabled ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                    Alertas
                </Button>
            </div>

            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-primary text-primary-foreground p-6 rounded-xl shadow-2xl flex items-center justify-between border-4 border-white animate-bounce">
                            <div className="flex items-center gap-4">
                                <Smartphone className="h-8 w-8" />
                                <div>
                                    <p className="text-2xl font-black italic">¡NUEVA RESERVA!</p>
                                </div>
                            </div>
                            <Button variant="secondary" size="lg" onClick={() => removeAlert(alert.id)}>ENTENDIDO</Button>
                        </div>
                    ))}
                </div>
            )}

            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        Panel Area41
                    </CardTitle>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <AdminNavCard 
                    title="Reservas" 
                    desc="Calendario" 
                    icon={<Calendar className="h-6 w-6" />} 
                    path="/admin/reservations" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Turnos Fijos" 
                    desc="Semanales" 
                    icon={<CalendarClock className="h-6 w-6" />} 
                    path="/admin/fixed-reservations" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Publicidades" 
                    desc="Gestionar anuncios" 
                    icon={<Megaphone className="h-6 w-6" />} 
                    path="/admin/advertisements" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Canchas" 
                    desc="Precios" 
                    icon={<Goal className="h-6 w-6" />} 
                    path="/admin/courts" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Fondos" 
                    desc="Imágenes web" 
                    icon={<ImageIcon className="h-6 w-6" />} 
                    path="/admin/backgrounds" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Logo" 
                    desc="Marca" 
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
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
                    {title}
                </CardTitle>
                <CardDescription className="text-xs">{desc}</CardDescription>
            </CardHeader>
        </Card>
    );
}
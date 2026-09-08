'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ShieldAlert, Megaphone, Goal, ImageIcon, Award, Calendar, CalendarClock, Bell, BellOff, Smartphone, Utensils, Cake } from "lucide-react";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [alerts, setAlerts] = useState<{id: string, time: string}[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isFirstRun = useRef(true);

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    // Listener de Reservas en tiempo real
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
                    // Reproducir sonido
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.log("Error de audio:", e));
                    }

                    // Agregar a la lista de alertas visuales
                    const newAlert = { id: change.doc.id, time: new Date().toLocaleTimeString() };
                    setAlerts(prev => [newAlert, ...prev]);

                    // Notificación nativa del celular/navegador
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("⚽ AREA41: ¡Nueva Reserva!", {
                            body: "Se ha registrado un nuevo turno en el complejo.",
                            icon: "/icon.png"
                        });
                    }

                    toast({
                        title: "¡ALERTA DE RESERVA!",
                        description: "Se acaba de registrar un nuevo turno.",
                        variant: "default",
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
                toast({ title: "Monitor Conectado", description: "Recibirás avisos de nuevas reservas." });
            } else {
                toast({ title: "Permiso denegado", description: "Debes permitir notificaciones para recibir alertas.", variant: "destructive" });
            }
        } else {
            setNotificationsEnabled(false);
            setAlerts([]);
            toast({ title: "Monitor Desactivado" });
        }
    };

    const removeAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    if (isUserLoading || isProfileLoading || (user && !userProfile)) {
        return <div className="flex min-h-screen items-center justify-center dark bg-background">Cargando panel...</div>;
    }
  
  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        {/* Elemento de audio oculto para la alarma */}
        <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
        
        <div className="w-full max-w-4xl space-y-6">
            {/* Estado del Monitor */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card/50 p-4 rounded-xl border border-primary/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className={cn("h-3 w-3 rounded-full", notificationsEnabled ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                    <span className="text-sm font-bold tracking-tight">
                        MONITOR DE RESERVAS: {notificationsEnabled ? "CONECTADO" : "OFF"}
                    </span>
                </div>
                <Button 
                    variant={notificationsEnabled ? "secondary" : "default"} 
                    className="h-10 px-6 font-bold"
                    onClick={toggleNotifications}
                >
                    {notificationsEnabled ? <BellOff className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
                    {notificationsEnabled ? "Desactivar Alertas" : "Activar Alertas"}
                </Button>
            </div>

            {/* Alertas de nuevas reservas */}
            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-primary text-primary-foreground p-6 rounded-xl shadow-2xl flex items-center justify-between border-4 border-white animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-4">
                                <Smartphone className="h-10 w-10 animate-bounce" />
                                <div>
                                    <p className="text-2xl font-black italic">¡NUEVA RESERVA!</p>
                                    <p className="text-sm font-bold opacity-80">Recibida a las {alert.time}</p>
                                </div>
                            </div>
                            <Button 
                                variant="secondary" 
                                size="lg" 
                                className="font-black"
                                onClick={() => removeAlert(alert.id)}
                            >
                                ENTENDIDO
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        Panel de Administración
                    </CardTitle>
                    <CardDescription>Gestiona todos los aspectos del Complejo Area41.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <AdminNavCard 
                    title="Reservas" 
                    desc="Ver calendario semanal" 
                    icon={<Calendar className="h-6 w-6" />} 
                    path="/admin/reservations" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Cumpleaños" 
                    desc="Reserva de 2 hs (ambas canchas)" 
                    icon={<Cake className="h-6 w-6 text-purple-400" />} 
                    path="/admin/birthdays" 
                    router={router} 
                    isHighlighted={true}
                />
                <AdminNavCard 
                    title="Turnos Fijos" 
                    desc="Reservas recurrentes" 
                    icon={<CalendarClock className="h-6 w-6" />} 
                    path="/admin/fixed-reservations" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Publicidades" 
                    desc="Gestionar auspiciantes" 
                    icon={<Megaphone className="h-6 w-6" />} 
                    path="/admin/advertisements" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Buffet" 
                    desc="Precios y menú" 
                    icon={<Utensils className="h-6 w-6" />} 
                    path="/admin/buffet" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Canchas" 
                    desc="Disponibilidad y precios" 
                    icon={<Goal className="h-6 w-6" />} 
                    path="/admin/courts" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Fondos" 
                    desc="Cambiar imagen web" 
                    icon={<ImageIcon className="h-6 w-6" />} 
                    path="/admin/backgrounds" 
                    router={router} 
                />
                <AdminNavCard 
                    title="Logo" 
                    desc="Actualizar logo" 
                    icon={<Award className="h-6 w-6" />} 
                    path="/admin/logo" 
                    router={router} 
                />
            </div>
        </div>
      </div>
  );
}

function AdminNavCard({ title, desc, icon, path, router, isHighlighted }: { title: string, desc: string, icon: React.ReactNode, path: string, router: any, isHighlighted?: boolean }) {
    return (
        <Card 
            className={cn(
                "bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-all cursor-pointer group active:scale-95",
                isHighlighted && "border-purple-500/40 hover:border-purple-400 bg-purple-950/15 ring-1 ring-purple-500/20"
            )} 
            onClick={() => router.push(path)}
        >
            <CardHeader className="p-4">
                <CardTitle className={cn(
                    "flex items-center gap-3 text-lg transition-colors",
                    isHighlighted ? "group-hover:text-purple-300 text-purple-100" : "group-hover:text-primary"
                )}>
                    <div className={cn(
                        "p-2 rounded-lg transition-all",
                        isHighlighted 
                            ? "bg-purple-600/20 text-purple-300 group-hover:bg-purple-600 group-hover:text-white" 
                            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                        {icon}
                    </div>
                    {title}
                </CardTitle>
                <CardDescription className={cn("text-xs", isHighlighted && "text-purple-300/80")}>{desc}</CardDescription>
            </CardHeader>
        </Card>
    );
}

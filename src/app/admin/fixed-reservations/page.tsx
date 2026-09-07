
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FixedReservation, Court, Reservation } from "@/lib/types";
import { Trash2, Edit, PlusCircle, CalendarClock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn, safeToDate } from "@/lib/utils";

type FormData = Omit<FixedReservation, 'id'>;

const weekDays = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo (Cerrado)' },
];

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


export default function AdminFixedReservationsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
    const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsRef);

    const fixedReservationsRef = useMemoFirebase(() => collection(firestore, 'fixed_reservations'), [firestore]);
    const { data: fixedReservations, isLoading: areFixedReservationsLoading } = useCollection<FixedReservation>(fixedReservationsRef);

    const reservationsRef = useMemoFirebase(() => collection(firestore, 'reservations'), [firestore]);
    const { data: allReservations } = useCollection<Reservation>(reservationsRef);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FixedReservation | null>(null);
    const [formData, setFormData] = useState<FormData>({ clientName: '', phoneNumber: '', courtId: '', dayOfWeek: 1, time: '20:00', isActive: true });

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !(userProfile as any).isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);
    
    // RESTRICCIÓN: Solo F5 3/4 y F7 1/2
    const sortedCourts = useMemo(() => {
        if (!courts) return [];
        return [...courts].filter(c => {
            if (c.courtType === 'Futbol 5') return c.courtNumber === 3 || c.courtNumber === 4;
            if (c.courtType === 'Futbol 7') return c.courtNumber === 1 || c.courtNumber === 2;
            return false;
        }).sort((a: any, b: any) => {
            if (a.courtType < b.courtType) return -1;
            if (a.courtType > b.courtType) return 1;
            return (a.courtNumber || 0) - (b.courtNumber || 0);
        });
    }, [courts]);
    
    const reservationsByDay = useMemo(() => {
        if (!fixedReservations || !courts) return {};
        
        const grouped: Record<number, FixedReservation[]> = {};
        const courtsMap = new Map(courts.map(c => [c.id, c]));
        
        fixedReservations.forEach(res => {
            if (!res) return;
            const day = res.dayOfWeek;
            if (grouped[day]) {
                grouped[day].push(res);
            } else {
                grouped[day] = [res];
            }
        });

        for (const day in grouped) {
            grouped[Number(day)].sort((a: any, b: any) => {
                if (a.time < b.time) return -1;
                if (a.time > b.time) return 1;
                return 0;
            });
        }
        
        return grouped;
    }, [fixedReservations, courts]);

    const handleSwitchChange = (item: FixedReservation) => {
        if(!firestore) return;
        const itemRef = doc(firestore, 'fixed_reservations', item.id);
        setDocumentNonBlocking(itemRef, { isActive: !item.isActive }, { merge: true });
        toast({ title: `Turno ${item.isActive ? 'desactivado' : 'activado'}`});
    }

    const openDialogForNew = () => {
        setEditingItem(null);
        setFormData({ clientName: '', phoneNumber: '', courtId: sortedCourts[0]?.id || '', dayOfWeek: 1, time: '20:00', isActive: true });
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (item: FixedReservation) => {
        setEditingItem(item);
        setFormData({ clientName: item.clientName, phoneNumber: item.phoneNumber || '', courtId: item.courtId, dayOfWeek: item.dayOfWeek, time: item.time, isActive: item.isActive });
        setIsDialogOpen(true);
    };

    const handleDeleteItem = (itemId: string) => {
        if (!firestore) return;
        const itemRef = doc(firestore, 'fixed_reservations', itemId);
        deleteDocumentNonBlocking(itemRef);
        toast({ title: "Turno fijo eliminado" });
    };
    
    const handleSaveChanges = () => {
        if (!firestore) return;
        if (!formData.clientName || !formData.courtId || !formData.time) {
            toast({ variant: 'destructive', title: 'Campos requeridos' });
            return;
        }

        setIsSaving(true);
        if (editingItem) { 
            const itemRef = doc(firestore, 'fixed_reservations', editingItem.id);
            setDocumentNonBlocking(itemRef, formData, { merge: true });
        } else { 
            const collectionRef = collection(firestore, 'fixed_reservations');
            addDocumentNonBlocking(collectionRef, formData);
        }
        setIsDialogOpen(false);
        setIsSaving(false);
    };

    const isLoading = isUserLoading || isProfileLoading || areFixedReservationsLoading || areCourtsLoading;
    
    if (isLoading || (user && !userProfile)) {
        return <div className="flex min-h-screen items-center justify-center dark bg-background"><p>Cargando...</p></div>;
    }
    
    const getCourtName = (courtId: string) => {
        const court = courts?.find(c => c.id === courtId);
        return court ? `${(court as any).courtType} C.${(court as any).courtNumber}` : 'Cancha';
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-full">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Turnos Fijos</CardTitle>
                        <CardDescription>Canchas 1 y 2 (F5) deshabilitadas.</CardDescription>
                    </div>
                    <Button onClick={openDialogForNew}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo</Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                        {weekDays.map(day => (
                            <div key={day.value} className={cn("flex flex-col gap-4 rounded-lg p-2 bg-background/30", day.value === 0 && "opacity-50")}>
                                <h3 className="text-xl font-bold text-center p-2 rounded-md bg-card/80">
                                    {day.label.split(' ')[0]}
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {reservationsByDay[day.value]?.map(item => (
                                        <Card key={item.id} className="bg-secondary/90 p-1.5 flex flex-col gap-1">
                                            <p className="text-xs font-bold truncate">{item.clientName}</p>
                                            <p className="text-[10px] opacity-70">{getCourtName(item.courtId)} - {item.time}</p>
                                            <div className="flex justify-between items-center">
                                                 <Switch checked={item.isActive} onCheckedChange={() => handleSwitchChange(item)} className="scale-[0.6]"/>
                                                 <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openDialogForEdit(item)} className="h-5 w-5"><Edit className="h-3 w-3"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="h-5 w-5 text-destructive"><Trash2 className="h-3 w-3"/></Button>
                                                 </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Turno Fijo</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Cliente</Label><Input value={formData.clientName} onChange={(e) => setFormData({...formData, clientName: e.target.value})} className="col-span-3" /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Cancha</Label>
                            <Select onValueChange={(val) => setFormData({...formData, courtId: val})} value={formData.courtId}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>{sortedCourts.map(c => <SelectItem key={c.id} value={c.id}>{c.courtType} C.{c.courtNumber}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Día</Label>
                             <Select onValueChange={(val) => setFormData({...formData, dayOfWeek: Number(val)})} value={String(formData.dayOfWeek)}>
                                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                <SelectContent>{weekDays.map(d => <SelectItem key={d.value} value={String(d.value)} disabled={d.value === 0}>{d.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Hora</Label>
                            <Select onValueChange={(val) => setFormData({...formData, time: val})} value={formData.time}>
                                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                <SelectContent>{availableTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleSaveChanges} disabled={isSaving}>Guardar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

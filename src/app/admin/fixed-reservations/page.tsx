
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

type FormData = Omit<FixedReservation, 'id'>;

const weekDays = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
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
    
    const sortedCourts = useMemo(() => {
        if (!courts) return [];
        return [...courts].sort((a: any, b: any) => {
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
            const day = res.dayOfWeek;
            if (grouped[day]) {
                grouped[day].push(res);
            } else {
                grouped[day] = [res];
            }
        });

        for (const day in grouped) {
            grouped[Number(day)].sort((a: any, b: any) => {
                const courtA = courtsMap.get(a.courtId) as any;
                const courtB = courtsMap.get(b.courtId) as any;
        
                if (a.time < b.time) return -1;
                if (a.time > b.time) return 1;
        
                if (courtA && courtB) {
                  if (courtA.courtType < courtB.courtType) return -1;
                  if (courtA.courtType > b.courtType) return 1;
                  return (courtA.courtNumber || 0) - (courtB.courtNumber || 0);
                }
                return 0;
            });
        }
        
        return grouped;
    }, [fixedReservations, courts]);

    const conflictInfo = useMemo(() => {
        if (!formData.courtId || !formData.time || !fixedReservations || !courts) return null;

        const selectedCourt = courts.find(c => c.id === formData.courtId);
        if (!selectedCourt) return null;

        // 1. Check fixed conflicts
        const fixedConflict = fixedReservations.find(res => {
            if (res.id === editingItem?.id || !res.isActive || res.dayOfWeek !== formData.dayOfWeek || res.time !== formData.time) return false;
            const otherCourt = courts.find(c => c.id === res.courtId);
            if (!otherCourt) return false;
            if (res.courtId === formData.courtId) return true;
            if (selectedCourt.courtType === 'Futbol 5' && otherCourt.courtType === 'Futbol 7') {
                const f5Eq1 = (otherCourt.courtNumber * 2) - 1;
                const f5Eq2 = otherCourt.courtNumber * 2;
                if (selectedCourt.courtNumber === f5Eq1 || selectedCourt.courtNumber === f5Eq2) return true;
            }
            if (selectedCourt.courtType === 'Futbol 7' && otherCourt.courtType === 'Futbol 5') {
                const f5Eq1 = (selectedCourt.courtNumber * 2) - 1;
                const f5Eq2 = selectedCourt.courtNumber * 2;
                if (otherCourt.courtNumber === f5Eq1 || otherCourt.courtNumber === f5Eq2) return true;
            }
            return false;
        });

        // 2. Check standard future conflicts
        const standardConflict = allReservations?.find(res => {
            const resDate = (res.reservationDateTime as any).toDate();
            if (resDate < new Date()) return false;
            if (resDate.getDay() !== formData.dayOfWeek) return false;
            const resTime = format(resDate, 'HH:mm');
            if (resTime !== formData.time) return false;

            for (const resCourtId of res.courtIds) {
                if (resCourtId === formData.courtId) return true;
                const resCourt = courts.find(c => c.id === resCourtId);
                if (!resCourt) continue;
                if (selectedCourt.courtType === 'Futbol 5' && resCourt.courtType === 'Futbol 7') {
                    const f5Eq1 = (resCourt.courtNumber * 2) - 1;
                    const f5Eq2 = resCourt.courtNumber * 2;
                    if (selectedCourt.courtNumber === f5Eq1 || selectedCourt.courtNumber === f5Eq2) return true;
                }
                if (selectedCourt.courtType === 'Futbol 7' && resCourt.courtType === 'Futbol 5') {
                    const f5Eq1 = (selectedCourt.courtNumber * 2) - 1;
                    const f5Eq2 = selectedCourt.courtNumber * 2;
                    if (resCourt.courtNumber === f5Eq1 || resCourt.courtNumber === f5Eq2) return true;
                }
            }
            return false;
        });

        if (fixedConflict || standardConflict) {
            return {
                type: fixedConflict ? 'Fijo' : 'Puntual',
                name: fixedConflict ? fixedConflict.clientName : 'Reserva de cliente'
            };
        }
        return null;
    }, [formData, fixedReservations, allReservations, courts, editingItem]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSelectChange = (name: keyof FormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

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
        toast({ title: "¡Turno fijo eliminado!", description: "El turno ha sido eliminado correctamente." });
    };
    
    const handleSaveChanges = () => {
        if (!firestore) return;
        if (!formData.clientName || !formData.courtId || !formData.time) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, completa el nombre, la cancha y la hora.' });
            return;
        }

        setIsSaving(true);
        
        if (editingItem) { 
            const itemRef = doc(firestore, 'fixed_reservations', editingItem.id);
            setDocumentNonBlocking(itemRef, formData, { merge: true });
            toast({ title: "¡Turno actualizado!", description: "Los cambios se han guardado." });
        } else { 
            const collectionRef = collection(firestore, 'fixed_reservations');
            addDocumentNonBlocking(collectionRef, formData);
            toast({ title: "¡Turno fijo agregado!", description: "El nuevo turno ya está disponible." });
        }
        
        setIsDialogOpen(false);
        setIsSaving(false);
    };

    const isLoading = isUserLoading || isProfileLoading || areFixedReservationsLoading || areCourtsLoading;
    
    if (isLoading || (user && !userProfile)) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
                <p className="text-primary-foreground">Cargando gestión de turnos fijos...</p>
            </div>
        );
    }
    
    const getCourtName = (courtId: string) => {
        const court = courts?.find(c => c.id === courtId);
        return court ? `${(court as any).courtType} - Cancha ${(court as any).courtNumber}` : 'Cancha no encontrada';
    }

    const renderReservationCard = (item: FixedReservation) => (
        <Card key={item.id} className="bg-secondary/90 text-secondary-foreground flex items-center p-1.5 justify-between gap-1">
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{item.clientName}</p>
                <p className="text-xs opacity-80 truncate">{getCourtName(item.courtId).replace('Cancha ','C.')} - {item.time}</p>
            </div>
            <div className="flex items-center gap-1">
                 <Switch
                    id={`active-switch-${item.id}`}
                    checked={item.isActive}
                    onCheckedChange={() => handleSwitchChange(item)}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-background/20 transform scale-[0.6]"
                />
                <Button variant="outline" size="icon" onClick={() => openDialogForEdit(item)} className="bg-background/20 hover:bg-background/40 border-0 h-5 w-5">
                    <Edit className="h-2.5 w-2.5" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-5 w-5">
                            <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro de cancelar el turno fijo?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará la reserva recurrente de forma permanente. No se podrá deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Volver</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>
                                Confirmar Cancelación
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Card>
    );

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-full">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestionar Turnos Fijos</CardTitle>
                        <CardDescription>
                            Crea y administra las reservas recurrentes en una vista de calendario semanal.
                        </CardDescription>
                    </div>
                    <Button onClick={openDialogForNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Turno Fijo
                    </Button>
                </CardHeader>
                <CardContent>
                    {(!fixedReservations || fixedReservations.length === 0) && !areFixedReservationsLoading ? (
                        <div className="text-center py-16 text-muted-foreground col-span-full">
                            <CalendarClock className="mx-auto h-12 w-12" />
                            <p className="mt-4">No hay turnos fijos todavía. ¡Crea el primero!</p>
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                            {weekDays.map(day => (
                                <div key={day.value} className="flex flex-col gap-4 rounded-lg bg-background/30 p-2">
                                    <h3 className="text-xl font-bold text-center sticky top-16 bg-card/80 p-2 rounded-md z-10 backdrop-blur-sm">{day.label}</h3>
                                    <div className="flex flex-col gap-2">
                                        {reservationsByDay[day.value] && reservationsByDay[day.value].length > 0 ? (
                                            reservationsByDay[day.value].map(renderReservationCard)
                                        ) : (
                                            <div className="flex items-center justify-center h-24">
                                                 <p className="text-xs text-muted-foreground text-center">Sin turnos.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Editar Turno Fijo' : 'Nuevo Turno Fijo'}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Modifica los detalles del turno.' : 'Añade una nueva reserva recurrente.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {conflictInfo && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 text-yellow-700 text-xs flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <div>
                                    <p className="font-bold">Aviso de superposición</p>
                                    <p>Este horario ya está ocupado por un turno {conflictInfo.type} ({conflictInfo.name}).</p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="clientName" className="text-right">Cliente</Label>
                            <Input id="clientName" name="clientName" value={formData.clientName} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phoneNumber" className="text-right">Teléfono</Label>
                            <Input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="courtId" className="text-right">Cancha</Label>
                            <Select onValueChange={(val) => handleSelectChange('courtId', val)} value={formData.courtId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona una cancha" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedCourts.map((court: any) => (
                                        <SelectItem key={court.id} value={court.id}>{`${court.courtType} - Cancha ${court.courtNumber}`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dayOfWeek" className="text-right">Día</Label>
                             <Select onValueChange={(val) => handleSelectChange('dayOfWeek', Number(val))} value={String(formData.dayOfWeek)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona un día" />
                                </SelectTrigger>
                                <SelectContent>
                                    {weekDays.map(day => (
                                        <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">Hora</Label>
                            <Select onValueChange={(val) => handleSelectChange('time', val)} value={formData.time}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona una hora" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTimes.map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

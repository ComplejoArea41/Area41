'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { FixedReservation, Court } from "@/lib/types";
import { Trash2, Edit, PlusCircle, CalendarClock, GripVertical } from "lucide-react";

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

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FixedReservation | null>(null);
    const [formData, setFormData] = useState<FormData>({ clientName: '', phoneNumber: '', courtId: '', dayOfWeek: 1, time: '20:00', isActive: true });

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);
    
    const sortedCourts = useMemo(() => courts?.sort((a, b) => {
        if (a.courtType < b.courtType) return -1;
        if (a.courtType > b.courtType) return 1;
        return a.courtNumber - b.courtNumber;
    }) || [], [courts]);
    
    const reservationsByDay = useMemo(() => {
        if (!fixedReservations || !courts) return {};
        
        const grouped: Record<number, FixedReservation[]> = {};

        const courtsMap = new Map(courts.map(c => [c.id, c]));
        
        fixedReservations.forEach(res => {
            if (grouped[res.dayOfWeek]) {
                grouped[res.dayOfWeek].push(res);
            } else {
                grouped[res.dayOfWeek] = [res];
            }
        });

        // Sort reservations within each day by time
        for (const day in grouped) {
            grouped[day].sort((a, b) => {
                const courtA = courtsMap.get(a.courtId);
                const courtB = courtsMap.get(b.courtId);

                // Sort by time first
                if(a.time < b.time) return -1;
                if(a.time > b.time) return 1;
                
                // Then by court type
                if(courtA && courtB) {
                    if (courtA.courtType < courtB.courtType) return -1;
                    if (courtA.courtType > b.courtType) return 1;
                    return courtA.courtNumber - courtB.courtNumber;
                }
                return 0;
            });
        }
        
        return grouped;
    }, [fixedReservations, courts]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSelectChange = (name: keyof FormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = async (item: FixedReservation) => {
        if(!firestore) return;
        const itemRef = doc(firestore, 'fixed_reservations', item.id);
        try {
            await setDocumentNonBlocking(itemRef, { isActive: !item.isActive }, { merge: true });
            toast({ title: `Turno ${item.isActive ? 'desactivado' : 'activado'}`});
        } catch(error) {
            console.error("Error toggling active state:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cambiar el estado del turno.' });
        }
    }

    const openDialogForNew = () => {
        setEditingItem(null);
        setFormData({ clientName: '', phoneNumber: '', courtId: sortedCourts[0]?.id || '', dayOfWeek: 1, time: '20:00', isActive: true });
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (item: FixedReservation) => {
        setEditingItem(item);
        setFormData({ clientName: item.clientName, phoneNumber: item.phoneNumber, courtId: item.courtId, dayOfWeek: item.dayOfWeek, time: item.time, isActive: item.isActive });
        setIsDialogOpen(true);
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) return;
        const itemRef = doc(firestore, 'fixed_reservations', itemId);
        try {
            await deleteDocumentNonBlocking(itemRef);
            toast({ title: "¡Turno fijo eliminado!", description: "El turno ha sido eliminado correctamente." });
        } catch (error) {
            console.error("Error deleting item: ", error);
            toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar el turno fijo." });
        }
    };
    
    const handleSaveChanges = async () => {
        if (!firestore) return;
        if (!formData.clientName || !formData.courtId || !formData.time) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, completa el nombre, la cancha y la hora.' });
            return;
        }

        setIsSaving(true);
        try {
            if (editingItem) { 
                const itemRef = doc(firestore, 'fixed_reservations', editingItem.id);
                setDocumentNonBlocking(itemRef, formData, { merge: true });
                toast({ title: "¡Turno actualizado!", description: "Los cambios se han guardado." });
            } else { 
                const collectionRef = collection(firestore, 'fixed_reservations');
                await addDocumentNonBlocking(collectionRef, formData);
                toast({ title: "¡Turno fijo agregado!", description: "El nuevo turno ya está disponible." });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving item: ", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar el turno." });
        } finally {
            setIsSaving(false);
        }
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
        return court ? `${court.courtType} - Cancha ${court.courtNumber}` : 'Cancha no encontrada';
    }

    const renderReservationCard = (item: FixedReservation) => (
        <Card key={item.id} className="bg-secondary/90 text-secondary-foreground flex flex-col p-3 gap-2">
            <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{item.clientName}</CardTitle>
                <div className="flex items-center space-x-2">
                    <Switch
                        id={`active-switch-${item.id}`}
                        checked={item.isActive}
                        onCheckedChange={() => handleSwitchChange(item)}
                        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-background/20"
                    />
                    <Label htmlFor={`active-switch-${item.id}`} className="text-xs">Activo</Label>
                </div>
            </div>
            <div className="flex-grow">
                <p className="text-sm opacity-80">{getCourtName(item.courtId)}</p>
                <p className="text-base font-bold">{item.time} hs</p>
                {item.phoneNumber && <p className="text-xs opacity-80">Tel: {item.phoneNumber}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="icon" onClick={() => openDialogForEdit(item)} className="bg-background/20 hover:bg-background/40 border-0 h-8 w-8">
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteItem(item.id)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                </Button>
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
                                    <div className="flex flex-col gap-4">
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
                                    {sortedCourts.map(court => (
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

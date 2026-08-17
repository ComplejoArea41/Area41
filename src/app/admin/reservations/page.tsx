'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, Timestamp, increment, addDoc } from 'firebase/firestore';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, deleteDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, ArrowLeft, Goal, AlertTriangle, History, Edit, Plus } from 'lucide-react';
import type { Reservation, User, Court, FixedReservation } from "@/lib/types";
import { format, startOfWeek, addDays, subDays, set } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FullReservation = Reservation & {
    user: User | null;
    court: Court | null; 
    isFixed?: boolean;
    hasConflict?: boolean;
};

const hours = Array.from({ length: 18 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

export default function AdminReservationsCalendarPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState<FullReservation | null>(null);
    const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
    
    // New Reservation State
    const [isNewResDialogOpen, setIsNewResDialogOpen] = useState(false);
    const [newResData, setNewResData] = useState({
        day: new Date(),
        hour: '',
        clientName: '',
        userId: '',
    });

    // Edit states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        courtId: '',
        time: '',
    });

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

    const reservationsRef = useMemoFirebase(() => collection(firestore, 'reservations'), [firestore]);
    const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsRef);

    const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersRef);

    const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
    const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsRef);

    const fixedReservationsRef = useMemoFirebase(() => collection(firestore, 'fixed_reservations'), [firestore]);
    const { data: fixedReservations, isLoading: areFixedReservationsLoading } = useCollection<FixedReservation>(fixedReservationsRef);

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    }, [weekStart]);

    const handleCancelReservation = async () => {
        if (!selectedReservation || !firestore) return;

        const isFixed = selectedReservation.isFixed;
        const collectionName = isFixed ? 'fixed_reservations' : 'reservations';
        const docRef = doc(firestore, collectionName, selectedReservation.id);

        try {
            if (!isFixed && selectedReservation.userId && selectedReservation.userId !== 'fixed-user') {
                const customerProfileRef = doc(firestore, 'users', selectedReservation.userId);
                updateDocumentNonBlocking(customerProfileRef, {
                    cancellationCount: increment(1)
                });
            }

            deleteDocumentNonBlocking(docRef);
            toast({
                title: "Reserva cancelada",
                description: `El turno ha sido eliminado correctamente.`,
            });
        } catch (error) {
            console.error("Error cancelling reservation:", error);
            toast({
                variant: "destructive",
                title: "Error al cancelar",
                description: "No se pudo eliminar la reserva.",
            });
        }
        
        setIsCancelAlertOpen(false);
        setSelectedReservation(null);
    };

    const handleOpenEdit = () => {
        if (!selectedReservation) return;
        setEditFormData({
            courtId: selectedReservation.court?.id || '',
            time: format((selectedReservation.reservationDateTime as any).toDate(), 'HH:mm'),
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdateReservation = async () => {
        if (!selectedReservation || !firestore || !courts) return;

        const isFixed = selectedReservation.isFixed;
        
        if (isFixed) {
            toast({ title: "Edición de turno fijo", description: "Para editar un turno fijo, por favor dirígete a la sección de 'Turnos Fijos'." });
            router.push('/admin/fixed-reservations');
            return;
        }

        const resRef = doc(firestore, 'reservations', selectedReservation.id);
        const newCourt = courts.find(c => c.id === editFormData.courtId);
        if (!newCourt) return;

        let newCourtIds = [newCourt.id];
        if (newCourt.courtType === 'Futbol 7') {
            const f7Num = newCourt.courtNumber;
            const f5_1 = courts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === (f7Num * 2) - 1);
            const f5_2 = courts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === f7Num * 2);
            if (f5_1) newCourtIds.push(f5_1.id);
            if (f5_2) newCourtIds.push(f5_2.id);
        }

        const currentResDate = (selectedReservation.reservationDateTime as any).toDate();
        const [hour, min] = editFormData.time.split(':').map(Number);
        const newDate = set(currentResDate, { hours: hour, minutes: min, seconds: 0, milliseconds: 0 });

        try {
            updateDocumentNonBlocking(resRef, {
                courtIds: newCourtIds,
                reservationDateTime: Timestamp.fromDate(newDate)
            });
            toast({ title: "Turno actualizado", description: "La reserva ha sido modificada correctamente." });
            setIsEditDialogOpen(false);
            setSelectedReservation(null);
        } catch (error) {
            console.error("Error updating reservation:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la reserva." });
        }
    };

    const handleOpenCreate = (day: Date, hour: string) => {
        setNewResData({
            day,
            hour,
            clientName: '',
            userId: '',
        });
        setIsNewResDialogOpen(true);
    };

    const handleCreateReservation = async () => {
        if (!firestore || !selectedCourt || !courts) return;

        if (!newResData.clientName && !newResData.userId) {
            toast({ variant: 'destructive', title: 'Faltan datos', description: 'Por favor selecciona un cliente o ingresa su nombre.' });
            return;
        }

        const [hour, min] = newResData.hour.split(':').map(Number);
        const resDateTime = set(newResData.day, { hours: hour, minutes: min, seconds: 0, milliseconds: 0 });

        let courtIds = [selectedCourt.id];
        if (selectedCourt.courtType === 'Futbol 7') {
            const f7Num = selectedCourt.courtNumber;
            const f5_1 = courts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === (f7Num * 2) - 1);
            const f5_2 = courts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === f7Num * 2);
            if (f5_1) courtIds.push(f5_1.id);
            if (f5_2) courtIds.push(f5_2.id);
        }

        // Si el admin ingresó un nombre a mano, usamos el ID del admin pero guardamos el nombre en el perfil del usuario si es necesario.
        // Por simplicidad, usaremos el userId seleccionado o el del propio admin.
        const targetUserId = newResData.userId || user!.uid;

        const resData = {
            userId: targetUserId,
            courtIds,
            reservationDateTime: Timestamp.fromDate(resDateTime),
            durationMinutes: 60,
        };

        try {
            await addDocumentNonBlocking(collection(firestore, 'reservations'), resData);
            toast({ title: 'Reserva creada', description: 'El turno ha sido registrado exitosamente.' });
            setIsNewResDialogOpen(false);
        } catch (error) {
            console.error("Error creating reservation:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la reserva.' });
        }
    };
    
    const getReservationForSlot = (day: Date, hour: string, courtId: string): FullReservation | undefined => {
        if (!courts) return undefined;
        
        const [hourNum] = hour.split(':').map(Number);
        const slotDateTime = new Date(day);
        slotDateTime.setHours(hourNum, 0, 0, 0);

        const courtToDisplay = courts.find(c => c.id === courtId);
        if (!courtToDisplay) return undefined;
    
        let regularMatch: FullReservation | undefined;
        let fixedMatch: FullReservation | undefined;

        if (reservations && allUsers) {
            const usersMap = new Map(allUsers.map(u => [u.id, u]));
            const reservationsInSlot = reservations.filter(res => {
                const resDateTime = (res.reservationDateTime as any).toDate();
                return resDateTime.getTime() === slotDateTime.getTime();
            });
    
            for (const reservation of reservationsInSlot) {
                let blockingCourt: Court | null = null;
                for (const reservedCourtId of reservation.courtIds) {
                     const reservedCourt = courts.find(c => c.id === reservedCourtId);
                     if (!reservedCourt) continue;

                     if (reservedCourtId === courtId) {
                        blockingCourt = reservedCourt;
                        break;
                     }
        
                    if (courtToDisplay.courtType === 'Futbol 5' && reservedCourt.courtType === 'Futbol 7') {
                        const f7Number = reservedCourt.courtNumber;
                        const f5Equivalent1 = (f7Number * 2) - 1;
                        const f5Equivalent2 = f7Number * 2;
                        if (courtToDisplay.courtNumber === f5Equivalent1 || courtToDisplay.courtNumber === f5Equivalent2) {
                            blockingCourt = reservedCourt;
                            break;
                        }
                    }
                    
                    if (courtToDisplay.courtType === 'Futbol 7' && reservedCourt.courtType === 'Futbol 5') {
                         const f7TargetNumber = courtToDisplay.courtNumber;
                         const f5Equivalent1 = (f7TargetNumber * 2) - 1;
                         const f5Equivalent2 = f7TargetNumber * 2;
                         if (reservedCourt.courtNumber === f5Equivalent1 || reservedCourt.courtNumber === f5Equivalent2) {
                            blockingCourt = reservedCourt;
                            break;
                         }
                    }
                }
        
                if (blockingCourt) {
                    regularMatch = {
                        ...reservation,
                        user: usersMap.get(reservation.userId) || null,
                        court: blockingCourt,
                        isFixed: false,
                    };
                    break;
                }
            }
        }

        if (fixedReservations) {
            const dayOfWeek = day.getDay();
            const matchingFixedReservations = fixedReservations.filter(fr => fr.isActive && fr.dayOfWeek === dayOfWeek && fr.time === hour);
            
            for (const fixedRes of matchingFixedReservations) {
                let blockingCourt: Court | null = null;
                const fixedCourt = courts.find(c => c.id === fixedRes.courtId);
                if (!fixedCourt) continue;

                if (fixedCourt.id === courtId) {
                    blockingCourt = fixedCourt;
                } else if (courtToDisplay.courtType === 'Futbol 5' && fixedCourt.courtType === 'Futbol 7') {
                    const f7Number = fixedCourt.courtNumber;
                    const f5Equivalent1 = (f7Number * 2) - 1;
                    const f5Equivalent2 = f7Number * 2;
                    if (courtToDisplay.courtNumber === f5Equivalent1 || courtToDisplay.courtNumber === f5Equivalent2) blockingCourt = fixedCourt;
                } else if (courtToDisplay.courtType === 'Futbol 7' && fixedCourt.courtType === 'Futbol 5') {
                    const f7TargetNumber = courtToDisplay.courtNumber;
                    const f5Equivalent1 = (f7TargetNumber * 2) - 1;
                    const f5Equivalent2 = f7TargetNumber * 2;
                    if (fixedCourt.courtNumber === f5Equivalent1 || fixedCourt.courtNumber === f5Equivalent2) blockingCourt = fixedCourt;
                }

                if (blockingCourt) {
                    fixedMatch = {
                        id: fixedRes.id,
                        userId: 'fixed-user',
                        courtIds: [fixedRes.courtId],
                        reservationDateTime: Timestamp.fromDate(slotDateTime) as any,
                        durationMinutes: 60,
                        user: {
                            id: 'fixed-user',
                            firstName: fixedRes.clientName,
                            lastName: '(Turno Fijo)',
                            email: 'N/A',
                            phoneNumber: fixedRes.phoneNumber || 'N/A',
                            cancellationCount: 0
                        },
                        court: blockingCourt,
                        isFixed: true
                    }
                    break;
                }
            }
        }
    
        if (regularMatch && fixedMatch) {
            return { ...regularMatch, hasConflict: true };
        }

        return regularMatch || fixedMatch;
    };
    
    const sortedCourts = useMemo(() => courts?.filter(c => {
        // En el admin también filtramos para no mostrar por error F5 canchas 1 y 2
        if (c.courtType === 'Futbol 5') {
            return c.courtNumber === 3 || c.courtNumber === 4;
        }
        return c.courtType === 'Futbol 7';
    }).sort((a, b) => {
        if (a.courtType < b.courtType) return -1;
        if (a.courtType > b.courtType) return 1;
        return a.courtNumber - b.courtNumber;
    }) || [], [courts]);

    const isLoading = isUserLoading || isProfileLoading || areReservationsLoading || areUsersLoading || areCourtsLoading || areFixedReservationsLoading;

    if (isLoading || (user && !userProfile)) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
                <p className="text-primary-foreground">Cargando gestión de reservas...</p>
            </div>
        );
    }
    
    if (!selectedCourt) {
        const futbol5Courts = sortedCourts.filter(c => c.courtType === 'Futbol 5');
        const futbol7Courts = sortedCourts.filter(c => c.courtType === 'Futbol 7');

        return (
            <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
                <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
                    <CardHeader>
                        <CardTitle>Seleccionar Cancha</CardTitle>
                        <CardDescription>
                            Elige una cancha para ver su calendario de reservas. (Canchas 1 y 2 de Fútbol 5 están deshabilitadas).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                         <div>
                            <h3 className="text-2xl font-bold mb-4">Canchas de Fútbol 5</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {futbol5Courts.map(court => (
                                    <Button key={court.id} variant="outline" className="h-20 text-lg" onClick={() => setSelectedCourt(court)}>
                                        <Goal className="mr-2" /> Cancha {court.courtNumber}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-4">Canchas de Fútbol 7</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {futbol7Courts.map(court => (
                                    <Button key={court.id} variant="outline" className="h-20 text-lg" onClick={() => setSelectedCourt(court)}>
                                       <Goal className="mr-2" /> Cancha {court.courtNumber}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full">
                <CardHeader>
                    <div className="flex items-center gap-4">
                         <Button variant="outline" size="icon" onClick={() => setSelectedCourt(null)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <CardTitle>Calendario de Reservas</CardTitle>
                            <CardDescription>
                                {`Mostrando reservas para ${selectedCourt.courtType} - Cancha ${selectedCourt.courtNumber}`}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-4">
                        <Button variant="outline" onClick={() => setCurrentDate(subDays(currentDate, 7))}>
                            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                        </Button>
                        <h3 className="text-xl font-semibold text-center">
                            Semana del {format(weekStart, 'd \'de\' LLLL', { locale: es })}
                        </h3>
                        <Button variant="outline" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                            Siguiente <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                        <div className="grid grid-cols-[auto_repeat(7,minmax(140px,1fr))]">
                            <div className="sticky left-0 bg-card z-10 p-2 border-r border-b font-semibold text-center">Hora</div>
                            {weekDays.map(day => (
                                <div key={day.toString()} className={cn("p-2 border-b font-semibold text-center", day.getDay() === 0 && "text-muted-foreground bg-muted/10")}>
                                    {format(day, 'EEE d', { locale: es })}
                                    {day.getDay() === 0 && <span className="block text-[10px] uppercase text-primary">Cerrado</span>}
                                </div>
                            ))}
                            {hours.map((hour) => (
                                <React.Fragment key={hour}>
                                    <div className="sticky left-0 bg-card z-10 p-2 border-r flex items-center justify-center text-center font-medium">
                                        {hour}
                                    </div>
                                    {weekDays.map((day) => {
                                        const isSunday = day.getDay() === 0;
                                        const reservation = getReservationForSlot(day, hour, selectedCourt.id);
                                        
                                        const typeSuffix = reservation?.court?.courtType === 'Futbol 7' ? '7' : '5';
                                        const labelPrefix = reservation?.isFixed ? 'Fijo' : 'Reservado';

                                        return (
                                            <div key={`${day.toString()}-${hour}`} className={cn("border-b p-1 h-16 flex items-center justify-center", isSunday && "bg-muted/5")}>
                                                {isSunday ? (
                                                    <div className="text-[10px] opacity-20 rotate-[30deg] font-bold select-none">CERRADO</div>
                                                ) : reservation ? (
                                                    <button
                                                        onClick={() => setSelectedReservation(reservation)}
                                                        className={cn(
                                                            "w-full h-full text-left p-2 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex flex-col justify-center relative",
                                                            reservation.hasConflict 
                                                                ? "bg-yellow-500 text-black hover:bg-yellow-600 border-2 border-dashed border-red-600" 
                                                                : (reservation.isFixed 
                                                                    ? "bg-[#800000] text-white hover:bg-[#800000]/90" 
                                                                    : (reservation.court?.courtType === 'Futbol 5' 
                                                                        ? "bg-red-600 text-white hover:bg-red-700" 
                                                                        : "bg-orange-500 text-white hover:bg-orange-600"))
                                                        )}
                                                    >
                                                        <div className="font-semibold truncate text-[10px] leading-tight">{reservation.user?.firstName}</div>
                                                        <div className="text-[9px] font-bold opacity-90">
                                                            {reservation.hasConflict ? (
                                                                <span className="flex items-center gap-0.5"><AlertTriangle className="h-2 w-2"/> CONFLICTO</span>
                                                            ) : (
                                                                `${labelPrefix} ${typeSuffix}`
                                                            )}
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleOpenCreate(day, hour)}
                                                        className="w-full h-full flex items-center justify-center group"
                                                    >
                                                        <div className="text-[10px] text-muted-foreground/30 group-hover:text-primary transition-colors flex items-center gap-1">
                                                            <Plus className="h-3 w-3" /> Libre
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Nueva Reserva Dialog */}
            <Dialog open={isNewResDialogOpen} onOpenChange={setIsNewResDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Reserva Manual</DialogTitle>
                        <DialogDescription>
                            Asienta un turno recibido por WhatsApp u otro medio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Horario</Label>
                            <div className="col-span-3 font-semibold text-primary">
                                {format(newResData.day, "EEEE d 'de' MMM", { locale: es })} - {newResData.hour} hs
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="clientName" className="text-right">Nombre Cliente</Label>
                            <Input 
                                id="clientName" 
                                value={newResData.clientName} 
                                onChange={(e) => setNewResData(prev => ({...prev, clientName: e.target.value}))}
                                className="col-span-3"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">O elegir usuario</Label>
                            <Select onValueChange={(val) => setNewResData(prev => ({...prev, userId: val}))} value={newResData.userId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar usuario registrado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allUsers?.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewResDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateReservation}>Confirmar Turno</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedReservation} onOpenChange={(isOpen) => { if (!isOpen) setSelectedReservation(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Reserva</DialogTitle>
                        <DialogDescription>
                            Información completa de la reserva y el cliente.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReservation && (
                        <div className="space-y-3 text-sm">
                             {selectedReservation.hasConflict && (
                                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 text-yellow-700 mb-4">
                                    <p className="font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> ATENCIÓN: Superposición detectada</p>
                                    <p>Existe un turno fijo y una reserva puntual ocupando este mismo horario. Por favor, verifica con los clientes.</p>
                                </div>
                             )}
                             
                             {(selectedReservation.user?.cancellationCount || 0) > 0 && (
                                <div className="bg-red-100 border-l-4 border-red-500 p-4 text-red-700 mb-4 flex items-start gap-3">
                                    <History className="h-5 w-5 shrink-0" />
                                    <div>
                                        <p className="font-bold">Observación del Cliente</p>
                                        <p>Este cliente ha cancelado turnos <strong>{selectedReservation.user?.cancellationCount}</strong> veces anteriormente.</p>
                                    </div>
                                </div>
                             )}

                             <div>
                                <h4 className="font-semibold text-muted-foreground">Cliente</h4>
                                <p className="text-base">{selectedReservation.user?.firstName} {selectedReservation.user?.lastName}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Email</h4>
                                <p>{selectedReservation.user?.email}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Teléfono</h4>
                                <p>{selectedReservation.user?.phoneNumber}</p>
                            </div>
                            <Separator className="my-4" />
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Cancha Reservada</h4>
                                <p>{selectedReservation.court?.courtType} {selectedReservation.court?.courtNumber}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Fecha y Hora</h4>
                                <p>{format((selectedReservation.reservationDateTime as any).toDate(), "EEEE d 'de' LLLL 'a las' HH:mm 'hs'", { locale: es })}</p>
                            </div>
                             {selectedReservation.isFixed && <p className="text-center font-bold text-secondary-foreground bg-[#800000] p-2 rounded-md text-white">Este es un turno fijo semanal.</p>}
                        </div>
                    )}
                    <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row gap-2">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                variant="destructive"
                                onClick={() => setIsCancelAlertOpen(true)}
                                disabled={!selectedReservation}
                                className="flex-1 sm:flex-none"
                            >
                                Cancelar Turno
                            </Button>
                            {!selectedReservation?.isFixed && (
                                <Button
                                    variant="outline"
                                    onClick={handleOpenEdit}
                                    className="flex-1 sm:flex-none"
                                >
                                    <Edit className="mr-2 h-4 w-4" /> Modificar Turno
                                </Button>
                            )}
                        </div>
                        <Button variant="ghost" onClick={() => setSelectedReservation(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Modificar Reserva</DialogTitle>
                        <DialogDescription>
                            Cambia la cancha o el horario de esta reserva puntual.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Cancha</label>
                            <Select 
                                value={editFormData.courtId} 
                                onValueChange={(val) => setEditFormData(prev => ({...prev, courtId: val}))}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona cancha" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedCourts.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.courtType} - Cancha {c.courtNumber}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Hora</label>
                            <Select 
                                value={editFormData.time} 
                                onValueChange={(val) => setEditFormData(prev => ({...prev, time: val}))}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona hora" />
                                </SelectTrigger>
                                <SelectContent>
                                    {hours.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleUpdateReservation}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedReservation?.isFixed 
                                ? "Esta acción eliminará el TURNO FIJO de forma permanente. Todas las futuras reservas para este turno se cancelarán."
                                : "Esta acción cancelará la reserva permanentemente y se sumará al historial de cancelaciones del cliente."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelReservation}>
                            Confirmar Cancelación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}

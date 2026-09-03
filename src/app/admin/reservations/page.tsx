'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, Timestamp, increment } from 'firebase/firestore';
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
import { format, startOfWeek, addDays, subDays, set, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn, safeToDate } from '@/lib/utils';

type FullReservation = Reservation & {
    user: User | null;
    court: Court | null; 
    isFixed?: boolean;
    hasConflict?: boolean;
};

const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
    '00:00', '01:00', '02:00'
];

export default function AdminReservationsCalendarPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState<FullReservation | null>(null);
    const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
    
    const [isNewResDialogOpen, setIsNewResDialogOpen] = useState(false);
    const [newResData, setNewResData] = useState({
        day: new Date(),
        hour: '',
        clientName: '',
        userId: '',
    });

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
        }
        
        setIsCancelAlertOpen(false);
        setSelectedReservation(null);
    };

    const handleOpenEdit = () => {
        if (!selectedReservation || !selectedReservation.reservationDateTime) return;
        setEditFormData({
            courtId: selectedReservation.court?.id || '',
            time: format(safeToDate(selectedReservation.reservationDateTime), 'HH:mm'),
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdateReservation = async () => {
        if (!selectedReservation || !firestore || !courts || !selectedReservation.reservationDateTime) return;

        if (selectedReservation.isFixed) {
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

        const currentResDate = safeToDate(selectedReservation.reservationDateTime);
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
        let resDay = newResData.day;
        if (hour >= 0 && hour < 8) {
            resDay = addDays(resDay, 1);
        }
        const resDateTime = set(resDay, { hours: hour, minutes: min, seconds: 0, milliseconds: 0 });

        let courtIds = [selectedCourt.id];
        if (selectedCourt.courtType === 'Futbol 7') {
            const f7Num = selectedCourt.courtNumber;
            const f5_1 = courts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === (f7Num * 2) - 1);
            const f5_2 = courts.find(c => c.courtType === 'Futbol 5' && c.courtNumber === f7Num * 2);
            if (f5_1) courtIds.push(f5_1.id);
            if (f5_2) courtIds.push(f5_2.id);
        }

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
        }
    };
    
    const getReservationForSlot = (day: Date, hour: string, courtId: string): FullReservation | undefined => {
        if (!courts || !reservations || !allUsers) return undefined;
        
        const [hourNum] = hour.split(':').map(Number);
        let slotDate = new Date(day);
        if (hourNum >= 0 && hourNum < 8) {
            slotDate = addDays(slotDate, 1);
        }
        const slotDateTime = set(slotDate, { hours: hourNum, minutes: 0, seconds: 0, milliseconds: 0 }).getTime();

        const courtToDisplay = courts.find(c => c.id === courtId);
        if (!courtToDisplay) return undefined;
    
        const usersMap = new Map(allUsers.map(u => [u.id, u]));
        
        const regularMatchRaw = reservations.find(res => {
            if (!res.reservationDateTime) return false;
            const resTime = safeToDate(res.reservationDateTime).getTime();
            if (resTime !== slotDateTime) return false;

            for (const resCourtId of (res.courtIds || [])) {
                if (resCourtId === courtId) return true;
                const reservedCourt = courts.find(c => c.id === resCourtId);
                if (!reservedCourt) continue;

                if (courtToDisplay.courtType === 'Futbol 5' && reservedCourt.courtType === 'Futbol 7') {
                    if (courtToDisplay.courtNumber === (reservedCourt.courtNumber * 2) - 1 || courtToDisplay.courtNumber === reservedCourt.courtNumber * 2) return true;
                }
                if (courtToDisplay.courtType === 'Futbol 7' && reservedCourt.courtType === 'Futbol 5') {
                    if (reservedCourt.courtNumber === (courtToDisplay.courtNumber * 2) - 1 || reservedCourt.courtNumber === courtToDisplay.courtNumber * 2) return true;
                }
            }
            return false;
        });

        let fixedMatch: FullReservation | undefined;
        if (fixedReservations) {
            const dayOfWeek = slotDate.getDay();
            const matchingFixed = fixedReservations.find(fr => {
                if (!fr.isActive || fr.dayOfWeek !== dayOfWeek || fr.time !== hour) return false;
                const fixedCourt = courts.find(c => c.id === fr.courtId);
                if (!fixedCourt) return false;

                if (fixedCourt.id === courtId) return true;
                if (courtToDisplay.courtType === 'Futbol 5' && fixedCourt.courtType === 'Futbol 7') {
                    if (courtToDisplay.courtNumber === (fixedCourt.courtNumber * 2) - 1 || courtToDisplay.courtNumber === fixedCourt.courtNumber * 2) return true;
                }
                if (courtToDisplay.courtType === 'Futbol 7' && fixedCourt.courtType === 'Futbol 5') {
                    if (fixedCourt.courtNumber === (courtToDisplay.courtNumber * 2) - 1 || fixedCourt.courtNumber === courtToDisplay.courtNumber * 2) return true;
                }
                return false;
            });

            if (matchingFixed) {
                fixedMatch = {
                    id: matchingFixed.id,
                    userId: 'fixed-user',
                    courtIds: [matchingFixed.courtId],
                    reservationDateTime: Timestamp.fromMillis(slotDateTime) as any,
                    durationMinutes: 60,
                    user: {
                        id: 'fixed-user',
                        firstName: matchingFixed.clientName,
                        lastName: '(Turno Fijo)',
                        email: 'N/A',
                        phoneNumber: matchingFixed.phoneNumber || 'N/A',
                        cancellationCount: 0
                    },
                    court: courts.find(c => c.id === matchingFixed.courtId) || null,
                    isFixed: true
                };
            }
        }

        if (regularMatchRaw && fixedMatch) {
            return {
                ...regularMatchRaw,
                user: usersMap.get(regularMatchRaw.userId) || null,
                court: courts.find(c => c.id === regularMatchRaw.courtIds[0]) || null,
                isFixed: false,
                hasConflict: true
            };
        }

        if (regularMatchRaw) {
            return {
                ...regularMatchRaw,
                user: usersMap.get(regularMatchRaw.userId) || null,
                court: courts.find(c => c.id === (regularMatchRaw.courtIds ? regularMatchRaw.courtIds[0] : '')) || null,
                isFixed: false
            };
        }

        return fixedMatch;
    };
    
    const sortedCourtsForSelection = useMemo(() => courts?.filter(c => {
        if (c.courtType === 'Futbol 5') {
            return c.courtNumber === 3 || c.courtNumber === 4;
        }
        if (c.courtType === 'Futbol 7') {
            return c.courtNumber === 1 || c.courtNumber === 2;
        }
        return false;
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
        const futbol5Courts = sortedCourtsForSelection.filter(c => c.courtType === 'Futbol 5');
        const futbol7Courts = sortedCourtsForSelection.filter(c => c.courtType === 'Futbol 7');

        return (
            <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
                <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
                    <CardHeader>
                        <CardTitle>Seleccionar Cancha</CardTitle>
                        <CardDescription>
                            Elige una cancha para ver su calendario de reservas. (F5 Canchas 1 y 2 están ocultas).
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
                                <p>{selectedReservation.reservationDateTime ? format(safeToDate(selectedReservation.reservationDateTime), "EEEE d 'de' LLLL 'a las' HH:mm 'hs'", { locale: es }) : 'Fecha no disponible'}</p>
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
                                    {sortedCourtsForSelection.map(c => (
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

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
import { Switch } from "@/components/ui/switch";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Court } from "@/lib/types";
import { Trash2, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminCourtsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const courtsCollectionRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
    const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsCollectionRef);

    const [courtDetails, setCourtDetails] = useState<Record<string, { price: number | string; isAvailable: boolean }>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Estado para nueva cancha
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isAddingCourt, setIsAddingCourt] = useState(false);
    const [newCourtData, setNewCourtData] = useState<{
        courtType: 'Futbol 5' | 'Futbol 7';
        courtNumber: number;
        price: number;
    }>({
        courtType: 'Futbol 5',
        courtNumber: 1,
        price: 25000,
    });

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    useEffect(() => {
        if (courts && courts.length > 0) {
            setCourtDetails(prev => {
                const next = { ...prev };
                courts.forEach(court => {
                    // Mantener valor existente si ya fue editado por el usuario, o inicializar
                    if (next[court.id] === undefined) {
                        next[court.id] = {
                            price: court.price ?? 0,
                            isAvailable: court.isAvailable !== undefined ? court.isAvailable : true
                        };
                    }
                });
                return next;
            });
        }
    }, [courts]);

    const handlePriceChange = (courtId: string, value: string) => {
        // Permitir vacío para que el usuario pueda borrar y reescribir libremente
        if (value !== '' && isNaN(Number(value))) return;

        setCourtDetails(prev => ({
            ...prev,
            [courtId]: {
                ...prev[courtId],
                price: value
            }
        }));
    };

    const handleAvailabilityChange = (courtId: string, checked: boolean) => {
        setCourtDetails(prev => ({
            ...prev,
            [courtId]: {
                ...prev[courtId],
                isAvailable: checked
            }
        }));
    };

    const handleDeleteCourt = async (courtId: string) => {
        try {
            const { error } = await supabase
                .from('courts')
                .delete()
                .eq('id', courtId);

            if (error) throw error;

            toast({
                title: "¡Cancha eliminada!",
                description: "La cancha ha sido eliminada correctamente.",
            });
        } catch (error) {
            console.error("Error deleting court: ", error);
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: "No se pudo eliminar la cancha.",
            });
        }
    };

    const handleAddCourt = async () => {
        if (!newCourtData.courtNumber || newCourtData.courtNumber <= 0) {
            toast({
                variant: "destructive",
                title: "Número inválido",
                description: "Ingresa un número de cancha válido.",
            });
            return;
        }

        setIsAddingCourt(true);
        try {
            const courtId = `cancha-${newCourtData.courtType === 'Futbol 7' ? 'f7' : 'f5'}-${newCourtData.courtNumber}-${Date.now().toString().slice(-4)}`;
            const { error } = await supabase
                .from('courts')
                .insert({
                    id: courtId,
                    court_type: newCourtData.courtType,
                    court_number: Number(newCourtData.courtNumber),
                    price: Number(newCourtData.price) || 0,
                    is_available: true,
                });

            if (error) throw error;

            toast({
                title: "¡Cancha creada!",
                description: `Se añadió ${newCourtData.courtType} Cancha ${newCourtData.courtNumber}.`,
            });
            setIsAddDialogOpen(false);
        } catch (error) {
            console.error("Error adding court:", error);
            toast({
                variant: "destructive",
                title: "Error al crear",
                description: "No se pudo crear la nueva cancha.",
            });
        } finally {
            setIsAddingCourt(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!courts || courts.length === 0) return;
        setIsSaving(true);

        try {
            const rowsToUpsert = courts.map((court) => {
                const details = courtDetails[court.id];
                const rawPrice = details ? details.price : court.price;
                const numericPrice = typeof rawPrice === 'string'
                    ? (rawPrice.trim() === '' ? 0 : Number(rawPrice))
                    : Number(rawPrice);
                const finalPrice = isNaN(numericPrice) ? (court.price || 0) : numericPrice;
                const finalIsAvailable = details && details.isAvailable !== undefined 
                    ? details.isAvailable 
                    : (court.isAvailable !== undefined ? court.isAvailable : true);

                return {
                    id: court.id,
                    court_type: court.courtType,
                    court_number: court.courtNumber,
                    price: finalPrice,
                    is_available: finalIsAvailable,
                };
            });

            const { error } = await supabase
                .from('courts')
                .upsert(rowsToUpsert);

            if (error) throw error;

            setCourtDetails(prev => {
                const next = { ...prev };
                rowsToUpsert.forEach(row => {
                    next[row.id] = {
                        price: row.price,
                        isAvailable: row.is_available,
                    };
                });
                return next;
            });

            toast({
                title: "¡Precios actualizados!",
                description: "Los cambios se han guardado correctamente.",
            });
        } catch (error) {
            console.error("Error saving court data:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudieron guardar los cambios en la base de datos.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isUserLoading || isProfileLoading || areCourtsLoading;

    if (isLoading || (user && !userProfile)) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Cargando gestión de canchas...</p>
            </div>
        );
    }

    const renderCourtInputs = (court: Court) => (
        <div key={court.id} className="p-4 border rounded-lg bg-card/50 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <Label className="text-lg font-semibold">
                        {`${court.courtType} - Cancha ${court.courtNumber}`}
                    </Label>
                    <span className="text-[10px] text-muted-foreground uppercase">
                        ID: {court.id}
                    </span>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar cancha?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará permanentemente la cancha {court.courtType} #{court.courtNumber}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCourt(court.id)}>
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={`price-${court.id}`}>Precio por Turno ($)</Label>
                    <Input
                        id={`price-${court.id}`}
                        type="number"
                        value={courtDetails[court.id]?.price ?? ''}
                        onChange={(e) => handlePriceChange(court.id, e.target.value)}
                        placeholder="0"
                        className="w-full text-right font-medium"
                    />
                </div>
                <div className="flex flex-col items-center justify-center gap-2 border rounded-md bg-background/20 p-2">
                    <Label htmlFor={`avail-${court.id}`} className="text-[10px] uppercase font-semibold">Estado</Label>
                    <div className="flex items-center gap-2">
                        <Switch
                            id={`avail-${court.id}`}
                            checked={courtDetails[court.id]?.isAvailable ?? true}
                            onCheckedChange={(checked) => handleAvailabilityChange(court.id, checked)}
                        />
                        <span className={`text-xs font-bold ${(courtDetails[court.id]?.isAvailable ?? true) ? 'text-primary' : 'text-muted-foreground'}`}>
                            {(courtDetails[court.id]?.isAvailable ?? true) ? 'ACTIVA' : 'DESACT.'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    const futbol5Courts = courts?.filter(c => c.courtType === 'Futbol 5').sort((a,b) => a.courtNumber - b.courtNumber) || [];
    const futbol7Courts = courts?.filter(c => c.courtType === 'Futbol 7').sort((a,b) => a.courtNumber - b.courtNumber) || [];

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestionar Canchas</CardTitle>
                        <CardDescription>
                            Ajusta los precios y activa o desactiva las canchas que ven los clientes.
                        </CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <PlusCircle className="h-4 w-4" />
                                Agregar Cancha
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nueva Cancha</DialogTitle>
                                <DialogDescription>
                                    Añade una cancha para reservas en el complejo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Tipo de Cancha</Label>
                                    <Select 
                                        value={newCourtData.courtType}
                                        onValueChange={(val: 'Futbol 5' | 'Futbol 7') => setNewCourtData(p => ({ ...p, courtType: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Futbol 5">Fútbol 5</SelectItem>
                                            <SelectItem value="Futbol 7">Fútbol 7</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Número de Cancha</Label>
                                    <Input 
                                        type="number" 
                                        value={newCourtData.courtNumber} 
                                        onChange={(e) => setNewCourtData(p => ({ ...p, courtNumber: Number(e.target.value) }))}
                                        min={1}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio ($)</Label>
                                    <Input 
                                        type="number" 
                                        value={newCourtData.price} 
                                        onChange={(e) => setNewCourtData(p => ({ ...p, price: Number(e.target.value) }))}
                                        min={0}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddCourt} disabled={isAddingCourt}>
                                    {isAddingCourt ? "Agregando..." : "Crear Cancha"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4 border-l-4 border-primary pl-3">Fútbol 5</h3>
                             {futbol5Courts.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No hay canchas de Fútbol 5 configuradas.</p>
                             ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {futbol5Courts.map(renderCourtInputs)}
                                </div>
                             )}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4 border-l-4 border-primary pl-3">Fútbol 7</h3>
                             {futbol7Courts.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No hay canchas de Fútbol 7 configuradas.</p>
                             ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {futbol7Courts.map(renderCourtInputs)}
                                </div>
                             )}
                        </div>
                    </div>
                    <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full mt-8 text-lg font-bold">
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

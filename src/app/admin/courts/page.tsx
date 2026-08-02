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
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, writeBatch, getDocs, Firestore, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Court } from "@/lib/types";
import { Trash2 } from "lucide-react";


const initialCourtsData: Omit<Court, 'id'>[] = [
    { courtType: "Futbol 5", courtNumber: 1, isAvailable: true, price: 30000 },
    { courtType: "Futbol 5", courtNumber: 2, isAvailable: true, price: 30000 },
    { courtType: "Futbol 5", courtNumber: 3, isAvailable: true, price: 30000 },
    { courtType: "Futbol 5", courtNumber: 4, isAvailable: true, price: 30000 },
    { courtType: "Futbol 7", courtNumber: 1, isAvailable: true, price: 60000 },
    { courtType: "Futbol 7", courtNumber: 2, isAvailable: true, price: 60000 },
];

async function seedInitialCourts(firestore: Firestore) {
    const courtsCollectionRef = collection(firestore, 'courts');
    const snapshot = await getDocs(courtsCollectionRef);
    if (snapshot.empty) {
        console.log("No courts found, seeding initial data...");
        const batch = writeBatch(firestore);
        initialCourtsData.forEach(courtData => {
            const docRef = doc(courtsCollectionRef); // Create a new doc with a generated ID
            batch.set(docRef, courtData);
        });
        await batch.commit();
        console.log("Initial courts seeded successfully.");
    }
}


export default function AdminCourtsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const courtsCollectionRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
    const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsCollectionRef);

    const [courtDetails, setCourtDetails] = useState<Record<string, { price: number; isAvailable: boolean }>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (firestore) {
            seedInitialCourts(firestore).catch(console.error);
        }
    }, [firestore]);
    
    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    useEffect(() => {
        if (courts) {
            const initialDetails = courts.reduce((acc, court) => {
                acc[court.id] = {
                    price: court.price || 0,
                    isAvailable: court.isAvailable !== undefined ? court.isAvailable : true
                };
                return acc;
            }, {} as Record<string, { price: number; isAvailable: boolean }>);
            setCourtDetails(initialDetails);
        }
    }, [courts]);


    const handlePriceChange = (courtId: string, value: string) => {
        const numericValue = Number(value);
        if (isNaN(numericValue)) return;
    
        setCourtDetails(prev => ({
            ...prev,
            [courtId]: {
                ...prev[courtId],
                price: numericValue
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
        if (!firestore) return;
        const courtRef = doc(firestore, 'courts', courtId);
        try {
            await deleteDoc(courtRef);
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

    const handleSaveChanges = async () => {
        if (!courts || !firestore) return;
        setIsSaving(true);
    
        const batch = writeBatch(firestore);
        courts.forEach(court => {
            const details = courtDetails[court.id];
            if (details) {
                const courtRef = doc(firestore, 'courts', court.id);
                const updatedData: Partial<Court> = {};
                
                if (details.price !== court.price) {
                    updatedData.price = details.price;
                }
                if (details.isAvailable !== court.isAvailable) {
                    updatedData.isAvailable = details.isAvailable;
                }
                
                if (Object.keys(updatedData).length > 0) {
                    batch.update(courtRef, updatedData);
                }
            }
        });
    
        try {
            await batch.commit();
            toast({
                title: "¡Datos de canchas actualizados!",
                description: "Los cambios se han guardado correctamente.",
            });
        } catch (error) {
             console.error("Error saving court data:", error);
             toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudieron guardar los datos.",
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
                        ID: {court.id.slice(0, 5)}...
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
                                Esta acción es irreversible.
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
                    <Label htmlFor={`price-${court.id}`}>Precio ($)</Label>
                    <Input
                        id={`price-${court.id}`}
                        type="number"
                        value={courtDetails[court.id]?.price ?? ''}
                        onChange={(e) => handlePriceChange(court.id, e.target.value)}
                        className="w-full text-right"
                    />
                </div>
                <div className="flex flex-col items-center justify-center gap-2 border rounded-md bg-background/20">
                    <Label htmlFor={`avail-${court.id}`} className="text-[10px] uppercase">Estado</Label>
                    <div className="flex items-center gap-2">
                        <Switch
                            id={`avail-${court.id}`}
                            checked={courtDetails[court.id]?.isAvailable ?? true}
                            onCheckedChange={(checked) => handleAvailabilityChange(court.id, checked)}
                        />
                        <span className="text-xs font-bold">
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
                <CardHeader>
                    <CardTitle>Gestionar Canchas</CardTitle>
                    <CardDescription>
                        Ajusta los precios y activa o desactiva las canchas que ven los clientes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4 border-l-4 border-primary pl-3">Fútbol 5</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {futbol5Courts.map(renderCourtInputs)}
                             </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4 border-l-4 border-primary pl-3">Fútbol 7</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {futbol7Courts.map(renderCourtInputs)}
                             </div>
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

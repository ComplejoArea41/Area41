
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
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, writeBatch, getDocs, Firestore, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Court } from "@/lib/types";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Trash2, Video } from "lucide-react";


const initialCourtsData: Omit<Court, 'id'>[] = [
    { courtType: "Futbol 5", courtNumber: 1, isAvailable: true, price: 30000 },
    { courtType: "Futbol 7", courtNumber: 1, isAvailable: true, price: 60000 },
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

    const userRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [user, firestore]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const courtsCollectionRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
    const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsCollectionRef);

    const [courtDetails, setCourtDetails] = useState<Record<string, { price: number; liveStreamUrl: string }>>({});
    const [isSaving, setIsSaving] = useState(false);

     useEffect(() => {
        if (firestore) {
          seedInitialCourts(firestore).catch(console.error);
        }
      }, [firestore]);

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) router.push('/login');
            else if (userProfile && !userProfile.isAdmin) router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    useEffect(() => {
        if (courts) {
            const initialDetails = courts.reduce((acc, court) => {
                acc[court.id] = {
                    price: court.price || 0,
                    liveStreamUrl: court.liveStreamUrl || ''
                };
                return acc;
            }, {} as Record<string, { price: number; liveStreamUrl: string }>);
            setCourtDetails(initialDetails);
        }
    }, [courts]);


    const handleDetailChange = (courtId: string, field: 'price' | 'liveStreamUrl', value: string) => {
        const newValue = field === 'price' ? Number(value) : value;
        if (field === 'price' && isNaN(newValue as number)) return;

        setCourtDetails(prev => ({
            ...prev,
            [courtId]: {
                ...prev[courtId],
                [field]: newValue
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
                description: "No se pudo eliminar la cancha. Verifica los permisos e inténtalo de nuevo.",
            });
        }
    };

    const handleSaveChanges = async () => {
        if (!courts || !firestore) return;
        setIsSaving(true);
    
        const updatePromises: Promise<void>[] = [];
        for (const court of courts) {
            const details = courtDetails[court.id];
            if (details && (details.price !== court.price || details.liveStreamUrl !== court.liveStreamUrl)) {
                const courtRef = doc(firestore, 'courts', court.id);
                const promise = new Promise<void>((resolve, reject) => {
                    try {
                        setDocumentNonBlocking(courtRef, { price: details.price, liveStreamUrl: details.liveStreamUrl }, { merge: true });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
                updatePromises.push(promise);
            }
        }
    
        try {
            await Promise.all(updatePromises);
            toast({
                title: "¡Datos de canchas actualizados!",
                description: "Los datos de las canchas se han guardado correctamente.",
            });
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudieron guardar los datos. Verifica los permisos e inténtalo de nuevo.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isUserLoading || isProfileLoading || areCourtsLoading;

    if (isLoading || !userProfile || !userProfile.isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Cargando gestión de canchas...</p>
            </div>
        );
    }

    const renderCourtInputs = (court: Court) => (
        <div key={court.id} className="p-4 border rounded-lg bg-card/50 space-y-4">
            <div className="flex items-center justify-between">
                <Label htmlFor={`price-${court.id}`} className="text-lg font-semibold">
                    {`Cancha ${court.courtNumber}`}
                </Label>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. La cancha será eliminada permanentemente.
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
            <div className="space-y-2">
                <Label htmlFor={`price-${court.id}`}>Precio por hora ($)</Label>
                <Input
                    id={`price-${court.id}`}
                    type="number"
                    value={courtDetails[court.id]?.price ?? ''}
                    onChange={(e) => handleDetailChange(court.id, 'price', e.target.value)}
                    className="w-full text-right"
                    placeholder="0"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`stream-url-${court.id}`} className="flex items-center gap-2"><Video className="h-4 w-4"/> URL de Cámara en Vivo</Label>
                <Input
                    id={`stream-url-${court.id}`}
                    type="text"
                    value={courtDetails[court.id]?.liveStreamUrl ?? ''}
                    onChange={(e) => handleDetailChange(court.id, 'liveStreamUrl', e.target.value)}
                    className="w-full"
                    placeholder="rtsp://... o http://..."
                />
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
                        Actualiza precios y asigna URLs de cámaras para cada cancha.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">Canchas de Fútbol 5</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {futbol5Courts.map(renderCourtInputs)}
                             </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4">Canchas de Fútbol 7</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {futbol7Courts.map(renderCourtInputs)}
                             </div>
                        </div>
                    </div>
                    <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full mt-8">
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

    
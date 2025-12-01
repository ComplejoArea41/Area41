
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
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, writeBatch, getDocs, Firestore } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Court } from "@/lib/types";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";


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

    const [prices, setPrices] = useState<Record<string, number>>({});
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
            const initialPrices = courts.reduce((acc, court) => {
                acc[court.id] = court.price || 0;
                return acc;
            }, {} as Record<string, number>);
            setPrices(initialPrices);
        }
    }, [courts]);


    const handlePriceChange = (courtId: string, value: string) => {
        const newPrice = Number(value);
        if (!isNaN(newPrice)) {
            setPrices(prev => ({ ...prev, [courtId]: newPrice }));
        }
    };

    const handleSaveChanges = async () => {
        if (!courts || !firestore) return;
        setIsSaving(true);
    
        const updatePromises: Promise<void>[] = [];
        for (const court of courts) {
            const currentPrice = prices[court.id];
            if (currentPrice !== undefined && currentPrice !== court.price) {
                const courtRef = doc(firestore, 'courts', court.id);
                // setDocumentNonBlocking doesn't return a promise we can directly use,
                // but we can wrap the logic to handle completion.
                const promise = new Promise<void>((resolve, reject) => {
                    try {
                        setDocumentNonBlocking(courtRef, { price: currentPrice }, { merge: true });
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
                title: "¡Precios actualizados!",
                description: "Los precios de las canchas se han guardado correctamente.",
            });
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudieron guardar los precios. Verifica los permisos e inténtalo de nuevo.",
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

    const futbol5Courts = courts?.filter(c => c.courtType === 'Futbol 5').sort((a,b) => a.courtNumber - b.courtNumber) || [];
    const futbol7Courts = courts?.filter(c => c.courtType === 'Futbol 7').sort((a,b) => a.courtNumber - b.courtNumber) || [];


    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Gestionar Precios de Canchas</CardTitle>
                    <CardDescription>
                        Actualiza aquí los precios por hora para cada tipo de cancha. Los cambios se reflejarán inmediatamente para nuevas reservas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">Canchas de Fútbol 5</h3>
                             <div className="space-y-4">
                                {futbol5Courts.map(court => (
                                    <div key={court.id} className="flex items-center justify-between">
                                        <Label htmlFor={`price-${court.id}`} className="text-lg">
                                            {`Cancha ${court.courtNumber}`}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">$</span>
                                            <Input
                                                id={`price-${court.id}`}
                                                type="number"
                                                value={prices[court.id] ?? ''}
                                                onChange={(e) => handlePriceChange(court.id, e.target.value)}
                                                className="w-32 text-right"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4">Canchas de Fútbol 7</h3>
                             <div className="space-y-4">
                                {futbol7Courts.map(court => (
                                    <div key={court.id} className="flex items-center justify-between">
                                        <Label htmlFor={`price-${court.id}`} className="text-lg">
                                            {`Cancha ${court.courtNumber}`}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">$</span>
                                            <Input
                                                id={`price-${court.id}`}
                                                type="number"
                                                value={prices[court.id] ?? ''}
                                                onChange={(e) => handlePriceChange(court.id, e.target.value)}
                                                className="w-32 text-right"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                ))}
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

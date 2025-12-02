
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, deleteDoc, writeBatch, getDocs, Firestore } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Tournament } from "@/lib/types";
import { PlusCircle, Trash2, Edit, Trophy, ArrowRight } from "lucide-react";


async function seedInitialTournament(firestore: Firestore) {
    const tournamentsCollectionRef = collection(firestore, 'tournaments');
    const snapshot = await getDocs(tournamentsCollectionRef);
    if (snapshot.empty) {
        console.log("No tournaments found, seeding initial data...");
        const batch = writeBatch(firestore);
        const docRef = doc(tournamentsCollectionRef);
        const initialTournament: Omit<Tournament, 'id'> = {
            name: "Copa Verano 2024",
            teamIds: [],
        };
        batch.set(docRef, initialTournament);
        await batch.commit();
        console.log("Initial tournament seeded successfully.");
    }
}


export default function AdminTournamentsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);
    
    const tournamentsCollectionRef = useMemoFirebase(() => collection(firestore, 'tournaments'), [firestore]);
    const { data: tournaments, isLoading: areTournamentsLoading } = useCollection<Tournament>(tournamentsCollectionRef);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

    const [tournamentName, setTournamentName] = useState('');

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) router.push('/login');
            else if (userProfile && !userProfile.isAdmin) router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);
    
    useEffect(() => {
        if (firestore) {
            seedInitialTournament(firestore).catch(console.error);
        }
    }, [firestore]);


    const openDialogForNew = () => {
        setEditingTournament(null);
        setTournamentName('');
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (tournament: Tournament) => {
        setEditingTournament(tournament);
        setTournamentName(tournament.name);
        setIsDialogOpen(true);
    };

    const handleDeleteTournament = async (tournamentId: string) => {
        if (!firestore) return;
        const tournamentRef = doc(firestore, 'tournaments', tournamentId);
        try {
            await deleteDoc(tournamentRef);
            toast({ title: "¡Torneo eliminado!", description: "El torneo se ha eliminado correctamente." });
        } catch (error) {
            console.error("Error deleting tournament: ", error);
            toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar el torneo." });
        }
    };

    const handleSaveChanges = async () => {
        if (!tournamentName) {
            toast({ variant: "destructive", title: "Datos incompletos", description: "Por favor, completa todos los campos." });
            return;
        }
        if (!firestore) return;
        setIsSaving(true);

        const tournamentData = {
            name: tournamentName,
        };
        
        try {
            if (editingTournament) {
                const tournamentRef = doc(firestore, 'tournaments', editingTournament.id);
                setDocumentNonBlocking(tournamentRef, tournamentData, { merge: true });
                toast({ title: "¡Torneo actualizado!", description: "Los cambios se han guardado correctamente." });

            } else {
                const newTournamentData = { ...tournamentData, teamIds: [] };
                await addDocumentNonBlocking(collection(firestore, 'tournaments'), newTournamentData);
                toast({ title: "¡Torneo creado!", description: "El nuevo torneo ha sido creado con éxito." });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving tournament: ", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar el torneo." });
        } finally {
            setIsSaving(false);
        }
    };


    if (isUserLoading || isProfileLoading || !userProfile || !userProfile.isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Cargando gestión de torneos...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-primary" />
                            Gestión de Torneos
                        </CardTitle>
                        <CardDescription>
                            Crea, edita y gestiona los torneos de fútbol.
                        </CardDescription>
                    </div>
                    <Button onClick={openDialogForNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Torneo
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {areTournamentsLoading && <p>Cargando torneos...</p>}
                        {tournaments?.map(tournament => (
                            <Card key={tournament.id} className="bg-card/70">
                                <CardHeader>
                                    <CardTitle>{tournament.name}</CardTitle>
                                </CardHeader>
                                <CardFooter className="flex justify-between">
                                     <p className="text-sm text-muted-foreground">{tournament.teamIds?.length || 0} equipos inscritos</p>
                                     <div className="flex gap-2">
                                        <Button variant="outline" size="sm" disabled>
                                            <ArrowRight className="mr-2 h-4 w-4" /> Ver Detalles
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => openDialogForEdit(tournament)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleDeleteTournament(tournament.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                     </div>
                                </CardFooter>
                            </Card>
                        ))}
                        {!areTournamentsLoading && tournaments?.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No hay torneos creados todavía.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingTournament ? 'Editar Torneo' : 'Nuevo Torneo'}</DialogTitle>
                        <DialogDescription>
                           {editingTournament ? 'Edita los detalles del torneo.' : 'Completa los detalles para crear un nuevo torneo.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nombre</Label>
                            <Input id="name" value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

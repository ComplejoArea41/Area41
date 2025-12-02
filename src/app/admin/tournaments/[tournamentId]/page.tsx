
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Tournament, Team } from "@/lib/types";
import { PlusCircle, Trash2, Edit, Trophy, Users } from "lucide-react";

type TeamFormData = Omit<Team, 'id' | 'tournamentId' | 'points' | 'played' | 'won' | 'drawn' | 'lost' | 'goalsFor' | 'goalsAgainst'>;

export default function TournamentDetailPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const tournamentId = params.tournamentId as string;

    // Admin verification
    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    // Tournament data
    const tournamentRef = useMemoFirebase(() => doc(firestore, 'tournaments', tournamentId), [firestore, tournamentId]);
    const { data: tournament, isLoading: isTournamentLoading } = useDoc<Tournament>(tournamentRef);

    // Teams data
    const teamsCollectionRef = useMemoFirebase(() => collection(firestore, 'tournaments', tournamentId, 'teams'), [firestore, tournamentId]);
    const { data: teams, isLoading: areTeamsLoading } = useCollection<Team>(teamsCollectionRef);

    // Team management states
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [isSavingTeam, setIsSavingTeam] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamFormData, setTeamFormData] = useState<TeamFormData>({ name: '' });

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) router.push('/login');
            else if (userProfile && !userProfile.isAdmin) router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const openDialogForNewTeam = () => {
        setEditingTeam(null);
        setTeamFormData({ name: '' });
        setIsTeamDialogOpen(true);
    };

    const openDialogForEditTeam = (team: Team) => {
        setEditingTeam(team);
        setTeamFormData({ name: team.name });
        setIsTeamDialogOpen(true);
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!firestore) return;
        const teamRef = doc(firestore, 'tournaments', tournamentId, 'teams', teamId);
        await deleteDocumentNonBlocking(teamRef);
        toast({ title: "¡Equipo eliminado!", description: "El equipo ha sido eliminado del torneo." });
    };

    const handleSaveTeam = async () => {
        if (!teamFormData.name) {
            toast({ variant: "destructive", title: "Nombre requerido", description: "El nombre del equipo no puede estar vacío." });
            return;
        }
        if (!firestore) return;
        setIsSavingTeam(true);

        const teamData = {
            name: teamFormData.name,
            tournamentId: tournamentId,
            points: 0,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
        };

        try {
            if (editingTeam) {
                const teamRef = doc(firestore, 'tournaments', tournamentId, 'teams', editingTeam.id);
                // We only allow editing the name for now
                setDocumentNonBlocking(teamRef, { name: teamFormData.name }, { merge: true });
                toast({ title: "¡Equipo actualizado!", description: "El nombre del equipo ha sido actualizado." });
            } else {
                await addDocumentNonBlocking(collection(firestore, 'tournaments', tournamentId, 'teams'), teamData);
                toast({ title: "¡Equipo agregado!", description: "El nuevo equipo se ha inscrito en el torneo." });
            }
            setIsTeamDialogOpen(false);
        } catch (error) {
            console.error("Error saving team: ", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar el equipo." });
        } finally {
            setIsSavingTeam(false);
        }
    };

    const isLoading = isUserLoading || isProfileLoading || isTournamentLoading;

    if (isLoading || !userProfile || !userProfile.isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Cargando detalles del torneo...</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-6xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-3xl">
                        <Trophy className="h-8 w-8 text-primary" />
                        {tournament?.name || 'Torneo'}
                    </CardTitle>
                    <CardDescription>
                        Gestiona los equipos, partidos, y la tabla de posiciones de este torneo.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Team Management Card */}
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-6xl">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Users className="h-6 w-6" /> Equipos
                        </CardTitle>
                        <CardDescription>Añade, edita o elimina los equipos participantes.</CardDescription>
                    </div>
                    <Button onClick={openDialogForNewTeam}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Equipo
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Equipo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {areTeamsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center">Cargando equipos...</TableCell>
                                </TableRow>
                            ) : teams && teams.length > 0 ? (
                                teams.map(team => (
                                    <TableRow key={team.id}>
                                        <TableCell className="font-medium">{team.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="icon" className="mr-2" onClick={() => openDialogForEditTeam(team)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteTeam(team.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24">No hay equipos inscritos todavía.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialog for Add/Edit Team */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
                        <DialogDescription>
                            {editingTeam ? 'Modifica el nombre del equipo.' : 'Añade un nuevo equipo a la competición.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="team-name" className="text-right">Nombre</Label>
                            <Input
                                id="team-name"
                                value={teamFormData.name}
                                onChange={(e) => setTeamFormData({ name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSaveTeam} disabled={isSavingTeam}>
                            {isSavingTeam ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

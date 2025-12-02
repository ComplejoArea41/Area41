
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
import { collection, doc, query, where, getDocs } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Tournament, Team, Player } from "@/lib/types";
import { PlusCircle, Trash2, Edit, Trophy, Users, UserPlus } from "lucide-react";

type TeamFormData = Omit<Team, 'id' | 'tournamentId' | 'players' | 'points' | 'played' | 'won' | 'drawn' | 'lost' | 'goalsFor' | 'goalsAgainst'>;
type PlayerFormData = Omit<Player, 'id' | 'teamId' | 'goals' | 'yellowCards' | 'redCards'>;

export default function TournamentDetailPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const tournamentId = params.tournamentId as string;

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const tournamentRef = useMemoFirebase(() => doc(firestore, 'tournaments', tournamentId), [firestore, tournamentId]);
    const { data: tournament, isLoading: isTournamentLoading } = useDoc<Tournament>(tournamentRef);

    const teamsCollectionRef = useMemoFirebase(() => collection(firestore, 'tournaments', tournamentId, 'teams'), [firestore, tournamentId]);
    const { data: teams, isLoading: areTeamsLoading, setData: setTeams } = useCollection<Team>(teamsCollectionRef);
    
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamForPlayer, setTeamForPlayer] = useState<Team | null>(null);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [teamFormData, setTeamFormData] = useState<TeamFormData>({ name: '', coach: '' });
    const [playerFormData, setPlayerFormData] = useState<PlayerFormData>({ name: '' });

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) router.push('/login');
            else if (userProfile && !userProfile.isAdmin) router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const openDialogForNewTeam = () => {
        setEditingTeam(null);
        setTeamFormData({ name: '', coach: '' });
        setIsTeamDialogOpen(true);
    };

    const openDialogForEditTeam = (team: Team) => {
        setEditingTeam(team);
        setTeamFormData({ name: team.name, coach: team.coach });
        setIsTeamDialogOpen(true);
    };

    const openDialogForNewPlayer = (team: Team) => {
        setTeamForPlayer(team);
        setEditingPlayer(null);
        setPlayerFormData({ name: '' });
        setIsPlayerDialogOpen(true);
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
        setIsSaving(true);
        
        try {
            if (editingTeam) {
                const teamRef = doc(firestore, 'tournaments', tournamentId, 'teams', editingTeam.id);
                setDocumentNonBlocking(teamRef, { name: teamFormData.name, coach: teamFormData.coach }, { merge: true });
                toast({ title: "¡Equipo actualizado!", description: "Los datos del equipo han sido actualizados." });
            } else {
                const teamData = {
                    name: teamFormData.name,
                    coach: teamFormData.coach,
                    tournamentId: tournamentId,
                    players: [],
                    points: 0,
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                };
                await addDocumentNonBlocking(collection(firestore, 'tournaments', tournamentId, 'teams'), teamData);
                toast({ title: "¡Equipo agregado!", description: "El nuevo equipo se ha inscrito en el torneo." });
            }
            setIsTeamDialogOpen(false);
        } catch (error) {
            console.error("Error saving team: ", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar el equipo." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSavePlayer = async () => {
        if (!playerFormData.name || !teamForPlayer) {
            toast({ variant: "destructive", title: "Datos incompletos", description: "El nombre del jugador es requerido." });
            return;
        }
        if (!firestore) return;
        setIsSaving(true);

        const playerData = {
            name: playerFormData.name,
            teamId: teamForPlayer.id,
            goals: 0,
            yellowCards: 0,
            redCards: 0,
        };
        
        const teamRef = doc(firestore, 'tournaments', tournamentId, 'teams', teamForPlayer.id);

        try {
            await addDocumentNonBlocking(collection(teamRef, 'players'), playerData);
            
            // Re-fetch players for the specific team to update UI
            const playersQuery = query(collection(teamRef, 'players'));
            const playersSnapshot = await getDocs(playersQuery);
            const updatedPlayers = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Player[];

            // Update local state for teams
            if (teams && setTeams) {
                const newTeams = teams.map(t => t.id === teamForPlayer.id ? { ...t, players: updatedPlayers } : t);
                setTeams(newTeams);
            }

            toast({ title: "¡Jugador agregado!", description: "El nuevo jugador ha sido añadido al equipo." });
            setIsPlayerDialogOpen(false);
        } catch (error) {
            console.error("Error saving player: ", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar el jugador." });
        } finally {
            setIsSaving(false);
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
                        Gestiona los equipos, jugadores, partidos y la tabla de posiciones de este torneo.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-6xl">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Users className="h-6 w-6" /> Equipos y Jugadores
                        </CardTitle>
                        <CardDescription>Añade equipos y gestiona sus plantillas.</CardDescription>
                    </div>
                    <Button onClick={openDialogForNewTeam}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Equipo
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Equipo / Director Técnico</TableHead>
                                <TableHead>Jugadores</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {areTeamsLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center">Cargando equipos...</TableCell></TableRow>
                            ) : teams && teams.length > 0 ? (
                                teams.map(team => (
                                    <TableRow key={team.id}>
                                        <TableCell>
                                            <div className="font-medium">{team.name}</div>
                                            <div className="text-sm text-muted-foreground">{team.coach || 'DT no asignado'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <ul className="list-disc pl-5 text-sm">
                                                {team.players && team.players.map(player => <li key={player.id}>{player.name}</li>)}
                                            </ul>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="icon" onClick={() => openDialogForNewPlayer(team)}>
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => openDialogForEditTeam(team)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteTeam(team.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">No hay equipos inscritos todavía.</TableCell></TableRow>
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
                            {editingTeam ? 'Modifica los datos del equipo.' : 'Añade un nuevo equipo a la competición.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="team-name" className="text-right">Nombre</Label>
                            <Input id="team-name" value={teamFormData.name} onChange={(e) => setTeamFormData(prev => ({...prev, name: e.target.value}))} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="team-coach" className="text-right">D.T.</Label>
                            <Input id="team-coach" value={teamFormData.coach} onChange={(e) => setTeamFormData(prev => ({...prev, coach: e.target.value}))} className="col-span-3"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSaveTeam} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             {/* Dialog for Add/Edit Player */}
             <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Añadir Jugador a {teamForPlayer?.name}</DialogTitle>
                        <DialogDescription>
                            Introduce el nombre del nuevo jugador para el equipo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="player-name" className="text-right">Nombre</Label>
                            <Input id="player-name" value={playerFormData.name} onChange={(e) => setPlayerFormData({name: e.target.value})} className="col-span-3"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsPlayerDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSavePlayer} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar Jugador'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

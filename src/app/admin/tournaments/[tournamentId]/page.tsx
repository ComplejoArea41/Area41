'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, writeBatch, runTransaction, orderBy, Timestamp, getDocs, where } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Tournament, Team, Player, Match } from "@/lib/types";
import { PlusCircle, Trash2, Edit, Trophy, Users, Eye, ShieldCheck, Save, ListOrdered, Flame, Video } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TeamFormData = Omit<Team, 'id' | 'tournamentId' | 'players' | 'points' | 'played' | 'won' | 'drawn' | 'lost' | 'goalsFor' | 'goalsAgainst'>;
type PlayerFormData = Omit<Player, 'id' | 'teamId' | 'tournamentId' | 'goals' | 'yellowCards' | 'redCards'>;
type MatchFormData = { teamAId: string; teamBId: string; date: Date | undefined; time: string; phase: string; };

type GoalAssignment = { [playerId: string]: number };

export default function TournamentDetailPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { toast } = useToast();

    // --- State Management ---
    const [isSaving, setIsSaving] = useState(false);

    // Team Dialog
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamFormData, setTeamFormData] = useState<TeamFormData>({ name: '', coach: '', flagUrl: '' });
    
    // Player Dialog
    const [isPlayerManagementOpen, setIsPlayerManagementOpen] = useState(false);
    const [managingPlayersOfTeam, setManagingPlayersOfTeam] = useState<Team | null>(null);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [playerFormData, setPlayerFormData] = useState<PlayerFormData>({ name: '' });

    // New Match Dialog
    const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
    const [matchFormData, setMatchFormData] = useState<MatchFormData>({ teamAId: '', teamBId: '', date: new Date(), time: '20:00', phase: 'Fase de Grupos'});

    // Result Dialog
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [matchPhase, setMatchPhase] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [teamAGoals, setTeamAGoals] = useState<GoalAssignment>({});
    const [teamBGoals, setTeamBGoals] = useState<GoalAssignment>({});

    // --- Firestore Data Hooks ---
    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const tournamentRef = useMemoFirebase(() => doc(firestore, 'tournaments', tournamentId), [firestore, tournamentId]);
    const { data: tournament, isLoading: isTournamentLoading } = useDoc<Tournament>(tournamentRef);

    const teamsQuery = useMemoFirebase(() => query(collection(firestore, 'tournaments', tournamentId, 'teams'), orderBy('points', 'desc')), [firestore, tournamentId]);
    const { data: teams, isLoading: areTeamsLoading } = useCollection<Team>(teamsQuery);
    
    const playersQuery = useMemoFirebase(() => query(collection(firestore, 'tournaments', tournamentId, 'players')), [firestore, tournamentId]);
    const { data: allPlayers, isLoading: arePlayersLoading } = useCollection<Player>(playersQuery);

    const matchesCollectionRef = useMemoFirebase(() => collection(firestore, 'tournaments', tournamentId, 'matches'), [firestore, tournamentId]);
    const { data: matches, isLoading: areMatchesLoading } = useCollection<Match>(matchesCollectionRef);

    // --- Memoized Derived Data ---
    const getTeamName = (teamId: string) => teams?.find(t => t.id === teamId)?.name || 'Equipo Desconocido';
    const getTeamPlayers = (teamId: string) => allPlayers?.filter(p => p.teamId === teamId) || [];

    const sortedTeams = useMemo(() => {
        if (!teams) return [];
        return [...teams].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const diffA = a.goalsFor - a.goalsAgainst;
            const diffB = b.goalsFor - b.goalsAgainst;
            if (diffB !== diffA) return diffB - diffA;
            return b.goalsFor - a.goalsFor;
        });
    }, [teams]);

    const topScorers = useMemo(() => {
        if (!allPlayers) return [];
        return [...allPlayers].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 10);
    }, [allPlayers]);


    // --- Effects ---
    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) router.push('/login');
            else if (userProfile && !userProfile.isAdmin) router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);
    
    // --- Team Management ---
    const openDialogForNewTeam = () => {
        setEditingTeam(null);
        setTeamFormData({ name: '', coach: '', flagUrl: '' });
        setIsTeamDialogOpen(true);
    };

    const openDialogForEditTeam = (team: Team) => {
        setEditingTeam(team);
        setTeamFormData({ name: team.name, coach: team.coach || '', flagUrl: team.flagUrl || '' });
        setIsTeamDialogOpen(true);
    };
    
    const handleDeleteTeam = async (teamId: string) => {
        if (!firestore) return;
        const playersToDelete = allPlayers?.filter(p => p.teamId === teamId) || [];
        const batch = writeBatch(firestore);
        playersToDelete.forEach(player => {
            const playerRef = doc(firestore, 'tournaments', tournamentId, 'players', player.id);
            batch.delete(playerRef);
        });
        const teamRef = doc(firestore, 'tournaments', tournamentId, 'teams', teamId);
        batch.delete(teamRef);
        await batch.commit();
        toast({ title: "¡Equipo eliminado!", description: "El equipo y sus jugadores han sido eliminados." });
    };

    const handleSaveTeam = async () => {
        if (!teamFormData.name) {
            toast({ variant: "destructive", title: "Nombre requerido", description: "El nombre del equipo no puede estar vacío." });
            return;
        }
        if (!firestore) return;
        setIsSaving(true);
        const teamData = {
            name: teamFormData.name,
            coach: teamFormData.coach,
            flagUrl: teamFormData.flagUrl,
            tournamentId: tournamentId,
            points: editingTeam?.points ?? 0,
            played: editingTeam?.played ?? 0,
            won: editingTeam?.won ?? 0,
            drawn: editingTeam?.drawn ?? 0,
            lost: editingTeam?.lost ?? 0,
            goalsFor: editingTeam?.goalsFor ?? 0,
            goalsAgainst: editingTeam?.goalsAgainst ?? 0,
        };
        try {
            if (editingTeam) {
                const teamRef = doc(firestore, 'tournaments', tournamentId, 'teams', editingTeam.id);
                setDocumentNonBlocking(teamRef, teamData, { merge: true });
                toast({ title: "¡Equipo actualizado!" });
            } else {
                await addDocumentNonBlocking(collection(firestore, 'tournaments', tournamentId, 'teams'), teamData);
                toast({ title: "¡Equipo agregado!" });
            }
            setIsTeamDialogOpen(false);
        } finally { setIsSaving(false); }
    };
    
    // --- Player Management ---
    const openPlayerManager = (team: Team) => {
        setManagingPlayersOfTeam(team);
        setIsPlayerManagementOpen(true);
        setEditingPlayer(null);
        setPlayerFormData({ name: '' });
    };

    const handleSavePlayer = async () => {
        if (!playerFormData.name || !managingPlayersOfTeam) return;
        if (!firestore) return;
        setIsSaving(true);
        const playerData: Omit<Player, 'id'> = {
            name: playerFormData.name,
            teamId: managingPlayersOfTeam.id,
            tournamentId: tournamentId,
            goals: editingPlayer?.goals ?? 0,
            yellowCards: editingPlayer?.yellowCards ?? 0,
            redCards: editingPlayer?.redCards ?? 0,
        };
        try {
            if (editingPlayer) {
                const playerRef = doc(firestore, `tournaments/${tournamentId}/players/${editingPlayer.id}`);
                await setDocumentNonBlocking(playerRef, playerData, { merge: true });
                toast({ title: "¡Jugador actualizado!" });
            } else {
                await addDocumentNonBlocking(collection(firestore, `tournaments/${tournamentId}/players`), playerData);
                toast({ title: "¡Jugador agregado!" });
            }
            setEditingPlayer(null);
            setPlayerFormData({ name: '' });
        } finally { setIsSaving(false); }
    };

    const handleDeletePlayer = async (playerId: string) => {
        if (!firestore) return;
        const playerRef = doc(firestore, `tournaments/${tournamentId}/players/${playerId}`);
        await deleteDocumentNonBlocking(playerRef);
        toast({ title: "¡Jugador eliminado!" });
    };
    
    // --- Fixture & Result Management ---
    const openNewMatchDialog = () => {
        setMatchFormData({ teamAId: '', teamBId: '', date: new Date(), time: '20:00', phase: 'Fase de Grupos' });
        setIsMatchDialogOpen(true);
    };

    const handleSaveNewMatch = async () => {
        const { teamAId, teamBId, date, time, phase } = matchFormData;
        if (!teamAId || !teamBId || !date || !time || !phase) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, completa todos los campos del partido.' });
            return;
        }
        if (teamAId === teamBId) {
            toast({ variant: 'destructive', title: 'Equipos inválidos', description: 'Un equipo no puede jugar contra sí mismo.' });
            return;
        }
        if (!firestore) return;
        setIsSaving(true);

        const [hour, minute] = time.split(':').map(Number);
        const matchDateTime = new Date(date);
        matchDateTime.setHours(hour, minute);

        const newMatchData = {
            tournamentId,
            teamAId,
            teamBId,
            teamAScore: null,
            teamBScore: null,
            date: Timestamp.fromDate(matchDateTime),
            status: 'pending',
            phase: phase
        };
        
        try {
            const matchesCollection = collection(firestore, 'tournaments', tournamentId, 'matches');
            const matchDocRef = await addDocumentNonBlocking(matchesCollection, newMatchData);
            
            // Now, find the corresponding reservation to link the matchId
            const reservationsRef = collection(firestore, 'reservations');
            const q = query(
                reservationsRef, 
                where('reservationDateTime', '==', Timestamp.fromDate(matchDateTime))
            );
            const querySnapshot = await getDocs(q);

            // Assuming only one reservation matches the exact date and time
            querySnapshot.forEach((reservationDoc) => {
                const reservationRef = doc(firestore, 'reservations', reservationDoc.id);
                updateDocumentNonBlocking(reservationRef, { matchId: matchDocRef.id });
            });

            toast({ title: '¡Partido Creado!', description: 'El nuevo partido ha sido añadido al fixture.' });
            setIsMatchDialogOpen(false);
        } catch (error) {
             console.error("Error creating match: ", error);
            toast({ variant: 'destructive', title: 'Error al crear partido' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const openResultDialog = (match: Match) => {
        setEditingMatch(match);
        setTeamAGoals({});
        setTeamBGoals({});
        setMatchPhase(match.phase || '');
        setVideoUrl(match.videoUrl || '');
        setIsResultDialogOpen(true);
    };

    const handleGoalAssignment = (team: 'A' | 'B', playerId: string, change: 1 | -1) => {
        const goalState = team === 'A' ? teamAGoals : teamBGoals;
        const setGoalState = team === 'A' ? setTeamAGoals : setTeamBGoals;
        const currentGoals = goalState[playerId] ?? 0;
        const newGoals = Math.max(0, currentGoals + change);
        setGoalState(prev => ({ ...prev, [playerId]: newGoals }));
    };

    const teamAScore = useMemo(() => Object.values(teamAGoals).reduce((sum, count) => sum + count, 0), [teamAGoals]);
    const teamBScore = useMemo(() => Object.values(teamBGoals).reduce((sum, count) => sum + count, 0), [teamBGoals]);

    const handleSaveResult = async () => {
        if (!firestore || !editingMatch) return;
        
        setIsSaving(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const matchRef = doc(firestore, 'tournaments', tournamentId, 'matches', editingMatch.id);
                const teamARef = doc(firestore, 'tournaments', tournamentId, 'teams', editingMatch.teamAId);
                const teamBRef = doc(firestore, 'tournaments', tournamentId, 'teams', editingMatch.teamBId);
                
                const allGoalscorers = {...teamAGoals, ...teamBGoals};
                const playerRefs = Object.keys(allGoalscorers).map(playerId => 
                    doc(firestore, 'tournaments', tournamentId, 'players', playerId)
                );
                
                // --- 1. READS (All reads must happen before writes) ---
                const [teamADoc, teamBDoc, ...playerDocs] = await Promise.all([
                    transaction.get(teamARef),
                    transaction.get(teamBRef),
                    ...playerRefs.map(ref => transaction.get(ref))
                ]);
    
                if (!teamADoc.exists() || !teamBDoc.exists()) {
                    throw new Error("Uno o ambos equipos no fueron encontrados.");
                }
    
                // --- 2. WRITES (All writes happen after reads) ---
    
                // Update match status and video URL
                transaction.update(matchRef, { 
                    teamAScore: teamAScore, 
                    teamBScore: teamBScore, 
                    status: 'finished', 
                    phase: matchPhase,
                    videoUrl: videoUrl,
                });
    
                // Update team stats
                const teamAData = teamADoc.data() as Team;
                const teamBData = teamBDoc.data() as Team;
                let { points: pA, won: wA, drawn: dA, lost: lA } = teamAData;
                let { points: pB, won: wB, drawn: dB, lost: lB } = teamBData;
    
                if (teamAScore > teamBScore) { pA += 3; wA += 1; lB += 1; }
                else if (teamBScore > teamAScore) { pB += 3; wB += 1; lA += 1; }
                else { pA += 1; pB += 1; dA += 1; dB += 1; }
                
                transaction.update(teamARef, { points: pA, played: teamAData.played + 1, won: wA, drawn: dA, lost: lA, goalsFor: teamAData.goalsFor + teamAScore, goalsAgainst: teamAData.goalsAgainst + teamBScore });
                transaction.update(teamBRef, { points: pB, played: teamBData.played + 1, won: wB, drawn: dB, lost: lB, goalsFor: teamBData.goalsFor + teamBScore, goalsAgainst: teamBData.goalsAgainst + teamAScore });
                
                // Update player stats
                playerDocs.forEach(playerDoc => {
                    if (playerDoc.exists()) {
                        const goalsScored = allGoalscorers[playerDoc.id];
                        if (goalsScored > 0) {
                            const currentGoals = playerDoc.data().goals || 0;
                            transaction.update(playerDoc.ref, { goals: currentGoals + goalsScored });
                        }
                    }
                });

                // Find and update the reservation with the video URL
                const reservationsRef = collection(firestore, 'reservations');
                const q = query(reservationsRef, where('matchId', '==', editingMatch.id));
                const querySnapshot = await getDocs(q); // Use getDocs directly inside transaction for reads
                
                querySnapshot.forEach((reservationDoc) => {
                    if(videoUrl) {
                        transaction.update(reservationDoc.ref, { videoUrl: videoUrl });
                    }
                });
            });
    
            toast({ title: '¡Resultado guardado!', description: 'La tabla de posiciones y la reserva se han actualizado.' });
            setIsResultDialogOpen(false);
        } catch (error) {
            console.error("Error saving match result: ", error);
            toast({ variant: 'destructive', title: 'Error al guardar', description: (error as Error).message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoadingPage = isUserLoading || isProfileLoading || isTournamentLoading;
    if (isLoadingPage || !userProfile || !userProfile.isAdmin) {
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

            <div className="grid grid-cols-1 gap-6 w-full max-w-6xl">
                {/* --- Teams Card --- */}
                <Card className="bg-card/80 backdrop-blur-sm w-full">
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6" />Equipos</CardTitle>
                            <CardDescription>Añade equipos y gestiona sus plantillas.</CardDescription>
                        </div>
                        <Button onClick={openDialogForNewTeam}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Equipo</Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Equipo / Director Técnico</TableHead><TableHead className="text-center">Jugadores</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {areTeamsLoading ? <TableRow><TableCell colSpan={3} className="text-center">Cargando equipos...</TableCell></TableRow>
                                : teams && teams.length > 0 ? teams.map(team => (
                                    <TableRow key={team.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {team.flagUrl ? <img src={team.flagUrl} alt={team.name} className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-muted" />}
                                                <div>
                                                    <div className="font-medium">{team.name}</div>
                                                    <div className="text-sm text-muted-foreground">{team.coach || 'DT no asignado'}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center"><Button variant="outline" size="sm" onClick={() => openPlayerManager(team)}><Eye className="mr-2 h-4 w-4" /> Ver ({getTeamPlayers(team.id).length})</Button></TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="icon" onClick={() => openDialogForEditTeam(team)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteTeam(team.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={3} className="text-center h-24">No hay equipos inscritos todavía.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     {/* --- Fixtures Card --- */}
                    <div className="lg:col-span-2">
                        <Card className="bg-card/80 backdrop-blur-sm w-full">
                             <CardHeader className="flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6" />Partidos y Resultados</CardTitle>
                                    <CardDescription>Crea partidos manualmente y carga los resultados.</CardDescription>
                                </div>
                                <Button onClick={openNewMatchDialog}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Partido</Button>
                            </CardHeader>
                            <CardContent>
                                {areMatchesLoading ? <p>Cargando partidos...</p> : matches && matches.length > 0 ? (
                                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                                        {matches.map(match => (
                                            <div key={match.id} className="p-3 border rounded-md text-sm bg-background/50 flex justify-between items-center">
                                                <div className="flex-1 text-right font-medium truncate">{getTeamName(match.teamAId)}</div>
                                                <div className="mx-4 text-center">
                                                    <div className="font-bold text-xl">{match.status === 'finished' ? `${match.teamAScore} - ${match.teamBScore}` : "VS"}</div>
                                                    <div className="text-xs text-muted-foreground">{format((match.date as any).toDate(), 'dd/MM/yy HH:mm')}hs</div>
                                                </div>
                                                <div className="flex-1 font-medium truncate">{getTeamName(match.teamBId)}</div>
                                                <Button size="sm" className="ml-4" onClick={() => openResultDialog(match)} disabled={isSaving}>
                                                    <Save className="mr-2 h-4 w-4" /> {match.status === 'pending' ? 'Cargar' : 'Editar'}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <p>No hay partidos creados todavía.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6 lg:col-span-1">
                         {/* --- Positions Table --- */}
                        <Card className="bg-card/80 backdrop-blur-sm w-full">
                            <CardHeader><CardTitle className="flex items-center gap-2"><ListOrdered className="h-6 w-6" />Tabla de Posiciones</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead className="w-[20px]">#</TableHead><TableHead>Equipo</TableHead><TableHead className="text-center">Pts</TableHead><TableHead className="text-center">PJ</TableHead><TableHead className="text-center">DG</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {areTeamsLoading ? <TableRow><TableCell colSpan={5}>Cargando...</TableCell></TableRow> : sortedTeams.map((team, i) => (
                                            <TableRow key={team.id}><TableCell className="font-bold">{i + 1}</TableCell><TableCell>{team.name}</TableCell><TableCell className="text-center font-bold">{team.points}</TableCell><TableCell className="text-center">{team.played}</TableCell><TableCell className="text-center">{team.goalsFor - team.goalsAgainst}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        {/* --- Scorers Table --- */}
                        <Card className="bg-card/80 backdrop-blur-sm w-full">
                            <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-6 w-6" />Goleadores</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Jugador</TableHead><TableHead className="text-right">Goles</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {arePlayersLoading ? <TableRow><TableCell colSpan={2}>Cargando...</TableCell></TableRow> : topScorers.map(player => (
                                            <TableRow key={player.id}><TableCell>{player.name} <span className="text-xs text-muted-foreground">({getTeamName(player.teamId)})</span></TableCell><TableCell className="text-right font-bold">{player.goals}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* --- Dialogs --- */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle>{editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle><DialogDescription>{editingTeam ? 'Modifica los datos del equipo.' : 'Añade un nuevo equipo a la competición.'}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="team-name" className="text-right">Nombre</Label><Input id="team-name" value={teamFormData.name} onChange={(e) => setTeamFormData(prev => ({...prev, name: e.target.value}))} className="col-span-3"/></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="team-coach" className="text-right">D.T.</Label><Input id="team-coach" value={teamFormData.coach || ''} onChange={(e) => setTeamFormData(prev => ({...prev, coach: e.target.value}))} className="col-span-3"/></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="team-flag" className="text-right">URL Bandera</Label><Input id="team-flag" value={teamFormData.flagUrl || ''} onChange={(e) => setTeamFormData(prev => ({...prev, flagUrl: e.target.value}))} className="col-span-3"/></div>
                    </div>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)}>Cancelar</Button><Button type="submit" onClick={handleSaveTeam} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isPlayerManagementOpen} onOpenChange={setIsPlayerManagementOpen}>
                <DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Gestión de Jugadores: {managingPlayersOfTeam?.name}</DialogTitle><DialogDescription>Añade, edita o elimina jugadores de este equipo.</DialogDescription></DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4"><h3 className="font-semibold">{editingPlayer ? 'Editar Jugador' : 'Añadir Jugador'}</h3><div className="grid items-center gap-2"><Label htmlFor="player-name">Nombre del Jugador</Label><Input id="player-name" value={playerFormData.name} onChange={(e) => setPlayerFormData({name: e.target.value})} /></div><div className="flex gap-2"><Button onClick={handleSavePlayer} disabled={isSaving} className="w-full">{isSaving ? 'Guardando...' : (editingPlayer ? 'Guardar Cambios' : 'Añadir Jugador')}</Button>{editingPlayer && (<Button variant="outline" onClick={() => { setEditingPlayer(null); setPlayerFormData({name:''}) }}>Cancelar</Button>)}</div></div>
                        <div className="space-y-2"><h3 className="font-semibold">Plantilla</h3><div className="border rounded-lg max-h-64 overflow-y-auto"><Table><TableBody>{arePlayersLoading && <TableRow><TableCell>Cargando...</TableCell></TableRow>}{getTeamPlayers(managingPlayersOfTeam?.id ?? '').length > 0 ? (getTeamPlayers(managingPlayersOfTeam?.id ?? '').map(player => (<TableRow key={player.id}><TableCell>{player.name}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingPlayer(player); setPlayerFormData({name: player.name})}}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeletePlayer(player.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))) : (!arePlayersLoading && <TableRow><TableCell>No hay jugadores en este equipo.</TableCell></TableRow>)}</TableBody></Table></div></div>
                    </div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsPlayerManagementOpen(false)}>Cerrar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Partido</DialogTitle>
                        <DialogDescription>Selecciona los equipos, la fecha y la fase del partido.</DialogDescription>
                    </DialogHeader>
                     <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="teamA" className="text-right">Equipo A</Label>
                            <Select value={matchFormData.teamAId} onValueChange={(value) => setMatchFormData(prev => ({...prev, teamAId: value}))}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                                <SelectContent>{teams?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="teamB" className="text-right">Equipo B</Label>
                             <Select value={matchFormData.teamBId} onValueChange={(value) => setMatchFormData(prev => ({...prev, teamBId: value}))}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                                <SelectContent>{teams?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Fecha</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !matchFormData.date && "text-muted-foreground" )}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {matchFormData.date ? format(matchFormData.date, "PPP") : <span>Elige una fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={matchFormData.date} onSelect={(d) => setMatchFormData(p => ({...p, date: d}))} initialFocus/></PopoverContent>
                            </Popover>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">Hora</Label>
                            <Input id="time" type="time" value={matchFormData.time} onChange={e => setMatchFormData(p => ({...p, time: e.target.value}))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phase" className="text-right">Fase</Label>
                            <Input id="phase" value={matchFormData.phase} onChange={e => setMatchFormData(p => ({...p, phase: e.target.value}))} className="col-span-3" placeholder="Ej: Fase de Grupos, Final Copa de Oro"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMatchDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveNewMatch} disabled={isSaving}>{isSaving ? "Creando..." : "Crear Partido"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader><DialogTitle>Cargar Resultado</DialogTitle><DialogDescription>Ingresa el marcador final y asigna los goles a los jugadores.</DialogDescription></DialogHeader>
                    {editingMatch && (<>
                        <div className="grid grid-cols-3 items-center justify-center gap-4 text-center">
                            <h3 className="font-bold text-lg text-right">{getTeamName(editingMatch.teamAId)}</h3>
                            <div className="flex items-center gap-2 justify-center">
                                <span className="w-20 h-12 text-2xl text-center font-bold flex items-center justify-center">{teamAScore}</span>
                                <span className="text-2xl font-bold">-</span>
                                <span className="w-20 h-12 text-2xl text-center font-bold flex items-center justify-center">{teamBScore}</span>
                            </div>
                            <h3 className="font-bold text-lg text-left">{getTeamName(editingMatch.teamBId)}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            {/* Team A Scorers */}
                            <div>
                                <h4 className="font-semibold mb-2">Goleadores - {getTeamName(editingMatch.teamAId)}</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {getTeamPlayers(editingMatch.teamAId).map(player => (
                                        <div key={player.id} className="flex items-center justify-between">
                                            <span>{player.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="outline" onClick={() => handleGoalAssignment('A', player.id, -1)} disabled={(teamAGoals[player.id] ?? 0) === 0}>-</Button>
                                                <span className="w-8 text-center font-bold">{teamAGoals[player.id] ?? 0}</span>
                                                <Button size="icon" variant="outline" onClick={() => handleGoalAssignment('A', player.id, 1)}>+</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             {/* Team B Scorers */}
                             <div>
                                <h4 className="font-semibold mb-2">Goleadores - {getTeamName(editingMatch.teamBId)}</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {getTeamPlayers(editingMatch.teamBId).map(player => (
                                        <div key={player.id} className="flex items-center justify-between">
                                            <span>{player.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="outline" onClick={() => handleGoalAssignment('B', player.id, -1)} disabled={(teamBGoals[player.id] ?? 0) === 0}>-</Button>
                                                <span className="w-8 text-center font-bold">{teamBGoals[player.id] ?? 0}</span>
                                                <Button size="icon" variant="outline" onClick={() => handleGoalAssignment('B', player.id, 1)}>+</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4 pt-4">
                            <Label htmlFor="match-phase" className="text-right">Fase</Label>
                            <Input id="match-phase" value={matchPhase} onChange={(e) => setMatchPhase(e.target.value)} className="col-span-3" placeholder="Ej: Final Copa de Oro"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4 pt-2">
                            <Label htmlFor="video-url" className="text-right flex items-center gap-2"><Video className="h-4 w-4"/> URL Video</Label>
                            <Input id="video-url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="col-span-3" placeholder="Pega aquí la URL de la grabación"/>
                        </div>
                    </>)}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveResult} disabled={isSaving}><Save className="mr-2 h-4 w-4"/> {isSaving ? "Guardando..." : "Guardar Resultado Final"}</Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
        </div>
    );
}

    
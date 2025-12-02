
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import type { Tournament, Team, Player, Match } from '@/lib/types';
import { Trophy, Users, Shield, ListOrdered, Flame, ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface MatchCardProps {
    match: Match;
    teamA?: Team;
    teamB?: Team;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, teamA, teamB }) => {
    return (
        <div className="bg-white/5 rounded-lg p-4">
            {match.phase && <p className="text-center text-sm font-semibold mb-3 text-primary">{match.phase}</p>}
            <div className="flex items-center justify-around">
                <div className="flex flex-col items-center gap-2 w-28 text-center">
                    {teamA?.flagUrl ? (
                        <Image src={teamA.flagUrl} alt={`Bandera de ${teamA.name}`} width={60} height={60} className="h-14 w-14 object-contain rounded-full bg-white/10 p-1" />
                    ) : (
                        <div className="h-14 w-14 bg-gray-700 rounded-full flex items-center justify-center"><Shield className="h-8 w-8 text-gray-400" /></div>
                    )}
                    <span className="font-semibold text-sm">{teamA?.name || 'Desconocido'}</span>
                </div>
                
                <div className="text-center mx-2">
                    {match.status === 'finished' ? (
                        <div className="text-3xl font-bold">
                            <span>{match.teamAScore}</span>
                            <span className="mx-2">-</span>
                            <span>{match.teamBScore}</span>
                        </div>
                    ) : (
                        <div className="text-xl font-bold text-muted-foreground">VS</div>
                    )}
                     <div className="text-xs text-muted-foreground mt-1">
                        {new Date(match.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}, {new Date(match.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 w-28 text-center">
                     {teamB?.flagUrl ? (
                        <Image src={teamB.flagUrl} alt={`Bandera de ${teamB.name}`} width={60} height={60} className="h-14 w-14 object-contain rounded-full bg-white/10 p-1" />
                    ) : (
                        <div className="h-14 w-14 bg-gray-700 rounded-full flex items-center justify-center"><Shield className="h-8 w-8 text-gray-400" /></div>
                    )}
                    <span className="font-semibold text-sm">{teamB?.name || 'Desconocido'}</span>
                </div>
            </div>
        </div>
    );
};


export default function TournamentPublicPage() {
  const firestore = useFirestore();
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.tournamentId as string;

  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');

  const tournamentRef = useMemoFirebase(
    () => (tournamentId ? doc(firestore, 'tournaments', tournamentId) : null),
    [firestore, tournamentId]
  );
  const { data: tournament, isLoading: isTournamentLoading } = useDoc<Tournament>(tournamentRef);

  const teamsQuery = useMemoFirebase(
    () =>
      tournamentId
        ? query(collection(firestore, 'tournaments', tournamentId, 'teams'), orderBy('points', 'desc'))
        : null,
    [firestore, tournamentId]
  );
  const { data: teams, isLoading: areTeamsLoading } = useCollection<Team>(teamsQuery);
  
  const allPlayersQuery = useMemoFirebase(
      () => tournamentId ? query(collection(firestore, `tournaments/${tournamentId}/players`)) : null,
      [firestore, tournamentId]
  )
  const {data: allPlayers, isLoading: arePlayersLoading} = useCollection<Player>(allPlayersQuery);

  const allMatchesQuery = useMemoFirebase(
    () => tournamentId ? query(collection(firestore, `tournaments/${tournamentId}/matches`), orderBy('date', 'asc')) : null,
    [firestore, tournamentId]
  )
  const {data: allMatches, isLoading: areMatchesLoading} = useCollection<Match>(allMatchesQuery);

  const sortedTeams = useMemo(() => {
    if (!teams) return [];
    return [...teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const goalDiffB = b.goalsFor - b.goalsAgainst;
      const goalDiffA = a.goalsFor - a.goalsAgainst;
      if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
      return b.goalsFor - a.goalsFor;
    });
  }, [teams]);

  const topScorers = useMemo(() => {
      if (!allPlayers) return [];
      return [...allPlayers]
        .filter(p => p.goals > 0)
        .sort((a,b) => b.goals - a.goals)
        .slice(0, 10);
  }, [allPlayers])

  const getTeam = (teamId: string) => teams?.find(t => t.id === teamId);

  const { phases, stages, filteredMatches } = useMemo(() => {
    if (!allMatches) return { phases: [], stages: [], filteredMatches: [] };
    
    const phaseSet = new Set<string>();
    allMatches.forEach(m => m.phase && phaseSet.add(m.phase));
    const phases = Array.from(phaseSet);

    const filteredByPhase = selectedPhase === 'all' 
        ? allMatches 
        : allMatches.filter(m => m.phase === selectedPhase);

    const stageSet = new Set<string>();
    filteredByPhase.forEach(m => {
        if(m.phase?.toLowerCase().includes('final')) stageSet.add('Final');
        if(m.phase?.toLowerCase().includes('semi')) stageSet.add('Semi Final');
        if(m.phase?.toLowerCase().includes('cuartos')) stageSet.add('Cuartos');
    });
    const stages = Array.from(stageSet);
    
    const filteredMatches = selectedStage === 'all'
        ? filteredByPhase
        : filteredByPhase.filter(m => m.phase?.toLowerCase().includes(selectedStage.toLowerCase()));

    const groupedByPhase = filteredMatches.reduce((acc, match) => {
        const phase = match.phase || 'Sin Fase';
        if (!acc[phase]) {
            acc[phase] = [];
        }
        acc[phase].push(match);
        return acc;
    }, {} as Record<string, Match[]>);

    return { phases, stages, filteredMatches: groupedByPhase };
  }, [allMatches, selectedPhase, selectedStage]);

  const isLoading = isTournamentLoading || areTeamsLoading || arePlayersLoading || areMatchesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground">Cargando datos del torneo...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-destructive">Torneo no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#538442]">
        <header className="p-4 flex items-center gap-4 text-white">
            <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
            <div>
                <h1 className="text-xl font-bold">{tournament.name}</h1>
                <p className="text-sm opacity-80">2° Torneo Femenino</p>
            </div>
        </header>

        <main className="flex-1 bg-background rounded-t-2xl p-4 space-y-4">
            <Tabs defaultValue="final-phases" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="final-phases"><Shield className="mr-2 h-4 w-4" />Fases</TabsTrigger>
                <TabsTrigger value="positions"><ListOrdered className="mr-2 h-4 w-4" />Posiciones</TabsTrigger>
                <TabsTrigger value="teams"><Users className="mr-2 h-4 w-4" />Equipos</TabsTrigger>
                <TabsTrigger value="scorers"><Flame className="mr-2 h-4 w-4" />Goleadores</TabsTrigger>
            </TabsList>
            
            <TabsContent value="positions">
                <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader><CardTitle>Tabla de Posiciones</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader><TableRow><TableHead className="w-[50px]">#</TableHead><TableHead>Equipo</TableHead><TableHead className="text-center">Pts</TableHead><TableHead className="text-center">PJ</TableHead><TableHead className="text-center">DG</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {sortedTeams.map((team, index) => (
                        <TableRow key={team.id}><TableCell className="font-bold">{index + 1}</TableCell><TableCell>{team.name}</TableCell><TableCell className="text-center font-bold">{team.points}</TableCell><TableCell className="text-center">{team.played}</TableCell><TableCell className="text-center">{team.goalsFor - team.goalsAgainst}</TableCell></TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="teams">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams?.map(team => (
                        <Card key={team.id} className="bg-card/80 backdrop-blur-sm">
                            <CardHeader><CardTitle>{team.name}</CardTitle>{team.coach && <CardDescription>D.T: {team.coach}</CardDescription>}</CardHeader>
                            <CardContent><h4 className="font-semibold mb-2">Jugadores:</h4>{allPlayers && allPlayers.filter(p => p.teamId === team.id).length > 0 ? (<ul className="list-disc pl-5 text-sm space-y-1">{allPlayers.filter(p => p.teamId === team.id).map(player => <li key={player.id}>{player.name}</li>)}</ul>): (<p className="text-xs text-muted-foreground">No hay jugadores cargados.</p>)}</CardContent>
                        </Card>
                    ))}
                </div>
            </TabsContent>
            
            <TabsContent value="scorers">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader><CardTitle>Tabla de Goleadores</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Jugador</TableHead><TableHead>Equipo</TableHead><TableHead className="text-right">Goles</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {topScorers.map(player => (
                                <TableRow key={player.id}><TableCell>{player.name}</TableCell><TableCell>{getTeam(player.teamId)?.name || 'N/A'}</TableCell><TableCell className="text-right font-bold">{player.goals}</TableCell></TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="final-phases">
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Seleccionar Fase" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Fases</SelectItem>
                                {phases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                            {stages.map(s => (
                                <Button key={s} size="sm" variant={selectedStage === s ? 'default' : 'ghost'} onClick={() => setSelectedStage(s)}>{s}</Button>
                            ))}
                            {selectedStage !== 'all' && <Button size="sm" variant="ghost" onClick={() => setSelectedStage('all')}>Todas</Button>}
                        </div>
                    </div>
                
                    <div className="space-y-6">
                        {Object.keys(filteredMatches).map(phaseName => (
                            <div key={phaseName}>
                                <h3 className="text-lg font-bold text-center mb-2 text-muted-foreground relative">
                                    <span className="z-10 relative px-2 bg-background">{phaseName}</span>
                                    <div className="absolute left-0 top-1/2 w-full h-px border-b border-dashed border-gray-600"></div>
                                </h3>
                                <div className="space-y-4">
                                {filteredMatches[phaseName].map(match => (
                                    <MatchCard key={match.id} match={match} teamA={getTeam(match.teamAId)} teamB={getTeam(match.teamBId)} />
                                ))}
                                </div>
                            </div>
                        ))}
                         {Object.keys(filteredMatches).length === 0 && <p className="text-center text-muted-foreground py-8">No hay partidos para la selección actual.</p>}
                    </div>
                </div>
            </TabsContent>

            </Tabs>
        </main>
    </div>
  );
}

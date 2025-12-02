
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
import { Trophy, Users, Shield, ListOrdered, Flame } from 'lucide-react';
import { useMemo } from 'react';

export default function TournamentPublicPage() {
  const firestore = useFirestore();
  const params = useParams();
  const tournamentId = params.tournamentId as string;

  const tournamentRef = useMemoFirebase(
    () => (tournamentId ? doc(firestore, 'tournaments', tournamentId) : null),
    [firestore, tournamentId]
  );
  const { data: tournament, isLoading: isTournamentLoading } =
    useDoc<Tournament>(tournamentRef);

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
    // The query now handles sorting by points, but we add secondary sorting criteria here.
    return [...teams].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      const goalDiffB = b.goalsFor - b.goalsAgainst;
      const goalDiffA = a.goalsFor - a.goalsAgainst;
      if (goalDiffB !== goalDiffA) {
        return goalDiffB - goalDiffA;
      }
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

  const getTeamName = (teamId: string) => {
      return teams?.find(t => t.id === teamId)?.name || 'Desconocido';
  }


  const isLoading =
    isTournamentLoading || areTeamsLoading || arePlayersLoading || areMatchesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Cargando datos del torneo...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-destructive">Torneo no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
      <Card className="bg-card/80 backdrop-blur-sm w-full max-w-6xl">
        <CardHeader className="text-center">
          <div className="inline-block bg-primary/20 text-primary p-4 rounded-full mb-4 mx-auto w-fit">
            <Trophy className="h-12 w-12" />
          </div>
          <CardTitle className="text-4xl">{tournament.name}</CardTitle>
          <CardDescription>
            Sigue toda la acción, resultados y estadísticas del torneo.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="w-full max-w-6xl">
        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="positions">
              <ListOrdered className="mr-2 h-4 w-4" />
              Posiciones
            </TabsTrigger>
            <TabsTrigger value="teams">
              <Users className="mr-2 h-4 w-4" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="scorers">
              <Flame className="mr-2 h-4 w-4" />
              Goleadores
            </TabsTrigger>
            <TabsTrigger value="fixtures">
              <Shield className="mr-2 h-4 w-4" />
              Partidos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="positions">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Tabla de Posiciones</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead className="text-center">Pts</TableHead>
                      <TableHead className="text-center">PJ</TableHead>
                      <TableHead className="text-center">G</TableHead>
                      <TableHead className="text-center">E</TableHead>
                      <TableHead className="text-center">P</TableHead>
                      <TableHead className="text-center">GF</TableHead>
                      <TableHead className="text-center">GC</TableHead>
                      <TableHead className="text-center">DG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTeams.map((team, index) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-bold">{index + 1}</TableCell>
                        <TableCell>{team.name}</TableCell>
                        <TableCell className="text-center font-bold">{team.points}</TableCell>
                        <TableCell className="text-center">{team.played}</TableCell>
                        <TableCell className="text-center">{team.won}</TableCell>
                        <TableCell className="text-center">{team.drawn}</TableCell>
                        <TableCell className="text-center">{team.lost}</TableCell>
                        <TableCell className="text-center">{team.goalsFor}</TableCell>
                        <TableCell className="text-center">{team.goalsAgainst}</TableCell>
                        <TableCell className="text-center">{team.goalsFor - team.goalsAgainst}</TableCell>
                      </TableRow>
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
                        <CardHeader>
                            <CardTitle>{team.name}</CardTitle>
                            {team.coach && <CardDescription>D.T: {team.coach}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                            <h4 className="font-semibold mb-2">Jugadores:</h4>
                            {allPlayers && allPlayers.filter(p => p.teamId === team.id).length > 0 ? (
                                <ul className="list-disc pl-5 text-sm space-y-1">
                                    {allPlayers.filter(p => p.teamId === team.id).map(player => <li key={player.id}>{player.name}</li>)}
                                </ul>
                            ): (
                                <p className="text-xs text-muted-foreground">No hay jugadores cargados.</p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
          </TabsContent>
          
          <TabsContent value="scorers">
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Tabla de Goleadores</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Jugador</TableHead>
                                <TableHead>Equipo</TableHead>
                                <TableHead className="text-right">Goles</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {topScorers.map(player => (
                               <TableRow key={player.id}>
                                   <TableCell>{player.name}</TableCell>
                                   <TableCell>{getTeamName(player.teamId)}</TableCell>
                                   <TableCell className="text-right font-bold">{player.goals}</TableCell>
                               </TableRow>
                           ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fixtures">
             <Card className="bg-card/80 backdrop-blur-sm">
                 <CardHeader>
                     <CardTitle>Partidos</CardTitle>
                 </CardHeader>
                 <CardContent>
                    {allMatches && allMatches.length > 0 ? (
                        <div className="space-y-4">
                            {allMatches.map(match => (
                                <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <span className="text-right flex-1">{getTeamName(match.teamAId)}</span>
                                    <div className="text-center mx-4">
                                        <div className="font-bold text-lg">
                                            {match.status === 'finished' ? `${match.teamAScore} - ${match.teamBScore}` : 'VS'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                           {new Date(match.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}, {new Date(match.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <span className="text-left flex-1">{getTeamName(match.teamBId)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No hay partidos programados todavía.</p>
                    )}
                 </CardContent>
             </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

    
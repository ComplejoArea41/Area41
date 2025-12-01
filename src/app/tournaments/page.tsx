
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
import { Trophy, ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tournament } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TournamentsPage() {
  const firestore = useFirestore();
  const tournamentsCollectionRef = useMemoFirebase(() => collection(firestore, 'tournaments'), [firestore]);
  const { data: tournaments, isLoading } = useCollection<Tournament>(tournamentsCollectionRef);
  
  if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center dark bg-background">
            <p className="text-primary-foreground">Cargando torneos...</p>
        </div>
      )
  }

  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-4xl">
            <div className="text-center mb-12">
                <div className="inline-block bg-primary/20 text-primary p-4 rounded-full mb-4">
                    <Trophy className="h-12 w-12" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                    ¡La Gloria te Espera!
                </h1>
                <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                    Explora nuestros torneos, inscríbete y compite por el campeonato.
                </p>
            </div>

            <div className="space-y-6">
                {tournaments && tournaments.length > 0 ? (
                    tournaments.map(tournament => (
                        <Card key={tournament.id} className="bg-card/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>{tournament.name}</CardTitle>
                                <CardDescription>
                                    Del {format(new Date(tournament.startDate), "d 'de' LLLL", { locale: es })} al {format(new Date(tournament.endDate), "d 'de' LLLL 'de' yyyy", { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{tournament.teamIds?.length || 0} equipos inscritos. ¡Aún hay lugares!</p>
                            </CardContent>
                            <CardFooter>
                                <Button disabled>
                                    Ver Detalles y Equipos <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-16 bg-card/60 rounded-lg">
                        <h2 className="text-2xl font-bold">No Hay Torneos Activos</h2>
                        <p className="text-muted-foreground mt-2">
                           Pronto anunciaremos nuevos torneos. ¡Mantente atento!
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
  );
}

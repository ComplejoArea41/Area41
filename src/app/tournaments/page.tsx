import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shirt, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TournamentsPage() {
    const router = useRouter();

  return (
      <div className="flex min-h-[80vh] flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-lg max-w-2xl">
              <div className="inline-block bg-primary/20 text-primary p-4 rounded-full">
                  <Trophy className="h-16 w-16" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                  ¡La Gloria te Espera!
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                  Estamos calentando los motores para los próximos torneos de fútbol en Area41. Prepara a tu equipo, la competencia será legendaria y los premios increíbles. ¡Muy pronto más detalles sobre inscripciones y fechas!
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Button onClick={() => router.push('/')}>Volver al Inicio</Button>
                  <Button variant="ghost">Contactar Soporte <span aria-hidden="true">&rarr;</span></Button>
              </div>
          </div>
      </div>
  );
}

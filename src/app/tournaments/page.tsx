import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shirt } from "lucide-react";
import LayoutWrapper from "@/components/layout-wrapper";

export default function TournamentsPage() {
  return (
    <LayoutWrapper>
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
          <div className="text-center bg-card/80 backdrop-blur-sm p-8 rounded-lg">
              <div className="inline-block bg-muted p-4 rounded-lg">
                  <Shirt className="h-16 w-16 text-muted-foreground" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Torneos Próximamente
              </h1>
              <p className="mt-6 text-base leading-7 text-muted-foreground">
                  ¡Estamos preparando todo para los próximos torneos! Vuelve pronto para más información.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Button>Volver al Inicio</Button>
                  <Button variant="ghost">Contactar Soporte <span aria-hidden="true">&rarr;</span></Button>
              </div>
          </div>
      </main>
    </LayoutWrapper>
  );
}

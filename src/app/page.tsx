import {
  Activity,
  ArrowUpRight,
  CalendarCheck,
  CreditCard,
  Shirt,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { upcomingReservations, recentMembers } from "@/lib/data";
import { placeholderImages } from "@/lib/placeholder-images.json";

export default function Dashboard() {

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Reservas
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+1,234</div>
              <p className="text-xs text-muted-foreground">
                +15.2% desde el último mes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Miembros Activos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+789</div>
              <p className="text-xs text-muted-foreground">
                +12.1% desde el último mes
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas del Buffet</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">$4,523.00</div>
                <p className="text-xs text-muted-foreground">
                    +25% que la semana pasada
                </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximos Torneos</CardTitle>
              <Shirt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">
                Torneos de verano por comenzar
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle>Próximas Reservas</CardTitle>
                <CardDescription>
                  Estas son las próximas reservas de canchas.
                </CardDescription>
              </div>
              <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/reservations">
                  Ver Todas
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Cancha</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingReservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div className="font-medium">{res.customerName}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          {res.customerEmail}
                        </div>
                      </TableCell>
                      <TableCell>{res.courtName}</TableCell>
                      <TableCell>
                        {res.date}
                      </TableCell>
                      <TableCell className="text-right">{res.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Nuevos Miembros</CardTitle>
              <CardDescription>
                Miembros que se unieron recientemente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8">
              {recentMembers.map((member) => {
                 const memberImage = placeholderImages.find(p => p.id === member.avatarId);
                 return (
                    <div key={member.id} className="flex items-center gap-4">
                        <Avatar className="hidden h-9 w-9 sm:flex">
                          {memberImage && (
                            <AvatarImage 
                              src={memberImage.imageUrl} 
                              alt={member.name} 
                              data-ai-hint={memberImage.imageHint}
                              width={36}
                              height={36}
                            />
                          )}
                          <AvatarFallback>{member.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-1">
                          <p className="text-sm font-medium leading-none">
                            {member.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                    </div>
                 );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

    
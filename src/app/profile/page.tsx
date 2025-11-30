import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { user, upcomingReservations } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { placeholderImages } from "@/lib/placeholder-images.json";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProfilePage() {
  const userAvatar = placeholderImages.find((p) => p.id === "user-avatar");
  const userFullName = `${user.firstName} ${user.lastName}`;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="flex flex-col items-center gap-4 text-center">
              {userAvatar && (
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={userAvatar.imageUrl}
                    alt={userFullName}
                    data-ai-hint={userAvatar.imageHint}
                    width={96}
                    height={96}
                  />
                  <AvatarFallback>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div className="grid gap-1">
                <CardTitle className="text-2xl">{userFullName}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
                <form className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="firstName">Nombre</Label>
                        <Input id="firstName" defaultValue={user.firstName} />
                    </div>
                     <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input id="lastName" defaultValue={user.lastName} />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" defaultValue={user.phoneNumber} />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" defaultValue={user.email} disabled />
                    </div>
                </form>
            </CardContent>
            <CardFooter>
                 <Button className="w-full">Guardar Cambios</Button>
            </CardFooter>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Mis Reservas</CardTitle>
              <CardDescription>
                Un historial de tus reservas recientes y futuras.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cancha</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingReservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">
                        {res.courtName}
                      </TableCell>
                      <TableCell>{res.date}</TableCell>
                      <TableCell>{res.time}</TableCell>
                      <TableCell className="text-right text-green-600">
                        Próxima
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">
                      Fútbol 5 - Cancha 3
                    </TableCell>
                    <TableCell>10 de Agosto, 2024</TableCell>
                    <TableCell>21:00</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      Completada
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

    
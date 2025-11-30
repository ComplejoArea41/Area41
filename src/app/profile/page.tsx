'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images.json';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userRef = useMemo(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading } = useDoc(userRef);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
    }
  }, [userProfile]);

  const handleSaveChanges = () => {
    if (userRef) {
      setDoc(
        userRef,
        {
          firstName,
          lastName,
          phoneNumber,
        },
        { merge: true }
      ).then(() => {
        toast({
            title: "¡Éxito!",
            description: "Tu perfil ha sido actualizado.",
        })
      }).catch((error) => {
        console.error("Error updating profile: ", error);
         toast({
            title: "Error",
            description: "No se pudo actualizar tu perfil.",
            variant: "destructive"
        })
      });
    }
  };

  const userAvatar = placeholderImages.find((p) => p.id === 'user-avatar');
  const userFullName = `${firstName} ${lastName}`;

  if (isLoading || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Cargando perfil...</p>
      </div>
    );
  }

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
                  <AvatarFallback>
                    {firstName.charAt(0)}
                    {lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="grid gap-1">
                <CardTitle className="text-2xl">{userFullName}</CardTitle>
                <CardDescription>{userProfile.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={userProfile.email} disabled />
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleSaveChanges}>Guardar Cambios</Button>
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
                  {/* Reservation data will be dynamic */}
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No hay reservas todavía.</TableCell>
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

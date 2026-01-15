
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useDoc, useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMemoFirebase } from '@/firebase/provider';
import { useRouter } from 'next/navigation';


export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc(userRef);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!isUserLoading && !user) {
        router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSaveChanges = () => {
    if (!userRef || !user) return;
    
    if (isSaving) return;

    setIsSaving(true);
      
    const updatedProfileData = {
      firstName,
      lastName,
      phoneNumber,
      email: user.email,
      isAdmin: userProfile?.isAdmin || false
    };

    try {
        setDocumentNonBlocking(userRef, updatedProfileData, { merge: true });
        toast({
          title: '¡Perfil actualizado!',
          description: 'Tus cambios han sido guardados.',
        });
        setIsSaving(false);

    } catch (error) {
        setIsSaving(false);
    }
  };


  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');
  const userFullName = `${firstName} ${lastName}`;


  if (isUserLoading || (isProfileLoading && !profileError)) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Cargando perfil...</p>
      </div>
    );
  }

  if(!user) {
    return (
        <div className="flex min-h-screen items-center justify-center dark bg-background">
            <p className="text-primary-foreground">Por favor, inicia sesión para ver tu perfil.</p>
        </div>
    )
  }

  return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-lg">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-col items-center gap-4 text-center">
                {userAvatar && (
                  <Avatar className="h-24 w-24 border-2 border-primary">
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
                  <CardTitle className="text-2xl">{userFullName.trim() || 'Completa tu Perfil'}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
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
                      placeholder="Tu nombre"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Tu apellido"
                       disabled={isSaving}
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Tu número de teléfono"
                       disabled={isSaving}
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email!} disabled />
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </CardFooter>
            </Card>
          </div>
      </div>
  );
}

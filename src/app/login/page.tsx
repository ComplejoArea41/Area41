
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
import { useAuth, useUser, useFirestore } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'signup') {
        setIsSigningUp(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading && user) {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const destination = params?.get('redirect') || '/reservations';
      router.push(destination);
    }
  }, [user, isUserLoading, router]);

  const handleAuthAction = async () => {
    if (isSigningUp && (!firstName || !lastName || !phoneNumber)) {
        toast({
            variant: "destructive",
            title: "Campos incompletos",
            description: "Por favor, completa tu nombre, apellido y teléfono para registrarte.",
        });
        return;
    }

    setIsLoading(true);
    try {
      if (isSigningUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // Now create the user profile in Firestore
        const userProfileData = {
          firstName,
          lastName,
          phoneNumber,
          email: newUser.email,
          isAdmin: false, // Default to not admin
        };
        const userDocRef = doc(firestore, 'users', newUser.uid);
        await setDoc(userDocRef, userProfileData);

        toast({ title: "Registro exitoso", description: "¡Bienvenido! Serás redirigido a las reservas." });

      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Inicio de sesión exitoso" });
      }
      
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const destination = params?.get('redirect') || '/reservations';
      router.push(destination);
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: error.message || "No se pudo iniciar sesión o registrarse.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background dark p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Bienvenidos a Area 41
          </CardTitle>
          <CardDescription>
            {isSigningUp
              ? 'Completa tus datos para registrarte.'
              : 'Ingresa para continuar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isSigningUp && (
            <>
               <div className="grid gap-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Tu nombre"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Tu apellido"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Teléfono</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Tu número de teléfono"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleAuthAction} disabled={isLoading}>
            {isLoading ? 'Cargando...' : (isSigningUp ? 'Registrarse' : 'Ingresar')}
          </Button>
          <Button
            variant="link"
            className="w-full"
            onClick={() => setIsSigningUp(!isSigningUp)}
            disabled={isLoading}
          >
            {isSigningUp
              ? '¿Ya tienes una cuenta? Inicia sesión'
              : '¿No tienes una cuenta? Regístrate'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

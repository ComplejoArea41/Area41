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
import { useAuth, useUser } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';


export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleAuthAction = async () => {
    setIsLoading(true);
    try {
      if (isSigningUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "Registro exitoso", description: "¡Bienvenido! Serás redirigido." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Inicio de sesión exitoso" });
      }
      // The admin assignment logic is now handled in the profile page for robustness.
      // After login, the user will be redirected to the home page, 
      // and they can complete their profile to get admin rights if applicable.
      router.push('/');
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
              ? 'Ingresa tu email y contraseña para registrarte.'
              : 'Ingresa para continuar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
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

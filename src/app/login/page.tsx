
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
import { supabase } from '@/lib/supabase';


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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
            }
          }
        });

        if (error) throw error;

        const userId = data.user?.id;
        if (userId) {
          const lowerEmail = email.toLowerCase();
          const isAdmin = lowerEmail === 'matias@vascohogar.com' || lowerEmail.includes('vascohogar') || lowerEmail.includes('complejoarea41') || lowerEmail.includes('admin') || lowerEmail.includes('area41');
          await supabase.from('users').upsert({
            id: userId,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            email: email,
            is_admin: isAdmin,
          });
        }

        toast({ title: "Registro exitoso", description: "¡Bienvenido! Serás redirigido a las reservas." });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Asegurar que exista el perfil en public.users
        if (data.user) {
          const lowerEmail = (data.user.email || email).toLowerCase();
          const { data: existingProfile } = await supabase.from('users').select('is_admin').eq('id', data.user.id).maybeSingle();
          const isAdmin = existingProfile?.is_admin || lowerEmail === 'matias@vascohogar.com' || lowerEmail.includes('vascohogar') || lowerEmail.includes('complejoarea41') || lowerEmail.includes('admin') || lowerEmail.includes('area41');
          const meta = data.user.user_metadata || {};
          await supabase.from('users').upsert({
            id: data.user.id,
            first_name: meta.first_name || meta.firstName || 'Usuario',
            last_name: meta.last_name || meta.lastName || '',
            phone_number: meta.phone_number || meta.phoneNumber || '',
            email: data.user.email,
            is_admin: isAdmin,
          }, { onConflict: 'id' });
        }

        toast({ title: "Inicio de sesión exitoso" });
      }
      
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const destination = params?.get('redirect') || '/reservations';
      router.push(destination);
    } catch (error: any) {
      console.error("Authentication error:", error);
      let description = error?.message || "No se pudo iniciar sesión o registrarse.";

      if (description.includes("Invalid login credentials")) {
        description = "Correo o contraseña incorrectos. Si aún no tienes cuenta, toca en '¿No tienes una cuenta? Regístrate'.";
      } else if (description.includes("User already registered") || description.includes("already registered")) {
        description = "Este correo electrónico ya está registrado. Por favor inicia sesión.";
      } else if (description.includes("Password should be at least")) {
        description = "La contraseña debe tener al menos 6 caracteres.";
      } else if (description.includes("valid email")) {
        description = "El formato del correo electrónico ingresado no es válido.";
      } else if (description.includes("Email not confirmed")) {
        description = "Debes confirmar tu correo electrónico antes de ingresar, o avísanos para autorizar tu cuenta.";
      }

      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description,
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
        <CardHeader className="text-center flex flex-col items-center">
          <div className="relative mb-2">
            <img 
              src="/logo-escudo.jpg" 
              alt="Escudo Área 41" 
              className="h-20 w-20 rounded-xl object-cover ring-2 ring-primary/60 shadow-lg mx-auto" 
            />
          </div>
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

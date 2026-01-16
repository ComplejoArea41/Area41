
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Reservation, User, Court } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// New combined type
type FullReservation = Reservation & {
    user: User | null;
    courtDetails: { name: string, type: string }[];
};

export default function AdminReservationsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

    const reservationsRef = useMemoFirebase(() => collection(firestore, 'reservations'), [firestore]);
    const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsRef);

    const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersRef);

    const courtsRef = useMemoFirebase(() => collection(firestore, 'courts'), [firestore]);
    const { data: courts, isLoading: areCourtsLoading } = useCollection<Court>(courtsRef);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const fullReservations = useMemo(() => {
        if (!reservations || !users || !courts) return [];

        const usersMap = new Map(users.map(u => [u.id, u]));
        const courtsMap = new Map(courts.map(c => [c.id, c]));

        return reservations
            .map((res): FullReservation => {
                const courtDetails = res.courtIds
                    .map(id => courtsMap.get(id))
                    .filter((c): c is Court => !!c)
                    // We only want to show the main court, not the sub-courts for F7
                    .filter(c => {
                        if (c.courtType === 'Futbol 5') {
                            // if it's a F5 court, check if any of the other reserved courts is a F7 that contains it.
                            const parentF7 = res.courtIds.map(id => courtsMap.get(id)).find(otherCourt => otherCourt?.courtType === 'Futbol 7');
                            return !parentF7;
                        }
                        return true;
                    })
                    .map(c => ({ name: `Cancha ${c.courtNumber}`, type: c.courtType }));
                
                return {
                    ...res,
                    user: usersMap.get(res.userId) || null,
                    courtDetails
                };
            })
            .sort((a, b) => {
                const dateA = (a.reservationDateTime as any)?.toDate() || 0;
                const dateB = (b.reservationDateTime as any)?.toDate() || 0;
                return dateB - dateA; // Sort descending
            });
    }, [reservations, users, courts]);

    const filteredReservations = useMemo(() => {
        if (!searchTerm) return fullReservations;
        return fullReservations.filter(res => {
            const userName = `${res.user?.firstName || ''} ${res.user?.lastName || ''}`.toLowerCase();
            const userPhone = res.user?.phoneNumber || '';
            const search = searchTerm.toLowerCase();
            return userName.includes(search) || userPhone.includes(search);
        });
    }, [fullReservations, searchTerm]);

    const isLoading = isUserLoading || isProfileLoading || areReservationsLoading || areUsersLoading || areCourtsLoading;

    if (isLoading || (user && !userProfile)) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
                <p className="text-primary-foreground">Cargando reservas...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-7xl">
                <CardHeader>
                    <CardTitle>Historial de Reservas</CardTitle>
                    <CardDescription>
                        Un registro de todas las reservas hechas en el complejo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Input
                            placeholder="Buscar por nombre o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cancha</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Horario</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Apellido</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredReservations.length > 0 ? (
                                    filteredReservations.map((res) => (
                                        <TableRow key={res.id}>
                                            <TableCell>{res.courtDetails.map(c => `${c.type} - ${c.name}`).join(', ')}</TableCell>
                                            <TableCell>
                                                {res.reservationDateTime ? format((res.reservationDateTime as any).toDate(), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {res.reservationDateTime ? format((res.reservationDateTime as any).toDate(), 'HH:mm', { locale: es }) : 'N/A'}
                                            </TableCell>
                                            <TableCell>{res.user?.firstName || 'N/A'}</TableCell>
                                            <TableCell>{res.user?.lastName || 'N/A'}</TableCell>
                                            <TableCell>{res.user?.phoneNumber || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">
                                            {isLoading ? 'Cargando...' : 'No se encontraron reservas.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

import type { User, Court, Reservation, MenuItem, Tournament, Team, RecentMember } from './types';

// Los datos de las canchas ahora se gestionan directamente en Firestore
// y se pueblan inicialmente desde la página de administración si la colección está vacía.

export const user: User = {
  id: "user-1",
  firstName: "Juan",
  lastName: "Perez",
  phoneNumber: "1122334455",
  email: "juan.perez@example.com",
};

export const upcomingReservations: (Reservation & { customerName: string; customerEmail: string; courtName: string })[] = [
    { id: "res1", userId: "user-2", courtIds: ["c1"], reservationDateTime: "2024-08-15T19:00:00Z", durationMinutes: 60, customerName: "Carlos Gomez", customerEmail: "carlos.g@example.com", courtName: "Fútbol 5 - Cancha 1", date: "15 de Agosto, 2024", time: "19:00" },
    { id: "res2", userId: "user-3", courtIds: ["c5"], reservationDateTime: "2024-08-15T20:00:00Z", durationMinutes: 60, customerName: "Laura Nuñez", customerEmail: "laura.n@example.com", courtName: "Fútbol 7 - Cancha 1", date: "15 de Agosto, 2024", time: "20:00" },
    { id: "res3", userId: "user-4", courtIds: ["c2"], reservationDateTime: "2024-08-16T18:00:00Z", durationMinutes: 90, customerName: "Pedro Pascal", customerEmail: "pedro.p@example.com", courtName: "Fútbol 5 - Cancha 2", date: "16 de Agosto, 2024", time: "18:00" },
];

// Los datos del menú ahora se gestionan en Firestore y se pueblan desde la página de admin/buffet.

export const recentMembers: RecentMember[] = [
    { id: "user-5", name: "Maria Garcia", email: "maria.g@example.com", avatarId: "staff-1" },
    { id: "user-6", name: "Roberto Diaz", email: "roberto.d@example.com", avatarId: "staff-2" },
    { id: "user-7", name: "Ana Martinez", email: "ana.m@example.com", avatarId: "staff-3" },
]

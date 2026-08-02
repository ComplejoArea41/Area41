
import type { User, Court, Reservation, MenuItem, RecentMember } from './types';

// Datos de ejemplo para desarrollo (los datos reales vienen de Firestore)
export const user: User = {
  id: "user-1",
  firstName: "Juan",
  lastName: "Perez",
  phoneNumber: "1122334455",
  email: "juan.perez@example.com",
};

export const upcomingReservations: (Reservation & { customerName: string; customerEmail: string; courtName: string })[] = [];

export const recentMembers: RecentMember[] = [
    { id: "user-5", name: "Maria Garcia", email: "maria.g@example.com", avatarId: "staff-1" },
    { id: "user-6", name: "Roberto Diaz", email: "roberto.d@example.com", avatarId: "staff-2" },
    { id: "user-7", name: "Ana Martinez", email: "ana.m@example.com", avatarId: "staff-3" },
];

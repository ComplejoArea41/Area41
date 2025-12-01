
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

export interface Court {
  id: string;
  courtType: 'Futbol 5' | 'Futbol 7';
  courtNumber: number;
  isAvailable: boolean;
  price: number;
}

export interface Reservation {
  id: string;
  userId: string;
  courtIds: string[];
  reservationDateTime: string; // ISO 8601 format
  durationMinutes: number;
  // For display purposes, will be constructed
  date?: string;
  time?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'Bebida' | 'Comida';
  imageUrl: string;
}

export interface Tournament {
  id: string;
  name: string;
  startDate: string; // ISO 8601 format
  endDate: string;   // ISO 8601 format
  teamIds: string[];
}

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
}

export interface RecentMember {
    id: string;
    name: string;
    email: string;
    avatarId: string;
}

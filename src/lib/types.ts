

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  isAdmin?: boolean;
}

export interface Court {
  id: string;
  courtType: 'Futbol 5' | 'Futbol 7';
  courtNumber: number;
  isAvailable: boolean;
  price: number; // Price per hour
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

export interface RecentMember {
    id: string;
    name: string;
    email: string;
    avatarId: string;
}


export interface BackgroundImage {
  id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
  storagePath?: string;
}

export interface LogoImage {
  id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
  storagePath?: string;
}

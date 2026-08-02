
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  isAdmin?: boolean;
  cancellationCount?: number;
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
  reservationDateTime: any; // Se usa any para admitir Timestamp de Firebase y evitar errores de compilación
  durationMinutes: number;
  date?: string;
  time?: string;
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

export interface FixedReservation {
  id: string;
  clientName: string;
  phoneNumber?: string;
  courtId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  time: string; // "HH:mm"
  isActive: boolean;
}

export interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
}

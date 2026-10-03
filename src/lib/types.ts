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
  price: number;
}

export interface Reservation {
  id: string;
  userId: string;
  customerName?: string;
  customerPhone?: string;
  courtIds: string[];
  reservationDateTime: any; 
  durationMinutes: number;
  date?: string;
  time?: string;
}

export interface BackgroundImage {
  id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
  storagePath?: string | null;
}

export interface LogoImage {
  id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
  storagePath?: string | null;
}

export interface FixedReservation {
  id: string;
  clientName: string;
  phoneNumber?: string;
  courtId: string;
  dayOfWeek: number;
  time: string;
  isActive: boolean;
}

export interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'Comida' | 'Bebida';
  imageUrl?: string;
}

export interface RecentMember {
  id: string;
  name: string;
  email: string;
  avatarId: string;
}

export interface CourtCamera {
  id: string;
  courtId: string;
  courtName: string;
  streamUrl: string;
  streamType?: 'hls' | 'youtube' | 'mp4';
  isLive: boolean;
  currentMatchTitle?: string;
  description?: string;
  updatedAt?: any;
}

export interface RecordedMatch {
  id: string;
  fileName?: string;
  courtId: string;
  courtName: string;
  cameraId?: string; // 'cam-1' | 'cam-2'
  cameraName?: string; // 'Cámara 1' | 'Cámara 2'
  date: string;
  time: string;
  startHour?: number;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
  downloadUrl?: string;
  reservationId?: string;
  createdAt?: any;
}

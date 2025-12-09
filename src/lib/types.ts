

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
}

export interface Team {
  id: string;
  name: string;
  tournamentId: string;
  coach?: string; // Director Técnico
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  flagUrl?: string;
}

export interface Player {
    id: string;
    name: string;
    teamId: string;
    tournamentId: string;
    goals: number;
    yellowCards: number;
    redCards: number;
}

export interface Match {
    id: string;
    tournamentId: string;
    teamAId: string;
    teamBId: string;
    teamAScore: number | null;
    teamBScore: number | null;
    date: string; // ISO 8601 format
    status: 'pending' | 'finished';
    phase?: string; // e.g., "Final Copa de Oro", "Semi Final"
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
}

    
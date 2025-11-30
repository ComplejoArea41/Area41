export interface User {
  name: string;
  email: string;
  avatarUrl: string;
  preferences: string;
}

export interface Activity {
  id: string;
  name: string;
  type: "Class" | "Facility";
  instructor: string;
  instructorAvatar?: string;
  location: string;
  time: string;
  day: string;
  availability: "Available" | "Full" | "Limited";
}

export interface Reservation {
  id: string;
  activityName: string;
  type: "Class" | "Court Booking";
  location: string;
  date: string;
  time: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatarId: string;
}

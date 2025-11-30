import type { User, Activity, Reservation, Staff } from './types';

export const user: User = {
  name: "Alex Doe",
  email: "alex.doe@example.com",
  avatarUrl: "/avatars/01.png",
  preferences: "I enjoy high-energy cardio workouts in the morning and team sports like basketball. I'm also interested in learning yoga for flexibility.",
};

export const activities: Activity[] = [
  { id: "act1", name: "Morning Yoga", type: "Class", instructor: "Emily White", instructorAvatar: "staff-3", location: "Studio A", day: "Monday", time: "8:00 AM", availability: "Available" },
  { id: "act2", name: "Advanced Tennis Clinic", type: "Class", instructor: "John Smith", instructorAvatar: "staff-2", location: "Court 1", day: "Monday", time: "10:00 AM", availability: "Limited" },
  { id: "act3", name: "HIIT Fusion", type: "Class", instructor: "Sarah Green", instructorAvatar: "staff-5", location: "Fitness Zone", day: "Tuesday", time: "9:00 AM", availability: "Available" },
  { id: "act4", name: "Lap Swimming", type: "Facility", instructor: "N/A", location: "Main Pool", day: "Tuesday", time: "11:00 AM - 1:00 PM", availability: "Available" },
  { id: "act5", name: "Basketball Court", type: "Facility", instructor: "N/A", location: "Indoor Arena", day: "Wednesday", time: "All Day", availability: "Limited" },
  { id: "act6", name: "Zumba Dance Party", type: "Class", instructor: "Maria Rodriguez", location: "Studio B", day: "Wednesday", time: "6:00 PM", availability: "Full" },
  { id: "act7", name: "Beginner Swim Lessons", type: "Class", instructor: "Michael Brown", instructorAvatar: "staff-4", location: "Lesson Pool", day: "Thursday", time: "4:00 PM", availability: "Available" },
  { id: "act8", name: "Open Gym", type: "Facility", instructor: "N/A", location: "Fitness Zone", day: "Friday", time: "All Day", availability: "Available" },
];

export const upcomingReservations: Reservation[] = [
    { id: "res1", activityName: "Advanced Tennis Clinic", type: "Class", location: "Court 1", date: "June 24, 2024", time: "10:00 AM" },
    { id: "res2", activityName: "Basketball Court", type: "Court Booking", location: "Indoor Arena", date: "June 25, 2024", time: "5:00 PM" },
    { id: "res3", activityName: "Morning Yoga", type: "Class", location: "Studio A", date: "June 26, 2024", time: "8:00 AM" },
];

export const todaysClasses: Pick<Activity, 'id' | 'name' | 'instructor' | 'instructorAvatar' | 'time' | 'availability'>[] = [
    { id: "act1", name: "Morning Yoga", instructor: "Emily White", instructorAvatar: "staff-3", time: "8:00 AM", availability: "Available" },
    { id: "act2", name: "Advanced Tennis", instructor: "John Smith", instructorAvatar: "staff-2", time: "10:00 AM", availability: "Limited" },
    { id: "act6", name: "Zumba Dance", instructor: "Maria Rodriguez", time: "6:00 PM", availability: "Full" },
]

export const staffList: Staff[] = [
  { id: "staff1", name: "Jane Doe", role: "General Manager", email: "jane.doe@sportshub.com", phone: "(123) 456-7890", avatarId: "staff-1" },
  { id: "staff2", name: "John Smith", role: "Head Tennis Pro", email: "john.smith@sportshub.com", phone: "(123) 456-7891", avatarId: "staff-2" },
  { id: "staff3", name: "Emily White", role: "Yoga & Wellness Coordinator", email: "emily.white@sportshub.com", phone: "(123) 456-7892", avatarId: "staff-3" },
  { id: "staff4", name: "Michael Brown", role: "Aquatics Director", email: "michael.brown@sportshub.com", phone: "(123) 456-7893", avatarId: "staff-4" },
  { id: "staff5", name: "Sarah Green", role: "Head Fitness Trainer", email: "sarah.green@sportshub.com", phone: "(123) 456-7894", avatarId: "staff-5" },
];

export const availability: string = `
- Tennis Courts: Available Monday-Friday 9am-5pm. Fully booked on weekends.
- Basketball Court: Available weekdays after 6pm.
- Swimming Pool: Open for lap swimming 6am-10am daily.
- Yoga Classes: Morning Yoga on Mon/Wed/Fri at 8am (Available). Evening Flow on Tue/Thu at 7pm (Limited spots).
- HIIT Classes: Daily at 12pm (Available).
`;

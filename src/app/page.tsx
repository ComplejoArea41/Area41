import {
  Activity,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { upcomingReservations, todaysClasses } from "@/lib/data";
import { placeholderImages } from "@/lib/placeholder-images.json";

export default function Dashboard() {
  const userAvatar = placeholderImages.find(p => p.id === 'user-avatar');

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Reservations
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingReservations.length}</div>
              <p className="text-xs text-muted-foreground">
                scheduled for this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+2,350</div>
              <p className="text-xs text-muted-foreground">
                +180.1% from last month
              </p>
            </CardContent>
          </Card>
           <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Recommendations</CardTitle>
              <Sparkles className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">Try Something New</div>
                <Link href="/recommendations" className="text-xs text-muted-foreground hover:text-primary">
                    Get personalized suggestions &rarr;
                </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Club Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+573</div>
              <p className="text-xs text-muted-foreground">
                +201 since last hour
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle>Upcoming Reservations</CardTitle>
                <CardDescription>
                  Here are your upcoming classes and court bookings.
                </CardDescription>
              </div>
              <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/schedule">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingReservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div className="font-medium">{res.activityName}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          {res.type}
                        </div>
                      </TableCell>
                      <TableCell>{res.location}</TableCell>
                      <TableCell>
                        {res.date}
                      </TableCell>
                      <TableCell className="text-right">{res.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Today's Classes</CardTitle>
              <CardDescription>
                Popular classes happening today. Join in!
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8">
              {todaysClasses.map((cls) => {
                 const instructorImage = placeholderImages.find(p => p.id === cls.instructorAvatar);
                 return (
                    <div key={cls.id} className="flex items-center gap-4">
                        <Avatar className="hidden h-9 w-9 sm:flex">
                          {instructorImage && (
                            <AvatarImage 
                              src={instructorImage.imageUrl} 
                              alt={cls.instructor} 
                              data-ai-hint={instructorImage.imageHint}
                              width={36}
                              height={36}
                            />
                          )}
                          <AvatarFallback>{cls.instructor.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-1">
                          <p className="text-sm font-medium leading-none">
                            {cls.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {cls.instructor} &bull; {cls.time}
                          </p>
                        </div>
                        <div className="ml-auto font-medium">
                          <Badge variant={cls.availability === 'Available' ? 'secondary' : 'destructive'}>
                            {cls.availability}
                          </Badge>
                        </div>
                    </div>
                 );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

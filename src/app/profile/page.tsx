import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { user, upcomingReservations } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { placeholderImages } from "@/lib/placeholder-images.json";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProfilePage() {
  const userAvatar = placeholderImages.find((p) => p.id === "user-avatar");

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="flex flex-col items-center gap-4 text-center">
              {userAvatar && (
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={userAvatar.imageUrl}
                    alt={user.name}
                    data-ai-hint={userAvatar.imageHint}
                    width={96}
                    height={96}
                  />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div className="grid gap-1">
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" defaultValue={user.name} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" defaultValue={user.email} disabled />
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter>
                 <Button className="w-full">Save Changes</Button>
            </CardFooter>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>My Preferences</CardTitle>
              <CardDescription>
                Help us tailor suggestions for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea defaultValue={user.preferences} className="min-h-32"/>
            </CardContent>
             <CardFooter>
                 <Button className="w-full" variant="secondary">Update Preferences</Button>
            </CardFooter>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>My Reservations</CardTitle>
              <CardDescription>
                A history of your recent and upcoming bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingReservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">
                        {res.activityName}
                      </TableCell>
                      <TableCell>{res.date}</TableCell>
                      <TableCell>{res.time}</TableCell>
                      <TableCell className="text-right text-green-600">
                        Upcoming
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">
                      Lap Swimming
                    </TableCell>
                    <TableCell>June 15, 2024</TableCell>
                    <TableCell>7:00 AM</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      Completed
                    </TableCell>
                  </TableRow>
                   <TableRow>
                    <TableCell className="font-medium">
                      HIIT Fusion
                    </TableCell>
                    <TableCell>June 12, 2024</TableCell>
                    <TableCell>9:00 AM</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      Completed
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

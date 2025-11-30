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
import { Badge } from "@/components/ui/badge";
import { activities } from "@/lib/data";
import Link from "next/link";
import { Dumbbell, Swords, Waves, Bike, PersonStanding } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/types";

const SportIcon = ({ name, className }: { name: string, className?: string }) => {
    const iconProps = { className: cn("h-5 w-5", className) };
    if (name.toLowerCase().includes("tennis")) return <Swords {...iconProps} />;
    if (name.toLowerCase().includes("yoga")) return <PersonStanding {...iconProps} />;
    if (name.toLowerCase().includes("swim")) return <Waves {...iconProps} />;
    if (name.toLowerCase().includes("zumba")) return <Dumbbell {...iconProps} />;
    if (name.toLowerCase().includes("hiit")) return <Dumbbell {...iconProps} />;
    if (name.toLowerCase().includes("basketball")) return <Dumbbell {...iconProps} />;
    return <Dumbbell {...iconProps} />;
}

export default function SchedulePage() {
  const getBadgeVariant = (availability: Activity['availability']) => {
    switch (availability) {
      case "Available":
        return "secondary";
      case "Limited":
        return "default";
      case "Full":
        return "destructive";
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Full Schedule</CardTitle>
          <CardDescription>
            Browse all available classes and facility times. Book your spot
            today!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Icon</span>
                </TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="hidden md:table-cell">Instructor / Location</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="hidden sm:table-cell">
                    <div className="bg-muted p-2 rounded-md inline-block">
                        <SportIcon name={activity.name} className="text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{activity.name}</TableCell>
                  <TableCell>{activity.day}</TableCell>
                  <TableCell>{activity.time}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {activity.type === "Class" ? activity.instructor : activity.location}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(activity.availability)}>
                      {activity.availability}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline" disabled={activity.availability === 'Full'}>
                      <Link href="/reservations">Book</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

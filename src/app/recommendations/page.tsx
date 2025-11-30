import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecommendationForm } from "./recommendation-form";
import { Sparkles } from "lucide-react";

export default function RecommendationsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-4">
            <h1 className="font-semibold text-3xl md:text-4xl">AI-Powered Recommendations</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
            Discover new activities tailored just for you. Tell us what you like, and our AI will suggest classes and activities based on your preferences and what's available at the center.
        </p>

        <RecommendationForm />
    </main>
  );
}

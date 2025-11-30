"use client";

import { useState } from "react";
import { useForm, useFormState } from "react-hook-form";
import { suggestActivityBasedOnPreferences } from "@/ai/flows/suggest-activity-based-on-preferences";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { availability, user } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const recommendationSchema = z.object({
    userPreferences: z.string().min(10, {
        message: "Please tell us a bit more about what you like.",
    }),
});

type RecommendationFormValues = z.infer<typeof recommendationSchema>;

export function RecommendationForm() {
  const [suggestions, setSuggestions] = useState("");
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RecommendationFormValues>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: {
      userPreferences: user.preferences,
    },
  });

  const { isSubmitting } = useFormState({ control: form.control });

  const onSubmit = async (data: RecommendationFormValues) => {
    setError(null);
    setSuggestions("");
    try {
      const result = await suggestActivityBasedOnPreferences({
        userPreferences: data.userPreferences,
        availability: availability,
      });
      setSuggestions(result.suggestions);
    } catch (e) {
      console.error(e);
      setError("Sorry, we couldn't generate recommendations at this time. Please try again later.");
    }
  };

  return (
    <div className="grid gap-8 mt-4">
        <Card>
            <CardHeader>
                <CardTitle>Your Preferences</CardTitle>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="userPreferences"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tell us what you're looking for</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="e.g., 'I like morning cardio sessions' or 'interested in team sports'"
                                        className="resize-min h-32"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    The more detail you provide, the better the recommendations.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                            )}
                            Generate Suggestions
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

      {isSubmitting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Finding your next favorite activity...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[70%]" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {suggestions && !isSubmitting && (
        <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Here are your personalized recommendations!
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
            {suggestions.split('\n').map((line, index) => {
                if(line.startsWith('-') || line.startsWith('*')) {
                    return <p key={index} className="m-0">{line}</p>;
                }
                return <p key={index}>{line}</p>;
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

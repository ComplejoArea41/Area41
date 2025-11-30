'use server';
/**
 * @fileOverview Provides personalized activity or class suggestions based on user preferences and availability.
 *
 * - suggestActivityBasedOnPreferences - A function that suggests activities or classes.
 * - SuggestActivityBasedOnPreferencesInput - The input type for the suggestActivityBasedOnPreferences function.
 * - SuggestActivityBasedOnPreferencesOutput - The return type for the suggestActivityBasedOnPreferences function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestActivityBasedOnPreferencesInputSchema = z.object({
  userPreferences: z
    .string()
    .describe('The user preferences for activities or classes.'),
  availability: z
    .string()
    .describe('The current availability of courts, fields, and classes.'),
});
export type SuggestActivityBasedOnPreferencesInput = z.infer<
  typeof SuggestActivityBasedOnPreferencesInputSchema
>;

const SuggestActivityBasedOnPreferencesOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'A list of suggested activities or classes based on user preferences and availability.'
    ),
});
export type SuggestActivityBasedOnPreferencesOutput = z.infer<
  typeof SuggestActivityBasedOnPreferencesOutputSchema
>;

export async function suggestActivityBasedOnPreferences(
  input: SuggestActivityBasedOnPreferencesInput
): Promise<SuggestActivityBasedOnPreferencesOutput> {
  return suggestActivityBasedOnPreferencesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestActivityBasedOnPreferencesPrompt',
  input: {schema: SuggestActivityBasedOnPreferencesInputSchema},
  output: {schema: SuggestActivityBasedOnPreferencesOutputSchema},
  prompt: `You are an AI assistant that provides personalized suggestions for activities or classes based on user preferences and the current availability.\n\nUser Preferences: {{{userPreferences}}}\nAvailability: {{{availability}}}\n\nBased on the user's preferences and the current availability, suggest activities or classes that the user might be interested in.`, // eslint-disable-line max-len
});

const suggestActivityBasedOnPreferencesFlow = ai.defineFlow(
  {
    name: 'suggestActivityBasedOnPreferencesFlow',
    inputSchema: SuggestActivityBasedOnPreferencesInputSchema,
    outputSchema: SuggestActivityBasedOnPreferencesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

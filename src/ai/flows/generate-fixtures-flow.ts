'use server';
/**
 * @fileOverview A flow for generating tournament fixtures.
 *
 * - generateFixtures - A function to generate match schedules for a tournament.
 * - GenerateFixturesInput - The input type for the generateFixtures function.
 * - GenerateFixturesOutput - The return type for the generateFixtures function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { format } from 'date-fns';

const GenerateFixturesInputSchema = z.object({
  teamIds: z.array(z.string()).describe('An array of team IDs participating in the tournament.'),
  tournamentId: z.string().describe('The ID of the tournament.'),
  format: z.enum(['round-robin']).describe('The format of the tournament.'),
});
export type GenerateFixturesInput = z.infer<typeof GenerateFixturesInputSchema>;

// The output will be an array of match-like objects, but without Firestore-specific fields.
const MatchSchema = z.object({
    teamAId: z.string(),
    teamBId: z.string(),
    date: z.string().describe("The date and time of the match in ISO 8601 format. Stagger matches appropriately, for example, two matches per day at 20:00 and 21:00, starting from tomorrow."),
});

const GenerateFixturesOutputSchema = z.object({
    matches: z.array(MatchSchema).describe("The generated list of matches.")
});
export type GenerateFixturesOutput = z.infer<typeof GenerateFixturesOutputSchema>;


export async function generateFixtures(input: GenerateFixturesInput): Promise<GenerateFixturesOutput> {
  return generateFixturesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFixturesPrompt',
  input: { schema: GenerateFixturesInputSchema },
  output: { schema: GenerateFixturesOutputSchema },
  prompt: `You are a tournament scheduler. Your task is to generate a fixture list for a tournament.

Tournament ID: {{{tournamentId}}}
List of Team IDs: {{{json teamIds}}}
Format: {{{format}}}
Current Date: ${format(new Date(), 'yyyy-MM-dd')}

Based on the provided list of team IDs and the tournament format, create a schedule of matches.

Instructions:
1.  For a 'round-robin' format, ensure every team plays against every other team exactly once.
2.  If the number of teams is odd, one team will have a bye in each round. Do not create a match for the team with a bye.
3.  Schedule the matches starting from tomorrow.
4.  Schedule a maximum of two matches per day to avoid overloading the courts. For example, at 20:00 and 21:00.
5.  Return the matches as an array of objects, where each object represents a match and has 'teamAId', 'teamBId', and a 'date' in ISO 8601 format.
6.  The order of teamAId and teamBId does not matter. The schedule should be fair and logical.
`,
});

const generateFixturesFlow = ai.defineFlow(
  {
    name: 'generateFixturesFlow',
    inputSchema: GenerateFixturesInputSchema,
    outputSchema: GenerateFixturesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

'use server';

/**
 * @fileOverview An AI agent that warns users about sharing sensitive information or potential fraud.
 *
 * - analyzeCommunication - A function that analyzes communication content for safety.
 * - AnalyzeCommunicationInput - The input type for the analyzeCommunication function.
 * - AnalyzeCommunicationOutput - The return type for the analyzeCommunication function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCommunicationInputSchema = z.object({
  text: z.string().describe('The text content of the communication to analyze.'),
});
export type AnalyzeCommunicationInput = z.infer<typeof AnalyzeCommunicationInputSchema>;

const AnalyzeCommunicationOutputSchema = z.object({
  isSensitiveDataDetected: z
    .boolean()
    .describe(
      'Ob sensible Daten wie Passwörter oder Kontonummern in der Kommunikation erkannt werden.'
    ),
  isFraudPhishingScamLikely:
    z.boolean().describe('Ob die Kommunikation Anzeichen von Betrug, Phishing oder Scam-Versuchen aufweist.'),
  sensitiveDataType: z
    .string()

    .optional()
    .describe('Die Art der erkannten sensiblen Daten, falls vorhanden (z.B. Passwort, Kontonummer).'),
  reason: z
    .string()
    .optional()
    .describe('Der Grund für die Betrugs-/Phishing-/Scam-Einschätzung, falls zutreffend.'),
  advice: z.string().optional().describe('Ein Ratschlag, der dem Benutzer angezeigt werden soll.'),
});
export type AnalyzeCommunicationOutput = z.infer<typeof AnalyzeCommunicationOutputSchema>;

export async function analyzeCommunication(input: AnalyzeCommunicationInput): Promise<AnalyzeCommunicationOutput> {
  return analyzeCommunicationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCommunicationPrompt',
  input: {schema: AnalyzeCommunicationInputSchema},
  output: {schema: AnalyzeCommunicationOutputSchema},
  prompt: `Sie sind ein Sicherheitsassistent, der die Kommunikation von Benutzern analysiert, um potenzielle Risiken zu identifizieren.

Sie erhalten den Inhalt einer Kommunikation und müssen feststellen, ob sie sensible Informationen enthält oder Anzeichen von Betrug, Phishing oder Betrugsversuchen aufweist.

Setzen Sie auf der Grundlage Ihrer Analyse die Ausgabefelder isSensitiveDataDetected und isFraudPhishingScamLikely entsprechend. Wenn sensible Daten erkannt werden, identifizieren Sie die Art der Daten und nehmen Sie sie in das Feld sensitiveDataType auf. Wenn Betrug, Phishing oder Betrug wahrscheinlich ist, geben Sie den Grund im Feld reason an.

Fügen Sie abschließend einen kurzen Ratschlag hinzu, der dem Benutzer angezeigt werden soll und ihm helfen könnte, sicher zu bleiben.

Kommunikationsinhalt: {{{text}}}`,
});

const analyzeCommunicationFlow = ai.defineFlow(
  {
    name: 'analyzeCommunicationFlow',
    inputSchema: AnalyzeCommunicationInputSchema,
    outputSchema: AnalyzeCommunicationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

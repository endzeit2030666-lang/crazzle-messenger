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
      'Whether or not sensitive data like passwords or account numbers is detected in the communication.'
    ),
  isFraudPhishingScamLikely:
    z.boolean().describe('Whether or not the communication exhibits indicators of fraud, phishing, or scam attempts.'),
  sensitiveDataType: z
    .string()
    .optional()
    .describe('The type of sensitive data detected, if any (e.g., password, account number).'),
  reason: z
    .string()
    .optional()
    .describe('The reason for the fraud/phishing/scam determination, if applicable.'),
  advice: z.string().optional().describe('Advice to display to the user'),
});
export type AnalyzeCommunicationOutput = z.infer<typeof AnalyzeCommunicationOutputSchema>;

export async function analyzeCommunication(input: AnalyzeCommunicationInput): Promise<AnalyzeCommunicationOutput> {
  return analyzeCommunicationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCommunicationPrompt',
  input: {schema: AnalyzeCommunicationInputSchema},
  output: {schema: AnalyzeCommunicationOutputSchema},
  prompt: `You are a security assistant that analyzes user communications to identify potential risks.

You will receive the content of a communication and must determine if it contains sensitive information or exhibits indicators of fraud, phishing, or scam attempts.

Based on your analysis, set the isSensitiveDataDetected and isFraudPhishingScamLikely output fields appropriately. If sensitive data is detected, identify the type of data and include it in the sensitiveDataType field. If fraud, phishing, or scam is likely, provide the reason in the reason field.

Finally, add a short piece of advice to display to the user, that could help the user stay safe.

Communication Content: {{{text}}}`,
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

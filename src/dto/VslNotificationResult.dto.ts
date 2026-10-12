
import { z } from 'zod';

/**
 * Validates the final processing result sent back to the candidate form service.
 * A result is published only after a notification succeeds or retries are exhausted.
 */
export const vslNotificationResultSchema = z.object({
    vslRunId: z.number().int().positive(),
    vslStepId: z.number().int().positive(),

    // Public UUID of the submission associated with this VSL step.
    submissionId: z.string().uuid(),

    // SENT means the notification provider accepted the send request.
    status: z.enum(['SENT', 'FAILED']),

    // Included for failures so the form service can record why the step failed.
    errorMessage: z.string().trim().min(1).max(500).optional(),

    // ISO timestamp indicating when the result was produced.
    occurredAt: z.string().datetime()
}).superRefine((result, ctx) => {
    if (result.status === 'FAILED' && !result.errorMessage) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['errorMessage'],
            message: 'An error message is required for a failed VSL notification'
        });
    }
});

export type VslNotificationResultDto =
    z.infer<typeof vslNotificationResultSchema>;

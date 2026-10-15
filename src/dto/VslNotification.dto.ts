import { z } from 'zod';

// Validates email notification jobs received from Candidate Form Service.
export const vslNotificationSchema = z.object({
    candidateId: z.number().int().positive(),
    submissionId: z.string().uuid(),
    vslRunId: z.number().int().positive(),
    stepNumber: z.number().int().positive(),

    // Only the three approved email steps are sent to this service.
    stepKey: z.enum([
        'VSL_D1_EMAIL',
        'VSL_D3_EMAIL',
        'VSL_D7_EMAIL'
    ]),

    candidateName: z.string().trim().min(1),
    candidateEmail: z.string().trim().email(),
    formLink: z.string().url(),
    subject: z.string().trim().min(1),
    templateKey: z.string().trim().min(1)
});

export type VslNotificationDto = z.infer<typeof vslNotificationSchema>;

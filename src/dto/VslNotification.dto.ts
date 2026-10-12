import { z } from 'zod';

import { NotificationChannel } from '../utils/enums/NotificationChannel.enum';

/**
 * Validates VSL notification jobs received from the candidate form service.
 * A VSL step is sent through exactly one channel.
 */
export const vslNotificationSchema = z.object({
    candidateId: z.number().int().positive(),

    // The public UUID of the candidate submission.
    submissionId: z.string().uuid(),

    vslRunId: z.number().int().positive(),
    vslStepId: z.number().int().positive(),

    // Internal steps are not notification jobs.
    stepKey: z.enum([
        'VSL_D1_EMAIL',
        'VSL_D1_WHATSAPP',
        'VSL_D3_EMAIL',
        'VSL_D5_WHATSAPP',
        'VSL_D7_EMAIL'
    ]),

    candidateName: z.string().trim().min(1),
    candidateEmail: z.string().trim().email(),

    // May be empty when the candidate has no usable phone number.
    candidatePhone: z.string().trim().default(''),

    formLink: z.string().url(),
    subject: z.string().trim().min(1),

    channels: z.array(z.nativeEnum(NotificationChannel)).min(1).max(1),

    templateKeys: z.object({
        [NotificationChannel.EMAIL]: z.string().trim().min(1).optional(),
        [NotificationChannel.WHATSAPP]: z.string().trim().min(1).optional()
    })
}).superRefine((payload, ctx) => {
    // The channel must match the channel defined by the VSL step.
    const expectedChannel = payload.stepKey.endsWith('_EMAIL')
        ? NotificationChannel.EMAIL
        : NotificationChannel.WHATSAPP;

    if (payload.channels[0] !== expectedChannel) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['channels'],
            message: `Step ${payload.stepKey} requires channel ${expectedChannel}`
        });
    }

    // Reject a job if its requested channel has no configured template.
    for (const channel of payload.channels) {
        if (!payload.templateKeys[channel]) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['templateKeys', channel],
                message: `Missing template key for channel ${channel}`
            });
        }
    }

    // AiSensy needs a valid phone number for WhatsApp delivery.
    if (
        payload.channels.includes(NotificationChannel.WHATSAPP) &&
        !/^\+?\d{10,15}$/.test(payload.candidatePhone)
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['candidatePhone'],
            message: 'A valid phone number is required for the WHATSAPP channel'
        });
    }
});

export type VslNotificationDto = z.infer<typeof vslNotificationSchema>;
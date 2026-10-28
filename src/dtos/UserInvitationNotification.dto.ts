import { z } from 'zod';

import { NotificationChannel } from '../utils/enums/NotificationChannel';

/**
 * Validates invitation notification jobs received from User-Service.
 * Email is the default channel; WhatsApp can be enabled when its template
 * and a valid phone number are provided.
 */
export const userInvitationNotificationSchema = z.object({
    userId: z.number().int().positive(),

    name: z.string().trim().min(1).max(100),

    loginUrl: z.string().url(),

    email: z.string().trim().email(),

    role: z.enum(['ADMIN', 'MANAGER']),

    temporaryPassword: z.string().min(1).max(128),

    candidatePhone: z.string().trim().default(''),

    channels: z
        .array(z.nativeEnum(NotificationChannel))
        .min(1)
        .default([NotificationChannel.EMAIL]),

    templateKeys: z
        .object({
            [NotificationChannel.EMAIL]: z.string().trim().min(1).optional(),
            [NotificationChannel.WHATSAPP]: z.string().trim().min(1).optional(),
        })
        .default({
            [NotificationChannel.EMAIL]: 'UserInvitation',
        }),
}).superRefine((payload, ctx) => {
    // Every selected channel must have its corresponding notification template.
    for (const channel of payload.channels) {
        if (!payload.templateKeys[channel]) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['templateKeys', channel],
                message: `Missing template key for channel ${channel}`,
            });
        }
    }

    // WhatsApp delivery requires a valid phone number.
    if (
        payload.channels.includes(NotificationChannel.WHATSAPP) &&
        !/^\+?\d{10,15}$/.test(payload.candidatePhone)
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['candidatePhone'],
            message: 'A valid phone number is required for the WHATSAPP channel',
        });
    }
});

export type UserInvitationNotificationDto =
    z.infer<typeof userInvitationNotificationSchema>;
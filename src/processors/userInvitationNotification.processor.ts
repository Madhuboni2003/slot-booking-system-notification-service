import { UnrecoverableError, Worker } from 'bullmq';

import { bullMqConnection } from '../configs/bullMq.config';
import logger from '../configs/logger.config';
import { workerRetentionOptions } from '../configs/queueOptions.config';
import {
    USER_INVITATION_NOTIFICATION_PAYLOAD,
    USER_INVITATION_NOTIFICATION_QUEUE,
} from '../constants';
import { UserInvitationNotificationDto, userInvitationNotificationSchema } from '../dtos/UserInvitationNotification.dto';
import { EmailExecutor } from '../strategies/executors/Email.executor';

export function setupUserInvitationNotificationProcessor() {
    // Listen for invitation email jobs from User-Service.
    const userInvitationProcessor = new Worker<UserInvitationNotificationDto>(
        USER_INVITATION_NOTIFICATION_QUEUE,
        async (job) => {
            // Unknown job names cannot be fixed by retrying.
            if (job.name !== USER_INVITATION_NOTIFICATION_PAYLOAD) {
                throw new UnrecoverableError('Invalid user invitation job name');
            }

            // Validate the payload received from another service.
            const parsed = userInvitationNotificationSchema.safeParse(job.data);

            if (!parsed.success) {
                throw new UnrecoverableError(
                    `Invalid user invitation payload: ${parsed.error.message}`,
                );
            }

            const payload = parsed.data;

            // Reuse the existing email executor and its SES/template handling.
            const emailExecutor = new EmailExecutor();

            await emailExecutor.send({
                recipient: payload.email,
                candidateName: payload.fullName,
                subject: "You're invited to join InterviewCall",
                templateKey: 'UserInvitation',
                emailParams: {
                    fullName: payload.fullName,
                    activationUrl: payload.activationUrl,
                },
            });
        },
        {
            connection: bullMqConnection,
            concurrency: 5,
            ...workerRetentionOptions,
        },
    );

    // Log successful invitation email jobs.
    userInvitationProcessor.on('completed', (job) => {
        logger.info('User invitation email job completed', {
            jobId: job.id,
            jobName: job.name,
        });
    });

    // Log failures; BullMQ handles configured retries.
    userInvitationProcessor.on('failed', (job, error) => {
        logger.error('User invitation email job failed', {
            jobId: job?.id,
            jobName: job?.name,
            error,
        });
    });

    logger.info('User invitation notification processor setup completed');
}
import { UnrecoverableError, Worker } from 'bullmq';

import { bullMqConnection } from '../configs/bullMq.config';
import logger from '../configs/logger.config';
import { workerRetentionOptions } from '../configs/queueOptions.config';
import { VSL_NOTIFICATION_PAYLOAD, VSL_NOTIFICATION_QUEUE } from '../constants';
import { VslNotificationDto, vslNotificationSchema } from '../dto/VslNotification.dto';
import NotificationRepository from '../repositories/Notification.repository';
import NotificationDeliveryRepository from '../repositories/NotificationDelivery.repository';
import VslNotificationService from '../services/VslNotification.service';

export function setupVslNotificationProcessor() {
    const vslProcessor = new Worker<VslNotificationDto>(
        VSL_NOTIFICATION_QUEUE,
        async (job) => {
            if(job.name != VSL_NOTIFICATION_PAYLOAD) {
                // Retrying cannot fix a job this worker does not recognize.
                throw new UnrecoverableError('Invalid job name');
            }

            // Validate the payload received from Candidate Form Service before sending an email.
            const parsed = vslNotificationSchema.safeParse(job.data);

            if(!parsed.success) {
                const reasons = parsed.error.issues
                    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                    .join('; ');

                // Retrying cannot fix a malformed payload.
                throw new UnrecoverableError(
                    `Invalid VSL notification payload: ${reasons}`
                );
            }

            const vslNotificationService = new VslNotificationService(
                new NotificationRepository(),
                new NotificationDeliveryRepository()
            );

            // Delivery errors propagate to BullMQ, which applies the configured retry policy.
            // No result callback is published; Candidate Form Service owns VSL progression.
            await vslNotificationService.sendNotification(parsed.data);

        }, {
            connection: bullMqConnection,
            concurrency: 5,
            ...workerRetentionOptions
        }
    );

    vslProcessor.on('completed', (job) => {
        logger.info('VSL notification job completed', {
            jobId: job.id,
            jobName: job.name
        });
    });

    vslProcessor.on('failed', (job, error) => {
        logger.error('VSL notification job failed', {
            jobId: job?.id,
            jobName: job?.name,
            error,
        });
    });

    logger.info('VSL notification processor setup completed');
}

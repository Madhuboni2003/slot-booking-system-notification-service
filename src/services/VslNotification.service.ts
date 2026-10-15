import { NotificationType } from '../../generated/prisma/enums';
import { VslNotificationDto } from '../dto/VslNotification.dto';
import NotificationRepository from '../repositories/Notification.repository';
import NotificationDeliveryRepository from '../repositories/NotificationDelivery.repository';
import { getFirstName } from '../utils/helpers/name.helper';
import { NotificationChannel } from '../utils/enums/NotificationChannel.enum';
import { deliverToChannels } from './channelDelivery.helper';

/**
 * Handles email notifications for VSL abandonment steps.
 * Uses the existing notification and delivery records to support
 * idempotency and avoid resending emails already marked as SENT.
 */
class VslNotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationDeliveryRepository: NotificationDeliveryRepository
    ) {}

    /**
     * Creates or reuses the notification record and delegates email
     * delivery to the shared delivery helper.
     */
    async sendNotification(payload: VslNotificationDto): Promise<void> {
        const notification =
            await this.notificationRepository.findOrCreateNotification({
                candidateId: payload.candidateId,
                submissionId: payload.submissionId,

                // A stable reference identifies this specific VSL run and step.
                externalRef: `vsl-run-${payload.vslRunId}-${payload.stepKey}`,

                // Each VSL step gets a distinct reminder number.
                reminderNumber: payload.stepNumber,

                notificationType: NotificationType.VSL_ABANDONMENT
            });

        const firstName = getFirstName(payload.candidateName);

        // VSL currently sends email only; template parameters are passed
        // to the shared helper for the existing email-delivery pipeline.
        await deliverToChannels({
            notificationId: notification.id,
            channels: [NotificationChannel.EMAIL],
            notificationDeliveryRepository: this.notificationDeliveryRepository,
            buildExecutorPayload: () => ({
                recipient: payload.candidateEmail,
                candidateName: payload.candidateName,
                subject: payload.subject,
                templateKey: payload.templateKey,
                emailParams: {
                    firstName,
                    formLink: payload.formLink
                }
            })
        });
    }
}

export default VslNotificationService;

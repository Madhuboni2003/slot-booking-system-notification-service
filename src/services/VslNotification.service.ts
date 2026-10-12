
import { NotificationType } from '../../generated/prisma/enums';
import { VslNotificationDto } from '../dto/VslNotification.dto';
import NotificationRepository from '../repositories/Notification.repository';
import NotificationDeliveryRepository from '../repositories/NotificationDelivery.repository';
import { NotificationExecutorPayload } from '../types/NotificationPayload.type';
import { NotificationChannel } from '../utils/enums/NotificationChannel.enum';
import { getFirstName } from '../utils/helpers/name.helper';
import { deliverToChannels } from './channelDelivery.helper';

/**
 * Sends email or WhatsApp notifications for a VSL abandonment step.
 * Retries reuse the same notification record and skip channels already marked SENT.
 */
class VslNotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationDeliveryRepository: NotificationDeliveryRepository
    ) {}

    /**
     * Creates or reuses the notification record, then sends through the existing
     * channel-delivery helper.
     */
    async sendNotification(payload: VslNotificationDto): Promise<void> {
        const notification = await this.notificationRepository.findOrCreateNotification({
            candidateId: payload.candidateId,
            submissionId: payload.submissionId,
            externalRef: `vsl-run-${payload.vslRunId}-step-${payload.vslStepId}`,
            // The existing schema has a unique key on submissionId + type + reminderNumber.
            // Use the stable step ID so different VSL steps can have separate notification records.
            reminderNumber: payload.vslStepId,
            notificationType: NotificationType.VSL_ABANDONMENT
        });

        const firstName = getFirstName(payload.candidateName);

        await deliverToChannels({
            notificationId: notification.id,
            channels: payload.channels,
            notificationDeliveryRepository: this.notificationDeliveryRepository,
            buildExecutorPayload: (
                channel: NotificationChannel
            ): NotificationExecutorPayload => {
                const templateKey = payload.templateKeys[channel] as string;

                if (channel === NotificationChannel.EMAIL) {
                    return {
                        recipient: payload.candidateEmail,
                        candidateName: payload.candidateName,
                        subject: payload.subject,
                        templateKey,
                        emailParams: {
                            firstName,
                            formLink: payload.formLink
                        }
                    };
                }

                return {
                    // AiSensy expects the number with country code and without "+".
                    recipient: payload.candidatePhone.replace(/\D/g, ''),
                    candidateName: payload.candidateName,
                    subject: payload.subject,
                    templateKey,
                    whatsAppParams: [
                        firstName,
                        payload.formLink
                    ]
                };
            }
        });
    }
}

export default VslNotificationService;

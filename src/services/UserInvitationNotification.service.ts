import { NotificationType } from '../../generated/prisma/enums';

import { UserInvitationNotificationDto } from '../dtos/UserInvitationNotification.dto';
import NotificationRepository from '../repositories/Notification.repository';
import NotificationDeliveryRepository from '../repositories/NotificationDelivery.repository';
import { NotificationExecutorPayload } from '../types/NotificationPayload.type';
import { NotificationChannel } from '../utils/enums/NotificationChannel';
import { deliverToChannels } from '../utils/helpers/channelDelivery.helper';

class UserInvitationNotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationDeliveryRepository: NotificationDeliveryRepository
    ) {}

    /**
     * Creates or reuses the invitation notification and sends it through
     * the requested channels while tracking each channel's delivery status.
     */
    async sendNotification(
        payload: UserInvitationNotificationDto
    ): Promise<void> {
        const notification = await this.notificationRepository.findOrCreateNotification({
            candidateId: payload.userId,
            externalRef: `user-invitation-${payload.userId}`,
            reminderNumber: 0,
            notificationType: NotificationType.USER_INVITATION
        });

        await deliverToChannels({
            notificationId: notification.id,
            channels: payload.channels,
            notificationDeliveryRepository: this.notificationDeliveryRepository,

            buildExecutorPayload: (
                channel: NotificationChannel
            ): NotificationExecutorPayload => {
                // The DTO schema must validate that every selected channel has a template key.
                const templateKey = payload.templateKeys[channel] as string;

                if (channel === NotificationChannel.EMAIL) {
                    return {
                        recipient: payload.email,
                        candidateName: payload.name,
                        subject: "You're invited to join InterviewCall",
                        templateKey,
                        emailParams: {
                            name: payload.name,
                            email: payload.email,
                            role: payload.role,
                            temporaryPassword: payload.temporaryPassword,
                            loginUrl: payload.loginUrl
                        }
                    };
                }

                return {
                    recipient: payload.candidatePhone.replace(/\D/g, ''),
                    candidateName: payload.name,
                    subject: "You're invited to join InterviewCall",
                    templateKey,
                    whatsAppParams: [
                        payload.name,
                        payload.role
                    ]
                };
            }
        });
    }
}

export default UserInvitationNotificationService;
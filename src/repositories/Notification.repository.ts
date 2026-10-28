import { Notification } from '../../generated/prisma/client';
import { NotificationType } from '../../generated/prisma/enums';
import { NotificationCreateInput } from '../../generated/prisma/models';
import { prisma } from '../configs/db.config';
import { INotificationRepository } from '../interfaces/INotificationRepository.interface';
import { isWorkrNotificationType } from '../utils/helpers/workrNotification.helper';

class NotificationRepository implements INotificationRepository {
    async createNotification(data: NotificationCreateInput): Promise<Notification> {
        const notification = await prisma.notification.create({ data });
        return notification;
    }

    /**
     * Returns the notification for this booking / reminder / WorkR signup, creating it on the first attempt.
     * A retried (or duplicated) job therefore resumes the same notification instead of failing
     * on the unique constraints.
     */
    async findOrCreateNotification(data: NotificationCreateInput): Promise<Notification> {
        const existing = await this.findExisting(data);

        if(existing) {
            return existing;
        }

        try {
            return await prisma.notification.create({ data });
        } catch (error) {
            // Another attempt of the same job may have created it between our read and write
            const created = await this.findExisting(data);

            if(created) {
                return created;
            }

            throw error;
        }
    }

    private async findExisting(data: NotificationCreateInput): Promise<Notification | null> {
        if(data.notificationType == NotificationType.BOOKING_CONFIRMED) {
            if(data.bookingId == null) {
                return null;
            }

            return await prisma.notification.findFirst({
                where: {
                    bookingId: data.bookingId,
                    notificationType: data.notificationType
                }
            });
        }

        // WorkR notifications are keyed by the WorkR user and, for the nurture days, the day number (Day 0 is reminder number 0)
        if (
            isWorkrNotificationType(data.notificationType) ||
            data.notificationType === NotificationType.USER_INVITATION
        ) {
            if(data.externalRef == null) {
                return null;
            }

            return await prisma.notification.findFirst({
                where: {
                    externalRef: data.externalRef,
                    notificationType: data.notificationType,
                    reminderNumber: data.reminderNumber ?? 0
                }
            });
        }

        return await prisma.notification.findFirst({
            where: {
                submissionId: data.submissionId,
                notificationType: data.notificationType,
                reminderNumber: data.reminderNumber ?? 0
            }
        });
    }
}

export default NotificationRepository;

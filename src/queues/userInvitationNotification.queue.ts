import { Queue } from 'bullmq';

import { bullMqConnection } from '../configs/bullMq.config';
import { defaultJobOptions } from '../configs/queueOptions.config';
import { USER_INVITATION_NOTIFICATION_QUEUE } from '../constants';
import { UserInvitationNotificationDto } from '../dtos/UserInvitationNotification.dto';

// Register the invitation queue using the existing Redis connection and retry policy.
const userInvitationNotificationQueue =
    new Queue<UserInvitationNotificationDto>(
        USER_INVITATION_NOTIFICATION_QUEUE,
        {
            connection: bullMqConnection,
            defaultJobOptions,
        },
    );

export default userInvitationNotificationQueue;
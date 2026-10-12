import { Queue } from 'bullmq';

import { bullMqConnection } from '../configs/bullMq.config';
import { defaultJobOptions } from '../configs/queueOptions.config';
import { VSL_NOTIFICATION_QUEUE } from '../constants';
import { VslNotificationDto } from '../dto/VslNotification.dto';

// Receives VSL notification jobs produced by the candidate form service.
const vslNotificationQueue = new Queue<VslNotificationDto>(
    VSL_NOTIFICATION_QUEUE,
    {
        connection: bullMqConnection,
        defaultJobOptions
    }
);

export default vslNotificationQueue;
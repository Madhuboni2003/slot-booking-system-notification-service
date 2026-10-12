
import { Queue } from 'bullmq';

import { bullMqConnection } from '../configs/bullMq.config';
import { defaultJobOptions } from '../configs/queueOptions.config';
import { VSL_NOTIFICATION_RESULT_QUEUE } from '../constants';
import { VslNotificationResultDto } from '../dto/VslNotificationResult.dto';

// Publishes VSL notification results for the candidate form service to consume.
const vslNotificationResultQueue = new Queue<VslNotificationResultDto>(
    VSL_NOTIFICATION_RESULT_QUEUE,
    {
        connection: bullMqConnection,
        defaultJobOptions
    }
);

export default vslNotificationResultQueue;

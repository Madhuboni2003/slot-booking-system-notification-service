import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import reminderNotificationQueue from '../queues/reminderNotification.queue';
import transactionalNotificationQueue from '../queues/transactionalNotification.queue';
import workrSignupNotificationQueue from '../queues/workrSignupNotification.queue';
import userInvitationNotificationQueue from '../queues/userInvitationNotification.queue';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/ui/queue-dashboard');

createBullBoard({
    queues: [
        new BullMQAdapter(transactionalNotificationQueue),
        new BullMQAdapter(reminderNotificationQueue),
        new BullMQAdapter(workrSignupNotificationQueue),
        new BullMQAdapter(userInvitationNotificationQueue)
    ],
    serverAdapter
});

export default serverAdapter;
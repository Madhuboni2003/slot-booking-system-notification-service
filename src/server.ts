import express from 'express';

import serverAdapter from './configs/bullBoard.config';
import logger from './configs/logger.config';
import { serverConfig } from './configs/server.config';
import { attachCorrelationIdMiddleware } from './middlewares/correlation.middleware';
import { appErrorHandler, genericErrorHandler } from './middlewares/error.middleware';
import { setupReminderNotificationProcessor } from './processors/reminderNotification.processor';
import { setupTransactionalNotificationProcessor } from './processors/transactionalNotification.processor';
import { setupWorkrSignupNotificationProcessor } from './processors/workrSignupNotification.processor';
import { setupVslNotificationProcessor } from './processors/vslNotification.processor';
import apiRouter from './routes';

const app = express();


app.use(express.json());

app.use(attachCorrelationIdMiddleware);

app.use('/api', apiRouter);
app.use('/ui/queue-dashboard', serverAdapter.getRouter());

app.use(appErrorHandler);
app.use(genericErrorHandler);

app.listen(serverConfig.PORT, () => {
    logger.info(`Server is running on http://localhost:${serverConfig.PORT}`);
    logger.info(`For Queue Dasboard, open http://localhost:${serverConfig.PORT}/ui/queue-dashboard`);
    setupTransactionalNotificationProcessor();
    setupReminderNotificationProcessor();
    setupWorkrSignupNotificationProcessor();
    setupVslNotificationProcessor();
    logger.info('Transactional notification processor setup completed');
});
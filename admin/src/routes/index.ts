import { Router } from 'express';
import usageStatsRouter from './usage-stats.js';
import feedbackRouter from './feedback.js';
import maintenanceRouter from './maintenance.js';

const router = Router();

router.get('/', (_req, res) => res.render('index'));
router.use('/usage-stats', usageStatsRouter);
router.use('/feedback', feedbackRouter);
router.use('/maintenance', maintenanceRouter);

export default router;

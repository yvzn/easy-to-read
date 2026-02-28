import { Router } from 'express';
import statsRouter from './stats.js';
import feedbackRouter from './feedback.js';
import maintenanceRouter from './maintenance.js';

const router = Router();

router.get('/', (_req, res) => res.redirect('/stats'));
router.use('/stats', statsRouter);
router.use('/feedback', feedbackRouter);
router.use('/maintenance', maintenanceRouter);

export default router;

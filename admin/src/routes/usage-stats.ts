import { Router } from 'express';
import { getUsageStats } from '../controllers/usage-stats.controller.js';

const router = Router();

router.get('/', getUsageStats);

export default router;

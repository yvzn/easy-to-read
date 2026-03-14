import { Router } from 'express';
import { getMonitoring } from '../controllers/monitoring.controller.js';

const router = Router();

router.get('/', getMonitoring);

export default router;

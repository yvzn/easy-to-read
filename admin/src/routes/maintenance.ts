import { Router } from 'express';
import {
  getMaintenancePage,
  deleteOldInteractions,
} from '../controllers/maintenance.controller.js';

const router = Router();

router.get('/', getMaintenancePage);
router.post('/delete', deleteOldInteractions);

export default router;

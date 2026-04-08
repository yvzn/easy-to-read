import { Router } from 'express';
import { getInteractions, getInteractionDetail } from '../controllers/interactions.controller.js';

const router = Router();

router.get('/', getInteractions);
router.get('/:interactionId', getInteractionDetail);

export default router;

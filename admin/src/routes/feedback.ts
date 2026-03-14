import { Router } from 'express';
import { getFeedbacks, deleteFeedback } from '../controllers/feedback.controller.js';

const router = Router();

router.get('/', getFeedbacks);
router.post('/delete', deleteFeedback);

export default router;

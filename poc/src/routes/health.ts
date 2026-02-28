import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
	res.send('Healthy');
});

export default router;

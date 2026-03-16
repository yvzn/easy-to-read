import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';

export const getMonitoring = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const interval = (req.query.interval as string) || 'day';
		if (!['day', 'week', 'month', 'year'].includes(interval)) {
			res.status(400).render('error', { message: 'Invalid interval parameter' });
			return;
		}

		const stats = await storageService.getMonitoringStats(interval as 'day' | 'week' | 'month' | 'year');

		res.render('monitoring', { stats, interval });
	} catch (error) {
		next(error);
	}
};

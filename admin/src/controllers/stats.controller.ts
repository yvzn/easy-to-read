import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const interval = (req.query.interval as string) || 'week';
		if (!['week', 'month', 'year'].includes(interval)) {
			res.status(400).render('error', { message: 'Invalid interval parameter' });
			return;
		}

		// Fetch all intervals in parallel: selected one for the bar chart, all three for doughnuts
		const [stats, weekStats, monthStats, yearStats] = await Promise.all([
			storageService.getCarbonFootprintStats(interval as 'week' | 'month' | 'year'),
			storageService.getCarbonFootprintStats('week'),
			storageService.getCarbonFootprintStats('month'),
			storageService.getCarbonFootprintStats('year'),
		]);

		res.render('stats', { stats, interval, weekStats, monthStats, yearStats });
	} catch (error) {
		next(error);
	}
};

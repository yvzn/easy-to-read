import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';

export const getUsageStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const interval = (req.query.interval as string) || 'week';
		if (!['week', 'month', 'year'].includes(interval)) {
			res.status(400).render('error', { message: 'Invalid interval parameter' });
			return;
		}

		const sort = (req.query.sort as string) || 'desc';
		if (!['asc', 'desc'].includes(sort)) {
			res.status(400).render('error', { message: 'Invalid sort parameter' });
			return;
		}

		// Fetch all intervals in parallel: selected one for the bar chart, all three for doughnuts
		const [stats, weekStats, monthStats, yearStats] = await Promise.all([
			storageService.getCarbonFootprintStats(interval as 'week' | 'month' | 'year'),
			storageService.getCarbonFootprintStats('week'),
			storageService.getCarbonFootprintStats('month'),
			storageService.getCarbonFootprintStats('year'),
		]);

		res.render('usage-stats', { stats, interval, weekStats, monthStats, yearStats, sort });
	} catch (error) {
		next(error);
	}
};

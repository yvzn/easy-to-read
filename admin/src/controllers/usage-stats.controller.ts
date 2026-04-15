import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';

export const getUsageStats = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
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

		const doughnutSections = [
			{ key: 'week', label: 'Weekly', data: weekStats.slice(-8) },
			{ key: 'month', label: 'Monthly', data: monthStats.slice(-6) },
			{ key: 'year', label: 'Yearly', data: yearStats.slice(-5) },
		].map((section) => ({
			...section,
			total: section.data.reduce((sum, item) => sum + item.count, 0),
		}));

		res.render('usage-stats', { stats, interval, sort, doughnutSections });
	} catch (error) {
		next(error);
	}
};

import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const interval = (req.query.interval as string) || 'week';
    if (!['week', 'month', 'year'].includes(interval)) {
      res.status(400).render('error', { message: 'Invalid interval parameter' });
      return;
    }
    const stats = await storageService.getCarbonFootprintStats(
      interval as 'week' | 'month' | 'year'
    );
    res.render('stats', { stats, interval });
  } catch (error) {
    next(error);
  }
};

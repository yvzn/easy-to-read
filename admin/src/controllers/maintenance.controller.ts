import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';

export const getMaintenancePage = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.render('maintenance', { result: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const deleteOldInteractions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { beforeDate, keepWithFeedback } = req.body as {
      beforeDate: string;
      keepWithFeedback?: string;
    };

    if (!beforeDate || typeof beforeDate !== 'string' || beforeDate.trim() === '') {
      res.render('maintenance', { result: null, error: 'A date is required.' });
      return;
    }

    const parsedDate = new Date(beforeDate.trim());
    if (isNaN(parsedDate.getTime())) {
      res.render('maintenance', { result: null, error: 'Invalid date format.' });
      return;
    }

    if (parsedDate >= new Date()) {
      res.render('maintenance', {
        result: null,
        error: 'Date must be in the past.',
      });
      return;
    }

    const shouldKeep = keepWithFeedback === 'on' || keepWithFeedback === 'true';
    const interactions = await storageService.getOldInteractions(parsedDate);
    const { deleted, skipped } = await storageService.deleteInteractions(interactions, shouldKeep);

    res.render('maintenance', {
      result: {
        deleted,
        skipped,
        beforeDate: parsedDate.toISOString().split('T')[0],
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

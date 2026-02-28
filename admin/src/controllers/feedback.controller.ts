import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';
import { FeedbackWithTimestamp } from '../types/index.js';

export const getFeedbacks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter = (req.query.filter as string) || '';
    // Limit filter length for safety
    const safeFilter = filter.substring(0, 200);
    const feedbacks = await storageService.getFeedbacks(safeFilter || undefined);

    const feedbacksWithTimestamp: FeedbackWithTimestamp[] = feedbacks.map((f) => ({
      ...f,
      formattedTimestamp: f.timestamp
        ? new Date(f.timestamp).toISOString().replace('T', ' ').substring(0, 19)
        : 'N/A',
    }));

    res.render('feedback', { feedbacks: feedbacksWithTimestamp, filter: safeFilter });
  } catch (error) {
    next(error);
  }
};

export const deleteFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rowKey } = req.body as { rowKey: string };
    if (!rowKey || typeof rowKey !== 'string' || rowKey.trim() === '') {
      res.status(400).render('error', { message: 'Invalid rowKey' });
      return;
    }
    await storageService.deleteFeedback('Feedbacks', rowKey.trim());
    res.redirect('/feedback');
  } catch (error) {
    next(error);
  }
};

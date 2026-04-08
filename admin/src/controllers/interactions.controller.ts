import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';
import { InteractionWithTimestamp } from '../types/index.js';

function formatTimestamp(timestamp?: Date): string {
	return timestamp
		? new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19)
		: 'N/A';
}

export const getInteractions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const sort = (req.query.sort as string) || 'desc';
		if (!['asc', 'desc'].includes(sort)) {
			res.status(400).render('error', { message: 'Invalid sort parameter' });
			return;
		}

		const interactions = await storageService.getInteractions(sort as 'asc' | 'desc');

		const interactionsWithTimestamp: InteractionWithTimestamp[] = interactions.map((i) => ({
			...i,
			formattedTimestamp: formatTimestamp(i.timestamp),
		}));

		res.render('interactions', { interactions: interactionsWithTimestamp, sort });
	} catch (error) {
		next(error);
	}
};

export const getInteractionDetail = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { interactionId } = req.params;

		if (!interactionId || typeof interactionId !== 'string' || interactionId.trim() === '') {
			res.status(400).render('error', { message: 'Invalid interaction ID' });
			return;
		}

		const interaction = await storageService.getInteractionById(interactionId.trim());

		if (!interaction) {
			res.status(404).render('error', { message: 'Interaction not found' });
			return;
		}

		res.render('interaction-detail', {
			interaction,
			formattedTimestamp: formatTimestamp(interaction.timestamp),
		});
	} catch (error) {
		next(error);
	}
};

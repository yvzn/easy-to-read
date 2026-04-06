import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service.js';
import { InteractionWithTimestamp } from '../types/index.js';

export const getInteractions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const interactions = await storageService.getInteractions();

		const interactionsWithTimestamp: InteractionWithTimestamp[] = interactions.map((i) => ({
			...i,
			formattedTimestamp: i.timestamp
				? new Date(i.timestamp).toISOString().replace('T', ' ').substring(0, 19)
				: 'N/A',
		}));

		res.render('interactions', { interactions: interactionsWithTimestamp });
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

		const formattedTimestamp = interaction.timestamp
			? new Date(interaction.timestamp).toISOString().replace('T', ' ').substring(0, 19)
			: 'N/A';

		res.render('interaction-detail', { interaction, formattedTimestamp });
	} catch (error) {
		next(error);
	}
};

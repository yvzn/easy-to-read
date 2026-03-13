import app from './app.js';
import { config } from './config/index.js';
import { storageService } from './services/storage.service.js';

const port = Number(config.port);

app.listen(port, () => {
	console.log(`Admin server running on http://localhost:${port}`);
	storageService.ensureTablesExist().catch((err: unknown) => {
		console.warn('Could not ensure tables exist:', err instanceof Error ? err.message : err);
	});
});

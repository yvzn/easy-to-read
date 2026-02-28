import app from './app.js';
import { config } from './config/index.js';

const port = Number(config.port);

app.listen(port, () => {
  console.log(`Admin server running on http://localhost:${port}`);
});

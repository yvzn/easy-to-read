import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  storageConnectionString: process.env.INTERACTIONS_STORAGE_CONNECTION_STRING || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
};

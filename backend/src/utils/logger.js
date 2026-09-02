import morgan from 'morgan';
import { config } from '../config/env.js';

export const httpLogger = morgan(config.nodeEnv === 'development' ? 'dev' : 'combined');

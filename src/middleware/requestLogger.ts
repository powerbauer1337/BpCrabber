import morgan from 'morgan';
import { stream } from '../utils/logger';

// Create custom Morgan format
const morganFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

// Export Morgan middleware configured to use our Winston logger
export const requestLogger = morgan(morganFormat, { stream });

export const AppConfig = {
  api: {
    baseUrl: process.env.BEATPORT_API_URL || 'https://api.beatport.com/v4',
    clientId: process.env.BEATPORT_CLIENT_ID,
    clientSecret: process.env.BEATPORT_CLIENT_SECRET,
    timeout: 30000,
  },
  download: {
    maxConcurrent: 3,
    defaultPath: process.env.DOWNLOAD_PATH || './downloads',
    maxRetries: 3,
    chunkSize: 1024 * 1024, // 1MB chunks
    allowedFormats: ['mp3', 'wav', 'aiff'],
  },
  auth: {
    tokenStorageKey: 'beatport_auth',
    refreshThreshold: 300, // 5 minutes before expiry
  },
  app: {
    name: 'Beatport Downloader',
    version: '1.0.0',
  },
};

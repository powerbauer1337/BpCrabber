import { google } from 'googleapis';
import http from 'http';
import { parse } from 'url';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read credentials
const credentials = JSON.parse(
  readFileSync(join(__dirname, '../.config/gdrive-credentials.json'), 'utf8')
);
const TOKEN_PATH = join(__dirname, '../.config/gdrive-token.json');

const oauth2Client = new google.auth.OAuth2(
  credentials.web.client_id,
  credentials.web.client_secret,
  credentials.web.redirect_uris[0]
);

// Generate auth url
const scopes = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

// Create server to handle the callback
const server = http.createServer(async (req, res) => {
  try {
    const queryObject = parse(req.url, true).query;
    if (queryObject.code) {
      const { tokens } = await oauth2Client.getToken(queryObject.code);
      writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      res.end('Authentication successful! You can close this window.');
      server.close();
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    res.end('Authentication failed! Please check the console.');
    server.close();
  }
});

// Start the server and open the auth url
server.listen(3000, () => {
  console.log('Opening browser for authentication...');
  open(authUrl);
});

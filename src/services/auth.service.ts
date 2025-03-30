import { AuthService, AuthTokens, UserProfile } from '../types/auth';
import { createHttpClient } from '../utils/http';
import { AppConfig } from '../config/app.config';
import { ElectronStore } from 'electron-store';

export class BeatportAuthService implements AuthService {
  private http = createHttpClient(AppConfig.api.baseUrl);
  private store: ElectronStore;

  constructor() {
    this.store = new ElectronStore({
      name: 'auth',
      encryptionKey: process.env.ENCRYPTION_KEY,
    });
  }

  async login(): Promise<AuthTokens> {
    const response = await this.http.post('/oauth/token', {
      grant_type: 'client_credentials',
      client_id: AppConfig.api.clientId,
      client_secret: AppConfig.api.clientSecret,
    });

    const tokens: AuthTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
    };

    this.store.set(AppConfig.auth.tokenStorageKey, tokens);
    return tokens;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.http.post('/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: AppConfig.api.clientId,
      client_secret: AppConfig.api.clientSecret,
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
    };
  }

  async getProfile(): Promise<UserProfile> {
    const response = await this.http.get('/me');
    return response.data;
  }

  isAuthenticated(): boolean {
    const tokens = this.getTokens();
    return !!tokens?.accessToken;
  }

  getTokens(): AuthTokens | null {
    return this.store.get(AppConfig.auth.tokenStorageKey) as AuthTokens | null;
  }
}

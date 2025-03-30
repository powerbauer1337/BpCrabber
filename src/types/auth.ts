export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  country?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  tokens?: AuthTokens;
  profile?: UserProfile;
  error?: string;
  isLoading: boolean;
}

export interface AuthService {
  login(): Promise<AuthTokens>;
  logout(): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  getProfile(): Promise<UserProfile>;
  isAuthenticated(): boolean;
  getTokens(): AuthTokens | null;
}

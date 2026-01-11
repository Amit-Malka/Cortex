import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

class GoogleClient {
  private oauth2Client: OAuth2Client;
  private scopes: string[];

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.readonly',
    ];
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent',
    });
  }

  async getTokens(code: string): Promise<GoogleTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || undefined,
      scope: tokens.scope!,
      token_type: tokens.token_type!,
      expiry_date: tokens.expiry_date!,
    };
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({
      auth: this.oauth2Client,
      version: 'v2',
    });

    const { data } = await oauth2.userinfo.get();

    return {
      email: data.email!,
      name: data.name!,
      picture: data.picture || undefined,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    return credentials.access_token!;
  }
}

export default GoogleClient;

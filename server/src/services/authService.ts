import GoogleClient from '../utils/googleClient';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';
import AppError from '../utils/AppError';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

class AuthService {
  private googleClient: GoogleClient | null = null;

  private getGoogleClient(): GoogleClient {
    if (!this.googleClient) {
      this.googleClient = new GoogleClient();
    }
    return this.googleClient;
  }

  async handleLogin(code: string): Promise<LoginResponse> {
    try {
      const client = this.getGoogleClient();
      const tokens = await client.getTokens(code);
      
      const userInfo = await client.getUserInfo(tokens.access_token);

      const existingUser = await prisma.user.findUnique({
        where: { email: userInfo.email },
      });

      const user = await prisma.user.upsert({
        where: { email: userInfo.email },
        create: {
          email: userInfo.email,
          name: userInfo.name,
          googleRefreshToken: tokens.refresh_token,
        },
        update: {
          name: userInfo.name,
          googleRefreshToken: tokens.refresh_token || existingUser?.googleRefreshToken,
        },
      });

      const token = signToken(user.id);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(`Authentication failed: ${error.message}`, 401);
      }
      throw new AppError('Authentication failed', 401);
    }
  }

  getAuthUrl(): string {
    return this.getGoogleClient().getAuthUrl();
  }
}

export default new AuthService();

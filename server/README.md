# Cortex Server

Backend API for Cortex with Google OAuth 2.0 authentication and PostgreSQL persistence.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Drive API** and **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Create **Web application** credentials
7. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
8. Copy **Client ID** and **Client Secret** to your `.env` file

### 4. Setup Database

Make sure PostgreSQL is running (via Docker):

```bash
# From project root
docker-compose up -d
```

Run migrations:

```bash
npx prisma migrate dev
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Run Development Server

```bash
npm run dev
```

Server will be available at: http://localhost:3000

## Authentication Flow

### 1. Initiate Google OAuth

```
GET /auth/google
```

Redirects user to Google's OAuth consent screen.

### 2. Google Callback

```
GET /auth/google/callback?code=AUTHORIZATION_CODE
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

### 3. Access Protected Routes

Include the JWT token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints

### Public Routes

- `GET /health` - Health check with database status
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler

### Protected Routes

Use the `protect` middleware to secure routes:

```typescript
import { protect } from './middleware/protect';

router.get('/profile', protect, getProfile);
```

## Project Structure

```
server/
├── src/
│   ├── controllers/      # Request handlers
│   │   └── authController.ts
│   ├── middleware/       # Express middleware
│   │   ├── errorHandler.ts
│   │   └── protect.ts
│   ├── routes/          # Route definitions
│   │   └── authRoutes.ts
│   ├── services/        # Business logic
│   │   └── authService.ts
│   ├── utils/           # Utilities
│   │   ├── AppError.ts
│   │   ├── catchAsync.ts
│   │   ├── googleClient.ts
│   │   ├── jwt.ts
│   │   └── bigintSerializer.ts
│   ├── lib/             # External integrations
│   │   └── prisma.ts
│   ├── types/           # TypeScript types
│   │   └── express.d.ts
│   ├── app.ts           # Express app
│   └── server.ts        # Server entry point
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **JWT**: Stateless authentication
- **Refresh Token Storage**: Secure Google refresh token storage
- **Password-less**: No password storage, OAuth only
- **Request Limits**: 10MB body size limit

## Testing

```bash
npm test
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests with coverage
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret for JWT signing | Random 32+ character string |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxx` |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI | `http://localhost:3000/auth/google/callback` |

## Architecture Principles

- **Separation of Concerns**: Controllers, Services, Utils clearly separated
- **Type Safety**: Strict TypeScript throughout
- **Error Handling**: Centralized with AppError class
- **Async Safety**: catchAsync wrapper prevents unhandled rejections
- **Data Isolation**: Per-user data with composite keys

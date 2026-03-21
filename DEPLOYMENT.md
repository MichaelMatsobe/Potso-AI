# Full-Stack Potso AI - Deployment Guide

## Architecture

- **Frontend**: React 19 + Vite (runs on port 3000)
- **Backend**: Express.js + Firebase (runs on port 8080)
- **Mobile**: React Native + Expo (iOS & Android)
- **Database**: Firestore
- **Authentication**: Firebase Auth

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Firebase project
- Gemini API key
- Service Account Key from Firebase

## Local Development Setup

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 2. Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication (Email/Password or Google)
4. Generate a Service Account Key:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download as JSON
5. Add credentials to `.env.local`:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_PRIVATE_KEY="your-private-key"
   FIREBASE_DATABASE_URL=your-database-url
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Servers

```bash
# Run both web and API servers concurrently
npm run dev

# Or run them separately:
npm run dev:web      # Port 3000
npm run dev:server   # Port 8080
```

### 5. Build for Production

```bash
npm run build
```

## Docker Deployment

### Local Docker Build

```bash
# Build image
docker build -t potso-ai:latest .

# Run container
docker run -p 3000:3000 -p 8080:8080 \
  -e GEMINI_API_KEY=your-key \
  -e FIREBASE_PROJECT_ID=your-id \
  -e FIREBASE_CLIENT_EMAIL=your-email \
  -e FIREBASE_PRIVATE_KEY="your-key" \
  potso-ai:latest
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Cloud Deployment

### Google Cloud Run

```bash
# Build and push to Cloud Run
gcloud run deploy potso-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars=GEMINI_API_KEY=your-key,FIREBASE_PROJECT_ID=your-id \
  --allow-unauthenticated
```

### AWS ECS

```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
docker tag potso-ai:latest your-account.dkr.ecr.us-east-1.amazonaws.com/potso-ai:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/potso-ai:latest

# Create ECS task definition, service, and cluster via AWS Console
```

### Vercel (Frontend Only)

```bash
# Deploy web app
npm run build
vercel deploy dist/
```

## Mobile Development (React Native + Expo)

### Setup

```bash
cd mobile
npm install
```

### Development

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run in web browser
npm run web
```

### Build for App Store/Play Store

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## API Documentation

### Authentication

All protected endpoints require a Bearer token:

```bash
Authorization: Bearer <firebase-id-token>
```

### Endpoints

#### Health Check
- `GET /api/health` - Check server status

#### Chat
- `GET /api/chat` - Get all chats for user
- `POST /api/chat` - Create new chat
- `GET /api/chat/:chatId/messages` - Get messages from chat
- `POST /api/chat/:chatId/messages` - Send message and get response
- `DELETE /api/chat/:chatId` - Delete chat

#### Auth
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/init-user` - Initialize user on first login

## Database Schema (Firestore)

```
users/
  ├── {userId}
      ├── email: string
      ├── displayName: string
      ├── createdAt: timestamp
      ├── preferences: object
      └── chats/
          └── {chatId}
              ├── title: string
              ├── createdAt: timestamp
              └── messages/
                  └── {messageId}
                      ├── role: 'user' | 'assistant'
                      ├── content: string
                      ├── timestamp: timestamp
                      ├── reasoning: array
                      └── artifacts: array
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `potso-ai` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `firebase-admin@...iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase private key (escaped) | `-----BEGIN PRIVATE KEY-----\n...` |
| `FIREBASE_DATABASE_URL` | Firestore database URL | `https://potso-ai.firebaseio.com` |
| `APP_URL` | Web app URL | `https://potso-ai.app` |
| `API_URL` | API server URL | `https://api.potso-ai.app` |
| `API_PORT` | API server port | `8080` |
| `NODE_ENV` | Environment | `production` or `development` |

## Troubleshooting

### Firebase Connection Issues
- Verify service account key is correctly formatted
- Check Firestore rules allow read/write
- Ensure CORS is configured properly

### API Errors
- Check API is running on port 8080
- Verify auth token is valid
- Check API logs for detailed errors

### Mobile App Issues
- Clear Expo cache: `expo start -c`
- Rebuild native dependencies: `cd mobile && npm install`
- Check Expo SDK version compatibility

## Performance Optimization

- Enable Firestore caching
- Use API rate limiting
- Implement CDN for static assets
- Cache chat history locally on mobile
- Use lazy loading for messages

## Security

- Never commit `.env.local` to version control
- Rotate Firebase service account keys regularly
- Enable Firestore security rules
- Use HTTPS in production
- Implement rate limiting
- Validate all API inputs

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review API documentation
3. Contact support team

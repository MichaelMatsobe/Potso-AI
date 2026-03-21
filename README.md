<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Potso AI - Full-Stack Multi-Agent Intelligence System

A production-ready full-stack application featuring a South African multi-agent AI system powered by Google Gemini, with web, mobile (iOS & Android), and backend deployments.

## 🚀 Features

- **Multi-Agent Reasoning**: Collaborative AI agents (Modisa, Tshepo, Kgakgamatso, Tlhaloganyo)
- **Real-Time Chat Interface**: React 19 web app with Vite
- **Mobile Support**: React Native + Expo for iOS & Android
- **Firebase Backend**: Firestore database + Authentication
- **REST API**: Express.js backend with modular architecture
- **Docker Ready**: Containerized deployment on Cloud Run, AWS, or any cloud provider

## 📋 Project Structure

```
potso-ai/
├── src/                      # Web frontend (React + Vite)
│   ├── components/          # React components
│   ├── services/           # API client services
│   └── types.ts            # TypeScript types
├── backend/                 # Express.js backend
│   ├── routes/             # API endpoints (auth, chat)
│   ├── services/           # Business logic (Gemini)
│   ├── middleware/         # Auth middleware
│   └── config/             # Firebase config
├── mobile/                  # React Native + Expo
│   ├── app/                # Expo Router pages
│   ├── components/         # Mobile UI components
│   └── services/           # Mobile API services
├── server.ts               # Express server entry point
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose setup
└── DEPLOYMENT.md           # Detailed deployment guide
```

## 🛠️ Tech Stack

### Frontend Web
- React 19
- Vite
- TypeScript
- Tailwind CSS
- Lucide React (Icons)
- Three.js (3D visualization)

### Mobile
- React Native
- Expo
- Expo Router
- Firebase SDK

### Backend
- Node.js
- Express.js
- TypeScript
- Firebase Admin SDK
- Google Gemini API

### Infrastructure
- Docker
- Firebase/Firestore
- Cloud Run / AWS / Vercel

## 📱 Getting Started

### Quick Start (Development)

```bash
# Install dependencies
npm install

# Install mobile dependencies
cd mobile && npm install && cd ..

# Create environment file
cp .env.example .env.local

# Add your credentials:
# - GEMINI_API_KEY from Google AI Studio
# - Firebase credentials from Firebase Console

# Start both web and API servers
npm run dev

# In another terminal, start mobile app
cd mobile && npm start
```

### URLs

- **Web App**: http://localhost:3000
- **API Server**: http://localhost:8080
- **Mobile Dev**: Scan QR code from Expo CLI

## 🚢 Deployment

### Docker

```bash
# Build
npm run docker:build

# Run
npm run docker:run

# Or use Docker Compose
docker-compose up -d
```

### Cloud Run (Google Cloud)

```bash
gcloud run deploy potso-ai --source . --platform managed --region us-central1
```

### Vercel (Frontend Only)

```bash
npm run build
vercel deploy dist/
```

### See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions

## 📚 API Documentation

### Authentication

All API endpoints require Firebase authentication:

```bash
AUTH_HEADER="Authorization: Bearer <firebase-id-token>"
```

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message and get AI response |
| GET | `/api/chat` | List all chats |
| POST | `/api/chat/:id/messages` | Get chat messages |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update profile |

### Example Request

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "content": "Analyze quantum computing trends"
  }'
```

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```env
# Gemini API
GEMINI_API_KEY=your-key-here

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email@.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Application
APP_URL=http://localhost:3000
API_URL=http://localhost:8080/api
API_PORT=8080
NODE_ENV=development
```

### Mobile (.env.local in `/mobile`)

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_API_URL=https://api.potso-ai.app/api
```

## 🧠 AI Agents

### Multi-Agent System

The system simulates collaboration between 4 specialized agents:

1. **Modisa** - Deep search and data retrieval
2. **Tshepo** - Synthesis and cross-referencing
3. **Kgakgamatso** - Technical audit and code analysis
4. **Tlhaloganyo** - Narrative structure and readability

Each agent can delegate tasks and provide reasoning steps.

## 📱 Mobile App Development

### Setup

```bash
cd mobile
npm install
npm start
```

### Run on Devices

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### Build for Production

```bash
# iOS
npm run build:ios

# Android
npm run build:android
```

### [Mobile Setup Guide](mobile/SETUP.md)

## 🗄️ Database Schema

### Firestore Structure

```
users/
  └── {userId}
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

## 🔐 Security

- JWT token-based authentication
- Firebase security rules
- CORS configuration
- Environment variable protection
- Input validation

## 📊 Performance

- Response caching
- Message sliding window (last 10)
- Lazy loading
- Asset optimization

## 🐛 Troubleshooting

### API Connection Failed

```bash
# Check if server is running
curl http://localhost:8080/api/health

# Verify Firebase credentials
echo $FIREBASE_PRIVATE_KEY
```

### Mobile App Issues

```bash
# Clear cache
expo start -c

# Rebuild dependencies
cd mobile && npm install --legacy-peer-deps
```

### Firebase Auth Issues

- Verify email is registered in Firebase Console
- Check Firestore security rules
- Ensure service account key is valid

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](DEPLOYMENT.md#api-documentation)
- [Mobile Setup](mobile/SETUP.md)
- [Architecture Overview](DEPLOYMENT.md#architecture)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

Licensed under the Apache License 2.0 - see LICENSE file for details.

## 👤 Author

**Michael Aaron Matsobe** in partnership with Google

## 🙏 Acknowledgments

- Google for Gemini API
- Firebase team
- React and React Native communities
- Expo for making mobile development easier

## 📞 Support

For issues and questions:
- Check [GitHub Issues](https://github.com/MichaelMatsobe/Potso-AI/issues)
- Review documentation
- Contact support team

---

**Ready to deploy? Check [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.**

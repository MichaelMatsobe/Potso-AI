# Mobile App Setup

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Xcode (for iOS) or Android Studio (for Android)
- EAS CLI for building: `npm install -g eas-cli`

## Development Setup

### 1. Navigate to Mobile Directory

```bash
cd mobile
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the mobile directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

### 4. Start Development Server

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

## Building for Production

### iOS Distribution

```bash
# Configure EAS project
eas init

# Build for iOS
npm run build:ios

# Submit to App Store
npm run submit:ios
```

### Android Distribution

```bash
# Build for Android
npm run build:android

# Submit to Google Play Store
npm run submit:android
```

## Firebase Setup for Mobile

1. Go to Firebase Console
2. Create a new web app for mobile (you can reuse your existing Firebase project)
3. Copy the config from Firebase Console
4. Add the credentials to `.env.local`

## Architecture

### Folder Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── auth/              # Auth screens
│   └── (tabs)/            # Tabbed interface
├── components/            # Reusable React Native components
├── services/             # API and Firebase services
├── assets/               # Images, icons, fonts
├── app.json              # Expo config
└── package.json          # Dependencies
```

### Key Technologies

- **React Native**: Cross-platform mobile development
- **Expo**: Managed React Native framework
- **Expo Router**: File-based routing (similar to Next.js)
- **Firebase Auth**: User authentication
- **Firebase Firestore**: Cloud database
- **NativeWind**: Tailwind CSS for React Native (optional)

## API Integration

The mobile app connects to the backend API at `http://localhost:8080/api` (or your deployed URL).

### Required Environment Variables for API

```
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find and kill process on port 8080
   lsof -i :8080
   kill <PID>
   ```

2. **Firebase config not loading**
   - Ensure `.env.local` is in the mobile directory
   - Restart Expo dev server after changing env vars

3. **Build fails on iOS**
   ```bash
   # Clear cache and rebuild
   npm run build:ios -- --clear-cache
   ```

4. **Android emulator not connecting**
   ```bash
   # Check ADB connections
   adb devices
   ```

## Testing

### Run Tests

```bash
npm test
```

### E2E Testing (if configured)

```bash
npm run e2e
```

## Performance Optimization

- Use React.memo() for expensive components
- Implement API response caching
- Lazy load heavy dependencies
- Use native performance monitoring (Sentry)

## Security

- Never commit `.env.local` to version control
- Use environment variables for all secrets
- Validate all user inputs
- Implement proper authentication token handling
- Use HTTPS for all API calls

## Deployment Checklist

- [ ] Update version in app.json
- [ ] Configure Firebase rules
- [ ] Set up push notifications
- [ ] Configure error tracking (Sentry)
- [ ] Test on real devices
- [ ] Create app store listings
- [ ] Prepare screenshots and descriptions
- [ ] Submit to App Store/Play Store

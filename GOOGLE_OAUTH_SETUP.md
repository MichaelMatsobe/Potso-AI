# Google OAuth Setup Guide

This guide explains how to set up Google OAuth for authentication in Potso AI.

## Prerequisites

- Google Cloud Console account
- Firebase project already set up
- Admin access to your Firebase Console

## Step 1: Create Google OAuth 2.0 Credentials

### 1.1 Go to Google Cloud Console

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Go to **APIs & Services** > **Credentials**

### 1.2 Create OAuth 2.0 Client ID

1. Click **+ Create Credentials** > **OAuth 2.0 Client IDs**
2. If prompted, configure the OAuth consent screen first:
   - Choose **External** user type
   - Fill in app name, user support email, and developer contact
   - On scopes, add: `email`, `profile`, `openid`
   - Add test users if needed
3. Return to Credentials and create OAuth 2.0 Client ID for **Web application**

### 1.3 Configure Authorized Redirect URIs

Add these URIs to your OAuth 2.0 credentials:

**Development:**
```
http://localhost:3001
http://localhost:3000
http://127.0.0.1:3001
http://127.0.0.1:3000
```

**Production:**
```
https://your-domain.com
https://www.your-domain.com
```

### 1.4 Copy Your Client ID

- Go back to **Credentials** > **OAuth 2.0 Client IDs**
- Click on your Web application credential
- Copy the **Client ID** (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)

## Step 2: Update Environment Variables

### 2.1 Frontend Setup

Add to `.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

Example:
```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

### 2.2 Verify Other Environment Variables

Ensure these are also set in `.env.local`:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_API_KEY=your-firebase-web-api-key
GEMINI_API_KEY=your-gemini-api-key
```

## Step 3: Enable Google Sign-In in Firebase

### 3.1 Configure Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** > **Sign-in method**
4. Click **Google** provider
5. Enable it
6. Select the same Google Cloud project you're using
7. Click **Save**

## Step 4: Test Google OAuth

### 4.1 Start the Application

```bash
npm run dev
```

The app will start on `http://localhost:3001`.

### 4.2 Test Sign-In & Sign-Up

1. Go to the login page
2. Click **Sign in with Google** button
3. You should see a Google Sign-In popup or redirect to Google login
4. After authentication, you'll be signed in and redirected to the chat

### 4.3 Test Sign-Up

1. Go to the signup page
2. Click **Sign up with Google** button
3. Follow the same Google authentication flow
4. A new user account will be created automatically

## How It Works

### Frontend Flow

1. **Login/Signup Page Loads**
   - Google Sign-In library is initialized with your Client ID
   - Google Sign-In buttons are rendered

2. **User Clicks Google Button**
   - Google authentication popup appears
   - User logs in with their Google account
   - Google returns an ID token

3. **Token Sent to Backend**
   - Frontend sends the ID token to `/api/auth/google`
   - Backend verifies the token with Firebase

4. **User Account Created/Updated**
   - If user doesn't exist, a new account is created in Firestore
   - User profile includes their Google email and display name
   - Auth token is returned to frontend

5. **Session Established**
   - Frontend stores the auth token in localStorage
   - User is logged in and redirected to the chat

### Backend Flow

1. **Token Verification**
   - Backend receives the Google ID token
   - Firebase Admin SDK verifies the token's authenticity
   - User ID and email are extracted from the verified token

2. **User Management**
   - Check if user exists in Firestore
   - Create new user if necessary with default preferences
   - Update last login timestamp

3. **Session Token Creation**
   - Generate a custom Firebase auth token
   - Return to frontend for future API requests

## Features

### Automatic Account Creation

- Users signing in with Google for the first time automatically get an account created
- Their display name is derived from their Google profile
- Default preferences are applied (dark theme, notifications enabled, etc.)

### Profile Synchronization

- User email comes from Google account
- Display name is set to Google's provided name or email
- Can be customized later in Settings

### Security

- All ID tokens are verified with Firebase Admin SDK
- Tokens are validated server-side before creating sessions
- HTTPS required for production deployments

## Troubleshooting

### Issue: "Failed to initialize Google Sign-In"

**Solution:**
- Verify `VITE_GOOGLE_CLIENT_ID` is set correctly in `.env.local`
- Reload the page to ensure the Google Sign-In script loads

### Issue: "Invalid or expired ID token"

**Solution:**
- Check that your Firebase credentials are valid
- Ensure the Google OAuth app is enabled in Firebase Console
- Verify the client ID matches your Firebase project

### Issue: Sign-in works on localhost but not on production

**Solution:**
- Add your production domain to **Authorized redirect URIs** in Google Cloud Console
- Update environment variables for production deployment
- Ensure HTTPS is enabled
- Clear browser cache and cookies

### Issue: "User not found" errors after Google sign-in

**Solution:**
- Check Firebase Firestore has write permissions
- Verify Firebase configuration is correct
- Check browser console for detailed error messages

## Production Deployment

### 1. Update Google OAuth Settings

1. Go to Google Cloud Console
2. Update **Authorized redirect URIs** with your production domain
3. Test on staging first

### 2. Set Environment Variables

Deploy these environment variables to your production environment:

```env
VITE_GOOGLE_CLIENT_ID=your-prod-client-id
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_API_KEY=your-firebase-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Enable HTTPS

Google OAuth requires HTTPS for production. Ensure your deployment uses HTTPS.

### 4. Privacy Policy & Terms

When deploying to production, update your:
- Privacy Policy
- Terms of Service

To include information about Google OAuth sign-in.

## Additional Resources

- [Google Sign-In for Web Documentation](https://developers.google.com/identity/sign-in/web)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Firebase Console](https://console.firebase.google.com/)

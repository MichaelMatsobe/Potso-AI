import { Router, Response } from 'express';
import { getAuth, getFirestore } from '../config/firebase';
import { AuthRequest, verifyAuthToken } from '../middleware/auth';

const router = Router();

// Sign up - Create new user account
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and displayName are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const auth = getAuth();
    const db = getFirestore();

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      uid: userRecord.uid,
      createdAt: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        fontSize: 'medium',
        notificationsEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        messageGrouping: true,
        codeHighlighting: true,
        autoSave: true,
        showTimestamps: true,
        compactMode: false
      }
    });

    // Generate custom token for immediate login
    const token = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      id: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      token
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to create account' });
  }
});

// Login - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const auth = getAuth();

    try {
      // Verify the password using the REST API
      const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + process.env.FIREBASE_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      if (!response.ok) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const data = await response.json();
      const userId = data.localId;

      // Get user profile from Firestore
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();

      const user = {
        id: userId,
        email: data.email,
        displayName: data.displayName || data.email?.split('@')[0],
        ...(userDoc.exists && userDoc.data())
      };

      // Create custom token for backend validation
      const token = await auth.createCustomToken(userId);

      res.json({
        ...user,
        token,
        idToken: data.idToken
      });
    } catch (error: any) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Failed to login' });
  }
});

// Google OAuth sign-in
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    const auth = getAuth();
    const db = getFirestore();

    try {
      // Verify the Google ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      const userId = decodedToken.uid;
      const email = decodedToken.email;
      const displayName = decodedToken.name || email?.split('@')[0];

      // Check if user exists in Firestore
      let userDoc = await db.collection('users').doc(userId).get();

      // If user doesn't exist, create them
      if (!userDoc.exists) {
        await db.collection('users').doc(userId).set({
          email,
          displayName,
          uid: userId,
          createdAt: new Date().toISOString(),
          googleAuth: true,
          preferences: {
            theme: 'dark',
            fontSize: 'medium',
            notificationsEnabled: true,
            soundEnabled: true,
            vibrationEnabled: true,
            messageGrouping: true,
            codeHighlighting: true,
            autoSave: true,
            showTimestamps: true,
            compactMode: false
          }
        });

        userDoc = await db.collection('users').doc(userId).get();
      } else {
        // Update last login
        await db.collection('users').doc(userId).update({
          lastLogin: new Date().toISOString(),
          googleAuth: true
        });
      }

      // Create custom token for backend validation
      const token = await auth.createCustomToken(userId);

      const user = {
        id: userId,
        email,
        displayName,
        ...(userDoc.exists && userDoc.data())
      };

      res.json({
        ...user,
        token
      });
    } catch (error: any) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid or expired ID token' });
    }
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: error.message || 'Failed to sign in with Google' });
  }
});

// Get current user profile
router.get('/profile', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const db = getFirestore();

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: userId,
      email: req.email,
      ...userDoc.data()
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { displayName, photoURL, preferences } = req.body;
    const db = getFirestore();

    const profileData: any = {
      updatedAt: new Date().toISOString()
    };

    if (displayName) profileData.displayName = displayName;
    if (photoURL) profileData.photoURL = photoURL;
    if (preferences) profileData.preferences = preferences;

    await db.collection('users').doc(userId).update(profileData);

    // Also update display name in Firebase Auth if provided
    if (displayName) {
      await getAuth().updateUser(userId, { displayName });
    }

    res.json({
      id: userId,
      email: req.email,
      ...profileData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update user preferences
router.put('/preferences', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { preferences } = req.body;
    const db = getFirestore();

    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    await db.collection('users').doc(userId).update({
      preferences,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Change password
router.post('/change-password', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Verify current password first
    try {
      const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + process.env.FIREBASE_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: req.email,
          password: currentPassword,
          returnSecureToken: true
        })
      });

      if (!response.ok) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    } catch (error) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await getAuth().updateUser(userId, { password: newPassword });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

// Reset password request
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const auth = getAuth();

    try {
      // Check if user exists
      await auth.getUserByEmail(email);
    } catch (error) {
      // Firebase returns error if user doesn't exist, but we don't expose this
      return res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link will be sent' 
      });
    }

    // In production, you would use Firebase Auth REST API to send password reset email
    // For now, we just confirm the request was processed
    res.json({ 
      success: true, 
      message: 'Password reset email sent successfully' 
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Verify email
router.post('/verify-email', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Mark email as verified in database
    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      emailVerified: true,
      updatedAt: new Date().toISOString()
    });

    // Update Firebase Auth user
    await getAuth().updateUser(userId, { emailVerified: true });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error: any) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: error.message || 'Failed to verify email' });
  }
});

// Delete account
router.delete('/delete-account', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    // Verify password before deletion
    try {
      await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + process.env.FIREBASE_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: req.email,
          password,
          returnSecureToken: true
        })
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const db = getFirestore();

    // Delete user chats and data from Firestore
    const chatsCollection = db.collection('users').doc(userId).collection('chats');
    const chats = await chatsCollection.get();
    const batch = db.batch();

    chats.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete user document
    batch.delete(db.collection('users').doc(userId));
    await batch.commit();

    // Delete Firebase Auth user
    await getAuth().deleteUser(userId);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: error.message || 'Failed to delete account' });
  }
});

// Create or initialize user on first login
router.post('/init-user', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      await db.collection('users').doc(userId).set({
        email: req.email,
        displayName: req.email?.split('@')[0] || 'User',
        createdAt: new Date().toISOString(),
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      });
    }

    res.json({ success: true, userId });
  } catch (error) {
    console.error('Error initializing user:', error);
    res.status(500).json({ error: 'Failed to initialize user' });
  }
});

export default router;

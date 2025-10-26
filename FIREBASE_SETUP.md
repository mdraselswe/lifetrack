# Firebase Setup Guide for LifeTrack App

## 🚀 Firebase Project Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `lifetrack-app` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### Step 3: Create Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)
5. Click "Done"

### Step 4: Get Firebase Configuration
1. In Firebase Console, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (`</>`)
4. Enter app nickname: `lifetrack-web`
5. Click "Register app"
6. Copy the Firebase configuration object

### Step 5: Configure Environment Variables
Create a `.env.local` file in your project root with the following content:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Replace the values with your actual Firebase configuration values.

### Step 6: Update Firebase Configuration
1. Open `lib/firebase.ts`
2. Replace the placeholder values with your actual Firebase config
3. Or use environment variables (recommended)

## 🔧 Firestore Security Rules

### Development Rules (Test Mode)
For development, you can use these simple rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Production Rules (Recommended)
For production, use these more secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{collection}/{document} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId
        && resource == null; // Only allow create operations
    }
    
    // Allow updates to existing documents
    match /users/{userId}/{collection}/{document} {
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && resource != null; // Document must exist
    }
  }
}
```

## 📱 App Features with Firebase

### ✅ What You Get:
1. **Real-time Data Sync**: Changes appear instantly across all devices
2. **User Authentication**: Secure login/registration system
3. **Cloud Storage**: Data stored in Firebase cloud
4. **Offline Support**: App works offline, syncs when online
5. **Cross-device Sync**: Same data on phone, tablet, computer
6. **Automatic Backups**: Data automatically backed up
7. **Scalable**: Handles thousands of users

### 🔄 Data Structure:
```
users/
  {userId}/
    debts/
      {debtId}/
        - personName: string
        - amount: number
        - reason: string
        - date: string
        - returned: boolean
        - payments: array
        - increases: array
    loans/
      {loanId}/
        - personName: string
        - amount: number
        - reason: string
        - date: string
        - returned: boolean
        - payments: array
        - increases: array
    reminders/
      {reminderId}/
        - title: string
        - description: string
        - scheduledTime: string
        - dismissed: boolean
```

## 🚀 Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables in Vercel:
1. Go to your Vercel project dashboard
2. Go to "Settings" → "Environment Variables"
3. Add all the Firebase environment variables
4. Redeploy your app

## 🔒 Security Best Practices

1. **Never expose Firebase config in client code**
2. **Use environment variables**
3. **Set up proper Firestore rules**
4. **Enable App Check for production**
5. **Monitor usage in Firebase Console**

## 📊 Monitoring

### Firebase Console Features:
- **Authentication**: Monitor user sign-ups and logins
- **Firestore**: View database usage and performance
- **Analytics**: Track app usage (if enabled)
- **Performance**: Monitor app performance
- **Crashlytics**: Track app crashes

## 🆘 Troubleshooting

### Common Issues:
1. **"Firebase not initialized"**: Check environment variables
2. **"Permission denied"**: Check Firestore rules
3. **"Network error"**: Check internet connection
4. **"User not authenticated"**: Check authentication setup

### Debug Steps:
1. Check browser console for errors
2. Verify environment variables
3. Check Firebase Console for errors
4. Test with Firebase Console directly

## 💰 Pricing

### Firebase Free Tier:
- **Authentication**: 10,000 users/month
- **Firestore**: 1GB storage, 50K reads/day
- **Hosting**: 10GB bandwidth/month

### When You Need to Upgrade:
- More than 10,000 users
- More than 1GB data storage
- High read/write operations

## 🎯 Next Steps

1. Set up Firebase project
2. Configure environment variables
3. Test authentication
4. Test data sync
5. Deploy to production
6. Monitor usage

## 📞 Support

If you need help:
1. Check Firebase documentation
2. Check Next.js documentation
3. Check this app's code comments
4. Test with Firebase Console

---

**Happy coding! 🚀**

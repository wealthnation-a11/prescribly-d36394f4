# Android Build & Play Store Deployment Guide

## Prerequisites

Before you begin, ensure you have:

1. **Google Play Developer Account** ($25 one-time fee)
   - Sign up at: https://play.google.com/console

2. **Development Environment**
   - Node.js installed
   - Android Studio installed
   - Java Development Kit (JDK) 11 or higher

3. **App Assets Ready**
   - App icon: 512x512 PNG (use `public/pwa-512x512.png`)
   - Feature graphic: 1024x500 PNG
   - At least 2 screenshots (phone)
   - Short description (80 characters max)
   - Full description (4000 characters max)

## Step 1: Export Project from Lovable

1. Click **GitHub** button in Lovable
2. Click **Connect to GitHub**
3. Authorize and create repository
4. Clone your repository locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
   cd YOUR-REPO
   ```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Initialize Capacitor for Android

```bash
# Add Android platform
npx cap add android

# Build the web app
npm run build

# Sync web app to native project
npx cap sync android
```

## Step 4: Open in Android Studio

```bash
npx cap open android
```

This will open the Android project in Android Studio.

## Step 5: Configure Signing (Required for Release)

### Create Keystore

In Android Studio terminal, run:
```bash
keytool -genkey -v -keystore prescribly-release.keystore -alias prescribly -keyalg RSA -keysize 2048 -validity 10000
```

**IMPORTANT:** Save the passwords securely! You'll need them for every release.

### Configure Signing in Android Studio

1. In Android Studio, go to: **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Click **Create new** keystore or use existing
4. Fill in all the required information
5. Choose **release** build variant
6. Check both signature versions (V1 and V2)

Alternatively, edit `android/app/build.gradle` to add signing configuration:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('prescribly-release.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'prescribly'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 6: Build Release Bundle

### Option A: Via Android Studio

1. **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Select your keystore
4. Choose **release** variant
5. Click **Finish**

The AAB file will be generated in: `android/app/release/app-release.aab`

### Option B: Via Command Line

```bash
cd android
./gradlew bundleRelease
```

## Step 7: Test on Device

Before submitting to Play Store, test on a real device:

```bash
# Development build
npx cap run android

# Or test the release APK
npx cap run android --target=device
```

## Step 8: Upload to Google Play Console

1. **Log in to Google Play Console**: https://play.google.com/console
2. **Create New App**:
   - Click "Create app"
   - Fill in app details (name: Prescribly, default language, etc.)
   - Declare if it's an app or game
   - Accept policies

3. **Set Up Store Listing**:
   - **App name**: Prescribly
   - **Short description**: Your 80-character pitch
   - **Full description**: Detailed description of features
   - **App icon**: Upload `public/pwa-512x512.png`
   - **Feature graphic**: Upload 1024x500 image
   - **Screenshots**: At least 2 phone screenshots
   - **Categorization**: Medical app
   - **Contact details**: Support email
   - **Privacy policy**: Link to your privacy policy

4. **Content Rating**:
   - Fill out the questionnaire
   - For health/medical apps, be honest about health advice features

5. **App Content**:
   - Privacy policy URL
   - Ads declaration (if using ads)
   - Target audience and content
   - Data safety section (IMPORTANT for health apps)

6. **Pricing & Distribution**:
   - Select countries
   - Set pricing (Free)
   - Confirm content guidelines compliance

7. **Release → Production**:
   - Click "Create new release"
   - Upload your AAB file (`app-release.aab`)
   - Add release notes
   - Review and rollout

## Step 9: Submit for Review

1. Review all sections (green checkmarks required)
2. Click **Submit for Review**
3. Wait for approval (typically 1-7 days)

## Important Notes for Health/Medical Apps

### Required Disclaimers
Add these to your app description and within the app:

```
MEDICAL DISCLAIMER:
This app is for informational purposes only and is not a substitute 
for professional medical advice, diagnosis, or treatment. Always seek 
the advice of your physician or other qualified health provider with 
any questions you may have regarding a medical condition.
```

### Data Safety Section
Declare what data you collect:
- User accounts and info (email, name, health data)
- Personal data (medical history, prescriptions)
- Encrypted data transmission
- User can request data deletion

### Privacy Policy
Ensure your privacy policy covers:
- What health data is collected
- How it's stored (encrypted)
- Who has access (doctors, practitioners)
- HIPAA compliance measures
- User rights (access, deletion, portability)

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew build
```

### Sync Issues
```bash
# Re-sync Capacitor
npm run build
npx cap sync android
```

### Version Updates
Update version in `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 2      // Increment for each release
        versionName "1.1"  // Semantic version
    }
}
```

## Updating Your App

When you make changes:

1. Make changes in Lovable
2. Git pull latest code
3. `npm run build`
4. `npx cap sync android`
5. Generate new signed bundle
6. Upload to Play Console as new release

## Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android Studio Guide](https://developer.android.com/studio/publish)
- [Lovable Capacitor Blog Post](https://lovable.dev/blog/mobile-apps-with-capacitor)

## Support

For issues specific to:
- **Capacitor**: [Capacitor GitHub](https://github.com/ionic-team/capacitor)
- **Play Store policies**: Google Play Console support
- **Lovable features**: Lovable Discord community

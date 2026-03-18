---
description: how to build and install the android application
---

Follow these steps to build the AuraWall APK and install it on your Android device:

1. **Sync Assets**: Ensure your latest web changes are synced to the Android project.
// turbo
```powershell
npx cap sync android
```

2. **Open in Android Studio**: Open the native project to build the APK.
// turbo
```powershell
npx cap open android
```

3. **Build the APK**:
   - In Android Studio, wait for Gradle to finish syncing.
   - Go to the top menu: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - After a few minutes, a notification will appear at the bottom right. Click **locate** to find your `app-debug.apk`.

4. **Install on Phone**:
   - Connect your phone to your computer via USB.
   - Copy the `app-debug.apk` file to your phone's storage.
   - On your phone, use a File Manager to find the APK and tap it to install (you may need to allow "Install from unknown sources").

5. **Set Live Wallpaper**:
   - Open the **AuraWall** app.
   - Go to **Settings** and tap **Set as Live Wallpaper**.
   - Select **AuraWall** from the system wallpaper list and tap **Set Wallpaper**.

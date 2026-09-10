# 📱 Android Build Guide

## Overview

LunaStream includes native Android apps for both mobile phones and Android TV devices. These are lightweight WebView wrappers that load the web application in a native container.

## Apps Included

### 📱 LunaStream Mobile
- **Package**: `com.lunastream.app`
- **File**: `LunaStream-mobile-1.0.0.apk`
- **Size**: ~7 MB
- **Min Android**: 7.0 (API 24)
- **Features**:
  - Fullscreen immersive experience
  - Touch-optimized interface
  - DOM storage enabled
  - Media playback support
  - Back navigation support

### 📺 LunaStream TV
- **Package**: `com.lunastream.tv`
- **File**: `LunaStream-tv-1.0.0.apk`
- **Size**: ~8 MB
- **Min Android**: 5.0 (API 21)
- **Features**:
  - D-pad navigation support
  - Leanback UI compatibility
  - Remote control friendly
  - Zoom controls
  - Fullscreen playback

## Building Locally

### Prerequisites
- Android SDK installed
- Java 17 (JDK)
- Gradle 8.2

### Build Mobile App
```bash
cd android-mobile
chmod +x gradlew
./gradlew assembleRelease
```
APK location: `app/build/outputs/apk/release/app-release-unsigned.apk`

### Build TV App
```bash
cd android-tv
chmod +x gradlew
./gradlew assembleRelease
```
APK location: `app/build/outputs/apk/release/app-release-unsigned.apk`

## Installation

### Mobile App
1. Download `LunaStream-mobile-1.0.0.apk` from releases
2. Enable "Install from unknown sources" in Android settings
3. Install the APK
4. Launch LunaStream

### TV App
1. Download `LunaStream-tv-1.0.0.apk` from releases
2. Transfer to your Android TV device (via USB, network, etc.)
3. Install using a file manager
4. Launch from your apps list

## Architecture

Both apps use a WebView approach:
- Lightweight (~7-8 MB)
- Loads the deployed web app
- Native fullscreen experience
- Offline caching via WebView
- Media playback support

The apps point to `https://lunastream.vercel.app` by default.

## Customization

To point the apps to your own deployment:

### Mobile
Edit `android-mobile/app/src/main/java/com/lunastream/app/MainActivity.java`:
```java
webView.loadUrl("https://your-deployment.com");
```

### TV
Edit `android-tv/app/src/main/java/com/lunastream/tv/MainActivity.java`:
```java
webView.loadUrl("https://your-deployment.com?mode=tv");
```

## Known Limitations

- Requires internet connection (loads web app)
- No native video download capability
- Some browser features may be limited by WebView
- TV app uses `?mode=tv` parameter for TV-optimized UI

## Future Improvements

Potential enhancements:
- Offline mode with cached content
- Native video player integration
- Push notifications
- Chromecast support
- Background playback
- Picture-in-picture mode

## CI/CD Integration

Both Android apps are built automatically in GitHub Actions:
- Triggered on every push to main
- Built alongside desktop apps
- Included in release assets
- Build time: ~1.5-2 minutes each

## Support

For issues specific to Android apps:
- Check if the issue also occurs in web browser
- Verify Android version compatibility
- Clear WebView cache: Settings > Apps > LunaStream > Clear Cache

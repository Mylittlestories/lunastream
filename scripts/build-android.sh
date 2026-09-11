#!/bin/bash

# LunaStream Android Build Script
# This script builds both mobile and TV Android APKs

set -e

echo "🌙 Building LunaStream Android Apps..."

# Build Mobile APK
echo "📱 Building Mobile APK..."
cd android-mobile
chmod +x gradlew 2>/dev/null || true

# Download gradle wrapper if not present
if [ ! -f "gradlew" ]; then
    echo "Downloading Gradle wrapper..."
    curl -fsSL https://services.gradle.org/distributions/gradle-8.2-bin.zip -o gradle.zip
    unzip -q gradle.zip
    ./gradle-8.2/bin/gradle wrapper
    rm -rf gradle.zip gradle-8.2
fi

# Build APK
./gradlew assembleRelease --no-daemon

# Copy APK to dist folder
mkdir -p ../dist
cp app/build/outputs/apk/release/app-release-unsigned.apk ../dist/LunaStream-mobile-1.0.0.apk
cd ..

# Build TV APK
echo "📺 Building TV APK..."
cd android-tv
chmod +x gradlew 2>/dev/null || true

# Download gradle wrapper if not present
if [ ! -f "gradlew" ]; then
    echo "Downloading Gradle wrapper..."
    curl -fsSL https://services.gradle.org/distributions/gradle-8.2-bin.zip -o gradle.zip
    unzip -q gradle.zip
    ./gradle-8.2/bin/gradle wrapper
    rm -rf gradle.zip gradle-8.2
fi

# Build APK
./gradlew assembleRelease --no-daemon

# Copy APK to dist folder
cp app/build/outputs/apk/release/app-release-unsigned.apk ../dist/LunaStream-tv-1.0.0.apk
cd ..

echo "✅ Android builds complete!"
echo "📱 Mobile APK: dist/LunaStream-mobile-1.0.0.apk"
echo "📺 TV APK: dist/LunaStream-tv-1.0.0.apk"

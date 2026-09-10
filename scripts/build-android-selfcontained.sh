#!/bin/bash
# Build self-contained Android APKs with embedded web app
set -e

echo "🌙 Building LunaStream Self-Contained Android Apps"
echo "================================================"

# Step 1: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Step 2: Build static web app
echo ""
echo "🏗️  Building static web app..."
npm run build

echo ""
echo "✅ Web app built (output: out/)"
echo "   Size: $(du -sh out/ | cut -f1)"

# Step 3: Copy to Android assets
echo ""
echo "📱 Copying web app to Android assets..."

# Mobile
rm -rf android-mobile/app/src/main/assets/*
mkdir -p android-mobile/app/src/main/assets
cp -r out/* android-mobile/app/src/main/assets/

# TV
rm -rf android-tv/app/src/main/assets/*
mkdir -p android-tv/app/src/main/assets
cp -r out/* android-tv/app/src/main/assets/

echo "✅ Assets copied to both apps"

# Step 4: Generate debug keystore
echo ""
echo "🔑 Generating debug keystore..."
mkdir -p ~/.android
if [ ! -f ~/.android/debug.keystore ]; then
    keytool -genkey -v -keystore ~/.android/debug.keystore \
        -storepass android -alias androiddebugkey -keypass android \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -dname "CN=Debug, OU=Debug, O=Debug, L=Debug, ST=Debug, C=US"
    echo "✅ Debug keystore generated"
else
    echo "✅ Debug keystore already exists"
fi

# Step 5: Build Android APKs
echo ""
echo "🔨 Building Mobile APK..."
cd android-mobile
chmod +x gradlew
./gradlew assembleRelease --no-daemon
cd ..

echo ""
echo "🔨 Building TV APK..."
cd android-tv
chmod +x gradlew
./gradlew assembleRelease --no-daemon
cd ..

# Step 6: Copy APKs to dist
echo ""
echo "📦 Copying APKs to dist/..."
mkdir -p dist
cp android-mobile/app/build/outputs/apk/release/LunaStream-mobile-1.0.0.apk dist/
cp android-tv/app/build/outputs/apk/release/LunaStream-tv-1.0.0.apk dist/

echo ""
echo "✅ Build complete!"
echo ""
echo " Output files:"
echo "   Mobile: dist/LunaStream-mobile-1.0.0.apk"
echo "   TV:     dist/LunaStream-tv-1.0.0.apk"
echo ""
echo "These APKs are FULLY SELF-CONTAINED - no server needed!"

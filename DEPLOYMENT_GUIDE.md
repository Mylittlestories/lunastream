# 🚀 Quick Deployment Guide

## Why You Need to Deploy

The Android apps (Mobile & TV) load the web application from a URL. Before using the Android apps, you need to deploy the web app so the apps have a working URL to connect to.

## Option 1: Deploy to Vercel (Recommended) - 2 minutes

### Step 1: Sign up for Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account
3. Authorize Vercel to access your GitHub repositories

### Step 2: Import Your Repository
1. Click "Add New Project"
2. Import `Mylittlestories/lunastream`
3. Vercel will auto-detect it as a Next.js project
4. Click "Deploy"

### Step 3: Update Android Apps
Once deployed, you'll get a URL like `https://lunastream-xxx.vercel.app`

Update the URL in:
- **Mobile**: `android-mobile/app/src/main/java/com/lunastream/app/MainActivity.java` (line 15)
- **TV**: `android-tv/app/src/main/java/com/lunastream/tv/MainActivity.java` (line 15)

Change:
```java
private static final String APP_URL = "https://lunastream.vercel.app";
```

To your new Vercel URL:
```java
private static final String APP_URL = "https://your-app.vercel.app";
```

Then rebuild the Android apps (CI will do this automatically on next release).

---

## Option 2: Deploy to Netlify - 2 minutes

1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select `lunastream`
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Click "Deploy site"

---

## Option 3: Self-Host with Docker - 5 minutes

```bash
# Clone the repository
git clone https://github.com/Mylittlestories/lunastream.git
cd lunastream

# Build and run with Docker
docker build -t lunastream .
docker run -d -p 3000:3000 -e JWT_SECRET=your-secret-key lunastream

# Update Android apps to use your server's IP:
# http://YOUR_SERVER_IP:3000
```

---

## Option 4: Deploy to Railway - 3 minutes

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `lunastream`
5. Railway will auto-detect and deploy

---

## After Deployment

Once your web app is deployed:

1. **Rebuild Android apps** (automatic on next GitHub release)
2. **Download new APKs** from GitHub Releases
3. **Install on your devices**
4. **Enjoy!** 🎉

---

## Troubleshooting

### "App not installed" error
- Enable "Install from unknown sources" in Android settings
- Make sure you downloaded the APK from GitHub Releases

### "DEPLOYMENT_NOT_FOUND" error
- The web app URL is not accessible
- Check that your deployment is live
- Verify the URL in the Android app source code

### White screen
- Check internet connection
- Verify the deployment URL is correct
- Try clearing the WebView cache

---

## Need Help?

- **GitHub Issues**: [Report a bug](https://github.com/Mylittlestories/lunastream/issues)
- **Documentation**: [README.md](README.md)
- **Android Guide**: [ANDROID_BUILD.md](ANDROID_BUILD.md)

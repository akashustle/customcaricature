# 📱 Play Store Release Guide — Custom Caricature Club

This project is wrapped with **Capacitor** so you can publish the same web app
to the Google Play Store as a real native Android app.

> Everything below has to be run on **your own computer** (Mac, Windows, or
> Linux) — Lovable's cloud editor cannot build native binaries.

---

## 1. One-time setup on your computer

1. Install **Android Studio** → <https://developer.android.com/studio>
   (this also installs the Android SDK and emulator)
2. Install **Node.js 20+** → <https://nodejs.org>
3. Install **Java 17 (JDK)** → already bundled with Android Studio
4. In Lovable, click **GitHub → Connect to GitHub** and push this repo to
   your own GitHub account.

---

## 2. Pull the project locally

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
```

---

## 3. First-time Android setup

```bash
# Add the native Android project (creates the /android folder)
npx cap add android

# Build the web bundle and copy it into the Android project
npm run build
npx cap sync android

# Generate launcher icons & splash from /resources
npx @capacitor/assets generate --android
```

> If `@capacitor/assets` isn't installed, run:
> `npm i -D @capacitor/assets` first.

---

## 4. Test on a real phone or emulator

```bash
npx cap run android
```

This opens Android Studio (or pushes straight to a connected USB device with
USB debugging on).

While you keep `capacitor.config.ts → server.url` enabled, the app live-reloads
from the Lovable preview — perfect for testing changes fast.

---

## 5. Production build for Play Store

### 5a. Disable hot-reload first

Open `capacitor.config.ts` and **comment out the entire `server` block** so
the app ships with the bundled offline `dist/` files:

```ts
// server: {
//   url: '...',
//   cleartext: true,
// },
```

### 5b. Build the release bundle

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

The signed AAB will be at:

```
android/app/build/outputs/bundle/release/app-release.aab
```

### 5c. Sign the AAB

If this is your first release, generate a keystore (KEEP IT SAFE — you can
never replace it once published):

```bash
keytool -genkey -v -keystore caricature-release.keystore \
  -alias caricature -keyalg RSA -keysize 2048 -validity 10000
```

Then add it to `android/app/build.gradle`:

```gradle
android {
  signingConfigs {
    release {
      storeFile file('../../caricature-release.keystore')
      storePassword 'YOUR_PASSWORD'
      keyAlias 'caricature'
      keyPassword 'YOUR_PASSWORD'
    }
  }
  buildTypes {
    release { signingConfig signingConfigs.release }
  }
}
```

Re-run `./gradlew bundleRelease`.

---

## 6. Upload to Play Store

1. Go to <https://play.google.com/console> ($25 one-time developer fee)
2. Create app → **Custom Caricature Club**
3. Internal testing → Create release → upload `app-release.aab`
4. Fill out: app icon, screenshots (5+), description, privacy policy URL
   (use your `/privacy` page), data-safety form
5. Submit for review (1–7 days)

---

## 7. Updating the app later

Every time you change code:

```bash
git pull
npm install
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

Bump `versionCode` and `versionName` in `android/app/build.gradle` before
each Play Store upload, otherwise Google rejects the bundle.

---

## ⚙️ What's already configured for you

- ✅ **App ID** (`app.lovable.161b75a406564c37978eee2b04e19101`)
- ✅ **App name** (Custom Caricature Club)
- ✅ **Brand splash** (`resources/splash.png`) and **icon** (`resources/icon.png`)
- ✅ **Status bar** colored to match brand cream `#fdf8f3`
- ✅ **Hardware back button** → router back, exit on root
- ✅ **Deep links** dispatched as `ccc:deep-link` events
- ✅ **Keyboard handling** with smooth resize
- ✅ **Network plugin** wired into the same offline detector the web uses
- ✅ **Push notifications** plugin installed (use the existing OneSignal setup)
- ✅ **Filesystem & Preferences** for offline-first storage
- ✅ **Mixed content** disabled (Play Store requirement)

---

## 🔮 Coming next round (per your selection)

- Offline registration form queue (signup works without internet, syncs when online)
- Offline order/booking submission queue
- Offline image capture & upload queue

These need the offline-sync layer which we'll build in the next iteration.

---

Need help with any step? Reach out or paste the error here in the chat.

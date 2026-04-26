# 📱 APK Distribution + Play Store Guide

This project ships a real native Android app via Capacitor. You can either
build the APK yourself (locally) or have GitHub build it for you on every push.

---

## 🚀 Path A — GitHub builds your APK automatically (recommended)

The workflow `.github/workflows/android-apk.yml` already runs on every push to
`main`. It always produces a **debug APK** (unsigned, instantly testable). If
you add 4 secrets it will also produce a **signed release APK**.

### One-time setup

1. **Push the project to your own GitHub repo** (Lovable → GitHub → Connect).
2. Generate a release keystore on any computer with Java installed:
   ```bash
   keytool -genkey -v -keystore caricature-release.jks \
     -alias caricature -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Base64-encode the keystore so it can be stored as a secret:
   ```bash
   base64 -i caricature-release.jks | tr -d '\n' > keystore.b64
   ```
4. In your GitHub repo → **Settings → Secrets and variables → Actions** add:
   - `ANDROID_KEYSTORE_BASE64` — paste contents of `keystore.b64`
   - `ANDROID_KEYSTORE_PASSWORD` — the password you set
   - `ANDROID_KEY_ALIAS` — `caricature`
   - `ANDROID_KEY_PASSWORD` — the same password
5. Push any commit — the workflow runs automatically.

### Where to find the APK

- **Every push** → Actions tab → latest run → Artifacts → download `app-debug-...zip`
- **Tag a release** (e.g. `git tag v1.0.0 && git push --tags`) → APK gets
  attached to **GitHub Releases** with a permanent public download URL.

### Wire it into your website

1. Copy the APK URL from GitHub Releases (right-click the `.apk` → Copy link).
2. In Lovable: **Admin Panel → App Download** tile.
3. Paste the URL, set version, save.
4. Users now download from `/download` on your site.

---

## 🛠 Path B — Build locally on your computer

Prereqs: Android Studio, Java 17, Node 20+.

```bash
# Debug APK — fastest, perfect for testing
./scripts/build-apk.sh

# Signed release APK
KEYSTORE_PATH=/path/to/caricature-release.jks \
KEYSTORE_PASSWORD=yourpw KEY_ALIAS=caricature KEY_PASSWORD=yourpw \
./scripts/build-apk.sh release
```

Output lands in `./build/app-debug.apk` or `./build/app-release.apk`.

Upload the file to:
- GitHub Releases (free, permanent URL), or
- Supabase Storage (`shop-images` bucket is already public), or
- any CDN.

Then paste the URL into **Admin → App Download**.

---

## 📲 What users see

Visit `/download` on your published site. They get:
- One-tap APK download button
- QR code (scan from another phone)
- Step-by-step install instructions ("enable unknown sources")
- Version, size, release notes (all admin-controlled)

---

## 📡 Offline-first features now live

The app's `src/lib/sync-queue.ts` automatically queues these actions when the
phone is offline and silently submits them when the connection returns:

- ✅ **Signup** (`auth.signup`) — wired into `/register`
- ✅ **Order create** (`order.create`)
- ✅ **Event booking** (`event.book`)
- ✅ **Profile update** (`profile.update`)
- ✅ **Image upload** (`image.upload`) — base64 → Supabase Storage

A floating pill (`SyncStatusBadge`) shows users what's queued and lets them
tap to retry. Failed items (after 5 attempts) are reported to the Admin
Error Inbox.

To enqueue from any other component:
```ts
import { enqueue } from "@/lib/sync-queue";
enqueue("order.create", { customer_name, amount, ... });
```

---

## 📦 Play Store release (when you're ready)

When you want to publish on the Play Store instead of distributing the APK
directly, you need an **AAB** file (not APK):

```bash
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab` — that's
what you upload to <https://play.google.com/console> ($25 one-time fee).

**Important before release build**: comment out the `server` block in
`capacitor.config.ts` so the app loads bundled offline files instead of the
live preview URL.

---

Need help with any step? Reach out in chat with the error message.

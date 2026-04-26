# 📱 Beginner-friendly Guide — Get your APK and put it on the website

This guide walks you through getting a real Android APK that users can
download from your website, **with zero coding**. It assumes you've never
used GitHub or a build pipeline before.

> 🍎 **iPhone users**: Apple doesn't allow APK installs at all. Your `/download`
> page already auto-detects iPhone visitors and shows them the
> "Add to Home Screen" install steps instead. When you're ready for the App
> Store, see *Path C* at the bottom.

---

## 🟢 Easiest path (5 minutes, no computer setup)

This path uses GitHub Actions to build the APK for you in the cloud, on
every code change. You only need a GitHub account.

### Step 1 — Push the code to your own GitHub repo
1. In Lovable, open the editor.
2. Click **GitHub** (top-right) → **Connect**.
3. Authorise Lovable, choose your GitHub username/organisation.
4. Click **Create Repository**. Lovable will copy all the code there.

### Step 2 — Wait ~10 minutes for GitHub to build the APK
1. Open your new GitHub repo in a new tab.
2. Click the **Actions** tab.
3. You'll see a workflow called **Build Android APK + AAB** running.
4. When it turns green ✅, click into it.
5. Scroll down to the **Artifacts** section.
6. Download `app-debug-…zip` — inside is your `app-debug.apk`. **That's a
   working installable Android app.** ✅

   *(Debug APK is unsigned. It works fine for direct install — Android just
   shows a "Unknown source" warning the first time. For a fully signed
   release APK, see Step 4 below.)*

### Step 3 — Put the APK online so users can download it
You need a **public URL** that ends in `.apk`. Two free options:

**Option A — GitHub Releases (recommended, permanent URL):**
1. In your GitHub repo, click **Releases** (right sidebar) → **Create a new
   release**.
2. Tag it `v1.0.0`. Title it `v1.0.0`.
3. Drag the `app-debug.apk` (or `app-release.apk`) into the file area.
4. Click **Publish release**.
5. Right-click the `.apk` link → **Copy link**. You now have a permanent URL
   like `https://github.com/YOU/REPO/releases/download/v1.0.0/app-debug.apk`.

**Option B — Lovable Cloud Storage:**
1. Open Lovable → **Cloud** → **Storage** → bucket `shop-images` (or any
   public bucket).
2. Drag the APK in. Click it → **Get public URL**.

### Step 4 — Wire it into your website
1. Open Lovable → **Admin Panel** → **Push & Updates** tab.
2. Find the **App Download Page** card.
3. Paste the APK URL into **Android APK URL**.
4. Set **Version** (e.g. `1.0.0`).
5. (Optional) Paste a SHA-256 checksum, size, changelog.
6. Click **Save**.
7. Visit `yoursite.com/download` — your APK is live. 🎉

---

## 🔐 Step 5 (recommended) — Switch to a SIGNED release APK

A signed release APK is required for the Play Store and removes the
"Unknown developer" warning. One-time setup:

### 5a — Generate a keystore (do this once, keep it forever)
On any computer with Java installed:
```bash
keytool -genkey -v -keystore caricature-release.jks \
  -alias caricature -keyalg RSA -keysize 2048 -validity 10000
```
- It will ask you to invent a **password** — pick a strong one and **save it**.
- It will ask for your name/company — fill in honestly.
- 📁 You now have `caricature-release.jks`. **Back it up.** Losing this
  file means losing the ability to update your app on the Play Store later.

### 5b — Encode the keystore so GitHub can store it
On Mac/Linux:
```bash
base64 -i caricature-release.jks | tr -d '\n' > keystore.b64
```
On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("caricature-release.jks")) | Set-Content keystore.b64
```

### 5c — Add 4 secrets to GitHub
In your GitHub repo → **Settings → Secrets and variables → Actions** → New
repository secret. Add:
| Name | Value |
|------|-------|
| `ANDROID_KEYSTORE_BASE64` | paste the contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the password you invented |
| `ANDROID_KEY_ALIAS` | `caricature` |
| `ANDROID_KEY_PASSWORD` | the same password |

### 5d (optional but powerful) — Auto-publish the SHA-256 to your site
The workflow can write the SHA-256 + version into your Lovable Cloud
backend on every build, so users always see the up-to-date checksum on
`/download` without you touching the admin panel.

1. Open the [Supabase project page](https://supabase.com/dashboard/project/cqdxfvcyrvlttmkuaeda/settings/api) (Lovable Cloud uses Supabase under the hood).
2. Copy the **service_role secret** (long key, not the anon key).
3. In GitHub → **Settings → Secrets and variables → Actions**, add:
   - `SUPABASE_SERVICE_ROLE_KEY` — paste the service_role key.
4. (Optional) Also add a **Repository variable** (not secret):
   - `ANDROID_APK_URL` — the permanent URL of the release APK (from
     GitHub Releases). The workflow will rewrite this on every build.

### 5e — Trigger a build
Make any small commit (or click **Actions → Build Android APK + AAB → Run
workflow**). When it finishes you'll get:
- `app-release.apk` — signed, ready for direct install
- `app-release.apk.sha256` — the checksum
- `app-release.aab` — Play Store bundle (when you're ready to publish)

---

## 🛠 Path B — Build on your own computer (advanced)

Only do this if you're comfortable with the terminal.

### Prereqs
- Node 20+ (`brew install node` or [nodejs.org](https://nodejs.org))
- Android Studio installed (it auto-installs the Android SDK)
- Java 17 (`brew install openjdk@17` on Mac)

### Steps
```bash
# 1. Pull the code
git clone https://github.com/YOU/YOUR-REPO.git
cd YOUR-REPO

# 2. Build the debug APK (fastest)
./scripts/build-apk.sh

# 3. Or build the signed release APK
KEYSTORE_PATH=/path/to/caricature-release.jks \
KEYSTORE_PASSWORD=yourpassword \
KEY_ALIAS=caricature \
KEY_PASSWORD=yourpassword \
./scripts/build-apk.sh release
```

The APK lands in `./build/app-debug.apk` or `./build/app-release.apk`.
Upload it to GitHub Releases / Supabase Storage / any CDN, then paste the
URL into Admin → App Download.

---

## 🍎 Path C — iPhone (App Store) build

Apple **does not allow** APK files. To get on iPhones you have two routes:

### Route 1 — PWA (already done, free, instant) ✅
Your `/download` page already shows iPhone visitors how to install the
website as an app via Safari → Share → **Add to Home Screen**. No App
Store, no $99/year fee, no review queue. Works immediately.

### Route 2 — Native iOS build (App Store, $99/year)
You need a **Mac with Xcode** plus an **Apple Developer account**.

```bash
# After cloning the repo on a Mac:
npm install
npx cap add ios
npx cap sync ios
npx cap open ios   # opens Xcode

# In Xcode:
# - Select a team (Apple Developer account)
# - Product → Archive → Distribute App → App Store Connect
```

Once approved (1-3 days), paste the App Store URL into Admin → App
Download → **iOS App URL** and iPhone visitors get a "Open App Store"
button.

For **TestFlight** (beta, no review needed):
1. Build & archive the same way in Xcode.
2. Upload to App Store Connect → TestFlight → invite testers.
3. Paste the TestFlight invite URL into Admin → App Download → **iOS
   TestFlight URL**.

---

## ❓ Troubleshooting

**"Install blocked / can't open file" on Android:**
- Open Settings → Apps → Special access → Install unknown apps.
- Find the browser you used to download → toggle **Allow from this source**.

**"App not installed" error:**
- A previous version is installed with a different signing key. Uninstall
  the old version first, then retry.

**The download URL is shown but `/download` says "Insecure URL — blocked":**
- The page refuses anything that's not `https://`. Use GitHub Releases
  (always HTTPS) or upload to Lovable Cloud Storage, then update the URL.

**Users see the old version:**
- Bump the **Version** in Admin → App Download. The /download page is
  version-pinned via the QR code, so the new version will be served
  immediately.

**The GitHub Actions build fails:**
- Click into the failed run → expand the red step → read the last error.
- If it's a missing secret, add it (see Step 5c above).
- If it's a Gradle/Java version issue, the workflow already pins Java 17 —
  re-run the workflow once.

---

## ✅ One-line recap

> Push to GitHub → GitHub Actions builds the APK → upload to GitHub Releases →
> paste the URL in Admin → App Download → users visit `/download`. Done.

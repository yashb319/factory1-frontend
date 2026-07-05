# Factory1 Mobile Distribution

Factory1 mobile uses Capacitor. The Android and iOS apps open the hosted Factory1 login page:

```text
https://factory1-frontend.vercel.app/login
```

Because the app loads the hosted Factory1 UI, normal frontend changes update after Vercel deployment and backend changes update after Render deployment. Users usually do not need to reinstall for ordinary UI/API improvements.

## Website Download Links

The public home page points to latest GitHub Release assets:

```text
https://github.com/yashb319/factory1-frontend/releases/latest/download/Factory1-android.apk
https://github.com/yashb319/factory1-frontend/releases/latest/download/Factory1-ios-project.zip
```

You can override the public download URLs in Vercel:

```text
NEXT_PUBLIC_FACTORY1_ANDROID_DOWNLOAD_URL=
NEXT_PUBLIC_FACTORY1_IOS_DOWNLOAD_URL=
```

## Local Commands

```bash
npm run mobile:sync
npm run mobile:open:android
npm run mobile:open:ios
npm run mobile:build:android:debug
```

The Android debug APK can be copied to:

```bash
npm run mobile:copy:android:debug
```

## GitHub Release Build

Push a release tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The `.github/workflows/mobile-release.yml` workflow builds and attaches:

- `Factory1-android.apk`
- `Factory1-ios-project.zip`

## Important iOS Note

An installable iOS IPA requires Apple Developer signing and provisioning profiles. Until signing is configured, the workflow publishes an iOS project ZIP instead of a signed IPA.

For App Store/TestFlight later, configure:

- Apple Developer account
- Bundle ID: `com.factory1.mobile`
- Signing certificate
- Provisioning profile
- App icon and launch screen

Android Play Store release later should use a signed AAB from:

```bash
npm run mobile:build:android:release
```

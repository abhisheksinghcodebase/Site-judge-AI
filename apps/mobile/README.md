# SiteJudge AI — Mobile Application

This is the official mobile application companion for **SiteJudge AI**, built using **React Native** and **Expo**. It ports the entire website auditing experience, category scoring metrics, dynamic issue filters, and code resolution blocks into a native mobile workspace.

---

## Features

- 📱 **100% Shared UI/UX Model**: Matches the Next.js visual system, featuring dark themes, neon gauge score rings, and glassmorphic cards.
- ⚡ **Full Audit Coverage**: Standard website URL scanning, progress timelines, issue severities, and recommended code fix panels.
- 🎯 **Advanced Category Breakdowns**: Support for all 10 analysis categories (Performance, Accessibility, SEO, Security, Best Practices, UI/UX Review, Responsiveness, Code Quality, Efficiency, and Alignment).
- 🤝 **Developer Profile**: Embedded showcase panel featuring Abhishek Kumar's GitHub Stats and LinkedIn integrations.

---

## Quick Start (Local Setup)

### Prerequisites
1. **Node.js** (v20+ recommended)
2. **Expo Go** application installed on your iOS or Android device (downloadable via App Store / Google Play).

### 1. Install Dependencies
Navigate to the mobile directory and install the packages:
```bash
cd apps/mobile
# We override React 19 peer dependencies in package.json, but you can also run:
npm install --legacy-peer-deps
```

### 2. Configure Backend Connection (Physical Devices)
If you are testing on a **physical device** (not an emulator), `localhost` will not connect. You must update the backend URL with your local machine's IP address:
1. Open [`apps/mobile/src/api.ts`](file:///c:/CODING_PROJECTS/Judge%20AI/apps/mobile/src/api.ts).
2. Change the `API_URL` to point to your computer's local IP (e.g. `http://192.168.1.100:8000`).

### 3. Run the Development Server
```bash
npm run start
```
This boots up the **Expo Dev Tools** in your terminal and renders a **QR Code**.

### 4. Load on Device
- **Android**: Open the **Expo Go** app and click **Scan QR Code**.
- **iOS**: Open the native **Camera app** and scan the terminal QR code, then tap the prompt to open in Expo Go.
- **Emulator**: Press `a` in your terminal for Android Emulator, or `i` for iOS Simulator.

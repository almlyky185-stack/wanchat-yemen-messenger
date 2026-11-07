# Expo React Native Template

This is a React Native template using Expo Router and configured for web, iOS, and Android development.

## Quick Start

```bash
# Fast installation with Bun (recommended)
bun install

# Or use npm (slower but more stable)
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Available Commands

### Development
- `npm run dev` - Start development server for web on port 3000
- `npm start` - Start development server (shows QR code for mobile)
- `npm run start:web` - Start web development server
- `npm run start:ios` - Start iOS development server
- `npm run start:android` - Start Android development server

### Building
- `npm run build:web` - Build for web production
- `npm run build:ios` - Build for iOS
- `npm run build:android` - Build for Android

### Package Management (Bun - Fast)
- `bun install` - Install dependencies (fastest)
- `npm run install:fast` - Install with Bun, skip postinstall (very fast)
- `npx expo install <package>` - Add a package at the version this Expo SDK expects
- `npm run setup` - Run Expo install for native linking

### Package Management (npm - Stable)
- `npm install` - Install dependencies (slower but stable)
- `npm run setup` - Run Expo install for native linking

### Utilities
- `npm run doctor` - Check project setup and dependencies
- `npm run lint` - Run linting

## Project Structure

```
├── app/                 # Expo Router pages
├── components/          # Reusable components
├── assets/             # Images, fonts, etc.
├── hooks/              # Custom hooks
└── package.json        # Dependencies and scripts
```

## Performance Tips

### For fastest installation:
1. Use `bun install` (2-10x faster than npm)
2. Use `npm run install:fast` to skip postinstall steps
3. Only run `npm run setup` when you need native linking

### For most stable installation:
1. Use `npm install` (slower but more compatible)
2. Run `npm run setup` after installing new native dependencies

## Notes for AI Agents

- **Fast setup**: Use `bun install` then `npm run dev`
- **Stable setup**: Use `npm install` then `npm run dev`
- Use `npm run doctor` to diagnose issues
- Use `npm run setup` instead of `npm run install` for Expo packages
- Expo SDK 58 with every dependency pinned exactly: add packages with `npx expo install <package>`, never `--fix` or `--check`
- The project uses Expo Router for navigation
- Web version runs on port 3000 by default
- Bun is 2-10x faster than npm for package installation 

## Email-only authentication

Wanchat uses email address and password for account creation and sign-in. Phone-number sign-in is not offered in the app.

To allow a new account to sign in immediately without an email confirmation link:

1. Open your Supabase project dashboard.
2. Go to **Authentication → Sign In / Providers → Email**.
3. Turn **Confirm email** off and save the change.
4. Keep email/password sign-in enabled.

With **Confirm email** disabled, Supabase automatically treats newly supplied email addresses as confirmed. This means someone can register using an email address they do not own. Consider enabling rate limits and abuse protection, and do not use email ownership as proof of identity until verification is enabled.

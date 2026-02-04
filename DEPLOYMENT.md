# Deployment Guide for GitHub Pages

## Issues Fixed

1. ✅ **Router basename** - BrowserRouter now uses the correct base path from Vite
2. ✅ **Windows compatibility** - Removed Unix-style environment variable syntax
3. ✅ **Automated deployment** - GitHub Actions workflow added
4. ✅ **Asset loading** - Vite configuration properly handles GitHub Pages subdirectory

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

The repository now includes a GitHub Actions workflow that will automatically deploy your app when you push to the main branch.

**Setup Steps:**

1. Go to your GitHub repository settings
2. Navigate to **Settings > Pages**
3. Under **Source**, select **GitHub Actions**
4. Push to your main branch - the workflow will automatically deploy

The workflow file is located at `.github/workflows/deploy.yml`

### Method 2: Manual Deployment with gh-pages

You can still deploy manually using the gh-pages package:

```bash
# Using pnpm
pnpm run deploy

# Using npm
npm run deploy
```

This will:
1. Build the client app (`npm run build:client`)
2. Deploy the `dist/spa` folder to the gh-pages branch

## Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm run dev

# Open http://localhost:8080
```

## How It Works

### Vite Configuration
The `vite.config.ts` file reads the `homepage` field from `package.json` and uses it as the base path:

```json
"homepage": "https://academyproduct.github.io/dynamic_completion_guide/"
```

This ensures all assets (JS, CSS, images) load correctly from the subdirectory.

### Router Configuration
The `App.tsx` file now uses a dynamic basename for React Router:

```typescript
const getBasename = () => {
  const base = document.querySelector('base')?.getAttribute('href') || '/';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

<BrowserRouter basename={getBasename()}>
```

This makes the router aware of the GitHub Pages subdirectory path.

## Troubleshooting

### Issue: Pages shows 404 on refresh
**Solution**: GitHub Pages serves a SPA as static files. The GitHub Actions workflow handles this correctly. If using manual deployment, ensure you're deploying to the `gh-pages` branch.

### Issue: Assets not loading
**Solution**: Verify the `homepage` field in `package.json` matches your GitHub Pages URL exactly.

### Issue: Manual deployment fails
**Solution**: Make sure you have the correct permissions and the gh-pages branch exists. First deployment might need manual branch creation.

### Issue: Routes don't work
**Solution**: The basename fix ensures routes work correctly. Clear your browser cache if you're still seeing issues.

## Why Vite is Needed

**Note:** This project DOES need Vite (or another build tool). Here's why:

1. **TypeScript Compilation** - The app is written in TypeScript and needs compilation to JavaScript
2. **JSX Transformation** - React JSX syntax must be transformed to JavaScript
3. **Module Bundling** - Hundreds of npm packages need to be bundled for the browser
4. **Asset Optimization** - Images, CSS, and JS need to be optimized for production
5. **Code Splitting** - Vite enables efficient code splitting for faster loads

Vite is the modern standard for React development and provides:
- Lightning-fast dev server with Hot Module Replacement (HMR)
- Optimized production builds
- TypeScript support out of the box
- Modern ES modules for better performance

## Build Output

After running `pnpm run build:client`, the production files are in `dist/spa/`:
- `index.html` - Main HTML file with injected base path
- `assets/` - Bundled and optimized JS, CSS, and other assets

The build is optimized, minified, and ready for production deployment.
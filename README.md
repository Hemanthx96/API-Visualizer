## API Explorer

A lightweight Postman-style API explorer built with **React + TypeScript + Vite**. Explore JSON APIs visually with smart table views, schema inference, diffing, charts, and more.

### 🚀 Live Demo

[View the live application](https://api-visualizer.vercel.app) (or your deployed URL)

### ✨ Core Features

- **Request builder**: URL input, GET method selector, editable header rows, disabled send during in-flight requests.
- **Execution & timing**: Axios-based requests with duration measurement and robust error handling (including CORS-friendly messaging, timeouts, and network failures).
- **Response viewer tabs**:
  - **Raw JSON**: Pretty-printed, collapsible JSON viewer.
  - **Table / Object**: Auto table for arrays of objects (sorting, filtering, pagination) and key/value view for plain objects.
  - **Chart**: Interactive bar and line charts for numeric data with configurable X/Y axes.
  - **Schema**: Inferred JSON schema (primitives, arrays, objects, unions, optional fields) rendered as an expandable tree.
  - **Diff**: Tree-based JSON diff against the previous response (added/removed/changed with color cues).
  - **Metadata**: Status code, status text, headers, duration, and approximate payload size.
- **Fullscreen response**: Toggle fullscreen for the response panel (ESC to exit).
- **History & replay**: Last 5 requests persisted to `localStorage` with one-click replay.
- **Themes**: Light/dark mode toggle with theme-aware scrollbars; UI pills/buttons match the palette.
- **Dual scrollbars**: Top and bottom horizontal scrollbars on wide content (tables/JSON) with synchronized scrolling.
- **UX niceties**: Loading skeletons, friendly error banners, hint text for empty states, smart disabling of actions while loading.

### 🛠️ Getting Started

#### Prerequisites

- Node.js 18+ and npm/pnpm/yarn

#### Local Development

```bash
# Install dependencies
npm install   # or pnpm install / yarn install

# Start development server
npm run dev   # or pnpm dev / yarn dev
```

Then open the printed localhost URL (typically `http://localhost:5173`) in your browser.

#### Build for Production

```bash
npm run build
```

The output will be in the `dist` directory, ready to be deployed.

### 🌐 Deployment

This project can be deployed for free on Vercel or Render. Both are excellent choices:

#### Option 1: Vercel (Recommended - Easiest)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click "New Project" and import your repository
   - Vercel will auto-detect Vite settings (the `vercel.json` file is already configured)
   - Click "Deploy" - your site will be live in minutes!

3. **Custom Domain** (optional):
   - In your Vercel project settings, add a custom domain
   - Vercel provides free SSL certificates automatically

#### Option 2: Render (Great Alternative)

1. **Push your code to GitHub** (same as above)

2. **Deploy to Render**:
   - Go to [render.com](https://render.com) and sign in with GitHub
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Render will auto-detect settings (the `render.yaml` file is already configured)
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Click "Create Static Site" - your site will be live in minutes!

3. **Custom Domain** (optional):
   - In your service settings, add a custom domain
   - Render provides free SSL certificates automatically

**Why Render?** Great free tier, simple setup, reliable hosting, and excellent for portfolio projects.

#### Option 3: GitHub Pages (Alternative)

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add deploy script to `package.json`**:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. **Update `vite.config.ts`** to set the base path:
   ```typescript
   export default defineConfig({
     base: '/your-repo-name/', // Replace with your actual repo name
     plugins: [react()],
   });
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**:
   - Go to your repo → Settings → Pages
   - Select "gh-pages" branch and "/ (root)" folder
   - Your site will be available at `https://yourusername.github.io/your-repo-name/`

### 📝 Usage Tips

- **Try these public APIs**:
  - `https://jsonplaceholder.typicode.com/posts`
  - `https://jsonplaceholder.typicode.com/users`
  - `https://dummyjson.com/products`
  - `https://api.github.com/users/octocat`

- **CORS Note**: Some APIs block browser requests due to CORS. The app will show a friendly message suggesting to use a backend proxy or try another API.

- **Current Limitations**: The client currently supports **GET** requests only, but the architecture allows easy extension to POST, PUT, DELETE, etc.

### 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **CSS Variables** - Theme system

### 📄 License

MIT License - feel free to use this project for your portfolio or as a starting point for your own API explorer.

### 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

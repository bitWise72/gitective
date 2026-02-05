# Deployment Guide

## Environment Variables Required

Add these environment variables in Vercel Dashboard (Settings → Environment Variables):

- `VITE_SUPABASE_URL` = Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = Your Supabase anon/public key

## Deployment Steps

1. Push code to GitHub repository
2. Import project to Vercel from GitHub
3. Vercel will auto-detect Vite framework
4. Add environment variables
5. Deploy

## Local Development

```bash
npm install
npm run dev
```

## Build Production

```bash
npm run build
npm run preview
```

The application will be available at http://localhost:8080

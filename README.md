# Pixel Perfect Replica

AI-Powered Visual Analysis Platform for investigating events through evidence collection, hypothesis testing, and narrative branching.

## Overview

Pixel Perfect Replica is a visual investigation platform that leverages Google Gemini AI to analyze evidence, detect objects in images, assess credibility, and generate hypotheses across multiple narrative branches. The application provides a 3D timeline visualization and real-time collaborative investigation tools.

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- shadcn/ui component library
- Framer Motion for animations
- React Three Fiber for 3D visualization
- TanStack React Query for state management
- React Router for navigation

### Backend
- Supabase for authentication and database
- PostgreSQL database
- Supabase Edge Functions (Deno runtime)
- Real-time subscriptions

### AI Integration
- Google Gemini API for visual analysis
- Object detection and bounding boxes
- Credibility assessment
- Narrative relevance scoring

## Prerequisites

- Node.js 18+ or Bun runtime
- Supabase account
- Google Gemini API key

## Setup

1. Clone the repository

```bash
git clone <repository-url>
cd pixel-perfect-replica
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

Create a `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

4. Set up Supabase

Run the migrations in the `supabase/migrations` directory to create the required database schema.

5. Configure Gemini API

Add your Gemini API key to the Supabase Edge Function environment variables.

## Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Build

Create a production build:

```bash
npm run build
```

## Project Structure

```
pixel-perfect-replica/
├── src/
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── types/           # TypeScript type definitions
│   ├── integrations/    # Supabase and external integrations
│   └── lib/             # Utility functions
├── supabase/
│   ├── functions/       # Edge functions
│   └── migrations/      # Database migrations
└── public/              # Static assets
```

## Features

- User authentication with Supabase
- Create and manage investigations
- Add evidence with multiple types (text, image, link)
- Automatic Gemini AI analysis of evidence
- 3D timeline visualization
- Multiple narrative branches
- Hypothesis generation and testing
- Real-time collaboration
- Credibility assessment

## License

All rights reserved.

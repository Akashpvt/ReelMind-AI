# Tech Stack

## Frontend

### Next.js

Recommended for the web application because it supports modern React development, routing, server components, API routes, and Vercel deployment.

### TypeScript

Use TypeScript for safer product development, clearer contracts, and better maintainability as the app grows.

### Tailwind CSS

Use Tailwind CSS for fast UI development, consistent spacing, responsive design, and easy implementation of the dark premium visual system.

### Framer Motion

Use Framer Motion for polished transitions, dashboard interactions, modal animations, and subtle UI motion.

## 3D and Animation

### Spline

Use Spline for fast 3D brand exploration, landing hero concepts, and lightweight interactive visuals.

### Three.js

Use Three.js when custom 3D control, performance tuning, or deeper interaction is required.

### React Three Fiber

Use React Three Fiber when integrating Three.js scenes directly into the React/Next.js app.

## Backend

Two viable options:

### Option A: Node.js API Routes

Best if the MVP should stay simple and tightly integrated with Next.js.

Pros:

- Fast setup
- Single deployment target
- Easy Vercel integration
- Good for early MVP

### Option B: FastAPI

Best if the product will need a separate AI orchestration backend, background jobs, or Python-heavy processing later.

Pros:

- Strong Python ecosystem
- Clean API design
- Good for AI workflows
- Easy to expand into workers and services

## Recommended MVP Choice

Start with **Next.js API routes** for Phase 1 unless there is a clear need for Python-only AI workflow logic. Add FastAPI later if the backend becomes more complex.

## Database

### Supabase PostgreSQL

Use Supabase PostgreSQL for:

- Users
- Projects
- Prompt history
- Generated outputs
- Future billing/account records

## Authentication

Two viable options:

### Clerk

Best for polished auth UX and fast startup setup.

### Supabase Auth

Best for keeping auth and database inside one platform.

## Recommended MVP Choice

Use **Clerk** if speed and polished onboarding are the priority. Use **Supabase Auth** if minimizing vendors is the priority.

## Deployment

### Vercel

Use Vercel for the Next.js frontend and API routes.

## Environment Variables Plan

Potential environment variables:

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
POLLINATIONS_API_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
OPENAI_API_KEY=
AI_MODEL_NAME=
```

Never commit real secrets to the repository.

## Initial Data Model Draft

Core tables:

- users
- projects
- prompt_history
- generated_outputs

The database schema should be finalized during Phase 1 implementation.

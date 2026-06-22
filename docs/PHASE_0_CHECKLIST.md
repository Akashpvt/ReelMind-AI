# Phase 0 Checklist

## GitHub Repo Setup

- [ ] Create a GitHub repository named `reelmind-ai`
- [ ] Add repository description: `AI tool for creators to generate viral reel ideas, hooks, scripts, captions, and prompts`
- [ ] Add topics: `ai`, `creator-tools`, `nextjs`, `short-form-video`, `supabase`
- [ ] Push Phase 0 foundation files
- [ ] Create `main` branch protection rules when the team grows
- [ ] Add issues or tasks for Phase 1 MVP features

## Vercel Setup

- [ ] Create Vercel account or use existing account
- [ ] Import GitHub repository into Vercel
- [ ] Set project root to `apps/web` during Phase 1 web app setup
- [ ] Configure production domain later
- [ ] Add environment variables after choosing auth and AI providers

## Supabase Setup

- [ ] Create Supabase project
- [ ] Save project URL
- [ ] Save anon public key
- [ ] Save service role key securely
- [ ] Plan database tables for users, projects, prompt history, and generated outputs
- [ ] Enable row-level security before production use

## Environment Variables Planning

- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `CLERK_SECRET_KEY` or Supabase Auth equivalent
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` if Clerk is selected
- [ ] `OPENAI_API_KEY`
- [ ] `AI_MODEL_NAME`

## API Key Planning

- [ ] Choose primary AI provider
- [ ] Create API key only when Phase 1 development begins
- [ ] Store keys in Vercel environment variables
- [ ] Keep local secrets in `.env.local`
- [ ] Never commit real API keys
- [ ] Decide whether to add usage logging for generated outputs

## Brand Assets

- [ ] Create logo concept
- [ ] Create favicon concept
- [ ] Select primary font pair
- [ ] Define reusable color tokens
- [ ] Collect 3D style references
- [ ] Create initial Spline or Three.js visual experiment later

## UI References

- [ ] Collect dark premium SaaS references
- [ ] Collect AI dashboard references
- [ ] Collect glassmorphism examples
- [ ] Collect neon purple and blue inspiration
- [ ] Identify dashboard layout patterns
- [ ] Identify prompt-input UX references

## MVP Boundaries

- [ ] Confirm Phase 1 includes only text generation, saving, dashboard, and history
- [ ] Exclude full video generation
- [ ] Exclude full image generation
- [ ] Exclude billing
- [ ] Exclude team accounts
- [ ] Exclude social scheduling
- [ ] Exclude native mobile app
- [ ] Define what counts as a saved project
- [ ] Define what counts as a prompt history item

## Ready For Phase 1 When

- [ ] MVP scope is approved
- [ ] Tech stack is confirmed
- [ ] Auth provider is selected
- [ ] AI provider is selected
- [ ] Database schema draft is approved
- [ ] First web app scaffold is ready to begin in `apps/web`

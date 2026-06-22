# ReelMind AI

**From Idea to Viral Reel in Minutes**

ReelMind AI is a planning-stage AI product for creators who need faster, sharper short-form video ideation. The product helps generate viral reel ideas, hooks, scripts, captions, CTAs, thumbnail concepts, voiceover prompts, and video prompts.

This repository currently contains the **Phase 0 foundation** only: project structure, brand direction, MVP scope, tech stack recommendations, and development planning assets.

## Target Users

- Content creators
- Instagram reel creators
- YouTubers
- Freelancers
- Creative agencies
- Small businesses

## Phase 0 Goal

Set a clean startup foundation before building the product. Phase 0 defines the product direction, MVP boundaries, technical choices, brand identity, and initial planning documents.

## Current Scope

Phase 0 includes:

- Project overview
- Brand identity guide
- Phase 1 MVP scope
- Tech stack recommendation
- Roadmap
- Prompt foundation
- Folder structure
- Setup checklist

Phase 0 does **not** include full app development.

## Recommended Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Framer Motion
- 3D/Animation: Spline, Three.js, React Three Fiber
- Backend: FastAPI or Node.js API routes
- Database: Supabase PostgreSQL
- Authentication: Clerk or Supabase Auth
- Deployment: Vercel

## Repository Structure

```text
reelmind-ai/
├── apps/
│   ├── web/
│   └── mobile/
├── backend/
├── docs/
├── assets/
├── prompts/
├── database/
└── README.md
```

## Phase 0 Checklist

- [ ] Create GitHub repository
- [ ] Connect repository to Vercel
- [ ] Create Supabase project
- [ ] Choose authentication provider
- [ ] Plan environment variables
- [ ] Plan AI API keys and model access
- [ ] Collect brand references
- [ ] Create logo exploration
- [ ] Define MVP boundaries
- [ ] Confirm Phase 1 user flows

## Next Step

Use the documents in `docs/` to confirm product direction, then start Phase 1 by scaffolding the web app inside `apps/web`.

## Phase 0 Documents

- `docs/PROJECT_OVERVIEW.md`
- `docs/MVP_SCOPE.md`
- `docs/BRAND_GUIDE.md`
- `docs/TECH_STACK.md`
- `docs/ROADMAP.md`
- `docs/PHASE_0_CHECKLIST.md`
- `prompts/system-prompt.md`

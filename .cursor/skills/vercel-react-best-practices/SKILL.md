---
name: vercel-react-best-practices
description: Applies Vercel and React best practices for Next.js apps—deployment, serverless/edge, caching, env vars, images, and performance. Use when building or reviewing React/Next.js apps, deploying to Vercel, or when the user asks about Vercel, React performance, or Next.js deployment.
---

# Vercel + React Best Practices

Use this skill when working on React or Next.js applications targeting Vercel. Focus on what Vercel and the React/Next ecosystem expect; avoid generic advice the agent already knows.

## When to Apply

- Building or refactoring Next.js/React code for Vercel
- Configuring deployment, env vars, or serverless/edge
- Optimizing performance (Core Web Vitals, images, bundles)
- Reviewing code for Vercel/React compatibility and pitfalls

---

## React (with Next.js)

- **Server vs Client**: Prefer Server Components by default. Use `"use client"` only for interactivity, browser APIs, or hooks (useState, useEffect, context).
- **Data in RSC**: Fetch in Server Components; pass serializable props to Client Components. Avoid passing functions or non-serializable values across the boundary.
- **State**: Keep client state minimal and colocated. Use URL state (searchParams) for shareable UI state where appropriate.
- **Bundling**: Dynamic imports for heavy or below-the-fold client components: `next/dynamic` with `ssr: false` only when necessary.

---

## Next.js on Vercel

- **Routing**: Use App Router conventions. Prefer `loading.tsx` and `error.tsx` for loading and error states; use `not-found.tsx` for 404s.
- **Data fetching**: In RSC, use `fetch` with Next.js caching (or `cache()` for request deduping). For mutations or client data, use server actions or route handlers.
- **Caching**:
  - `fetch`: use `revalidate` or `cache: 'force-cache'` / `cache: 'no-store'` explicitly.
  - Page/segment: `export const revalidate = 60` (or `dynamic = 'force-dynamic'` when needed).
  - Avoid default caching where fresh data is required (e.g. auth-dependent pages).
- **Env**: Use `NEXT_PUBLIC_*` only for client-exposed values. Keep secrets server-only. Prefer Vercel project env vars and avoid committing `.env` with secrets.

---

## Vercel Deployment & Config

- **Build**: Rely on `next build`; ensure `build` script in `package.json` runs it. No custom build command unless necessary.
- **Output**: Prefer default Next.js output. Use `output: 'standalone'` only when not deploying to Vercel or when required for custom hosting.
- **vercel.json**: Use only for overrides: redirects, headers, rewrites, cron, or functions config. Do not duplicate what Next.js already does.
- **Serverless/Edge**:
  - API routes and Server Actions run as serverless functions by default.
  - Use Edge Runtime only when needed (e.g. low-latency, simple logic): `export const runtime = 'edge'` in route/segment.
  - Avoid large node_modules or blocking APIs in edge; use Node runtime for those.
- **Env**: Set production and preview env in Vercel dashboard. Use different values for preview vs production when needed.

---

## Performance

- **Images**: Use `next/image` with appropriate `sizes` and `priority` for LCP images. Prefer Vercel Image Optimization (default when deployed on Vercel).
- **Fonts**: Use `next/font` (e.g. `next/font/google`) to avoid layout shift and extra network requests.
- **Scripts**: Use `next/script` with `strategy="lazyOnload"` (or `afterInteractive`) for third-party scripts.
- **Core Web Vitals**: Prefer server-rendered content and minimal client JS for LCP; defer non-critical JS; avoid layout thrash and large DOMs.

---

## Checklist (Quick Reference)

- [ ] Server Components by default; `"use client"` only where needed
- [ ] No non-serializable props across server/client boundary
- [ ] Env: secrets without `NEXT_PUBLIC_`; client vars with `NEXT_PUBLIC_`
- [ ] Caching/revalidate explicit for data and segments
- [ ] `next/image` for images; `next/font` for fonts
- [ ] `vercel.json` only for redirects, headers, rewrites, or functions config
- [ ] Edge only where beneficial; Node for heavy or blocking work

---

## Optional Deep Dive

For detailed Vercel docs (limits, regions, cron, logging), refer to [Vercel Docs](https://vercel.com/docs) and [Next.js Docs](https://nextjs.org/docs). Prefer official docs over long inline reference in this skill.

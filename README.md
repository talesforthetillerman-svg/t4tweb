# t4tweb

Music Band Website.

## Deploy on Vercel

### Option A (recommended): Git-based auto deploy

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Go to **Vercel Dashboard → Add New → Project**.
3. Import the repository.
4. Vercel should auto-detect **Next.js**.
5. Keep defaults (or verify):
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next` (managed by Vercel for Next.js)
6. Click **Deploy**.

After first deploy:
- Every push to the production branch (usually `main`) triggers a Production deployment.
- Every PR/branch push triggers a Preview deployment.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## Recommended checks before deploy

```bash
npm run typecheck
npm run build
```

## Notes

- If build fails fetching Google Fonts in restricted environments, this is usually a network limitation of that environment.  
- In Vercel cloud builds, outbound access is generally available, so `next/font/google` typically works.

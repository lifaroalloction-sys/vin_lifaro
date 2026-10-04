# My Memories

Public memories site. Browsing is open; only the admin can edit categories/albums and upload or delete media. React + Vite, Supabase, hosted on GitHub Pages.

## 1. Supabase (free)
1. Create a project at supabase.com.
2. In SQL Editor, run `supabase/schema.sql` once to create the tables and starter categories. The admin email is already set in the file. If the tables already exist, run `supabase/public_seed.sql` to add any missing starter categories and albums instead.
3. Run `supabase/public_read_access.sql` in the SQL Editor. This makes categories and albums publicly readable; do not put private information in them.
4. Settings > API Keys: copy the Project URL and the publishable (or legacy anon public) key.
5. Run `supabase/media_uploads.sql` in the SQL Editor to create the public media bucket and admin-only upload policies.
6. Authentication > Providers > Google: enable Google for admin editing. In Google Cloud, set the authorized redirect URI to `https://pesyjaurxbnhjysrddte.supabase.co/auth/v1/callback`.

## 2. Run locally
    cp .env.example .env     # paste the two values
    npm install
    npm run dev

## 3. Push to GitHub
    git init && git add . && git commit -m "Memories app"
    git branch -M main
    git remote add origin https://github.com/YOUR-USER/memories.git
    git push -u origin main

## 4. Host on GitHub Pages
1. In the repository, open Settings > Secrets and variables > Actions. Add `VITE_SUPABASE_URL` as a repository variable and `VITE_SUPABASE_ANON_KEY` as a repository secret. Until both are set, the site displays a configuration notice.
2. Open Settings > Pages and select GitHub Actions as the build and deployment source.
3. Push to `main` or manually run the Deploy to GitHub Pages workflow under Actions.
4. The site will be available at `https://lifaroalloction-sys.github.io/vin_lifaro/`.
5. In Supabase Authentication > URL Configuration, set the Site URL to the Pages URL and add it to the allowed redirect URLs.

## Security notes
Categories, albums, photos, and videos are publicly viewable. The public site is read-only; category/album changes and uploads/deletions require the configured admin's Google sign-in and are enforced by database/storage policies. Never upload private media.

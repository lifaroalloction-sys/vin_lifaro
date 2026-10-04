# My Memories

Public read-only memories site. React + Vite, Supabase, hosted on GitHub Pages.

## 1. Supabase (free)
1. Create a project at supabase.com.
2. SQL Editor: paste `supabase/schema.sql` and run it once. The admin email is already set in the file.
3. Run `supabase/public_read_access.sql` in the SQL Editor. This makes categories and albums publicly readable; do not put private information in them.
4. Settings > API Keys: copy the Project URL and the publishable (or legacy anon public) key.

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
1. In the repository, open Settings > Secrets and variables > Actions. Add `VITE_SUPABASE_URL` as a repository variable and `VITE_SUPABASE_ANON_KEY` as a repository secret. Until both are set, the site displays a configuration notice instead of the sign-in form.
2. Open Settings > Pages and select GitHub Actions as the build and deployment source.
3. Push to `main` or manually run the Deploy to GitHub Pages workflow under Actions.
4. The site will be available at `https://lifaroalloction-sys.github.io/vin_lifaro/`.
5. In Supabase Authentication > URL Configuration, set the Site URL to the Pages URL and add it to the allowed redirect URLs.

## Security notes
Categories and album names are public to anyone. The public site is read-only; database write policies still require an authenticated admin. Never store private information in public categories or albums.

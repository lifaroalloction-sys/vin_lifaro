# My Memories

Private memories site. React + Vite, Supabase (login, database, access rules), hosted on Cloudflare Pages.

## 1. Supabase (free)
1. Create a project at supabase.com.
2. SQL Editor: paste `supabase/schema.sql`, replace `YOUR-ADMIN-EMAIL@gmail.com` with your email, run it.
3. Authentication > URL Configuration: set Site URL to your hosted URL (add `http://localhost:5173` as a redirect too).
4. Settings > API: copy the Project URL and the anon public key.

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
1. In the repository, open Settings > Secrets and variables > Actions. Add `VITE_SUPABASE_URL` as a repository variable and `VITE_SUPABASE_ANON_KEY` as a repository secret.
2. Open Settings > Pages and select GitHub Actions as the build and deployment source.
3. Push to `main` or manually run the Deploy to GitHub Pages workflow under Actions.
4. The site will be available at `https://lifaroalloction-sys.github.io/vin_lifaro/`.
5. In Supabase Authentication > URL Configuration, set the Site URL to the Pages URL and add it to the allowed redirect URLs.

## Security notes
The anon key is meant to be public. Access is enforced by Row Level Security in the database: only listed emails can read, only admins can write.

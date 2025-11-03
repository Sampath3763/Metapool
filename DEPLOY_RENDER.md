Render deployment guide for Virtual Queue

This repository contains two services under the repo root:
- backend/ (Express + Mongoose)
- frontend/ (Vite + React)

We provide `render.yaml` which configures both services so Render can create them automatically when you connect the repository.

Prerequisites
- A Render account
- MongoDB Atlas connection string (or any accessible MongoDB) with network access configured
- GitHub repository connected to Render (recommended)

Environment variables (set these in Render dashboard for the backend service):
- MONGO_URI (required) — MongoDB connection URI, e.g. mongodb+srv://user:pass@cluster0.mongodb.net/virtual-queue?retryWrites=true&w=majority
- ADMIN_PASSWORD (required) — admin password used by the simple admin flow
- JWT_SECRET (recommended) — secret used to sign JWT tokens (if used)

Frontend build-time env (set in the frontend service before build):
- VITE_API_URL — the public URL of the backend service (e.g. https://virtual-queue-backend.onrender.com)

How Render uses `render.yaml`
- When you connect this GitHub repo to Render, Render will detect `render.yaml` and attempt to create the services defined there.
- The backend service is a `web` Node service (root: `backend`) and will run `npm install` and `npm start`.
- The frontend service builds at root `frontend` and uses `npx serve -s dist -l $PORT` as the Start Command to serve the built static files.

Important notes before deploying
1. Set `VITE_API_URL` in the frontend service BEFORE the first build. Vite inlines environment variables at build time.
2. Do NOT commit secrets to the repo; use Render's Environment variables or Secret management.
3. Ensure your MongoDB allows connections from Render. For Atlas, add Render's outbound IP ranges or allow access from anywhere (0.0.0.0/0) for quick testing (not recommended for production).
4. The backend exposes a `/health` endpoint for platform health checks.

Step-by-step (recommended)
1. Push your code to GitHub (main branch).
2. In Render dashboard, "New -> Import from GitHub" and select this repository.
3. Render should detect `render.yaml` and offer to create two services. If it does not, create services manually:
   - Backend: Select "Web Service", link to `backend` folder, Build Command: `npm install`, Start Command: `npm start`.
   - Frontend: Select "Web Service (Static)", link to `frontend` folder, Build Command: `npm install && npm run build`, Start Command: `npx serve -s dist -l $PORT`.
4. For backend service, configure environment variables (MONGO_URI, ADMIN_PASSWORD, JWT_SECRET) in the Render settings.
5. For frontend service, set `VITE_API_URL` to the backend URL (once the backend has deployed).
6. Deploy and monitor build logs. The backend will show log lines from `server.js` (Connected to MongoDB). The frontend will show Vite build logs and then the `serve` server logs.

Domain and TLS
- Render provides managed TLS for custom domains. Add a custom domain in Render settings and follow instructions to create DNS records.

Scaling and plan
- The `render.yaml` uses `plan: free`. For production, choose a larger plan and higher instance count.

Troubleshooting
- Build fails: check service build logs, ensure frontend `VITE_API_URL` is set before build.
- Mongo connection errors: verify `MONGO_URI`, network access, and credentials.
- Admin login not working: ensure `ADMIN_PASSWORD` matches between backend `.env` and Render env var.

Optional: run locally
- Backend:
  cd backend
  cp .env.example .env
  # edit .env to put your MONGO_URI and ADMIN_PASSWORD
  npm install
  npm start

- Frontend:
  cd frontend
  npm install
  npm run dev

If you'd like, I can also:
- Create a small script to automate Render service creation via the Render API/CLI.
- Convert the backend to serverless functions for Vercel if you prefer a single platform.

*** End of guide ***

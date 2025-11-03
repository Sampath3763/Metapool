# Virtual Queue (frontend + backend)

Structure:
- backend: Express + Mongoose server
- frontend: Vite + React app

Quick start

1. Backend

- cd backend
- copy `.env.example` to `.env` and set `MONGO_URI` if needed
- npm install
- npm run dev

2. Frontend

- cd frontend
- copy `.env.example` to `.env` and adjust `VITE_API_URL` if backend isn't on localhost:4000
- npm install
- npm run dev

Notes

- Completing the head of the queue will remove that item and shift numbers so the next person becomes number 1.

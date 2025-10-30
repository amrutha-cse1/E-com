# Mock E‑Com Cart — Full Stack Assignment

This repository contains a simple full‑stack shopping cart demo (React frontend + FastAPI backend). It implements product listing, add/remove cart items, totals, and a mock checkout that returns a receipt. The backend can run with MongoDB or in a lightweight in‑memory mode (no DB required) for quick local demos.
A small full‑stack mock e‑commerce cart application built as an assignment/demo.
Backend: FastAPI (Python). Frontend: React (Create React App + craco + Tailwind).

## Key features
- Product listing (GET /api/products)
- User authentication: register & login (JWT)
- Cart management and checkout endpoints
- In‑memory fallback so the app can run without a database for local testing
- Demo user flow for quick review

## Tech stack
- Backend: Python 3.10+ (FastAPI, uvicorn)
- Frontend: React (Create React App), axios, Tailwind CSS
- Dev tooling: npm / Node.js, pip / virtualenv

## Prerequisites
- Windows PowerShell (or similar shell)
- Python 3.10+ (or the version used in this project)
- Node.js & npm (Node 16+ recommended)
- Git (optional, for repo work)

## Quick start (Windows PowerShell)

Open two PowerShell windows (one for backend, one for frontend).

### Backend (API)
```powershell
cd C:\Users\Amrutha\OneDrive\Desktop\App\app\backend

# create and activate a virtual environment (if needed)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# install dependencies
pip install -r requirements.txt

# run the API server
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

API: `http://127.0.0.1:8000`
Docs (Swagger/OpenAPI): `http://127.0.0.1:8000/docs`

Notes:
- The backend provides a simple in‑memory storage fallback for local evaluation. If you configure a real DB, the server will try to use it.

### Frontend (React)
```powershell
cd C:\Users\Amrutha\OneDrive\Desktop\App\app\frontend

# install dependencies (first time)
npm install --legacy-peer-deps

# run dev server
npm start
```

Open: `http://localhost:3000`

If the frontend can't reach the backend, it falls back to `http://localhost:8000` in local dev.

## Environment variables
- Frontend: `REACT_APP_BACKEND_URL` (optional build-time backend URL). Local dev prefers `http://localhost:8000`.
- Backend: continues to work with defaults; add env-based config if you wire a DB or external services.

## API endpoints (overview)
- GET /api/products — list products
- POST /api/auth/register — register user
	- Body example: `{ "email": "you@example.com", "password": "secret", "name": "Your Name" }`
- POST /api/auth/login — login (returns JWT)
	- Body example: `{ "email": "you@example.com", "password": "secret" }`
- Authenticated endpoints (require Bearer token):
	- GET /api/cart — get user's cart
	- POST /api/cart — add item to cart
	- POST /api/checkout — complete checkout

cURL examples:
```bash
# list products
curl http://127.0.0.1:8000/api/products

# register example
curl -X POST http://127.0.0.1:8000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"pass123","name":"Test"}'
```

## Tests
Lightweight backend tests / smoke tests may be included. From the `backend/` directory (with venv activated):
```powershell
python backend_test.py
```

## Project layout (top-level)
- `backend/` — FastAPI backend code and requirements
- `frontend/` — React frontend
- `README.md` — this file

## Production build (frontend)
```powershell
cd frontend
npm run build
# serve the build folder or integrate with backend
```

## Troubleshooting
- If `uvicorn` reports port-in-use, find and stop the process or run on a different port:
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```
- If frontend shows CORS or connection errors, ensure the backend is running and `REACT_APP_BACKEND_URL` is correct.

## Notes for reviewers
- This project was prepared as an assignment demo. It includes an in‑memory fallback so it can be evaluated without external DB setup.
- Dev-only analytics and preview-service references were removed for a neutral demo.

## Contributing
This is a demo project. Small improvements welcome (tests, DB wiring, auth hardening).

## License
Provided for assignment/demo purposes. Add a LICENSE file (e.g., MIT) to specify reuse terms.

## Contact
If you need help or the repo link, message me through the assignment page. — Amrutha

---

If you want a shorter `README.md` optimized for the assignment upload page, I can create that instead. Let me know and I'll update the file.

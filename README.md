# Medicus

Medicus is a healthcare operations dashboard and backend for tracking PHC-level inventory, demand, staffing, beds, transfers, and emergency scenarios. The repository contains a FastAPI backend, a React + Vite frontend, data ingestion scripts, machine learning components, and a simulated public-health dataset used to demonstrate operational planning.

## Repository structure

- `backend/` – FastAPI app, database access, authentication, ML services, optimization, and simulation logic.
- `data_pipeline/` – scripts that ingest and validate public health and operational datasets.
- `data/` – source registry and processed datasets used by the app.
- `frontend/` – React frontend for the dashboard and operations views.
- `tests/` – unit and integration tests covering RBAC, guardrails, simulation behavior, and model checks.
- `docs/` – architecture and project documentation.
- `scripts/` – helper scripts for database packaging and auditing.
- `simulation/` – utilities for generating synthetic or scenario data.

## Main stack

- Python, FastAPI, SQLite
- React, TypeScript, Vite
- Tailwind CSS
- scikit-learn, PyTorch, NumPy, Pandas
- Google GenAI SDK for grounded AI responses

## What the app includes

- role-based auth and access control
- PHC inventory tracking and demand updates
- bed, staffing, and patient flow monitoring
- emergency and simulation scenarios
- redistribution optimization logic for medicine transfers
- federated-learning style model flow for multi-region learning
- AI-assisted operational summarization through the Gemini service

## Run locally

### Backend

```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open the frontend in the browser, typically at `http://localhost:5173`.

## Tests

```bash
python -m unittest discover tests
```

## Notes

This repository is a working project scaffold and demo environment for public-health operational intelligence. The code and data are organized around simulated PHC operations, federated learning experiments, and operational decision support rather than a production deployment setup.

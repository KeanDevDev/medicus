# Multi-stage production container for Swasthya Grid
# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

RUN npm run build

# Stage 2: Python Backend Runtime
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    SWASTHYA_DB_PATH=/app/data/swasthya_grid.db

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application directories
COPY backend/ ./backend/
COPY data/ ./data/
COPY data_pipeline/ ./data_pipeline/
COPY simulation/ ./simulation/
COPY docs/ ./docs/
COPY scripts/ ./scripts/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8080

CMD exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}

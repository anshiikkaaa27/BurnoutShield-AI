# ════════════════════════════════════════════════════════════════
#  BurnoutShield Backend — Dockerfile
#  Build context: repo root  (set in docker-compose)
#  So paths like Backend/ and ml-model/ both resolve correctly.
# ════════════════════════════════════════════════════════════════

# ── Stage 1: install Python dependencies ─────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# System libs needed to compile bcrypt / cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc libffi-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first so Docker layer-caches the pip install
COPY Backend/requirements.txt ./requirements.txt

RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt

# ── Stage 2: lean runtime image ───────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source (Backend folder contents → /app)
COPY Backend/ ./

# Copy ML model artefacts into /app/ml-model
COPY ml-model/ ./ml-model/

# Run as non-root for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# 2 workers is fine for a VPS with 1–2 CPUs.
# For high traffic increase workers or switch to gunicorn.
CMD ["python", "-m", "uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2"]

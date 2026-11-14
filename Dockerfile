FROM node:22-bookworm-slim AS frontend-build

WORKDIR /frontend

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html ./
COPY vite.config.js ./
COPY src ./src

RUN npm run build


FROM python:3.12-slim AS production

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./

COPY --from=frontend-build /frontend/dist ./dist

EXPOSE 10000

CMD ["sh", "-c", "echo '=== ALEMBIC DIAGNOSTIC START ==='; python -m alembic current 2>&1; echo \"=== ALEMBIC EXIT CODE: $? ===\"; echo '=== ALEMBIC DIAGNOSTIC END ==='; exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
# Deployment preparation

## Proposed architecture

- **Frontend:** Vercel static site (`npm run build`, output `dist`). Set `VITE_API_BASE_URL` to the HTTPS origin of the deployed API. The local `/api` proxy is only for Vite development.
- **API:** Render Web Service, started with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set the health check path to `/health`.
- **Data and providers:** keep the existing managed PostgreSQL database and Qdrant Cloud collection after confirming their exact targets; continue using the existing Gemini and Groq credentials.
- **PDF files:** the default local storage directory is not durable on ephemeral hosts. Configure `DOCUMENT_STORAGE_DIR` to a mounted persistent disk before accepting uploads, or add an object-storage adapter (for example, S3-compatible storage) before horizontal scaling. Do not deploy the upload flow on ephemeral storage.

## Cost and limits to review

Vercel Hobby currently lists $0/month for personal projects, subject to its usage limits ([plan limits](https://vercel.com/docs/plans/hobby)). Render's free API service spins down after 15 idle minutes, can take about a minute to wake, and loses local files on restart or deploy, so it is unsuitable for persistent uploads ([free service limits](https://render.com/docs/free)). Render's current pricing lists the smallest paid web instance at $7/month and persistent disk storage at $0.25/GB-month; a 1 GB disk would add $0.25/month ([pricing](https://render.com/pricing)). Provider API usage, existing PostgreSQL/Qdrant charges, bandwidth, and applicable taxes are separate. Confirm current account-specific pricing before creating any service.

## Required backend environment

`DATABASE_URL`, `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION_NAME`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, and `DOCUMENT_STORAGE_DIR`.

Generate `JWT_SECRET` independently for production. Set `CORS_ALLOWED_ORIGINS` to the exact public frontend origin. `DATABASE_URL` must use the SQLAlchemy `postgresql+psycopg://` driver form. Keep API keys and database credentials in the host's secret environment settings; never place them in Vite variables.

## Required frontend environment

Set `VITE_API_BASE_URL` to the public HTTPS API origin at build time. Vite embeds `VITE_*` values into browser assets, so this value must contain no secret.

## Safe release sequence

1. Confirm the PostgreSQL host/database and Qdrant URL/collection are the intended production targets. Confirm the existing account, document, and four legacy vectors remain present.
2. Choose and provision durable PDF storage; do not use an ephemeral filesystem for uploaded documents.
3. Configure host secrets and the exact CORS origin. Configure a single API instance while using a local mounted disk.
4. Review the Alembic target and run `alembic upgrade head` against the verified database. This adds citation storage; it does not rebuild existing tables. Existing message history stays intact, but citations from old answers cannot be reconstructed because they were never persisted.
5. Deploy the API and verify `/health`, `/`, and the current Alembic revision.
6. Build/deploy the frontend with `VITE_API_BASE_URL` set to the deployed API origin. Check registration, login, upload, retrieval, citations, reopened history, retry, and deletion using a temporary account and document.
7. Restart the API and verify the same temporary document is still accessible before deleting it. Verify the public landing page loads signed out.

Do not run migrations, create hosting resources, or deploy until the database/vector targets and storage choice have been reviewed and deployment is approved.


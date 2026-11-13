# Study-Buddy RAG evaluation

## Fixture design and status

The fixture source set contains:

- `data/source.pdf`, copied byte-for-byte to `fixtures/resume_source.pdf` and owned by evaluation user A.
- `fixtures/rest_api_guide.pdf`, generated from the original, fixed text in `fixtures.py` and owned by user A.
- `fixtures/database_engineering_guide.pdf`, generated from the original, fixed text in `fixtures.py` and owned by user B.

The technical documents cover REST methods and status codes, JWT, authentication versus authorization, request lifecycle, keys and relationships, indexes, ACID, and joins. `fixtures.py` writes PDFs using a small deterministic standard-library PDF writer, so no additional production dependency is needed. It refuses to overwrite an existing changed fixture. `manifest.json` records SHA-256 hashes and the fixture version. The existing resume is preserved as a copy; the original `data/source.pdf` is never modified.

The dataset has direct, paraphrased, multi-fact, cross-chunk, cross-document, unanswerable, and scope-exclusion cases. Expected facts are authored against the document text. Chunk and document UUID labels are deliberately `null` until real upload and Qdrant ingestion have occurred; the seeder resolves them from the actual Qdrant payload and rejects a mismatch. Empty relevance labels are then used for questions with no in-scope evidence. Labels are linked to `fixture_version`.

`fixture-state.json` is generated locally and gitignored. It records evaluation user/document/conversation IDs, ownership, scopes, associations, completed status, actual chunk IDs/counts, and fixture version. It does not contain credentials, token values, or chunk text. No fixtures have been seeded by this code change; therefore this checkout currently has no actual fixture user/document/conversation IDs, and all answerable case UUID labels remain pending.

## Isolated local setup

Use a disposable evaluation database, dedicated local file directory, and a Qdrant collection whose name starts with `study_buddy_eval_`. Never run this process against a production database or the default `pdf_knowledge_base` collection. The seeder refuses a non-local API URL, a non-evaluation SQLite URL, a non-prefixed Qdrant collection, or missing explicit seed authorization. Provider credentials are read from the normal environment/`.env`; they are never printed. Real ingestion calls Gemini and writes to the dedicated Qdrant collection.

The API must use the same isolated settings in the server window. In PowerShell from the repository root:

```powershell
$env:DATABASE_URL = "sqlite:///./data/evaluation.sqlite3"
$env:DOCUMENT_STORAGE_DIR = "data/evaluation_uploads"
$env:QDRANT_COLLECTION_NAME = "study_buddy_eval_phase9b"
$env:EVAL_FIXTURE_MODE = "1"
$env:JWT_SECRET_KEY = (& .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))")
$env:ACCESS_TOKEN_EXPIRE_MINUTES = "60"
New-Item -ItemType Directory -Force data | Out-Null
& .\.venv\Scripts\python.exe -m alembic upgrade head
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Keep this server window open. Alembic was verified against this SQLite URL and creates only `data/evaluation.sqlite3`. The Qdrant service now accepts `QDRANT_COLLECTION_NAME` and defaults to the existing `pdf_knowledge_base` value when it is unset, preserving normal deployments.

In a second PowerShell window, set the same isolation variables, choose passwords interactively, prepare the source PDFs, and seed through registration, login, authenticated upload, conversation, and Qdrant flows:

```powershell
$env:DATABASE_URL = "sqlite:///./data/evaluation.sqlite3"
$env:DOCUMENT_STORAGE_DIR = "data/evaluation_uploads"
$env:QDRANT_COLLECTION_NAME = "study_buddy_eval_phase9b"
$env:EVAL_FIXTURE_MODE = "1"
$env:EVAL_API_URL = "http://127.0.0.1:8000"
$env:EVAL_ALLOW_FIXTURE_SEED = "YES"
$env:EVAL_USER_A_EMAIL = "study-buddy-eval-a@example.invalid"
$env:EVAL_USER_B_EMAIL = "study-buddy-eval-b@example.invalid"
$secureA = Read-Host "Set evaluation user A password" -AsSecureString
$secureB = Read-Host "Set evaluation user B password" -AsSecureString
$env:EVAL_USER_A_PASSWORD = [Net.NetworkCredential]::new("", $secureA).Password
$env:EVAL_USER_B_PASSWORD = [Net.NetworkCredential]::new("", $secureB).Password
& .\.venv\Scripts\python.exe tests\evaluation\prepare_fixtures.py
& .\.venv\Scripts\python.exe tests\evaluation\seed_fixtures.py
```

Use passwords with at least eight characters. The `@example.invalid` suffix prevents use of real email addresses. The seeder logs in to existing users after duplicate registration, checks both users are distinct, and uses each user's JWT for that user's uploads and conversations. On rerun it reuses documents by fixture filename, retries a failed document, verifies indexed chunk text against the source PDF, and reuses a conversation only when its title, scope, and selected document IDs match. It fails rather than overwriting a mismatched conversation or fixture file.

The six created scopes are:

| Owner | Scope | Associated documents |
|---|---|---|
| A | `single_document` | Resume |
| A | `single_document` | REST guide |
| A | `selected_documents` | Resume and REST guide |
| A | `all_documents` | No junction rows; runtime resolves all completed A documents |
| B | `single_document` | Database guide |
| B | `all_documents` | No junction rows; runtime resolves all completed B documents |

The seeder verifies the server's scoped list/create responses, completed lifecycle status, document ownership through authenticated account-specific API lists, and actual indexed chunk records filtered by the authenticated owner UUID and document UUID. It saves the real IDs to `fixture-state.json` and updates `dataset.json` only after all actual evidence labels pass consistency validation.

## Run all evaluation cases

After seeding, use a third PowerShell window or continue in the seeding window. Keep the password environment variables in that process, log in through the API, and hold tokens only in process memory:

```powershell
$env:EVAL_API_URL = "http://127.0.0.1:8000"
$base = $env:EVAL_API_URL
function Get-StudyBuddyEvalToken([string]$email, [string]$password) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  (Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body $body).access_token
}
$tokenA = Get-StudyBuddyEvalToken $env:EVAL_USER_A_EMAIL $env:EVAL_USER_A_PASSWORD
$tokenB = Get-StudyBuddyEvalToken $env:EVAL_USER_B_EMAIL $env:EVAL_USER_B_PASSWORD
$env:EVAL_ACCESS_TOKENS = @{ a = $tokenA; b = $tokenB } | ConvertTo-Json -Compress
& .\.venv\Scripts\python.exe tests\evaluation\run_evaluation.py tests\evaluation\evaluation-report.json
Get-Content tests\evaluation\evaluation-report.json
Remove-Item Env:\EVAL_ACCESS_TOKENS
Remove-Variable tokenA, tokenB
```

The runner verifies each token with `/auth/me` and checks its account ID against the local fixture state before issuing `/ask`. It does not accept user IDs from dataset cases. It uses each case's actual seeded conversation ID, records request latency, distinguishes authentication/authorization/HTTP/connection failures, and does not count failed or blocked cases as evaluated. It redacts response error details to avoid copying provider or credential text into the report. Set a single `EVAL_ACCESS_TOKEN` plus `EVAL_SINGLE_USER_KEY` only for intentionally partial, one-user runs.

The report records model names, threshold 0.50, top-K 5, fixture/dataset version, evaluated and blocked cases, API errors, and latency percentiles. Provider token usage and component-level timing remain unavailable from the current API. `security_scope_tests` remains marked blocked: fixture presence and ordinary evaluation outputs do not constitute the independent Phase 9D security test.

## Safe cleanup

No cleanup runs automatically. To preserve evaluation artifacts, do not run cleanup. If a fixture reset is explicitly needed, stop the local API, confirm the environment points to `sqlite:///./data/evaluation.sqlite3`, `data/evaluation_uploads`, and `study_buddy_eval_phase9b`, then remove only those local paths. Delete a Qdrant collection only after confirming its exact name begins with `study_buddy_eval_`; never delete the default collection or user collections as part of evaluation cleanup. Remove the local `fixture-state.json`; a later seed replaces dataset labels only after verifying the new actual uploads and points.

## Metric and evaluation limitations

- Recall@K divides by the number of labeled relevant chunks; it diagnoses missed evidence, not answer quality.
- Precision@K divides by K even when fewer than K points are returned; this penalizes empty result slots and measures retrieval noise.
- MRR uses the rank of the first relevant chunk; it measures how quickly at least one useful result appears.
- Answer-fact matching is deterministic phrase/word-boundary matching with basic negation checks. It can miss a correct paraphrase and does not establish semantic correctness.
- Citation checks compare citation chunk, document, source, and page against returned sources. This tests reference consistency, not whether the cited text truly entails the claim.
- Faithfulness cannot be independently scored because `/ask` does not return the retrieved text as evaluation output.
- Unanswerable/scope-exclusion cases check safe abstention text and missing citations. They are not a substitute for dedicated authorization tests.
- API p50/p95 use linear interpolation at `(n - 1) * p` (Hyndman-Fan type 7) over wall-clock request latency.
- Provider token usage, cost, and component timings are not exposed. The second verification LLM call and network/provider variability make live answer scores less deterministic than retrieval labels.
- Resume PDF page extraction and expected phrases are checked from the actual source; sensitive resume content is not copied into the evaluation report.

## Tests

Run the full test suite:

```powershell
& .\.venv\Scripts\python.exe -m pytest -q
```

Fixture-specific tests can be run with:

```powershell
& .\.venv\Scripts\python.exe -m pytest tests\test_evaluation_fixtures.py tests\test_evaluation_metrics.py -q
```

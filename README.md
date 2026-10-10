# CloudSentinel

**Multi-Cloud Threat Detection and Intelligence Platform**

CloudSentinel connects to cloud services (AWS and Azure), normalizes their logs into a common format, detects suspicious activity, correlates related events into incidents, maps behavior to MITRE ATT&CK, and presents everything in a unified dashboard with an AI security assistant grounded in evidence.

> The goal is not to display logs. It is to turn raw cloud events into **actionable security incidents with evidence-backed explanations**.

**Status:** under active development (Step 1: project skeleton and Docker setup).

---

## Example: what it detects

1. Multiple failed AWS console logins occur.
2. A successful login follows from an unusual IP address.
3. The account creates a new access key.
4. The account attempts to access sensitive resources.
5. CloudSentinel correlates these events into one potential attack sequence.
6. The detection engine maps the behavior to MITRE ATT&CK (T1110, T1078.004, T1098.001, T1530).
7. The RAG component retrieves relevant threat intelligence and investigation procedures.
8. The dashboard shows an incident timeline, evidence, risk score, and recommended response steps.

The same flow applies to Azure (Entra ID sign-ins, Activity Log, resource logs).

---

## Architecture

```
        AWS CLOUD                              AZURE CLOUD
 ┌─────────────────────┐              ┌──────────────────────┐
 │ CloudTrail          │              │ Azure Activity Log   │
 │ GuardDuty Findings  │              │ Entra ID Sign-ins    │
 │ VPC Flow Logs       │              │ Azure Resource Logs  │
 └──────────┬──────────┘              └──────────┬───────────┘
            ▼                                    ▼
 ┌─────────────────────┐              ┌──────────────────────┐
 │ EventBridge         │              │ Event Hubs           │
 │ CloudWatch / S3     │              │ Azure Monitor        │
 └──────────┬──────────┘              └──────────┬───────────┘
            └─────────────────┬──────────────────┘
                              ▼
                  ┌───────────────────────┐
                  │  Log Ingestion Layer  │   collectors, streaming consumers,
                  │                       │   sample-log replay
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │  Normalization Layer  │   provider adapters ->
                  │  Common Event Schema  │   one schema (CES)
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │ Detection & Analysis  │   rules + correlation +
                  │                       │   anomaly detection
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │  Threat Intelligence  │   MITRE ATT&CK mapping,
                  │  & Incident Building  │   risk scoring
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │  RAG Investigation    │   evidence + threat intel +
                  │                       │   playbooks -> grounded answers
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │   Unified Dashboard   │   alerts, incidents,
                  │                       │   AI security analyst
                  └───────────────────────┘
```

### Dashboard pages

| Page | Purpose |
|------|---------|
| Overview | Total events, suspicious activity, critical incidents, security status |
| Live Event Stream | Incoming AWS and Azure events in real time |
| Threat Detection | Rules, analytics, and alerts |
| MITRE ATT&CK Mapping | Techniques associated with detected behavior |
| Incident Investigation | Correlated events, attack timeline, affected resources, risk score |
| AI Security Assistant | Ask questions about an incident; answers cite logs and documentation |
| Cloud Comparison | AWS vs Azure event and incident patterns |

For the full design (Common Event Schema, detection tiers, RAG contract, engineering rules), see [`CONTEXT.md`](CONTEXT.md).

---

## Tech stack

| Concern | Choice |
|---------|--------|
| Backend API / workers | Python 3.12, FastAPI, Pydantic |
| Queue / streaming (dev) | Redis |
| Database | PostgreSQL 16 with pgvector |
| Frontend (planned) | React, TypeScript, Vite, Tailwind |
| Packaging | Docker, Docker Compose |

---

## Project structure

```
cloudsentinel/
├── README.md
├── CONTEXT.md                 # full project context / design document
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI entrypoint (app.main:app)
│       └── workers/           # ingest / detect workers (planned)
├── detections/                # YAML detection rules and ATT&CK mapping (planned)
├── knowledge/                 # playbooks and docs for RAG (planned)
├── sample_logs/               # sample AWS / Azure logs (planned)
├── frontend/                  # React dashboard (planned)
└── tests/
```

---

## Getting started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose (Docker Desktop on Windows/Mac)
- Git
- Python 3.12+ (only needed for a local virtual environment)

Check your tools:

```bash
docker --version
docker compose version
git --version
```

### 1. Clone the repository

```bash
git clone https://github.com/zero1byte/cloudsentinel.git
cd cloudsentinel
```

### 2. Create your environment file

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

Open `.env` and set at least a new `POSTGRES_PASSWORD`. Leave `INGEST_MODE=replay` to run with sample logs and no cloud account. **Never commit `.env`.**

### 3. Start the stack

```bash
docker compose up --build
```

Add `-d` to run in the background.

### 4. Verify

- Health check: http://localhost:8000/healthz -> `{"status":"ok"}`
- API docs (Swagger): http://localhost:8000/docs

---

## Starting again after you closed the project

Your database data is stored in a Docker volume (`pgdata`), so it survives restarts. To get back to work:

1. **Start Docker Desktop** (Windows/Mac) and wait until it says it is running. On Linux, make sure the Docker service is running.
2. **Open a terminal in the project folder:**
   ```bash
   cd path/to/cloudsentinel
   ```
3. **Start the containers:**
   ```bash
   docker compose up -d
   ```
   Add `--build` only if you changed code, `requirements.txt`, or the Dockerfile.
4. **Check that everything is up:**
   ```bash
   docker compose ps
   ```
   Open http://localhost:8000/healthz.
5. **(Optional) Reactivate your local virtual environment** if you use one for your editor or tests:
   ```bash
   source .venv/bin/activate          # Linux/macOS
   .venv\Scripts\Activate.ps1         # Windows PowerShell
   ```

### Stopping

| Goal | Command |
|------|---------|
| Pause containers, keep everything | `docker compose stop` |
| Remove containers, **keep database data** | `docker compose down` |
| Remove containers **and delete database data** | `docker compose down -v` |

---

## Local development (virtual environment)

Docker builds its own Python environment inside the image. A local `.venv` is optional and is useful for editor autocomplete, running tests, and running the API without Docker.

```bash
python3 -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

Run the API locally with hot reload, using only the database and Redis from Docker:

```bash
docker compose up -d db redis
cd backend
uvicorn app.main:app --reload
```

When you add a library, install it, add it to `backend/requirements.txt`, then rebuild the image:

```bash
pip install <package>
# add the package to backend/requirements.txt
docker compose up --build -d
```

---

## Useful commands

| Task | Command |
|------|---------|
| Follow API logs | `docker compose logs -f api` |
| Rebuild and restart | `docker compose up --build -d` |
| List running services | `docker compose ps` |
| Shell inside the API container | `docker compose exec api sh` |
| Postgres shell | `docker compose exec db psql -U sentinel -d cloudsentinel` |
| Build the image only | `docker build -t cloudsentinel:dev .` |

---

## Troubleshooting

| Problem | Likely fix |
|---------|-----------|
| `Cannot connect to the Docker daemon` | Docker Desktop is not running; start it |
| Build error: `not found` for a folder | `backend/`, `detections/`, `knowledge/` or `sample_logs/` is missing; create it (add a `.gitkeep` to empty folders) |
| Port 8000 already in use | Stop the other program, or change the port mapping in `docker-compose.yml` |
| API container keeps restarting | Run `docker compose logs api`; usually a missing `__init__.py` or an import error in `main.py` |
| `.env` appears in `git status` | Add `.env` to `.gitignore` and run `git rm --cached .env` |
| Database password change has no effect | The volume keeps the old password; run `docker compose down -v` (this deletes data) and start again |

---

## Roadmap

1. [x] Project setup and Docker
2. [ ] Common Event Schema (data models)
3. [ ] Sample AWS and Azure logs, including an attack sequence
4. [ ] Normalization adapters (CloudTrail, Entra ID, then others)
5. [ ] Database and ingestion
6. [ ] Detection rules, correlation, and incidents
7. [ ] MITRE ATT&CK mapping and risk scoring
8. [ ] Dashboard
9. [ ] RAG security assistant
10. [ ] Azure parity, cloud comparison, live connectors

---

## Security notes

- Cloud credentials used by CloudSentinel should be **read-only** and least-privilege.
- Secrets live in `.env` or a secrets manager, never in the repository or the image.
- Log content is treated as untrusted input, both in the UI and when building LLM prompts.
- The AI assistant is advisory only and has no ability to change cloud resources.

---

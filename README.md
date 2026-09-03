# RepoMind AI

Implementation based on the provided specification in README_RepoMind_AI.md.

## Modules

- frontend: Next.js dashboard and workflow pages
- backend: FastAPI services and REST APIs
- parser: repository parser utilities
- rag: retrieval utilities
- embeddings: vector store abstractions
- graph: knowledge graph builder
- static_analysis: debt/security/complexity analyzers
- uml: class diagram generation
- reports: report builder
- docker: container configuration
- tests: cross-module tests

## Run Locally

### Local-Only Mode

This mode disables all external API calls. The app uses local SQLite, hash-based embeddings, and fallback provider responses.

```bash
Copy-Item .env.local.example .env.local
```

```bash
cd backend
$env:LOCAL_ONLY = "true"
$env:API_PREFIX = ""
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000"
npm run dev
```

### Optional Vector Store Services

Run only the vector-store service you want alongside the local-only app:

```bash
cd docker
docker compose -f docker-compose.qdrant.yml up -d
```

```bash
cd docker
docker compose -f docker-compose.milvus.yml up -d
```

### Backendc

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker Compose

```bash
cd docker
docker compose up --build
```

## Required Environment Variables

See [.env.example](.env.example)

## APIs

- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me
- POST /repository/import
- GET /repository/{id}
- POST /chat
- GET /uml?repository_id=
- GET /dependencies?repository_id=
- GET /technical-debt?repository_id=
- GET /security?repository_id=
- GET /report?repository_id=

## Notes

This implementation now includes:

- Configurable LLM providers (OpenAI, Gemini, Claude)
- Qdrant vector search integration with SQL fallback
- Neo4j graph indexing integration
- JWT auth with register/login/refresh/logout
- Role-based access control for sensitive endpoints
- Persistent user sessions in database-backed session table
- Parser-driven UML and dependency outputs
- Interactive Cytoscape dependency graph and Mermaid UML rendering in frontend

For free-tier provider choices and API platforms, see [docs/free-api-platforms.md](docs/free-api-platforms.md).

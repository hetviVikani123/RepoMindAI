# RepoMind AI Architecture

## Flow

1. User submits GitHub repository URL
2. Backend clones and indexes repository
3. Parser/analysis modules extract metadata and structure
4. Embedding service creates chunk vectors for retrieval
5. Chat endpoint retrieves similar chunks and builds grounded response
6. UI surfaces architecture, UML, dependency, security, and debt reports

## Components

- FastAPI Backend
- Next.js Frontend
- PostgreSQL (metadata)
- Neo4j (knowledge graph)
- Qdrant (vector search)

## Future Improvements

- Replace hash-based embedding with Sentence Transformers or hosted models
- Implement exact AST parsers by language
- Add full CI pipeline and regression prompt evaluation

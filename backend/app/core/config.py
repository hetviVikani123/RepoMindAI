from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "RepoMind AI"
    app_env: str = "development"
    local_only: bool = False
    api_prefix: str = ""
    database_url: str = "sqlite:///./repomind.db"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    openai_api_key: str | None = None
    google_api_key: str | None = None
    anthropic_api_key: str | None = None
    groq_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"
    llm_provider: str = "gemini"
    embedding_provider: str = "local"
    openai_model: str = "gpt-4o-mini"
    gemini_model: str = "gemini-1.5-flash"
    groq_model: str = "llama-3.3-70b-versatile"
    claude_model: str = "claude-3-5-haiku-latest"
    ollama_model: str = "llama3.2"
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_collection: str = "repomind_code_chunks"
    neo4j_uri: str | None = None
    neo4j_username: str = "neo4j"
    neo4j_password: str | None = None
    jwt_secret: str = "cfV47rfodqrCwqfo7jlhnol5HtgwW02JY8aLlXdDI03"
    workspace_dir: str = str(Path(__file__).resolve().parents[3] / "workspace_repos")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

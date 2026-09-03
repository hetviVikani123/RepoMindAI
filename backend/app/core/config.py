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
    llm_provider: str = "openai"
    embedding_provider: str = "openai"
    openai_model: str = "gpt-4o-mini"
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_collection: str = "repomind_code_chunks"
    neo4j_uri: str | None = None
    neo4j_username: str = "neo4j"
    neo4j_password: str | None = None
    jwt_secret: str = "change-me"
    workspace_dir: str = str(Path(__file__).resolve().parents[3] / "workspace_repos")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

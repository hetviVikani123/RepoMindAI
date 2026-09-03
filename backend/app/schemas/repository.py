from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class RepositoryImportRequest(BaseModel):
    url: HttpUrl


class RepositoryResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    url: str
    local_path: str
    language: str
    framework: str
    build_system: str
    created_at: datetime

    class Config:
        from_attributes = True


class RepositoryListResponse(BaseModel):
    repositories: list[RepositoryResponse]
    total: int


class ChatRequest(BaseModel):
    repository_id: int
    question: str = Field(min_length=3)


class ChatResponse(BaseModel):
    answer: str
    citations: list[str]


class AnalysisResponse(BaseModel):
    repository_id: int
    report_type: str
    result: dict


class PipelineStageResponse(BaseModel):
    stage_name: str
    status: str
    message: str
    started_at: datetime | None
    completed_at: datetime | None

    class Config:
        from_attributes = True


class PipelineStatusResponse(BaseModel):
    repository_id: int
    stages: list[PipelineStageResponse]


class DocumentationResponse(BaseModel):
    repository_id: int
    readme: str
    architecture_doc: str
    module_docs: dict[str, str]
    api_summary: str

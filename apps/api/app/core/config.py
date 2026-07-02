"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "sqlite+aiosqlite:///./sitejudge.db"

    # Queue (set USE_CELERY=False to run scans via FastAPI BackgroundTasks without Redis)
    use_celery: bool = True

    # Redis / Celery
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    # Services
    lighthouse_worker_url: str = "http://worker:3001"

    # AI (Groq)
    groq_api_key: str = ""

    # GitHub Integration
    github_token: str = ""

    # CORS
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()

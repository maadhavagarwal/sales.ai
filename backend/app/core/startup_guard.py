import os


DEFAULT_SECRET = "INSECURE_DEV_KEY_CHANGE_IN_PRODUCTION"


def _is_true(value: str | None) -> bool:
    return str(value or "").strip().lower() == "true"


def _looks_unsafe_secret(value: str | None) -> bool:
    if not value:
        return True
    raw = str(value).strip()
    lowered = raw.lower()
    if len(raw) < 32:
        return True
    unsafe_markers = [
        "insecure",
        "placeholder",
        "change_in_production",
        "change-in-production",
        "your-secret",
        "example",
    ]
    if raw == DEFAULT_SECRET:
        return True
    return any(marker in lowered for marker in unsafe_markers)


def validate_startup_or_raise() -> None:
    """Block unsafe startup configurations in strict production mode."""
    strict_mode = _is_true(os.getenv("NEURALBI_STRICT_PRODUCTION", "false"))
    if not strict_mode:
        return

    secret_key = os.getenv("SECRET_KEY")
    if _looks_unsafe_secret(secret_key):
        raise RuntimeError(
            "Strict production mode requires a strong SECRET_KEY (32+ chars, non-placeholder)."
        )

    database_url = os.getenv("DATABASE_URL", "").strip().lower()
    if not database_url.startswith("postgresql"):
        raise RuntimeError(
            "Strict production mode requires PostgreSQL DATABASE_URL."
        )

    if _is_true(os.getenv("ENABLE_LIVE_KPI_SIMULATOR", "false")):
        raise RuntimeError(
            "ENABLE_LIVE_KPI_SIMULATOR must be false in strict production mode."
        )

    allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
    lowered_origins = allowed_origins.lower()
    disallowed_markers = ["localhost", "127.0.0.1", "http://", "*"]
    if any(marker in lowered_origins for marker in disallowed_markers):
        raise RuntimeError(
            "Strict production mode requires explicit HTTPS ALLOWED_ORIGINS without localhost/wildcards."
        )

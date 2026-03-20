import os


def strict_production_enabled() -> bool:
    """Return True when strict production guardrails are enabled."""
    return os.getenv("NEURALBI_STRICT_PRODUCTION", "false").lower() == "true"


def require_real_services(feature: str) -> None:
    """Raise if a code path relies on synthetic/mock behavior in strict mode."""
    if strict_production_enabled():
        raise RuntimeError(
            f"{feature} is unavailable in strict production mode without real service implementation."
        )

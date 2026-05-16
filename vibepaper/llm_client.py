"""Shared OpenAI-compatible client helpers for related-work tasks.

Reads ``OPENAI_API_KEY``, ``OPENAI_BASE_URL`` (optional, for proxies), and
``VIBEPAPER_MODEL`` from the environment. The ``TokenBucket`` rate limiter
keeps batch jobs (e.g. per-paper summarization) under a configurable QPS
ceiling.
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass


class LLMConfigError(Exception):
    """Raised when required LLM env vars are missing or invalid."""


@dataclass
class LLMConfig:
    api_key: str
    model: str
    base_url: str | None


def resolve_model(override: str | None = None) -> str:
    """Pick the model name: explicit override > ``VIBEPAPER_MODEL`` env."""
    if override:
        candidate = override.strip()
        if candidate:
            return candidate

    env_value = (os.environ.get("VIBEPAPER_MODEL") or "").strip()
    if not env_value:
        raise LLMConfigError(
            "VIBEPAPER_MODEL is not set. Configure it in .env, e.g. "
            "VIBEPAPER_MODEL=gpt-4o-mini."
        )
    return env_value


def resolve_api_key() -> str:
    """Read ``OPENAI_API_KEY`` from env, raise if missing."""
    value = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not value:
        raise LLMConfigError(
            "OPENAI_API_KEY is not set. Configure it in .env."
        )
    return value


def resolve_base_url() -> str | None:
    """Optional ``OPENAI_BASE_URL`` override (proxy support)."""
    value = (os.environ.get("OPENAI_BASE_URL") or "").strip()
    return value or None


def load_config(model_override: str | None = None) -> LLMConfig:
    return LLMConfig(
        api_key=resolve_api_key(),
        model=resolve_model(model_override),
        base_url=resolve_base_url(),
    )


def build_client(config: LLMConfig):
    """Construct an ``openai.OpenAI`` client from a resolved ``LLMConfig``.

    Imported lazily so the rest of the package does not require the
    ``openai`` SDK to be installed for unrelated commands.
    """
    from openai import OpenAI

    return OpenAI(api_key=config.api_key, base_url=config.base_url)


class TokenBucket:
    """Thread-safe token bucket for request-per-second rate limiting.

    ``rate_per_sec`` tokens are refilled per real-time second up to
    ``capacity``. ``acquire()`` blocks until one token is available. This is
    a *rate* limiter, not a concurrency limiter — combine with a thread pool
    to cap simultaneous in-flight requests.
    """

    def __init__(self, rate_per_sec: float, capacity: int | None = None) -> None:
        if rate_per_sec <= 0:
            raise ValueError("rate_per_sec must be positive")
        self.rate = float(rate_per_sec)
        self.capacity = float(capacity if capacity is not None else max(rate_per_sec, 1))
        self._tokens = self.capacity
        self._last = time.monotonic()
        self._lock = threading.Lock()

    def acquire(self, tokens: float = 1.0) -> float:
        """Block until ``tokens`` are available; return seconds slept."""
        slept = 0.0
        while True:
            with self._lock:
                now = time.monotonic()
                elapsed = now - self._last
                self._tokens = min(self.capacity, self._tokens + elapsed * self.rate)
                self._last = now
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return slept
                deficit = tokens - self._tokens
                wait = deficit / self.rate
            time.sleep(wait)
            slept += wait

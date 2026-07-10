"""
In-memory progress store for real-time scan pipeline events.

Each scan_id maps to a list of ProgressEvent dicts that accumulate
as the orchestrator pipeline runs. SSE endpoints read from this store.
"""

import asyncio
import time
from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class ProgressEvent:
    """A single log line from the pipeline."""
    timestamp: float
    event_type: str          # "log", "step_start", "step_done", "complete", "error"
    agent: str               # "seo", "accessibility", "broken_links", "lighthouse", "judge", "system"
    message: str
    detail: str | None = None
    step_index: int | None = None
    total_steps: int = 5

    def to_dict(self) -> dict:
        return asdict(self)


class ProgressStore:
    """Thread-safe in-memory store for pipeline progress events."""

    def __init__(self):
        self._events: dict[str, list[ProgressEvent]] = {}
        self._conditions: dict[str, asyncio.Condition] = {}

    def _ensure(self, scan_id: str):
        if scan_id not in self._events:
            self._events[scan_id] = []
            self._conditions[scan_id] = asyncio.Condition()

    async def push(self, scan_id: str, event: ProgressEvent):
        """Push a new event and notify all waiting listeners."""
        self._ensure(scan_id)
        self._events[scan_id].append(event)
        cond = self._conditions[scan_id]
        async with cond:
            cond.notify_all()

    async def push_log(self, scan_id: str, agent: str, message: str,
                       detail: str | None = None, step_index: int | None = None):
        """Convenience: push a log event."""
        await self.push(scan_id, ProgressEvent(
            timestamp=time.time(),
            event_type="log",
            agent=agent,
            message=message,
            detail=detail,
            step_index=step_index,
        ))

    async def push_step_start(self, scan_id: str, agent: str, message: str,
                               step_index: int):
        await self.push(scan_id, ProgressEvent(
            timestamp=time.time(),
            event_type="step_start",
            agent=agent,
            message=message,
            step_index=step_index,
        ))

    async def push_step_done(self, scan_id: str, agent: str, message: str,
                              step_index: int):
        await self.push(scan_id, ProgressEvent(
            timestamp=time.time(),
            event_type="step_done",
            agent=agent,
            message=message,
            step_index=step_index,
        ))

    async def push_complete(self, scan_id: str):
        await self.push(scan_id, ProgressEvent(
            timestamp=time.time(),
            event_type="complete",
            agent="system",
            message="Audit pipeline finished. Report ready.",
        ))

    async def push_error(self, scan_id: str, message: str):
        await self.push(scan_id, ProgressEvent(
            timestamp=time.time(),
            event_type="error",
            agent="system",
            message=message,
        ))

    def get_events(self, scan_id: str, after_index: int = 0) -> list[ProgressEvent]:
        """Get all events for a scan after a given index."""
        self._ensure(scan_id)
        return self._events[scan_id][after_index:]

    async def wait_for_events(self, scan_id: str, timeout: float = 30.0) -> bool:
        """Wait until new events are available. Returns True if notified, False on timeout."""
        self._ensure(scan_id)
        cond = self._conditions[scan_id]
        try:
            async with cond:
                await asyncio.wait_for(cond.wait(), timeout=timeout)
                return True
        except asyncio.TimeoutError:
            return False

    def cleanup(self, scan_id: str):
        """Remove events for a completed scan (call after client disconnects)."""
        self._events.pop(scan_id, None)
        self._conditions.pop(scan_id, None)


# Singleton instance
progress_store = ProgressStore()

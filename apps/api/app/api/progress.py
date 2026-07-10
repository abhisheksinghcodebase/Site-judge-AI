"""SSE endpoint for real-time scan progress streaming."""

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.progress_store import progress_store

router = APIRouter(prefix="/scans", tags=["progress"])


@router.get("/{scan_id}/progress")
async def stream_progress(scan_id: str):
    """
    Server-Sent Events (SSE) endpoint that streams real-time pipeline
    progress events as the scan runs. The frontend connects via EventSource.

    Event format:
        data: {"timestamp": ..., "event_type": "log", "agent": "seo", "message": "..."}

    The stream ends when a 'complete' or 'error' event is sent.
    """

    async def event_generator():
        cursor = 0
        keepalive_count = 0
        max_keepalives = 120  # ~2 minutes of no events before giving up

        # Send initial connection event
        init_event = json.dumps({
            "event_type": "connected",
            "agent": "system",
            "message": "Connected to progress stream",
            "timestamp": 0,
            "step_index": None,
            "total_steps": 5,
        })
        yield f"data: {init_event}\n\n"

        while True:
            # Get any new events since our cursor
            new_events = progress_store.get_events(scan_id, after_index=cursor)

            if new_events:
                keepalive_count = 0
                for event in new_events:
                    data = json.dumps(event.to_dict())
                    yield f"data: {data}\n\n"
                    cursor += 1

                    # End stream on terminal events
                    if event.event_type in ("complete", "error"):
                        return
            else:
                # Send keepalive comment to prevent connection timeout
                keepalive_count += 1
                if keepalive_count >= max_keepalives:
                    # Timeout — send error and close
                    timeout_event = json.dumps({
                        "event_type": "error",
                        "agent": "system",
                        "message": "Progress stream timed out",
                        "timestamp": 0,
                        "step_index": None,
                        "total_steps": 5,
                    })
                    yield f"data: {timeout_event}\n\n"
                    return

                yield ": keepalive\n\n"

            # Wait for new events or timeout after 1 second
            await progress_store.wait_for_events(scan_id, timeout=1.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )

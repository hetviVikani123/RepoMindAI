from __future__ import annotations

from datetime import datetime


def build_report(repository_id: int, sections: dict) -> dict:
    return {
        "repository_id": repository_id,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "sections": sections,
        "summary": {
            "section_count": len(sections),
            "status": "generated",
        },
    }

from __future__ import annotations


def retrieve_context(question: str, chunks: list[dict], top_k: int = 5) -> list[dict]:
    scored = []
    q_tokens = set(question.lower().split())

    for chunk in chunks:
        text = chunk.get("chunk", "")
        tokens = set(text.lower().split())
        overlap = len(q_tokens.intersection(tokens))
        scored.append((overlap, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:top_k]]

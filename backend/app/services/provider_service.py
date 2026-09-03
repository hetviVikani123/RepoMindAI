from __future__ import annotations

from app.core.config import settings


class ProviderService:
    @staticmethod
    def generate_answer(question: str, context: str) -> str:
        if settings.local_only:
            return (
                "Local-only mode is enabled. External LLM APIs are disabled.\n\n"
                f"Question: {question}\n\n"
                f"Grounded context:\n{context[:2000]}"
            )

        provider = settings.llm_provider.lower()

        if provider == "openai" and settings.openai_api_key:
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key)
            completion = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": "You are a codebase reasoning assistant. Be concise and grounded."},
                    {"role": "user", "content": f"Question:\n{question}\n\nContext:\n{context}"},
                ],
                temperature=0.2,
            )
            return completion.choices[0].message.content or "No response returned by model."

        if provider == "gemini" and settings.google_api_key:
            import google.generativeai as genai

            genai.configure(api_key=settings.google_api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(f"Question:\n{question}\n\nContext:\n{context}")
            return response.text or "No response returned by model."

        if provider == "claude" and settings.anthropic_api_key:
            from anthropic import Anthropic

            client = Anthropic(api_key=settings.anthropic_api_key)
            message = client.messages.create(
                model="claude-3-5-haiku-latest",
                max_tokens=800,
                temperature=0.2,
                messages=[{"role": "user", "content": f"Question:\n{question}\n\nContext:\n{context}"}],
            )
            first = message.content[0]
            return first.text if hasattr(first, "text") else "No response returned by model."

        return (
            "Provider fallback used because provider credentials are missing.\n\n"
            f"Question: {question}\n\n"
            f"Context summary:\n{context[:1500]}"
        )

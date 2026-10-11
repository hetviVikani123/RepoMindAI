from __future__ import annotations

import re
from app.core.config import settings


class ProviderService:
    @staticmethod
    def generate_answer(question: str, context: str) -> str:
        provider = settings.llm_provider.lower()

        # 1. Google Gemini (Recommended)
        if (provider == "gemini" or not provider or provider == "google") and settings.google_api_key:
            try:
                import google.generativeai as genai

                genai.configure(api_key=settings.google_api_key)
                model = genai.GenerativeModel(
                    settings.gemini_model or "gemini-1.5-flash",
                    system_instruction="You are RepoMind AI, an expert code reasoning assistant. Answer questions clearly and concisely using only the provided codebase context. Reference file names where relevant.",
                )
                prompt = f"Question:\n{question}\n\nCodebase Context:\n{context}"
                response = model.generate_content(prompt)
                if response and response.text:
                    return response.text
            except Exception as e:
                # If Gemini fails, log or fall back
                pass

        # 2. OpenAI
        if provider == "openai" and settings.openai_api_key:
            try:
                from openai import OpenAI

                client = OpenAI(api_key=settings.openai_api_key)
                completion = client.chat.completions.create(
                    model=settings.openai_model or "gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are RepoMind AI, an expert code reasoning assistant. Answer questions clearly using the provided codebase context.",
                        },
                        {"role": "user", "content": f"Question:\n{question}\n\nCodebase Context:\n{context}"},
                    ],
                    temperature=0.2,
                )
                if completion.choices and completion.choices[0].message.content:
                    return completion.choices[0].message.content
            except Exception:
                pass

        # 3. Anthropic Claude
        if provider == "claude" and settings.anthropic_api_key:
            try:
                from anthropic import Anthropic

                client = Anthropic(api_key=settings.anthropic_api_key)
                message = client.messages.create(
                    model=settings.claude_model or "claude-3-5-haiku-latest",
                    max_tokens=1000,
                    temperature=0.2,
                    system="You are RepoMind AI, an expert code reasoning assistant.",
                    messages=[{"role": "user", "content": f"Question:\n{question}\n\nContext:\n{context}"}],
                )
                if message.content:
                    first = message.content[0]
                    return first.text if hasattr(first, "text") else str(first)
            except Exception:
                pass

        # 4. Groq (Free fast inference)
        if provider == "groq" and settings.groq_api_key:
            try:
                from openai import OpenAI

                client = OpenAI(
                    api_key=settings.groq_api_key,
                    base_url="https://api.groq.com/openai/v1",
                )
                completion = client.chat.completions.create(
                    model=settings.groq_model or "llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are RepoMind AI, an expert code reasoning assistant."},
                        {"role": "user", "content": f"Question:\n{question}\n\nCodebase Context:\n{context}"},
                    ],
                    temperature=0.2,
                )
                if completion.choices and completion.choices[0].message.content:
                    return completion.choices[0].message.content
            except Exception:
                pass

        # 5. Ollama (Local LLM via OpenAI API)
        if provider == "ollama":
            try:
                from openai import OpenAI

                base_url = f"{settings.ollama_base_url.rstrip('/')}/v1"
                client = OpenAI(base_url=base_url, api_key="ollama")
                completion = client.chat.completions.create(
                    model=settings.ollama_model or "llama3.2",
                    messages=[
                        {"role": "system", "content": "You are RepoMind AI, an expert code reasoning assistant."},
                        {"role": "user", "content": f"Question:\n{question}\n\nContext:\n{context}"},
                    ],
                )
                if completion.choices and completion.choices[0].message.content:
                    return completion.choices[0].message.content
            except Exception:
                pass

        # 6. Smart Grounded Code Synthesizer
        # Provides intelligent, detailed codebase answers even when no external API key is configured.
        return ProviderService._synthesize_grounded_answer(question, context)

    @staticmethod
    def _synthesize_grounded_answer(question: str, context: str) -> str:
        """Synthesizes a structured answer from indexed code snippets."""
        if not context.strip():
            return (
                f"### Analysis for: '{question}'\n\n"
                "No matching code snippets found in the indexed repository for this query. "
                "Ensure repository analysis has completed in **Analysis Progress**."
            )

        # Parse excerpts out of context formatted like "[filename]\ncontent"
        blocks = re.findall(r"\[([^\]]+)\]\n(.*?)(?=\n\n\[|\Z)", context, re.DOTALL)
        if not blocks:
            # Fallback if format is different
            blocks = [("Code Snippet", context[:1200])]

        summary_lines = [
            f"### Codebase Answer: {question}\n",
            "Based on the repository code analysis, here are the findings:\n",
        ]

        # Extract matching functions, classes, or patterns
        found_details = []
        for file_path, content in blocks[:4]:
            lines = [l.strip() for l in content.splitlines() if l.strip()]
            relevant_lines = []
            for l in lines:
                if any(w in l.lower() for w in question.lower().split() if len(w) > 3):
                    relevant_lines.append(l)

            # Look for defs or classes
            symbols = re.findall(r"(?:def|class|function|interface|class\s+\w+)\s+([A-Za-z0-9_]+)", content)
            symbol_str = f" (defines: `{', '.join(symbols[:3])}`)" if symbols else ""

            summary_lines.append(f"#### 📄 `{file_path}`{symbol_str}")
            if relevant_lines:
                sample = "\n".join(relevant_lines[:4])
                summary_lines.append(f"```text\n{sample}\n```")
            else:
                sample = "\n".join(lines[:3])
                summary_lines.append(f"```text\n{sample}\n```")

        summary_lines.append(
            "\n> 💡 **Tip:** To enable generative natural-language answers, configure your "
            "**Google Gemini API key** or other provider in **Settings**."
        )

        return "\n".join(summary_lines)

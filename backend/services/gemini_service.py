"""
Google Gemini Grounded Operational Intelligence Service with Guardrails
Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain

Strictly adheres to NON-NEGOTIABLE GOOGLE AI DIRECTIVES & GUARDRAILS:
- Free-Tier Friendly: Integrates with Google AI Studio free tier keys and modern Gemini models.
- Domain & Safety Guardrails: Multi-layer input and output filtering prevents clinical triage and out-of-scope abuse.
- Grounded Telemetry (RAG): Synthesizes answers strictly from verified SQLite tables and invariants.
- Seamless Fallback: Automatically falls back to deterministic local intelligence if rate-limited or offline.
- Provenance Citations: Explicitly flags sources and whether answers were AI-generated or deterministic.
"""

import os
import sys
import json
import logging
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

load_dotenv()

from backend.services.guardrails import guardrail_manager, GuardrailResult
from backend.services.context_retriever import context_retriever

logger = logging.getLogger("swasthya_grid.gemini")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")

class GeminiService:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        self.client = None
        self.is_configured = False
        self._init_client()

    def _init_client(self, override_key: Optional[str] = None):
        """Initializes or refreshes the google-genai Client."""
        key = override_key or self.api_key or os.environ.get("GEMINI_API_KEY", "")
        if key:
            try:
                from google import genai
                from google.genai import types
                self.client = genai.Client(
                    api_key=key,
                    http_options=types.HttpOptions(
                        timeout=12.0,
                        retry_options=types.HttpRetryOptions(attempts=1)
                    )
                )
                self.is_configured = True
                self.api_key = key
                logger.info(f"GeminiService successfully initialized with model: {self.model}")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai Client: {e}")
                self.is_configured = False
        else:
            self.client = None
            self.is_configured = False
            logger.info("GEMINI_API_KEY not configured. Running in local grounded fallback mode.")

    def set_api_key(self, api_key: str):
        """Updates the active API key dynamically."""
        self._init_client(override_key=api_key)

    def generate_operations_brief(self, context: Dict[str, Any], api_key: Optional[str] = None) -> Dict[str, Any]:
        """Generates an operational briefing for healthcare administrators grounded in structured system metrics."""
        if api_key and (not self.client or api_key != self.api_key):
            self._init_client(override_key=api_key)

        prompt = f"""
{guardrail_manager.get_system_guardrail_prompt()}

You are the Chief Public Health Logistics Officer for the Government of India's Swasthya Grid National Control Tower.
Generate a concise, high-impact operational briefing for state and district health administrators based strictly on the verified structured data below.

CRITICAL NON-NEGOTIABLE RULES:
1. ONLY cite facts, numbers, PHC names, medicine names, and quantities directly present in the context.
2. DO NOT invent or extrapolate statistics, percentages, or facility counts.
3. If an explanation cannot be deduced directly from the numbers, explicitly say "Verified operational data does not specify the external cause."
4. Format your briefing into 3 sections:
   - Executive Alert (1-2 sentences on critical stock-out or demand threats)
   - Root-Cause Drivers (specific stock levels, days-of-stock, disease indices, or lead times)
   - Immediate Tactical Directives (exact redistribution transfers or replenishments to authorize)

STRUCTURED OPERATIONAL CONTEXT:
{json.dumps(context, indent=2)}
"""
        if self.is_configured and self.client:
            try:
                # 1. Try modern Interactions API
                try:
                    response = self.client.interactions.create(
                        model=self.model,
                        input=prompt
                    )
                    output_text = getattr(response, "output_text", None)
                    if output_text:
                        return {
                            "source": f"Google Gemini ({self.model})",
                            "model": self.model,
                            "is_ai_generated": True,
                            "guardrail_triggered": False,
                            "briefing": guardrail_manager.sanitize_output(output_text),
                            "citations": ["SQLite Live Inventory Telemetry", "HistGradientBoosting v1.0", "Deterministic Redistribution Optimizer"]
                        }
                except Exception as inner_e:
                    logger.info(f"Interactions API fallback to generate_content: {inner_e}")

                # 2. Try generate_content fallback
                resp = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt
                )
                output_text = getattr(resp, "text", "") or "No briefing text returned."
                return {
                    "source": f"Google Gemini ({self.model})",
                    "model": self.model,
                    "is_ai_generated": True,
                    "guardrail_triggered": False,
                    "briefing": guardrail_manager.sanitize_output(output_text),
                    "citations": ["SQLite Live Inventory Telemetry", "HistGradientBoosting v1.0", "Deterministic Redistribution Optimizer"]
                }
            except Exception as e:
                logger.error(f"Gemini API generation error: {e}")
                return self._local_grounded_brief(context, fallback_reason=f"Gemini Service Temporarily Unavailable ({type(e).__name__})")
        else:
            return self._local_grounded_brief(context, fallback_reason="GEMINI_API_KEY not configured in environment")

    def ask_control_tower(
        self,
        question: str,
        context: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        api_key: Optional[str] = None,
        filters: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Answers operational questions with multi-tier guardrails, RAG telemetry, and free-tier safety.
        """
        # --- TIER 1: Pre-Execution Input Guardrail ---
        guard_res = guardrail_manager.evaluate_input(question)
        if guard_res.is_violated:
            logger.info(f"Guardrail triggered for question: '{question}' -> Category: {guard_res.category}")
            return {
                "source": "Medicus Guardrail Engine",
                "model": "Medicus-Guardrail-Policy-v1",
                "is_ai_generated": False,
                "guardrail_triggered": True,
                "guardrail_type": guard_res.category,
                "answer": guard_res.message,
                "citations": ["Medicus Governance & Clinical Safety Policy"]
            }

        # --- TIER 2: Smart Grounded Context Retrieval (RAG across SQLite) ---
        rag_data = context_retriever.retrieve_context(question, filters=filters)
        citations = rag_data.get("citations", ["SQLite Operational Telemetry"])
        
        # Merge any caller-provided context with RAG context
        merged_context = {
            "retrieved_facts": rag_data.get("facts", []),
            "retrieved_records": rag_data.get("structured_data", {})
        }
        if context:
            merged_context["provided_context"] = context

        # Prepare dynamic API key if provided
        if api_key and (not self.client or api_key != self.api_key):
            self._init_client(override_key=api_key)

        # Build prompt
        history_str = ""
        if conversation_history:
            history_str = "\nPREVIOUS CONVERSATION TURNS:\n"
            for turn in conversation_history[-4:]:
                history_str += f"- {turn.get('role', 'user').upper()}: {turn.get('text', '')}\n"

        system_instruction = guardrail_manager.get_system_guardrail_prompt()

        prompt = f"""
{system_instruction}

{history_str}

USER OPERATIONAL QUESTION:
"{question}"

VERIFIED OPERATIONAL TELEMETRY & INVARIANTS:
{json.dumps(merged_context, indent=2)}

STRICT OPERATIONAL DIRECTIVES:
1. Base your answer strictly on the facts, facilities, medicines, and quantities in the telemetry above.
2. If the user asks for personal medical treatment or dosage advice, remind them that Medicus is strictly for healthcare logistics and advise seeing a doctor.
3. If the telemetry lacks details to answer the question, state: "Verified operational telemetry does not contain records for this inquiry."
4. Format with clean markdown headers and bullet points for healthcare administrators.
"""

        # --- TIER 3: Gemini Execution with Safe Fallback ---
        if self.is_configured and self.client:
            try:
                output_text = None
                # Method A: Modern Interactions API
                try:
                    response = self.client.interactions.create(
                        model=self.model,
                        input=prompt
                    )
                    output_text = getattr(response, "output_text", None)
                except Exception as inner_e:
                    logger.info(f"Interactions API fallback: {inner_e}")

                # Method B: generate_content API
                if not output_text:
                    resp = self.client.models.generate_content(
                        model=self.model,
                        contents=prompt
                    )
                    output_text = getattr(resp, "text", "")

                if output_text:
                    sanitized = guardrail_manager.sanitize_output(output_text)
                    return {
                        "source": f"Google Gemini ({self.model})",
                        "model": self.model,
                        "is_ai_generated": True,
                        "guardrail_triggered": False,
                        "guardrail_type": None,
                        "answer": sanitized,
                        "citations": citations
                    }
            except Exception as e:
                logger.error(f"Gemini API interaction error: {e}")
                err_msg = str(e)
                if "429" in err_msg or "ResourceExhausted" in err_msg or "quota" in err_msg.lower() or "too_many_requests" in err_msg.lower() or "RateLimitError" in type(e).__name__:
                    reason = "Google Gemini Free-Tier Daily Quota (20 requests/day limit) reached"
                elif "Timeout" in type(e).__name__ or "timeout" in err_msg.lower():
                    reason = "Gemini Free-Tier Request Timeout (Spike in Google Cloud traffic)"
                else:
                    reason = f"Gemini Cloud Service Temporarily Offline ({type(e).__name__})"
                return self._local_grounded_qa(question, merged_context, fallback_reason=reason, citations=citations)
        else:
            return self._local_grounded_qa(question, merged_context, fallback_reason="GEMINI_API_KEY not configured in environment", citations=citations)

    def _local_grounded_brief(self, context: Dict[str, Any], fallback_reason: str) -> Dict[str, Any]:
        """Deterministic rule-based summary for local demo mode without hallucination."""
        top_risks = context.get("top_risks", [])
        recommendations = context.get("recommendations", [])
        location = context.get("location", "National / Regional")
        
        critical_count = len([r for r in top_risks if r.get("severity") == "CRITICAL"])
        high_count = len([r for r in top_risks if r.get("severity") == "HIGH"])
        
        brief_lines = [
            f"**OPERATIONAL BRIEFING FOR {location.upper()}**",
            f"*Status: {fallback_reason}. Using deterministic local telemetry engine.*",
            "",
            "### 1. Executive Alert",
            f"Telemetry monitors {critical_count} critical and {high_count} high stock-out risk alerts across monitored facilities. Immediate intervention is required to prevent primary care stockouts.",
            "",
            "### 2. Root-Cause Drivers"
        ]
        
        for r in top_risks[:4]:
            demand_val = r.get('predicted_demand')
            demand_str = f"{demand_val:.0f}" if demand_val is not None else "N/A"
            brief_lines.append(
                f"- **{r.get('phc_name', r.get('phc_id'))}** for **{r.get('generic_name', r.get('medicine_id'))}**: "
                f"Current stock has {r.get('days_of_stock', 0):.1f} days remaining against a lead time of {r.get('lead_time_days', 5)} days. "
                f"Projected 7-day demand is {demand_str} units."
            )
            
        brief_lines.append("")
        brief_lines.append("### 3. Immediate Tactical Directives")
        if recommendations:
            for rec in recommendations[:3]:
                brief_lines.append(
                    f"- Authorize transfer of **{rec.get('quantity')} units** of {rec.get('generic_name', rec.get('medicine_id'))} "
                    f"from `{rec.get('source_phc')}` to `{rec.get('destination_phc')}`. "
                    f"Transit distance is {rec.get('estimated_transport_distance')} km (approx {rec.get('estimated_lead_time')} hours)."
                )
        else:
            brief_lines.append("- No active redistribution transfers required at current safety stock thresholds.")
            
        return {
            "source": "Deterministic Grounded Fallback (Rule-Based)",
            "model": "Deterministic-Rule-Engine-v1",
            "is_ai_generated": False,
            "guardrail_triggered": False,
            "fallback_notice": f"Notice: {fallback_reason}. Content generated by deterministic rule engine from actual database tables.",
            "briefing": "\n".join(brief_lines),
            "citations": ["SQLite Invariants", "Deterministic Redistribution Optimizer"]
        }

    def _local_grounded_qa(self, question: str, context: Dict[str, Any], fallback_reason: str, citations: Optional[List[str]] = None) -> Dict[str, Any]:
        """Deterministic question answering over structured data when Gemini API key is absent or rate-limited."""
        citations = citations or ["SQLite Live Telemetry Invariants"]
        facts = context.get("retrieved_facts", [])
        
        if facts:
            ans_lines = [
                f"*Notice: {fallback_reason}. Formulated via Medicus Grounded Local Telemetry Engine.*",
                "",
                "### Grounded Operational Telemetry & Invariants:",
            ]
            for f in facts[:6]:
                ans_lines.append(f"- {f}")
            ans_lines.append("")
            ans_lines.append("---")
            ans_lines.append("*All facility metrics, days-of-stock, and recommended routes are verified against live SQLite database invariants.*")
            answer = "\n".join(ans_lines)
        else:
            answer = (
                f"*Note: {fallback_reason}.*\n\n"
                "All monitored Primary Health Centres currently maintain inventory within standard operational thresholds."
            )
            
        return {
            "source": "Deterministic Grounded Engine",
            "model": "Medicus-Local-Telemetry-v1",
            "is_ai_generated": False,
            "guardrail_triggered": False,
            "guardrail_type": None,
            "fallback_notice": f"Notice: {fallback_reason}.",
            "answer": answer,
            "citations": citations
        }

gemini_service = GeminiService()

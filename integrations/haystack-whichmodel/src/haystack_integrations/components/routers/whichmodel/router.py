"""WhichModel router component for Haystack pipelines.

Calls the WhichModel MCP server to get cost-optimised model recommendations,
enabling dynamic model selection in Haystack pipelines.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Literal

import httpx
from haystack import component, default_from_dict, default_to_dict

logger = logging.getLogger(__name__)

TASK_TYPES = [
    "chat",
    "code_generation",
    "code_review",
    "summarisation",
    "translation",
    "data_extraction",
    "tool_calling",
    "creative_writing",
    "research",
    "classification",
    "embedding",
    "vision",
    "reasoning",
]

TaskType = Literal[
    "chat",
    "code_generation",
    "code_review",
    "summarisation",
    "translation",
    "data_extraction",
    "tool_calling",
    "creative_writing",
    "research",
    "classification",
    "embedding",
    "vision",
    "reasoning",
]

Complexity = Literal["low", "medium", "high"]

_MCP_ENDPOINT = "https://mcp.whichmodel.app/mcp"
_REQUEST_ID_COUNTER = 0


def _next_request_id() -> int:
    global _REQUEST_ID_COUNTER
    _REQUEST_ID_COUNTER += 1
    return _REQUEST_ID_COUNTER


@component
class WhichModelRouter:
    """Select the best LLM for a task using WhichModel's cost-aware recommendation engine.

    This component calls the WhichModel MCP server to get model recommendations
    based on task type, complexity, token estimates, budget, and capability requirements.
    It returns the recommended model ID and full recommendation details that can be used
    to dynamically route to the best model in a Haystack pipeline.

    Usage:

    ```python
    from haystack_integrations.components.routers.whichmodel import WhichModelRouter

    router = WhichModelRouter()
    result = router.run(task_type="code_generation", complexity="high")
    print(result["model_id"])       # e.g. "anthropic/claude-sonnet-4"
    print(result["recommendation"]) # full recommendation dict
    ```
    """

    def __init__(
        self,
        mcp_endpoint: str = _MCP_ENDPOINT,
        timeout: float = 30.0,
        default_task_type: TaskType | None = None,
        default_complexity: Complexity = "medium",
    ) -> None:
        """Initialize the WhichModel router.

        Args:
            mcp_endpoint: URL of the WhichModel MCP server.
            timeout: HTTP request timeout in seconds.
            default_task_type: Default task type when not provided at runtime.
            default_complexity: Default complexity level.
        """
        self.mcp_endpoint = mcp_endpoint
        self.timeout = timeout
        self.default_task_type = default_task_type
        self.default_complexity = default_complexity
        self._client: httpx.Client | None = None
        self._session_id: str | None = None

    def warm_up(self) -> None:
        """Initialize the HTTP client and open an MCP session."""
        if self._client is None:
            self._client = httpx.Client(timeout=self.timeout)
            self._initialize_session()

    def _initialize_session(self) -> None:
        """Send MCP initialize request to establish a session."""
        assert self._client is not None
        payload = {
            "jsonrpc": "2.0",
            "id": _next_request_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "haystack-whichmodel", "version": "0.1.0"},
            },
        }
        try:
            resp = self._client.post(
                self.mcp_endpoint,
                json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"},
            )
            resp.raise_for_status()

            # Capture session ID from Mcp-Session-Id header
            self._session_id = resp.headers.get("mcp-session-id")

            # Parse response (may be SSE or JSON)
            result = self._parse_response(resp)
            logger.debug("MCP session initialized: %s", result)
        except httpx.HTTPError as e:
            logger.warning("Failed to initialize MCP session: %s", e)

    def _parse_response(self, resp: httpx.Response) -> dict[str, Any]:
        """Parse an MCP response, handling both JSON and SSE formats."""
        content_type = resp.headers.get("content-type", "")

        if "text/event-stream" in content_type:
            # Parse SSE: look for data lines with JSON-RPC response
            for line in resp.text.splitlines():
                if line.startswith("data: "):
                    data = line[6:].strip()
                    if data:
                        parsed = json.loads(data)
                        if "result" in parsed or "error" in parsed:
                            return parsed
            return {}
        else:
            return resp.json()

    def _call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Call an MCP tool and return the result."""
        if self._client is None:
            self.warm_up()
        assert self._client is not None

        payload = {
            "jsonrpc": "2.0",
            "id": _next_request_id(),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        headers: dict[str, str] = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if self._session_id:
            headers["Mcp-Session-Id"] = self._session_id

        resp = self._client.post(self.mcp_endpoint, json=payload, headers=headers)
        resp.raise_for_status()

        result = self._parse_response(resp)

        if "error" in result:
            raise RuntimeError(f"MCP tool call failed: {result['error']}")

        return result.get("result", {})

    @component.output_types(
        model_id=str,
        provider=str,
        recommendation=dict,
        alternative=dict,
        budget_model=dict,
        confidence=str,
        data_freshness=str,
    )
    def run(
        self,
        task_type: str | None = None,
        complexity: str | None = None,
        estimated_input_tokens: int | None = None,
        estimated_output_tokens: int | None = None,
        budget_per_call: float | None = None,
        requirements: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Get a cost-optimised model recommendation from WhichModel.

        Args:
            task_type: The type of task (e.g. "code_generation", "chat", "reasoning").
            complexity: Task complexity: "low", "medium", or "high".
            estimated_input_tokens: Expected input size in tokens.
            estimated_output_tokens: Expected output size in tokens.
            budget_per_call: Maximum spend in USD for a single call.
            requirements: Capability requirements dict with keys like
                ``tool_calling``, ``json_output``, ``streaming``,
                ``context_window_min``, ``providers_include``, ``providers_exclude``.

        Returns:
            Dictionary with keys:
            - ``model_id``: Recommended model identifier (e.g. "anthropic/claude-sonnet-4").
            - ``provider``: Model provider name.
            - ``recommendation``: Full recommendation details dict.
            - ``alternative``: Alternative model recommendation (empty dict if none).
            - ``budget_model``: Cheapest viable model (empty dict if none).
            - ``confidence``: Recommendation confidence ("high", "medium", "low").
            - ``data_freshness``: When pricing data was last updated.
        """
        effective_task_type = task_type or self.default_task_type
        if not effective_task_type:
            raise ValueError(
                "task_type must be provided either at init (default_task_type) or at runtime. "
                f"Valid types: {', '.join(TASK_TYPES)}"
            )

        effective_complexity = complexity or self.default_complexity

        # Build MCP tool arguments
        arguments: dict[str, Any] = {
            "task_type": effective_task_type,
            "complexity": effective_complexity,
        }
        if estimated_input_tokens is not None:
            arguments["estimated_input_tokens"] = estimated_input_tokens
        if estimated_output_tokens is not None:
            arguments["estimated_output_tokens"] = estimated_output_tokens
        if budget_per_call is not None:
            arguments["budget_per_call"] = budget_per_call
        if requirements is not None:
            arguments["requirements"] = requirements

        result = self._call_tool("recommend_model", arguments)

        # Extract the text content from MCP tool result
        content = result.get("content", [])
        if not content:
            raise RuntimeError("Empty response from WhichModel MCP server")

        text_content = next((c["text"] for c in content if c.get("type") == "text"), None)
        if text_content is None:
            raise RuntimeError("No text content in WhichModel MCP response")

        data = json.loads(text_content)

        # Handle error responses
        if "error" in data:
            raise RuntimeError(f"WhichModel error: {data['error']}")

        recommended = data.get("recommended", {})
        return {
            "model_id": recommended.get("model_id", ""),
            "provider": recommended.get("provider", ""),
            "recommendation": recommended,
            "alternative": data.get("alternative") or {},
            "budget_model": data.get("budget_model") or {},
            "confidence": data.get("confidence", "low"),
            "data_freshness": data.get("data_freshness", ""),
        }

    def to_dict(self) -> dict[str, Any]:
        """Serialize this component to a dictionary."""
        return default_to_dict(
            self,
            mcp_endpoint=self.mcp_endpoint,
            timeout=self.timeout,
            default_task_type=self.default_task_type,
            default_complexity=self.default_complexity,
        )

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> WhichModelRouter:
        """Deserialize a component from a dictionary."""
        return default_from_dict(cls, data)

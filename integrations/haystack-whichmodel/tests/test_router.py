"""Tests for WhichModelRouter component."""

import json
from unittest.mock import MagicMock, patch

import pytest
from haystack_integrations.components.routers.whichmodel import WhichModelRouter


class TestWhichModelRouterInit:
    def test_default_init(self):
        router = WhichModelRouter()
        assert router.mcp_endpoint == "https://whichmodel.dev/mcp"
        assert router.timeout == 30.0
        assert router.default_task_type is None
        assert router.default_complexity == "medium"

    def test_custom_init(self):
        router = WhichModelRouter(
            mcp_endpoint="https://custom.endpoint/mcp",
            timeout=60.0,
            default_task_type="code_generation",
            default_complexity="high",
        )
        assert router.mcp_endpoint == "https://custom.endpoint/mcp"
        assert router.timeout == 60.0
        assert router.default_task_type == "code_generation"
        assert router.default_complexity == "high"


class TestWhichModelRouterSerialization:
    def test_to_dict(self):
        router = WhichModelRouter(default_task_type="chat", timeout=15.0)
        data = router.to_dict()
        assert data["type"] == "haystack_integrations.components.routers.whichmodel.router.WhichModelRouter"
        assert data["init_parameters"]["default_task_type"] == "chat"
        assert data["init_parameters"]["timeout"] == 15.0

    def test_from_dict(self):
        router = WhichModelRouter(default_task_type="reasoning", default_complexity="high")
        data = router.to_dict()
        restored = WhichModelRouter.from_dict(data)
        assert restored.default_task_type == "reasoning"
        assert restored.default_complexity == "high"
        assert restored.mcp_endpoint == router.mcp_endpoint

    def test_roundtrip(self):
        router = WhichModelRouter(
            mcp_endpoint="https://example.com/mcp",
            timeout=45.0,
            default_task_type="summarisation",
            default_complexity="low",
        )
        restored = WhichModelRouter.from_dict(router.to_dict())
        assert restored.to_dict() == router.to_dict()


class TestWhichModelRouterValidation:
    def test_run_without_task_type_raises(self):
        router = WhichModelRouter()
        with pytest.raises(ValueError, match="task_type must be provided"):
            router.run()

    def test_default_task_type_used_when_not_provided_at_runtime(self):
        """Verify default_task_type is used when task_type is not passed to run()."""
        router = WhichModelRouter(default_task_type="chat")

        mock_recommendation = {
            "recommended": {
                "model_id": "openai/gpt-4.1-mini",
                "provider": "openai",
                "display_name": "GPT-4.1 Mini",
                "quality_tier": "standard",
                "cost_estimate_usd": 0.001,
                "score": 85.0,
                "reasoning": "Good for chat.",
            },
            "alternative": None,
            "budget_model": None,
            "data_freshness": "2026-04-10T00:00:00Z",
            "confidence": "high",
        }

        with patch.object(router, "_call_tool") as mock_call:
            mock_call.return_value = {
                "content": [{"type": "text", "text": json.dumps(mock_recommendation)}]
            }
            result = router.run()
            mock_call.assert_called_once()
            args = mock_call.call_args[0]
            assert args[1]["task_type"] == "chat"


class TestWhichModelRouterRun:
    @pytest.fixture()
    def mock_recommendation(self):
        return {
            "recommended": {
                "model_id": "anthropic/claude-sonnet-4",
                "provider": "anthropic",
                "display_name": "Claude Sonnet 4",
                "quality_tier": "premium",
                "cost_estimate_usd": 0.0045,
                "input_price_per_mtok": 3.0,
                "output_price_per_mtok": 15.0,
                "context_length": 200000,
                "capabilities": {
                    "tool_calling": True,
                    "json_output": True,
                    "streaming": True,
                    "vision": True,
                },
                "score": 92.5,
                "reasoning": "Recommended for code_generation (high complexity).",
            },
            "alternative": {
                "model_id": "openai/gpt-4.1",
                "provider": "openai",
                "display_name": "GPT-4.1",
                "quality_tier": "premium",
                "cost_estimate_usd": 0.006,
                "score": 88.0,
                "reasoning": "Alternative option.",
            },
            "budget_model": {
                "model_id": "deepseek/deepseek-v3",
                "provider": "deepseek",
                "display_name": "DeepSeek V3",
                "quality_tier": "standard",
                "cost_estimate_usd": 0.0008,
                "score": 65.0,
                "reasoning": "Cheapest viable option.",
            },
            "data_freshness": "2026-04-10T12:00:00Z",
            "confidence": "high",
        }

    def test_run_returns_expected_keys(self, mock_recommendation):
        router = WhichModelRouter()
        with patch.object(router, "_call_tool") as mock_call:
            mock_call.return_value = {
                "content": [{"type": "text", "text": json.dumps(mock_recommendation)}]
            }
            result = router.run(task_type="code_generation", complexity="high")

        assert result["model_id"] == "anthropic/claude-sonnet-4"
        assert result["provider"] == "anthropic"
        assert result["confidence"] == "high"
        assert result["data_freshness"] == "2026-04-10T12:00:00Z"
        assert result["recommendation"]["score"] == 92.5
        assert result["alternative"]["model_id"] == "openai/gpt-4.1"
        assert result["budget_model"]["model_id"] == "deepseek/deepseek-v3"

    def test_run_passes_all_arguments(self, mock_recommendation):
        router = WhichModelRouter()
        with patch.object(router, "_call_tool") as mock_call:
            mock_call.return_value = {
                "content": [{"type": "text", "text": json.dumps(mock_recommendation)}]
            }
            router.run(
                task_type="code_generation",
                complexity="high",
                estimated_input_tokens=5000,
                estimated_output_tokens=2000,
                budget_per_call=0.01,
                requirements={"tool_calling": True, "providers_exclude": ["deepseek"]},
            )
            call_args = mock_call.call_args[0][1]
            assert call_args["task_type"] == "code_generation"
            assert call_args["complexity"] == "high"
            assert call_args["estimated_input_tokens"] == 5000
            assert call_args["estimated_output_tokens"] == 2000
            assert call_args["budget_per_call"] == 0.01
            assert call_args["requirements"]["tool_calling"] is True

    def test_run_handles_null_alternative_and_budget(self):
        router = WhichModelRouter()
        data = {
            "recommended": {"model_id": "test/model", "provider": "test"},
            "alternative": None,
            "budget_model": None,
            "data_freshness": "2026-04-10T00:00:00Z",
            "confidence": "low",
        }
        with patch.object(router, "_call_tool") as mock_call:
            mock_call.return_value = {
                "content": [{"type": "text", "text": json.dumps(data)}]
            }
            result = router.run(task_type="chat")
            assert result["alternative"] == {}
            assert result["budget_model"] == {}

    def test_run_handles_error_response(self):
        router = WhichModelRouter()
        with patch.object(router, "_call_tool") as mock_call:
            mock_call.return_value = {
                "content": [{"type": "text", "text": json.dumps({"error": "No models available"})}]
            }
            with pytest.raises(RuntimeError, match="WhichModel error"):
                router.run(task_type="chat")

    def test_run_handles_empty_response(self):
        router = WhichModelRouter()
        with patch.object(router, "_call_tool") as mock_call:
            mock_call.return_value = {"content": []}
            with pytest.raises(RuntimeError, match="Empty response"):
                router.run(task_type="chat")


class TestWhichModelRouterIntegration:
    """Integration tests that hit the live MCP server. Skipped by default."""

    @pytest.mark.skipif(True, reason="Integration test — run manually with --run-integration")
    def test_live_recommendation(self):
        router = WhichModelRouter()
        router.warm_up()
        result = router.run(task_type="code_generation", complexity="medium")
        assert result["model_id"]
        assert result["provider"]
        assert result["confidence"] in ("high", "medium", "low")
        assert result["data_freshness"]

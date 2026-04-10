# whichmodel-haystack

[![PyPI](https://img.shields.io/pypi/v/whichmodel-haystack)](https://pypi.org/project/whichmodel-haystack/)
[![Python](https://img.shields.io/pypi/pyversions/whichmodel-haystack)](https://pypi.org/project/whichmodel-haystack/)

Haystack integration for [WhichModel](https://whichmodel.dev) — cost-aware LLM model selection for your pipelines.

## Installation

```bash
pip install whichmodel-haystack
```

## Quick Start

```python
from haystack_integrations.components.routers.whichmodel import WhichModelRouter

router = WhichModelRouter()
result = router.run(task_type="code_generation", complexity="high")

print(result["model_id"])       # e.g. "anthropic/claude-sonnet-4"
print(result["provider"])       # e.g. "anthropic"
print(result["confidence"])     # "high", "medium", or "low"
```

No API key required. The component calls the public WhichModel MCP server at `https://whichmodel.dev/mcp`.

## Usage in a Pipeline

Use `WhichModelRouter` to dynamically select the best model before generating:

```python
from haystack import Pipeline
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack_integrations.components.routers.whichmodel import WhichModelRouter

# Get the best model for the task
router = WhichModelRouter()
result = router.run(
    task_type="code_generation",
    complexity="high",
    estimated_input_tokens=2000,
    estimated_output_tokens=1000,
    budget_per_call=0.01,
    requirements={"tool_calling": True},
)

# Use the recommended model
print(f"Using {result['model_id']} (confidence: {result['confidence']})")
print(f"Estimated cost: ${result['recommendation']['cost_estimate_usd']:.6f}")
```

## Parameters

### Init Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mcp_endpoint` | `str` | `https://whichmodel.dev/mcp` | WhichModel MCP server URL |
| `timeout` | `float` | `30.0` | HTTP request timeout in seconds |
| `default_task_type` | `str` | `None` | Default task type for `run()` |
| `default_complexity` | `str` | `"medium"` | Default complexity level |

### Run Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `task_type` | `str` | Task type: `chat`, `code_generation`, `code_review`, `summarisation`, `translation`, `data_extraction`, `tool_calling`, `creative_writing`, `research`, `classification`, `embedding`, `vision`, `reasoning` |
| `complexity` | `str` | `"low"`, `"medium"`, or `"high"` |
| `estimated_input_tokens` | `int` | Expected input size in tokens |
| `estimated_output_tokens` | `int` | Expected output size in tokens |
| `budget_per_call` | `float` | Max USD per call |
| `requirements` | `dict` | Capability requirements: `tool_calling`, `json_output`, `streaming`, `context_window_min`, `providers_include`, `providers_exclude` |

### Output

| Key | Type | Description |
|-----|------|-------------|
| `model_id` | `str` | Recommended model ID (e.g. `anthropic/claude-sonnet-4`) |
| `provider` | `str` | Provider name |
| `recommendation` | `dict` | Full recommendation with score, reasoning, pricing |
| `alternative` | `dict` | Alternative model from different provider/tier |
| `budget_model` | `dict` | Cheapest viable option |
| `confidence` | `str` | `"high"`, `"medium"`, or `"low"` |
| `data_freshness` | `str` | When pricing data was last updated |

## License

Apache-2.0

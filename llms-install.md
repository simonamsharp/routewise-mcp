# WhichModel MCP
> Cost-optimized LLM model recommendations for AI agents

## Quick Start
Add to your MCP config (remote):
```json
{"mcpServers":{"whichmodel":{"url":"https://whichmodel.dev/mcp"}}}
```

Or via stdio (Claude Desktop, Cursor):
```json
{"mcpServers":{"whichmodel":{"command":"npx","args":["-y","whichmodel-mcp"]}}}
```

## Tools
- recommend_model: Get the best model for a task_type (chat, code_generation, summarisation, reasoning, vision, etc.), complexity, and capability requirements; returns recommendation, alternatives, and cost estimate
- compare_models: Head-to-head comparison of 2-5 models with cost projections
- get_pricing: Raw pricing data with filters (provider, capability, price ceiling)
- check_price_changes: Monitor pricing changes since a given date
- estimate_cost: Estimate USD cost for a specific model + token counts, with daily/monthly projections
- find_cheapest_capable: Find the cheapest model meeting hard capability requirements (tool_calling, vision, json_output, etc.)

No API key required. Rate limit: 100 requests/minute per IP.

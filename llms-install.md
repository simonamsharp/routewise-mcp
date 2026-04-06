# WhichModel MCP
> Cost-optimized LLM model recommendations for AI agents

## Quick Start
Add to your MCP config:
```json
{"mcpServers":{"whichmodel":{"url":"https://whichmodel.dev/mcp"}}}
```

## Tools
- recommend_model: Get the cheapest model for your task type and complexity
- compare_models: Head-to-head comparison of 2-5 models with cost projections
- get_pricing: Raw pricing data with filters (provider, capability, price ceiling)
- check_price_changes: Monitor pricing changes since a given date

No auth required for free tier (1,000 req/mo).

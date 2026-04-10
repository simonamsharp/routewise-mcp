"""Basic example: get a cost-optimised model recommendation."""

from haystack_integrations.components.routers.whichmodel import WhichModelRouter

router = WhichModelRouter()
router.warm_up()

# Get recommendation for a code generation task
result = router.run(
    task_type="code_generation",
    complexity="high",
    estimated_input_tokens=3000,
    estimated_output_tokens=1500,
    budget_per_call=0.02,
    requirements={
        "tool_calling": True,
        "streaming": True,
    },
)

print(f"Recommended: {result['model_id']} ({result['provider']})")
print(f"Confidence: {result['confidence']}")
print(f"Cost estimate: ${result['recommendation'].get('cost_estimate_usd', 0):.6f}")
print(f"Reasoning: {result['recommendation'].get('reasoning', '')}")

if result["alternative"]:
    print(f"\nAlternative: {result['alternative'].get('model_id', '')}")

if result["budget_model"]:
    print(f"Budget option: {result['budget_model'].get('model_id', '')}")

print(f"\nData freshness: {result['data_freshness']}")

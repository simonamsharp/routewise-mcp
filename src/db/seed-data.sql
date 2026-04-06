-- WhichModel seed data: Top 50+ models with current pricing (April 2026)
-- Paste this in the Supabase SQL Editor after running schema.sql

INSERT INTO models (model_id, provider, display_name, description, context_length, max_output_tokens, modality, pricing_prompt, pricing_completion, pricing_image, pricing_request, capabilities, supported_parameters, quality_tier, value_score, is_active)
VALUES
-- ══ Anthropic ══
('anthropic/claude-opus-4', 'anthropic', 'Claude Opus 4', 'Most capable Anthropic model for complex reasoning', 200000, 32000, 'text+image->text', 0.000015, 0.000075, 0.0048, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'frontier', 8.9, true),
('anthropic/claude-sonnet-4', 'anthropic', 'Claude Sonnet 4', 'Fast, intelligent model for everyday tasks', 200000, 16000, 'text+image->text', 0.000003, 0.000015, 0.0048, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'frontier', 22.2, true),
('anthropic/claude-sonnet-4-5', 'anthropic', 'Claude Sonnet 4.5', 'Hybrid reasoning model with extended thinking', 200000, 16000, 'text+image->text', 0.000003, 0.000015, 0.0048, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'frontier', 22.2, true),
('anthropic/claude-haiku-3.5', 'anthropic', 'Claude 3.5 Haiku', 'Fast and affordable for high-volume tasks', 200000, 8192, 'text+image->text', 0.0000008, 0.000004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'premium', 62.5, true),
('anthropic/claude-haiku-4', 'anthropic', 'Claude Haiku 4', 'Next-gen fast model', 200000, 8192, 'text+image->text', 0.0000008, 0.000004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'premium', 62.5, true),

-- ══ OpenAI ══
('openai/gpt-4.1', 'openai', 'GPT-4.1', 'Flagship OpenAI model', 1047576, 32768, 'text+image->text', 0.000002, 0.000008, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'frontier', 33.3, true),
('openai/gpt-4.1-mini', 'openai', 'GPT-4.1 Mini', 'Affordable and fast with large context', 1047576, 32768, 'text+image->text', 0.0000004, 0.0000016, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'premium', 125.0, true),
('openai/gpt-4.1-nano', 'openai', 'GPT-4.1 Nano', 'Fastest and cheapest OpenAI model', 1047576, 32768, 'text+image->text', 0.0000001, 0.0000004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'budget', 166.7, true),
('openai/o3', 'openai', 'o3', 'Advanced reasoning model', 200000, 100000, 'text+image->text', 0.00001, 0.00004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'frontier', 6.7, true),
('openai/o3-mini', 'openai', 'o3 Mini', 'Efficient reasoning model', 200000, 100000, 'text+image->text', 0.0000011, 0.0000044, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'premium', 45.5, true),
('openai/o4-mini', 'openai', 'o4 Mini', 'Latest efficient reasoning model', 200000, 100000, 'text+image->text', 0.0000011, 0.0000044, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'premium', 45.5, true),
('openai/gpt-4o', 'openai', 'GPT-4o', 'Multimodal flagship', 128000, 16384, 'text+image->text', 0.0000025, 0.00001, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'frontier', 26.7, true),
('openai/gpt-4o-mini', 'openai', 'GPT-4o Mini', 'Compact multimodal model', 128000, 16384, 'text+image->text', 0.00000015, 0.0000006, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','tool_choice','response_format'], 'premium', 200.0, true),

-- ══ Google ══
('google/gemini-2.5-pro', 'google', 'Gemini 2.5 Pro', 'Most capable Google model with thinking', 1048576, 65536, 'text+image->text', 0.0000025, 0.000015, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','response_format'], 'frontier', 18.2, true),
('google/gemini-2.5-flash', 'google', 'Gemini 2.5 Flash', 'Fast and efficient with thinking', 1048576, 65536, 'text+image->text', 0.00000015, 0.0000006, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','response_format'], 'premium', 250.0, true),
('google/gemini-2.0-flash', 'google', 'Gemini 2.0 Flash', 'Previous gen fast model', 1048576, 8192, 'text+image->text', 0.0000001, 0.0000004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','response_format'], 'premium', 250.0, true),
('google/gemini-2.0-flash-lite', 'google', 'Gemini 2.0 Flash Lite', 'Cheapest Google model', 1048576, 8192, 'text+image->text', 0.00000004, 0.00000016, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','response_format'], 'budget', 416.7, true),
('google/gemma-3-27b-it', 'google', 'Gemma 3 27B', 'Open-weights mid-size model', 131072, 8192, 'text->text', 0.0000002, 0.0000004, NULL, NULL, '{"tool_calling":false,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','response_format'], 'standard', 166.7, true),

-- ══ DeepSeek ══
('deepseek/deepseek-chat-v3', 'deepseek', 'DeepSeek V3', 'Strong open-source chat model', 131072, 8192, 'text->text', 0.0000003, 0.00000088, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'premium', 135.1, true),
('deepseek/deepseek-r1', 'deepseek', 'DeepSeek R1', 'Reasoning-focused model', 131072, 8192, 'text->text', 0.00000055, 0.0000022, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'frontier', 72.7, true),
('deepseek/deepseek-chat', 'deepseek', 'DeepSeek Chat', 'General chat model', 131072, 8192, 'text->text', 0.0000003, 0.00000088, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'premium', 135.1, true),

-- ══ Meta / Llama ══
('meta-llama/llama-4-maverick', 'meta-llama', 'Llama 4 Maverick', 'Latest flagship open model', 1048576, 65536, 'text+image->text', 0.0000005, 0.0000007, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','response_format'], 'premium', 125.0, true),
('meta-llama/llama-4-scout', 'meta-llama', 'Llama 4 Scout', 'Efficient open model with large context', 1048576, 65536, 'text+image->text', 0.00000018, 0.0000003, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":true}', ARRAY['temperature','tools','response_format'], 'standard', 208.3, true),
('meta-llama/llama-3.3-70b-instruct', 'meta-llama', 'Llama 3.3 70B', 'Strong open-source 70B model', 131072, 8192, 'text->text', 0.0000003, 0.0000004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 142.9, true),
('meta-llama/llama-3.1-70b-instruct', 'meta-llama', 'Llama 3.1 70B', 'Reliable 70B model', 131072, 8192, 'text->text', 0.0000003, 0.0000004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 142.9, true),
('meta-llama/llama-3.1-8b-instruct', 'meta-llama', 'Llama 3.1 8B', 'Small and fast open model', 131072, 4096, 'text->text', 0.00000005, 0.00000005, NULL, NULL, '{"tool_calling":false,"json_output":false,"streaming":true,"vision":false}', ARRAY['temperature'], 'budget', 500.0, true),
('meta-llama/llama-3.1-405b-instruct', 'meta-llama', 'Llama 3.1 405B', 'Largest open-source model', 131072, 8192, 'text->text', 0.000001, 0.000001, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'premium', 75.0, true),

-- ══ Mistral ══
('mistralai/mistral-large', 'mistralai', 'Mistral Large', 'Flagship Mistral model', 131072, 8192, 'text->text', 0.000002, 0.000006, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'premium', 25.0, true),
('mistralai/mistral-medium', 'mistralai', 'Mistral Medium', 'Mid-tier Mistral model', 131072, 8192, 'text->text', 0.0000008, 0.0000024, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 41.7, true),
('mistralai/mistral-small', 'mistralai', 'Mistral Small', 'Affordable Mistral model', 131072, 8192, 'text->text', 0.0000002, 0.0000006, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'budget', 125.0, true),
('mistralai/codestral', 'mistralai', 'Codestral', 'Code-specialised Mistral model', 32768, 8192, 'text->text', 0.0000003, 0.0000009, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 111.1, true),
('mistralai/mistral-nemo', 'mistralai', 'Mistral Nemo', 'Small efficient Mistral model', 131072, 4096, 'text->text', 0.00000015, 0.00000015, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'budget', 333.3, true),

-- ══ xAI ══
('x-ai/grok-3', 'x-ai', 'Grok 3', 'Flagship xAI model', 131072, 16384, 'text->text', 0.000003, 0.000015, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'frontier', 22.2, true),
('x-ai/grok-3-mini', 'x-ai', 'Grok 3 Mini', 'Efficient reasoning model from xAI', 131072, 16384, 'text->text', 0.0000003, 0.0000005, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'premium', 192.3, true),
('x-ai/grok-2', 'x-ai', 'Grok 2', 'Previous gen xAI model', 131072, 8192, 'text->text', 0.000002, 0.00001, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'premium', 20.8, true),

-- ══ Cohere ══
('cohere/command-a', 'cohere', 'Command A', 'Latest Cohere flagship', 256000, 8192, 'text->text', 0.0000025, 0.00001, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'premium', 26.7, true),
('cohere/command-r-plus', 'cohere', 'Command R+', 'Strong RAG-optimised model', 128000, 4096, 'text->text', 0.000003, 0.000015, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 11.1, true),
('cohere/command-r', 'cohere', 'Command R', 'Efficient RAG model', 128000, 4096, 'text->text', 0.0000005, 0.0000015, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'budget', 75.0, true),

-- ══ Qwen ══
('qwen/qwen-2.5-72b-instruct', 'qwen', 'Qwen 2.5 72B', 'Strong Chinese/English open model', 131072, 8192, 'text->text', 0.0000004, 0.0000004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 125.0, true),
('qwen/qwen-2.5-coder-32b-instruct', 'qwen', 'Qwen 2.5 Coder 32B', 'Code-specialised Qwen model', 131072, 8192, 'text->text', 0.0000002, 0.0000002, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 250.0, true),
('qwen/qwq-32b', 'qwen', 'QwQ 32B', 'Reasoning-focused Qwen model', 131072, 8192, 'text->text', 0.0000002, 0.0000002, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 250.0, true),

-- ══ Microsoft ══
('microsoft/phi-4', 'microsoft', 'Phi 4', 'Small but capable model', 16384, 4096, 'text->text', 0.00000007, 0.00000014, NULL, NULL, '{"tool_calling":false,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','response_format'], 'budget', 238.1, true),

-- ══ Nvidia ══
('nvidia/llama-3.1-nemotron-70b-instruct', 'nvidia', 'Nemotron 70B', 'Nvidia-tuned Llama 70B', 131072, 8192, 'text->text', 0.0000003, 0.0000004, NULL, NULL, '{"tool_calling":true,"json_output":true,"streaming":true,"vision":false}', ARRAY['temperature','tools','response_format'], 'standard', 142.9, true)

ON CONFLICT (model_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  context_length = EXCLUDED.context_length,
  max_output_tokens = EXCLUDED.max_output_tokens,
  modality = EXCLUDED.modality,
  pricing_prompt = EXCLUDED.pricing_prompt,
  pricing_completion = EXCLUDED.pricing_completion,
  pricing_image = EXCLUDED.pricing_image,
  capabilities = EXCLUDED.capabilities,
  supported_parameters = EXCLUDED.supported_parameters,
  quality_tier = EXCLUDED.quality_tier,
  value_score = EXCLUDED.value_score,
  is_active = EXCLUDED.is_active;

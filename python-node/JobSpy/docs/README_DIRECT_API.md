# CloudflareAIDirect - Direct Cloudflare API Implementation

This is a duplicate implementation of the CloudflareAI class that uses the Cloudflare API directly instead of going through a worker endpoint.

## Key Differences from Original CloudflareAI Class

### 1. Authentication Method
- **Original**: Uses a worker endpoint with a custom API key (`WORKER_API_KEY`)
- **Direct**: Uses Cloudflare account ID and API token (`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`)

### 2. API Endpoints
- **Original**: 
  - Worker endpoint: `https://openai-api-worker.hacolby.workers.dev`
  - Endpoints: `/v1/chat/completions/text` and `/v1/chat/completions/structured`
  
- **Direct**: 
  - OpenAI-compatible: `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1/chat/completions`
  - Raw API: `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{model}`

### 3. Environment Variables
```bash
# Original implementation
export WORKER_ENDPOINT_URI="https://openai-api-worker.hacolby.workers.dev"
export WORKER_API_KEY="your-api-key-here"

# Direct API implementation
export CLOUDFLARE_ACCOUNT_ID="your-account-id-here"
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

## Setup Instructions

### 1. Get Your Cloudflare Credentials

1. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to the **Workers AI** page
3. Select **Use REST API**
4. Create a Workers AI API Token with both `Workers AI - Read` and `Workers AI - Edit` permissions
5. Copy your Account ID and API Token

### 2. Set Environment Variables

```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id-here"
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

Or add them to your `.env` file:
```
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_API_TOKEN=your-api-token-here
```

### 3. Install Required Dependencies

```bash
pip install requests python-dotenv
```

## Usage Examples

### Basic Text Generation
```python
from cloudflare_direct import CloudflareAIDirect

# Initialize the client
ai = CloudflareAIDirect()

# Generate text
response = ai.generate_text("What is artificial intelligence?")
print(response)
```

### Structured JSON Response
```python
# Define a schema for structured output
schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "description": {"type": "string"},
        "features": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["name", "description", "features"]
}

# Get structured response
result = ai.structured_response(
    "Describe Cloudflare Workers",
    schema=schema
)
print(result)
```

### Using Different Models
```python
# Use a specific model for text generation
response = ai.generate_text(
    "Write a haiku about clouds",
    model="@cf/meta/llama-3.1-70b-instruct"
)

# Use a model that supports JSON mode for structured responses
result = ai.structured_response(
    "List three benefits of edge computing",
    schema=schema,
    model="@cf/meta/llama-3.1-8b-instruct"
)
```

## Method Compatibility

All methods from the original CloudflareAI class are preserved:

- `generate_text()` - Generate text responses
- `structured_response()` - Get structured JSON responses
- `read_local_file()` - Read local files
- `save_local_file()` - Save content to files  
- `read_sqlite_db()` - Query SQLite databases
- `append_sqlite_db()` - Insert data into SQLite
- `set_system_instruction()` - Set default system prompt
- `strip_code_block_tildes()` - Clean markdown formatting

## Additional Method

- `generate_text_raw_api()` - Alternative method using the raw `/ai/run` endpoint for models that don't support OpenAI-compatible format

## Supported Models for JSON Mode

According to Cloudflare documentation, these models support structured JSON output:

- `@cf/meta/llama-3.1-8b-instruct-fast`
- `@cf/meta/llama-3.1-70b-instruct`
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- `@cf/meta/llama-3-8b-instruct`
- `@cf/meta/llama-3.1-8b-instruct`
- `@cf/meta/llama-3.2-11b-vision-instruct`
- `@hf/nousresearch/hermes-2-pro-mistral-7b`
- `@hf/thebloke/deepseek-coder-6.7b-instruct-awq`
- `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`

## Error Handling

The implementation includes the same robust error handling as the original:
- Automatic retry logic for failed requests
- Fallback mechanisms for structured responses
- JSON parsing recovery for incomplete responses
- Detailed logging for debugging

## Migration from Worker-based to Direct API

To migrate from the original CloudflareAI class to CloudflareAIDirect:

1. Replace the import:
   ```python
   # Old
   from cloudflare_ai import CloudflareAI
   
   # New
   from cloudflare_direct import CloudflareAIDirect
   ```

2. Update initialization:
   ```python
   # Old
   ai = CloudflareAI(
       worker_url="https://your-worker.workers.dev",
       api_key="your-worker-key"
   )
   
   # New
   ai = CloudflareAIDirect(
       account_id="your-account-id",
       api_token="your-cloudflare-api-token"
   )
   ```

3. All other method calls remain the same!

## Advantages of Direct API

1. **No Worker Overhead**: Direct API calls without the worker proxy layer
2. **Official Support**: Uses Cloudflare's official API endpoints
3. **Better Rate Limits**: Direct API may have different rate limits than worker endpoints
4. **Simpler Architecture**: No need to maintain a separate worker

## Testing

Run the test code at the bottom of `cloudflare_direct.py`:

```bash
python cloudflare_direct.py
```

This will test both text generation and structured response capabilities.

## Troubleshooting

1. **Authentication Errors**: Ensure your API token has both `Workers AI - Read` and `Workers AI - Edit` permissions
2. **Model Not Found**: Check the [Workers AI models catalog](https://developers.cloudflare.com/workers-ai/models/) for available models
3. **JSON Mode Failures**: Not all models support JSON mode - use one from the supported list above
4. **Rate Limits**: The API has rate limits - implement exponential backoff if needed

## References

- [Workers AI REST API Documentation](https://developers.cloudflare.com/workers-ai/get-started/rest-api)
- [OpenAI Compatible Endpoints](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility)
- [JSON Mode Documentation](https://developers.cloudflare.com/workers-ai/features/json-mode)
- [Workers AI Models Catalog](https://developers.cloudflare.com/workers-ai/models/)

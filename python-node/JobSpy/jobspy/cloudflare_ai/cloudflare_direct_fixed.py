import os
import json
import re
import sqlite3
import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional, List

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️  python-dotenv not installed. Install with: pip install python-dotenv")
    print("Falling back to environment variables or hardcoded values.")

# Setup logging
log_dir = Path(__file__).parent.parent / "logs"
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "demo.log"

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Clear existing handlers to prevent duplicate logs
if logger.handlers:
    for handler in logger.handlers:
        logger.removeHandler(handler)

file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.INFO)

formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)

logger.addHandler(file_handler)

# Also add a StreamHandler for console output
stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.INFO)
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)


class CloudflareAIDirect:
    """
    A class for interacting directly with Cloudflare AI API (not through a worker),
    providing utilities for text generation, structured responses, file operations,
    and SQLite database interactions.
    
    This version uses the official Cloudflare API endpoints directly instead of
    a worker proxy endpoint.
    """

    # Models that support OpenAI-compatible endpoints
    OPENAI_COMPATIBLE_MODELS = [
        "@cf/meta/llama-3.1-8b-instruct",
        "@cf/meta/llama-3.1-8b-instruct-fast", 
        "@cf/meta/llama-3.1-70b-instruct",
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        "@cf/meta/llama-3-8b-instruct",
        "@cf/meta/llama-3.2-11b-vision-instruct",
        "@hf/nousresearch/hermes-2-pro-mistral-7b",
        "@hf/thebloke/deepseek-coder-6.7b-instruct-awq",
        "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"
    ]
    
    # Default models
    DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct"  # Changed to OpenAI-compatible model
    DEFAULT_STRUCTURED_MODEL = "@cf/meta/llama-3.1-8b-instruct"  # Model that supports JSON mode
    
    # Get Cloudflare account ID and API token from environment variables
    DEFAULT_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "your-account-id-here")
    DEFAULT_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "your-api-token-here")
    
    # Base URLs for Cloudflare API
    BASE_URL = "https://api.cloudflare.com/client/v4/accounts"
    
    def __init__(
        self,
        account_id: str = DEFAULT_ACCOUNT_ID,
        api_token: str = DEFAULT_API_TOKEN,
        default_system_instruction: str = "You are a helpful AI assistant.",
    ):
        self.account_id = account_id
        self.api_token = api_token
        self.default_system_instruction = default_system_instruction
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        })
        
        # Construct API endpoints
        self.ai_run_url = f"{self.BASE_URL}/{self.account_id}/ai/run"
        self.openai_compat_url = f"{self.BASE_URL}/{self.account_id}/ai/v1"

    def set_system_instruction(self, instruction: str):
        """Sets the default system instruction for the AI model."""
        self.default_system_instruction = instruction

    def read_local_file(self, file_path: str) -> Optional[str]:
        """Reads content from a local file."""
        try:
            full_path = Path(file_path).expanduser().resolve()
            return full_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            logger.error(f"Error: File not found at {file_path}")
            return None
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            return None

    def save_local_file(self, file_path: str, content: str):
        """Saves content to a local file."""
        try:
            full_path = Path(file_path).expanduser().resolve()
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding="utf-8")
            logger.info(f"Content successfully saved to {file_path}")
        except Exception as e:
            logger.error(f"Error saving file {file_path}: {e}")

    def read_sqlite_db(self, db_path: str, query: str) -> Optional[List[Dict[str, Any]]]:
        """Reads data from a SQLite database using the given query."""
        try:
            full_path = Path(db_path).expanduser().resolve()
            conn = sqlite3.connect(str(full_path))
            conn.row_factory = sqlite3.Row  # Return rows as dict-like objects
            cursor = conn.cursor()
            cursor.execute(query)
            results = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return results
        except FileNotFoundError:
            logger.error(f"Error: Database file not found at {db_path}")
            return None
        except sqlite3.Error as e:
            logger.error(f"SQLite error reading from {db_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error reading from SQLite DB {db_path}: {e}")
            return None

    def append_sqlite_db(self, db_path: str, table_name: str, data: Dict[str, Any]):
        """Appends data to a specified table in a SQLite database."""
        try:
            full_path = Path(db_path).expanduser().resolve()
            conn = sqlite3.connect(str(full_path))
            cursor = conn.cursor()

            # Create table if it doesn't exist based on data keys
            columns = ", ".join([f"{key} TEXT" for key in data.keys()])
            create_table_sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({columns})"
            cursor.execute(create_table_sql)

            # Insert data
            placeholders = ", ".join(["?" for _ in data.keys()])
            insert_sql = f"INSERT INTO {table_name} ({', '.join(data.keys())}) VALUES ({placeholders})"
            cursor.execute(insert_sql, tuple(data.values()))

            conn.commit()
            conn.close()
            logger.info(f"Data successfully appended to table '{table_name}' in {db_path}")
        except sqlite3.Error as e:
            logger.error(f"SQLite error appending to {db_path}: {e}")
        except Exception as e:
            logger.error(f"Error appending to SQLite DB {db_path}: {e}")

    def structured_response(
        self,
        user_message: str,
        schema: Dict[str, Any],
        model: str = DEFAULT_STRUCTURED_MODEL,
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
        """
        Sends a request to the Cloudflare AI API for a structured JSON response
        using the OpenAI-compatible endpoint with JSON mode.
        """
        if self.api_token == "your-api-token-here":
            logger.error("Error: CLOUDFLARE_API_TOKEN is not set. Please set it in your environment variables.")
            return None
        
        if self.account_id == "your-account-id-here":
            logger.error("Error: CLOUDFLARE_ACCOUNT_ID is not set. Please set it in your environment variables.")
            return None

        messages = [
            {"role": "system", "content": self.default_system_instruction},
            {"role": "user", "content": user_message},
        ]

        # Use OpenAI-compatible endpoint with JSON mode
        payload = {
            "model": model,
            "messages": messages,
            "response_format": {
                "type": "json_schema",
                "json_schema": schema,
            },
            "temperature": kwargs.pop("temperature", 0.1),
            "max_tokens": kwargs.pop("max_tokens", 2048),
        }

        try:
            # Use the OpenAI-compatible chat completions endpoint
            response = self._session.post(
                f"{self.openai_compat_url}/chat/completions",
                json=payload,
                timeout=kwargs.pop("timeout", 30),
            )
            response.raise_for_status()  # Raise an exception for HTTP errors

            result = response.json()
            
            if 'choices' in result and len(result['choices']) > 0:
                content = result['choices'][0]['message']['content']
                finish_reason = result['choices'][0].get('finish_reason', 'unknown')
                
                # Log finish reason for debugging
                if finish_reason != 'stop':
                    logger.warning(f"Structured response finished with reason: {finish_reason}")
                
                if isinstance(content, dict):
                    return content

                # Enhanced markdown code block removal
                cleaned_content = self.strip_all_markdown_formatting(content)
                
                # Always try to fix and parse the JSON
                parsed_content = self._extract_and_fix_json(cleaned_content, schema)
                if parsed_content:
                    logger.info("Successfully parsed/recovered JSON from structured endpoint.")
                    return parsed_content
                else:
                    logger.error(f"Failed to parse or recover JSON from structured endpoint: {cleaned_content}")
                    # Fallback to default model if structured parsing fails
                    logger.info("Falling back to default model for unstructured response...")
                    return self._fallback_structured_response(user_message, schema, **kwargs)
            else:
                logger.error(f"Unexpected API response structure: {result}")
                # Fallback to default model if structured API response is unexpected
                logger.info("Falling back to default model for unstructured response...")
                return self._fallback_structured_response(user_message, schema, **kwargs)

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed for structured endpoint: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Raw response content on error: {e.response.text}")
            logger.info("Falling back to default model for unstructured response...")
            return self._fallback_structured_response(user_message, schema, **kwargs)
        except Exception as e:
            logger.error(f"Error in structured_response: {e}")
            logger.info("Falling back to default model for unstructured response...")
            return self._fallback_structured_response(user_message, schema, **kwargs)

    def _fallback_structured_response(
        self,
        user_message: str,
        schema: Dict[str, Any],
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
        """
        Internal method to handle fallback when structured response endpoint fails or is not available.
        It uses the default model and attempts to parse the response into the desired schema.
        """
        # Construct a prompt that explicitly asks for JSON output based on the schema
        schema_properties = json.dumps(schema.get("properties", {}), indent=2)
        fallback_prompt = (
            f"{user_message}\n\n"
            f"Please provide the response in ONLY valid JSON format, with no additional text, markdown formatting, or code blocks. "
            f"Return ONLY the JSON object itself. "
            f"For any fields not explicitly mentioned in the input, use 'n/a'.\n"
            f"Ensure all JSON fields are complete and properly closed.\n"
            f"Schema properties: {schema_properties}"
        )

        # Use generate_text with an OpenAI-compatible model
        raw_response = None
        retries = 3
        for i in range(retries):
            try:
                raw_response = self.generate_text(
                    user_message=fallback_prompt,
                    model=self.DEFAULT_MODEL,  # Use OpenAI-compatible model
                    **kwargs,
                )
                if raw_response:
                    break
            except Exception as e:
                logger.warning(f"Attempt {i+1}/{retries} for fallback generate_text failed: {e}")
            time.sleep(1)  # 1 second delay between retries

        if not raw_response:
            logger.error("Fallback model also failed to generate a response after retries.")
            return None

        # Attempt to parse the cleaned fallback response as JSON
        cleaned_response = self.strip_all_markdown_formatting(raw_response)
        parsed_response = self._extract_and_fix_json(cleaned_response, schema)
        
        if not parsed_response:
            return None

        # Create a result dictionary with all schema keys initialized to 'n/a'
        structured_result = {key: "n/a" for key in schema.get("properties", {}).keys()}

        # Populate the result dictionary with values from the parsed AI response
        for key, value in parsed_response.items():
            if key in structured_result:
                structured_result[key] = value

        return structured_result

    def strip_all_markdown_formatting(self, text: str) -> str:
        """Enhanced method to remove ALL markdown formatting from text."""
        # Remove any leading text before JSON
        if "json" in text.lower() and "{" in text:
            # Find the first { after any mention of JSON
            json_start = text.find("{")
            if json_start > 0:
                text = text[json_start:]
        
        # Remove markdown code blocks with language specifier
        text = re.sub(r'```json\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'```\s*json\s*', '', text, flags=re.IGNORECASE)
        
        # Remove plain code blocks
        text = re.sub(r'```\s*', '', text)
        
        # Remove any trailing backticks
        text = re.sub(r'```$', '', text)
        
        # Clean up any remaining backticks
        text = text.replace('```', '')
        
        return text.strip()

    def _extract_and_fix_json(self, text: str, schema: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Try multiple approaches to extract and fix incomplete JSON from AI response.
        """
        # First clean the text thoroughly
        text = self.strip_all_markdown_formatting(text)
        
        # Approach 1: Try to parse as-is
        try:
            result = json.loads(text)
            # Fix numeric values that might be strings
            return self._fix_numeric_values(result, schema)
        except json.JSONDecodeError:
            pass

        # Approach 2: Find JSON object boundaries
        json_start = text.find('{')
        json_end = text.rfind('}')
        
        if json_start == -1 or json_end == -1:
            return None
            
        json_text = text[json_start:json_end + 1]

        # Approach 3: Try to parse the extracted JSON
        try:
            result = json.loads(json_text)
            return self._fix_numeric_values(result, schema)
        except json.JSONDecodeError:
            pass

        # Approach 4: Fix common JSON issues
        fixed_json = self._fix_common_json_issues(json_text)
        try:
            result = json.loads(fixed_json)
            return self._fix_numeric_values(result, schema)
        except json.JSONDecodeError:
            logger.warning(f"Could not parse JSON even after attempting fixes: {fixed_json[:500]}...")
            return None

    def _fix_numeric_values(self, data: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
        """Fix numeric values that might be incorrectly stored as strings."""
        if not schema or 'properties' not in schema:
            return data
            
        for key, value in data.items():
            if key in schema['properties']:
                prop_schema = schema['properties'][key]
                if prop_schema.get('type') == 'number' and isinstance(value, str):
                    try:
                        # Try to convert string to float
                        data[key] = float(value.replace(',', '').replace('$', ''))
                    except (ValueError, AttributeError):
                        pass
        return data

    def _fix_common_json_issues(self, json_text: str) -> str:
        """
        Fix common JSON formatting issues.
        """
        # Remove trailing commas before closing braces
        json_text = re.sub(r',(\s*})', r'\1', json_text)
        
        # Fix unescaped newlines in string values
        json_text = re.sub(r'(?<!\\)\\n', '\\\\n', json_text)
        
        # Ensure strings are properly quoted (but not numbers)
        # This regex is more careful about not quoting numbers
        json_text = re.sub(r':\s*([^",{\[\s\d-][^",}]*?)(\s*[,}])', r': "\1"\2', json_text)
        
        return json_text

    def generate_text(
        self,
        user_message: str,
        model: str = DEFAULT_MODEL,
        **kwargs,
    ) -> Optional[str]:
        """
        Sends a request to the Cloudflare AI API for a text response.
        Automatically chooses the right endpoint based on the model.
        """
        if self.api_token == "your-api-token-here":
            logger.error("Error: CLOUDFLARE_API_TOKEN is not set. Please set it in your environment variables.")
            return None
        
        if self.account_id == "your-account-id-here":
            logger.error("Error: CLOUDFLARE_ACCOUNT_ID is not set. Please set it in your environment variables.")
            return None

        # Check if model supports OpenAI-compatible format
        if model in self.OPENAI_COMPATIBLE_MODELS:
            return self._generate_text_openai_format(user_message, model, **kwargs)
        else:
            return self._generate_text_raw_api(user_message, model, **kwargs)

    def _generate_text_openai_format(
        self,
        user_message: str,
        model: str,
        **kwargs,
    ) -> Optional[str]:
        """Generate text using OpenAI-compatible endpoint."""
        messages = [
            {"role": "system", "content": self.default_system_instruction},
            {"role": "user", "content": user_message},
        ]

        # Use OpenAI-compatible endpoint for text generation
        payload = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.pop("temperature", 0.7),
            "max_tokens": kwargs.pop("max_tokens", 2048),
        }

        try:
            # Use the OpenAI-compatible chat completions endpoint
            response = self._session.post(
                f"{self.openai_compat_url}/chat/completions",
                json=payload,
                timeout=kwargs.pop("timeout", 30),
            )
            response.raise_for_status()

            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                content = result['choices'][0]['message']['content']
                
                # Check if response was truncated due to max_tokens
                if 'finish_reason' in result['choices'][0] and result['choices'][0]['finish_reason'] == 'length':
                    logger.warning("Response was truncated due to max_tokens limit. Consider increasing max_tokens.")
                
                return self.strip_code_block_tildes(content)
            else:
                logger.error(f"Unexpected API response structure: {result}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Raw response content on error: {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Error in generate_text: {e}")
            return None
    
    def _generate_text_raw_api(
        self,
        user_message: str,
        model: str,
        **kwargs,
    ) -> Optional[str]:
        """
        Use the raw /ai/run endpoint for models that don't support OpenAI format.
        """
        # Construct payload for raw AI run endpoint
        # Different models expect different payload formats
        payload = {
            "prompt": f"{self.default_system_instruction}\n\n{user_message}",
            "max_tokens": kwargs.pop("max_tokens", 2048),
        }
        
        # Add optional parameters if provided
        if "temperature" in kwargs:
            payload["temperature"] = kwargs.pop("temperature")

        try:
            # Use the raw AI run endpoint
            response = self._session.post(
                f"{self.ai_run_url}/{model}",
                json=payload,
                timeout=kwargs.pop("timeout", 30),
            )
            response.raise_for_status()

            result = response.json()
            if 'result' in result:
                # Different models may return results in different formats
                if isinstance(result['result'], dict):
                    if 'response' in result['result']:
                        return self.strip_code_block_tildes(result['result']['response'])
                    elif 'text' in result['result']:
                        return self.strip_code_block_tildes(result['result']['text'])
                    elif 'output' in result['result']:
                        return self.strip_code_block_tildes(result['result']['output'])
                elif isinstance(result['result'], str):
                    return self.strip_code_block_tildes(result['result'])
            
            logger.error(f"Unexpected API response structure: {result}")
            return None

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Raw response content on error: {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Error in _generate_text_raw_api: {e}")
            return None

    def generate_text_raw_api(self, user_message: str, model: str = DEFAULT_MODEL, **kwargs) -> Optional[str]:
        """Wrapper for backward compatibility."""
        return self._generate_text_raw_api(user_message, model, **kwargs)

    @staticmethod
    def strip_code_block_tildes(response_text: str) -> str:
        """Removes markdown code block fences (```json, ```markdown, ```) from a string."""
        patterns = [r"```json\n", r"```markdown\n", r"```\n", r"```"]
        for pattern in patterns:
            response_text = re.sub(pattern, "", response_text)
        return response_text.strip()


# Example usage and testing
if __name__ == "__main__":
    # Initialize the CloudflareAIDirect class
    ai = CloudflareAIDirect()
    
    # Test text generation
    print("Testing text generation...")
    response = ai.generate_text("What is artificial intelligence in one sentence?")
    if response:
        print(f"Text response: {response}")
    
    # Test structured response
    print("\nTesting structured response...")
    schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "capital": {"type": "string"}, 
            "population": {"type": "number"},
            "languages": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["name", "capital", "languages"]
    }
    
    structured_resp = ai.structured_response(
        "Tell me about India.",
        schema=schema
    )
    if structured_resp:
        print(f"Structured response: {json.dumps(structured_resp, indent=2)}")

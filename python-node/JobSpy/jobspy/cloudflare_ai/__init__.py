import os
import json
import re
import sqlite3
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
import time

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


class CloudflareAI:
    """
    A class for interacting with Cloudflare AI models, providing utilities for
    text generation, structured responses, file operations, and SQLite database interactions.
    """

    DEFAULT_MODEL = "@cf/openai/gpt-oss-120b"
    DEFAULT_STRUCTURED_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct"
    DEFAULT_WORKER_URL = os.getenv("WORKER_ENDPOINT_URI", "https://openai-api-worker.hacolby.workers.dev")
    DEFAULT_API_KEY = os.getenv("WORKER_API_KEY", "your-api-key-here")

    def __init__(
        self,
        worker_url: str = DEFAULT_WORKER_URL,
        api_key: str = DEFAULT_API_KEY,
        default_system_instruction: str = "You are a helpful AI assistant.",
    ):
        self.worker_url = worker_url
        self.api_key = api_key
        self.default_system_instruction = default_system_instruction
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })

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
        Sends a request to the Cloudflare AI endpoint for a structured JSON response.
        Defaults to @cf/meta/llama-4-scout-17b-16e-instruct.
        """
        if self.api_key == "your-api-key-here":
            logger.error("Error: WORKER_API_KEY is not set. Please set it in your environment variables or pass it to the CloudflareAI constructor.")
            return None

        messages = [
            {"role": "system", "content": self.default_system_instruction},
            {"role": "user", "content": user_message},
        ]

        payload = {
            "model": model,
            "messages": messages,
            "response_format": {
                "type": "json_schema",
                "schema": schema,
            },
            "temperature": kwargs.pop("temperature", 0.1),
            "max_tokens": kwargs.pop("max_tokens", 2048),
            **kwargs,
        }

        try:
            response = self._session.post(
                f"{self.worker_url}/v1/chat/completions/structured",
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

                # Strip markdown code block tildes before attempting JSON parsing
                cleaned_content = self.strip_code_block_tildes(content)

                # Always try to fix and parse the JSON
                parsed_content = self._extract_and_fix_json(cleaned_content, schema)
                if parsed_content:
                    logger.info("Successfully parsed/recovered JSON from structured endpoint.")
                    return parsed_content
                else:
                    logger.error(f"Failed to parse or recover JSON from structured endpoint: {cleaned_content}")
                    logger.error(f"Raw response content: {response.text}")
                    logger.error(f"Response headers: {response.headers}")
                    # Fallback to default model if structured parsing fails
                    logger.info("Falling back to default model for unstructured response...")
                    return self._fallback_structured_response(user_message, schema, **kwargs)
            else:
                logger.error(f"Unexpected API response structure: {result}")
                logger.error(f"Raw response content: {response.text}")
                logger.error(f"Response headers: {response.headers}")
                # Fallback to default model if structured API response is unexpected
                logger.info("Falling back to default model for unstructured response...")
                return self._fallback_structured_response(user_message, schema, **kwargs)

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed for structured endpoint: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Raw response content on error: {e.response.text}")
                logger.error(f"Response headers on error: {e.response.headers}")
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
            f"Please provide the response in JSON format, adhering to the following schema structure. "
            f"For any fields not explicitly mentioned in the input, use 'n/a'.\n"
            f"Ensure all JSON fields are complete and properly closed.\n"
            f"Schema properties: {schema_properties}"
        )

        # Use generate_text with the default model
        raw_response = None
        retries = 3
        for i in range(retries):
            try:
                raw_response = self.generate_text(
                    user_message=fallback_prompt,
                    model=self.DEFAULT_MODEL,
                    **kwargs,
                )
                if raw_response:
                    break
            except Exception as e:
                logger.warning(f"Attempt {i+1}/{retries} for fallback generate_text failed: {e}")
            time.sleep(1) # 1 second delay between retries

        if not raw_response:
            logger.error("Fallback model also failed to generate a response after retries.")
            return None

        # Attempt to parse the cleaned fallback response as JSON
        cleaned_response = self.strip_code_block_tildes(raw_response)
        parsed_response = None

        # Try direct JSON parsing first
        try:
            parsed_response = json.loads(cleaned_response)
        except json.JSONDecodeError:
            logger.debug(f"Direct JSON parsing failed, attempting regex extraction: {cleaned_response}")
            # If direct parsing fails, use regex to find the outermost JSON object
            json_match = re.search(r'''^\s*({.*})\s*$''', cleaned_response, re.DOTALL)
            if json_match:
                json_string = json_match.group(1)
                try:
                    parsed_response = json.loads(json_string)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse fallback AI response with regex extraction as JSON: {json_string}")
                    logger.error(f"JSON decode error: {e}")
                    logger.error(f"Raw response content from fallback: {raw_response}")
            else:
                logger.error(f"No complete JSON object found in fallback AI response after regex attempt: {cleaned_response}")
                logger.error(f"Raw response content from fallback: {raw_response}")

        if not parsed_response:
            return None

        # Create a result dictionary with all schema keys initialized to 'n/a'
        structured_result = {key: "n/a" for key in schema.get("properties", {}).keys()}

        # Populate the result dictionary with values from the parsed AI response
        for key, value in parsed_response.items():
            if key in structured_result:
                structured_result[key] = value

        return structured_result

    def _extract_and_fix_json(self, text: str, schema: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Try multiple approaches to extract and fix incomplete JSON from AI response.
        """
        # Approach 1: Try to parse as-is
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Approach 2: Find JSON object boundaries and try to complete it
        json_start = text.find('{')
        if json_start == -1:
            return None

        # Find the last occurrence of a closing brace
        json_end = text.rfind('}')
        if json_end == -1:
            # No closing brace found, try to construct one
            json_text = text[json_start:]
            json_text = self._attempt_json_completion(json_text, schema)
        else:
            json_text = text[json_start:json_end + 1]

        # Approach 3: Try to parse the extracted/fixed JSON
        try:
            return json.loads(json_text)
        except json.JSONDecodeError:
            pass

        # Approach 4: Try to fix common JSON issues
        fixed_json = self._fix_common_json_issues(json_text)
        try:
            return json.loads(fixed_json)
        except json.JSONDecodeError:
            logger.warning(f"Could not parse JSON even after attempting fixes: {fixed_json}")
            return None

    def _attempt_json_completion(self, incomplete_json: str, schema: Dict[str, Any]) -> str:
        """
        Attempt to complete an incomplete JSON object based on the schema.
        """
        # Remove any trailing incomplete content after the last complete field
        lines = incomplete_json.split('\n')
        completed_lines = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            # If line ends with a comma or is a complete field, keep it
            if (stripped.endswith(',') or
                stripped.endswith('{') or
                ('"' in stripped and ':' in stripped and
                 (stripped.endswith('"') or stripped.endswith('",')))):
                completed_lines.append(line)
            else:
                # This might be an incomplete line, check if it's a field start
                if '"' in stripped and ':' in stripped:
                    # Try to complete the field with a placeholder
                    field_name = stripped.split(':')[0].strip()
                    completed_lines.append(f'  {field_name}: "n/a"')
                break

        # Ensure proper JSON closure
        result = '\n'.join(completed_lines)
        if not result.strip().endswith('}'):
            # Remove trailing comma if present
            if result.strip().endswith(','):
                result = result.rsplit(',', 1)[0]
            result += '\n}'

        return result

    def _fix_common_json_issues(self, json_text: str) -> str:
        """
        Fix common JSON formatting issues.
        """
        # Remove trailing commas before closing braces
        json_text = re.sub(r',(\s*})', r'\1', json_text)

        # Fix unescaped newlines in string values
        json_text = re.sub(r'(?<!\\)\\n', '\\\\n', json_text)

        # Ensure strings are properly quoted
        json_text = re.sub(r':\s*([^",{\[\s][^",}]*?)(\s*[,}])', r': "\1"\2', json_text)

        return json_text

    def generate_text(
        self,
        user_message: str,
        model: str = DEFAULT_MODEL,
        **kwargs,
    ) -> Optional[str]:
        """
        Sends a request to the Cloudflare AI endpoint for a text response.
        Defaults to @cf/openai/gpt-oss-120b.
        """
        if self.api_key == "your-api-key-here":
            logger.error("Error: WORKER_API_KEY is not set. Please set it in your environment variables or pass it to the CloudflareAI constructor.")
            return None

        messages = [
            {"role": "system", "content": self.default_system_instruction},
            {"role": "user", "content": user_message},
        ]

        payload = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.pop("temperature", 0.7),
            "max_tokens": kwargs.pop("max_tokens", 2048),  # Increased from 1024 to 2048
            **kwargs,
        }

        try:
            response = self._session.post(
                f"{self.worker_url}/v1/chat/completions/text",
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
                logger.error(f"Raw response content: {response.text}")
                logger.error(f"Response headers: {response.headers}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Raw response content on error: {e.response.text}")
                logger.error(f"Response headers on error: {e.response.headers}")
            return None
        except Exception as e:
            logger.error(f"Error in generate_text: {e}")
            return None

    @staticmethod
    def strip_code_block_tildes(response_text: str) -> str:
        """Removes markdown code block fences (```json, ```markdown, ```) from a string."""
        patterns = [r"```json\n", r"```markdown\n", r"```\n", r"```"]
        for pattern in patterns:
            response_text = re.sub(pattern, "", response_text)
        return response_text.strip()

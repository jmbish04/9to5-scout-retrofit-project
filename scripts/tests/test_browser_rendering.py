#!/usr/bin/env python3
"""
Cloudflare Browser Rendering API Test Script
Mirrors the JavaScript browser-rendering-example.js functionality
Tests both local file saving and R2 bucket upload capabilities
"""

import os
import json
import base64
import asyncio
import aiohttp
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging

# Configure logging to both console and file
def setup_logging():
    """Setup logging to both console and file (overwrite each run)"""
    # Create formatters
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    
    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Clear any existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (overwrite each run)
    log_file = Path(__file__).parent / "browser_rendering_test.log"
    file_handler = logging.FileHandler(log_file, mode='w')  # 'w' mode overwrites
    file_handler.setLevel(logging.DEBUG)  # More detailed logging to file
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
    return root_logger

# Setup logging
logger = setup_logging()

class CloudflareBrowserRenderingClient:
    """Client for Cloudflare Browser Rendering REST API"""
    
    def __init__(self, api_token: str, account_id: str):
        self.api_token = api_token
        self.account_id = account_id
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    async def _make_request(self, session: aiohttp.ClientSession, endpoint: str, data: Dict[str, Any], binary: bool = False) -> Dict[str, Any]:
        """Make a request to the Cloudflare Browser Rendering API"""
        url = f"{self.base_url}/{endpoint}"
        
        async with session.post(url, headers=self.headers, json=data) as response:
            if response.status == 200:
                if binary:
                    # For binary responses (screenshots, PDFs), return the raw data
                    content = await response.read()
                    return {"success": True, "result": base64.b64encode(content).decode('utf-8')}
                else:
                    return await response.json()
            else:
                error_text = await response.text()
                raise Exception(f"API request failed: {response.status} - {error_text}")
    
    async def take_screenshot(self, session: aiohttp.ClientSession, url: str, **options) -> Dict[str, Any]:
        """Take a screenshot of a webpage"""
        data = {
            "url": url,
            "screenshotOptions": {
                "fullPage": options.get("fullPage", True),
                "type": options.get("type", "png"),
                "omitBackground": options.get("omitBackground", False)
            },
            "viewport": {
                "width": options.get("width", 1920),
                "height": options.get("height", 1080)
            }
        }
        
        # Add authentication if provided
        if "username" in options and "password" in options:
            data["authenticate"] = {
                "username": options["username"],
                "password": options["password"]
            }
        
        # Add custom headers if provided
        if "headers" in options:
            data["setExtraHTTPHeaders"] = options["headers"]
        
        return await self._make_request(session, "screenshot", data, binary=True)
    
    async def extract_content(self, session: aiohttp.ClientSession, url: str, **options) -> Dict[str, Any]:
        """Extract HTML content from a webpage"""
        data = {
            "url": url,
            "rejectResourceTypes": options.get("rejectResourceTypes", [])
        }
        
        # Add authentication if provided
        if "username" in options and "password" in options:
            data["authenticate"] = {
                "username": options["username"],
                "password": options["password"]
            }
        
        # Add custom headers if provided
        if "headers" in options:
            data["setExtraHTTPHeaders"] = options["headers"]
        
        return await self._make_request(session, "content", data)
    
    async def extract_markdown(self, session: aiohttp.ClientSession, url: str, **options) -> Dict[str, Any]:
        """Extract markdown content from a webpage"""
        data = {"url": url}
        
        # Add authentication if provided
        if "username" in options and "password" in options:
            data["authenticate"] = {
                "username": options["username"],
                "password": options["password"]
            }
        
        # Add custom headers if provided
        if "headers" in options:
            data["setExtraHTTPHeaders"] = options["headers"]
        
        return await self._make_request(session, "markdown", data)
    
    async def extract_json(self, session: aiohttp.ClientSession, url: str, prompt: str, schema: Dict[str, Any], **options) -> Dict[str, Any]:
        """Extract structured JSON data from a webpage using AI"""
        data = {
            "url": url,
            "prompt": prompt,
            "response_format": {
                "type": "json_schema",
                "schema": schema
            }
        }
        
        # Add authentication if provided
        if "username" in options and "password" in options:
            data["authenticate"] = {
                "username": options["username"],
                "password": options["password"]
            }
        
        # Add custom headers if provided
        if "headers" in options:
            data["setExtraHTTPHeaders"] = options["headers"]
        
        return await self._make_request(session, "json", data)
    
    async def extract_links(self, session: aiohttp.ClientSession, url: str, **options) -> Dict[str, Any]:
        """Extract links from a webpage"""
        data = {"url": url}
        
        # Add authentication if provided
        if "username" in options and "password" in options:
            data["authenticate"] = {
                "username": options["username"],
                "password": options["password"]
            }
        
        # Add custom headers if provided
        if "headers" in options:
            data["setExtraHTTPHeaders"] = options["headers"]
        
        return await self._make_request(session, "links", data)
    
    async def scrape_elements(self, session: aiohttp.ClientSession, url: str, selectors: List[Dict[str, str]], **options) -> Dict[str, Any]:
        """Scrape specific elements from a webpage"""
        data = {
            "url": url,
            "elements": selectors
        }
        
        # Add authentication if provided
        if "username" in options and "password" in options:
            data["authenticate"] = {
                "username": options["username"],
                "password": options["password"]
            }
        
        # Add custom headers if provided
        if "headers" in options:
            data["setExtraHTTPHeaders"] = options["headers"]
        
        return await self._make_request(session, "scrape", data)
    
    async def generate_pdf(self, session: aiohttp.ClientSession, url: str, **options) -> Dict[str, Any]:
        """Generate a PDF from a webpage"""
        data = {
            "url": url,
            "pdfOptions": {
                "format": options.get("format", "a4"),
                "printBackground": options.get("printBackground", True)
            }
        }
        
        # Add authentication if provided
        if "username" in options and "password" in options:
            data["authenticate"] = {
                "username": options["username"],
                "password": options["password"]
            }
        
        # Add custom headers if provided
        if "headers" in options:
            data["setExtraHTTPHeaders"] = options["headers"]
        
        return await self._make_request(session, "pdf", data, binary=True)

class AssetManager:
    """Manages saving assets locally and to R2 bucket"""
    
    def __init__(self, local_assets_dir: str, r2_bucket_url: Optional[str] = None):
        self.local_assets_dir = Path(local_assets_dir)
        self.local_assets_dir.mkdir(parents=True, exist_ok=True)
        self.r2_bucket_url = r2_bucket_url
    
    def save_asset(self, filename: str, data: bytes, asset_type: str = "binary") -> str:
        """Save asset locally and optionally to R2 bucket"""
        # Save locally
        local_path = self.local_assets_dir / filename
        local_path.write_bytes(data)
        logger.info(f"💾 Asset saved locally: {local_path}")
        
        # TODO: Add R2 bucket upload functionality
        # This would require additional R2 SDK setup
        if self.r2_bucket_url:
            logger.info(f"📦 R2 upload would go to: {self.r2_bucket_url}/{filename}")
        
        return str(local_path)
    
    def save_text_asset(self, filename: str, content: str) -> str:
        """Save text asset locally and optionally to R2 bucket"""
        # Save locally
        local_path = self.local_assets_dir / filename
        local_path.write_text(content, encoding='utf-8')
        logger.info(f"💾 Text asset saved locally: {local_path}")
        
        # TODO: Add R2 bucket upload functionality
        if self.r2_bucket_url:
            logger.info(f"📦 R2 upload would go to: {self.r2_bucket_url}/{filename}")
        
        return str(local_path)

def load_dev_vars() -> Dict[str, str]:
    """Load environment variables from .dev.vars file"""
    # Look for .dev.vars in the project root (two levels up from scripts/tests/)
    dev_vars_path = Path(__file__).parent.parent.parent / ".dev.vars"
    env_vars = {}
    
    if dev_vars_path.exists():
        with open(dev_vars_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"\'')
                    env_vars[key.strip()] = value
        logger.info("✅ Configuration loaded from .dev.vars")
    else:
        logger.warning("⚠️ .dev.vars file not found, using environment variables")
    
    return env_vars

async def test_basic_screenshot(client: CloudflareBrowserRenderingClient, asset_manager: AssetManager):
    """Test basic screenshot functionality"""
    logger.info("📸 Testing basic screenshot...")
    
    async with aiohttp.ClientSession() as session:
        try:
            result = await client.take_screenshot(session, "https://example.com")
            
            if result.get("success") and result.get("result"):
                # Decode base64 screenshot data
                screenshot_data = base64.b64decode(result["result"])
                
                timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
                filename = f"screenshot-{timestamp}.png"
                file_path = asset_manager.save_asset(filename, screenshot_data, "binary")
                
                logger.info(f"✅ Screenshot captured and saved: {file_path}")
                return file_path
            else:
                logger.error(f"❌ Screenshot failed: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Screenshot test failed: {e}")
            return None

async def test_content_extraction(client: CloudflareBrowserRenderingClient, asset_manager: AssetManager):
    """Test HTML content extraction"""
    logger.info("📄 Testing content extraction...")
    
    async with aiohttp.ClientSession() as session:
        try:
            result = await client.extract_content(
                session, 
                "https://example.com",
                rejectResourceTypes=["image", "stylesheet"]
            )
            
            if result.get("success") and result.get("result"):
                timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
                filename = f"content-{timestamp}.html"
                file_path = asset_manager.save_text_asset(filename, result["result"])
                
                logger.info(f"✅ Content extracted and saved: {file_path}")
                return file_path
            else:
                logger.error(f"❌ Content extraction failed: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Content extraction test failed: {e}")
            return None

async def test_markdown_extraction(client: CloudflareBrowserRenderingClient, asset_manager: AssetManager):
    """Test markdown extraction"""
    logger.info("📝 Testing markdown extraction...")
    
    async with aiohttp.ClientSession() as session:
        try:
            result = await client.extract_markdown(session, "https://example.com")
            
            if result.get("success") and result.get("result"):
                timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
                filename = f"markdown-{timestamp}.md"
                file_path = asset_manager.save_text_asset(filename, result["result"])
                
                logger.info(f"✅ Markdown extracted and saved: {file_path}")
                return file_path
            else:
                logger.error(f"❌ Markdown extraction failed: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Markdown extraction test failed: {e}")
            return None

async def test_json_extraction(client: CloudflareBrowserRenderingClient, asset_manager: AssetManager):
    """Test JSON extraction with AI"""
    logger.info("📊 Testing JSON extraction...")
    
    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "headings": {"type": "array", "items": {"type": "string"}}
        }
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            result = await client.extract_json(
                session,
                "https://example.com",
                "Extract key information from this page",
                schema
            )
            
            if result.get("success") and result.get("result"):
                timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
                filename = f"json-{timestamp}.json"
                
                # Handle both direct result and nested output
                json_data = result["result"]
                if isinstance(json_data, dict) and "output" in json_data:
                    json_data = json_data["output"]
                
                json_content = json.dumps(json_data, indent=2)
                file_path = asset_manager.save_text_asset(filename, json_content)
                
                logger.info(f"✅ JSON extracted and saved: {file_path}")
                return file_path
            else:
                logger.error(f"❌ JSON extraction failed: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ JSON extraction test failed: {e}")
            return None

async def test_pdf_generation(client: CloudflareBrowserRenderingClient, asset_manager: AssetManager):
    """Test PDF generation"""
    logger.info("📄 Testing PDF generation...")
    
    async with aiohttp.ClientSession() as session:
        try:
            result = await client.generate_pdf(session, "https://example.com")
            
            if result.get("success") and result.get("result"):
                # Decode base64 PDF data
                pdf_data = base64.b64decode(result["result"])
                
                timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
                filename = f"pdf-{timestamp}.pdf"
                file_path = asset_manager.save_asset(filename, pdf_data, "binary")
                
                logger.info(f"✅ PDF generated and saved: {file_path}")
                return file_path
            else:
                logger.error(f"❌ PDF generation failed: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ PDF generation test failed: {e}")
            return None

async def test_linkedin_job_scraping(client: CloudflareBrowserRenderingClient, asset_manager: AssetManager, job_id: str, username: str, password: str):
    """Test LinkedIn job scraping with authentication - FULL GAMBIT"""
    logger.info(f"🔗 Testing LinkedIn job scraping for job ID: {job_id} - FULL GAMBIT")
    
    url = f"https://linkedin.com/jobs/view/{job_id}"
    
    # LinkedIn-specific headers
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    # LinkedIn job data schema
    job_schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "company": {"type": "string"},
            "location": {"type": "string"},
            "employmentType": {"type": "string"},
            "salaryRange": {"type": "string"},
            "description": {"type": "string"},
            "requiredSkills": {"type": "array", "items": {"type": "string"}},
            "preferredSkills": {"type": "array", "items": {"type": "string"}},
            "benefits": {"type": "array", "items": {"type": "string"}},
            "applicationDeadline": {"type": "string"},
            "remoteWork": {"type": "string"},
            "experienceLevel": {"type": "string"},
            "industry": {"type": "string"},
            "jobUrl": {"type": "string"},
            "postedDate": {"type": "string"}
        },
        "required": ["title", "company", "location", "description"]
    }
    
    # LinkedIn-specific selectors
    selectors = [
        {"selector": "h1.job-title"},
        {"selector": ".job-details-jobs-unified-top-card__company-name"},
        {"selector": ".job-details-jobs-unified-top-card__bullet"},
        {"selector": ".job-details-jobs-unified-top-card__salary"},
        {"selector": ".jobs-description-content__text"},
        {"selector": ".jobs-unified-top-card__job-insight"}
    ]
    
    async with aiohttp.ClientSession() as session:
        try:
            # Execute ALL operations in parallel - FULL GAMBIT
            tasks = [
                # Content extraction
                client.extract_content(session, url, username=username, password=password, headers=headers),
                
                # Screenshots (viewport and full page)
                client.take_screenshot(session, url, username=username, password=password, headers=headers, fullPage=False, width=1920, height=1080),
                client.take_screenshot(session, url, username=username, password=password, headers=headers, fullPage=True),
                
                # Markdown extraction
                client.extract_markdown(session, url, username=username, password=password, headers=headers),
                
                # JSON extraction with AI
                client.extract_json(
                    session, url,
                    "Extract comprehensive job posting information from this LinkedIn job posting. Include job title, company name, location, employment type, salary range, job description, required qualifications/skills, preferred qualifications/skills, benefits and perks, application deadline, remote work options, experience level required, industry/sector",
                    job_schema,
                    username=username, password=password, headers=headers
                ),
                
                # Links extraction
                client.extract_links(session, url, username=username, password=password, headers=headers),
                
                # Element scraping
                client.scrape_elements(session, url, selectors, username=username, password=password, headers=headers),
                
                # PDF generation
                client.generate_pdf(session, url, username=username, password=password, headers=headers, format="a4")
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
            job_prefix = f"linkedin-job-{job_id}-{timestamp}"
            saved_files = []
            
            # Process results with descriptive names
            task_names = [
                "content", "screenshot-viewport", "screenshot-fullpage", 
                "markdown", "json-data", "links", "scraped-elements", "pdf"
            ]
            
            for i, (result, task_name) in enumerate(zip(results, task_names)):
                if isinstance(result, Exception):
                    logger.error(f"❌ {task_name} task failed: {result}")
                    continue
                
                if not result.get("success"):
                    logger.error(f"❌ {task_name} task returned unsuccessful: {result}")
                    continue
                
                task_data = result.get("result")
                if not task_data:
                    continue
                
                # Process based on task type
                if task_name == "content":
                    filename = f"{job_prefix}-content.html"
                    file_path = asset_manager.save_text_asset(filename, task_data)
                    saved_files.append(file_path)
                
                elif task_name in ["screenshot-viewport", "screenshot-fullpage"]:
                    filename = f"{job_prefix}-{task_name}.png"
                    screenshot_data = base64.b64decode(task_data)
                    file_path = asset_manager.save_asset(filename, screenshot_data, "binary")
                    saved_files.append(file_path)
                
                elif task_name == "markdown":
                    filename = f"{job_prefix}-markdown.md"
                    file_path = asset_manager.save_text_asset(filename, task_data)
                    saved_files.append(file_path)
                
                elif task_name == "json-data":
                    if isinstance(task_data, dict) and "output" in task_data:
                        filename = f"{job_prefix}-data.json"
                        json_content = json.dumps(task_data["output"], indent=2)
                        file_path = asset_manager.save_text_asset(filename, json_content)
                        saved_files.append(file_path)
                
                elif task_name == "links":
                    filename = f"{job_prefix}-links.json"
                    json_content = json.dumps(task_data, indent=2)
                    file_path = asset_manager.save_text_asset(filename, json_content)
                    saved_files.append(file_path)
                
                elif task_name == "scraped-elements":
                    filename = f"{job_prefix}-scraped.json"
                    json_content = json.dumps(task_data, indent=2)
                    file_path = asset_manager.save_text_asset(filename, json_content)
                    saved_files.append(file_path)
                
                elif task_name == "pdf":
                    filename = f"{job_prefix}-document.pdf"
                    pdf_data = base64.b64decode(task_data)
                    file_path = asset_manager.save_asset(filename, pdf_data, "binary")
                    saved_files.append(file_path)
            
            # Print comprehensive summary
            if saved_files:
                logger.info(f"\n🎯 LinkedIn Job Scraping - FULL GAMBIT COMPLETE!")
                logger.info(f"📁 Generated {len(saved_files)} assets:")
                for file_path in saved_files:
                    logger.info(f"   {file_path}")
                
                # Log file reference for AI agents
                log_file = Path(__file__).parent / "browser_rendering_test.log"
                logger.info(f"\n📋 Detailed logs available at: {log_file}")
                logger.info(f"🤖 AI Agent: Review the log file for comprehensive test details")
            else:
                logger.warning("⚠️ No assets were generated from LinkedIn job scraping")
            
            return saved_files
            
        except Exception as e:
            logger.error(f"❌ LinkedIn job scraping failed: {e}")
            return []

async def run_comprehensive_test(client: CloudflareBrowserRenderingClient, asset_manager: AssetManager):
    """Run comprehensive test with multiple operations"""
    logger.info("🔄 Running comprehensive test...")
    
    url = "https://example.com"
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    comp_prefix = f"comprehensive-{timestamp}"
    saved_files = []
    
    async with aiohttp.ClientSession() as session:
        try:
            # Execute multiple operations in parallel
            tasks = [
                client.extract_content(session, url),
                client.take_screenshot(session, url, fullPage=True),
                client.extract_markdown(session, url),
                client.extract_json(
                    session, url,
                    "Extract key information from this page",
                    {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "headings": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                ),
                client.extract_links(session, url),
                client.scrape_elements(session, url, [{"selector": "h1, h2, h3"}])
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            task_names = ["content", "screenshot", "markdown", "json", "links", "scraped"]
            
            for i, (result, task_name) in enumerate(zip(results, task_names)):
                if isinstance(result, Exception):
                    logger.error(f"❌ {task_name} task failed: {result}")
                    continue
                
                if not result.get("success"):
                    logger.error(f"❌ {task_name} task returned unsuccessful: {result}")
                    continue
                
                task_data = result.get("result")
                if not task_data:
                    continue
                
                if task_name == "screenshot":
                    filename = f"{comp_prefix}-{task_name}.png"
                    screenshot_data = base64.b64decode(task_data)
                    file_path = asset_manager.save_asset(filename, screenshot_data, "binary")
                    saved_files.append(file_path)
                
                elif task_name == "json" and isinstance(task_data, dict) and "output" in task_data:
                    filename = f"{comp_prefix}-{task_name}.json"
                    json_content = json.dumps(task_data["output"], indent=2)
                    file_path = asset_manager.save_text_asset(filename, json_content)
                    saved_files.append(file_path)
                
                else:
                    filename = f"{comp_prefix}-{task_name}.{'json' if task_name in ['links', 'scraped'] else 'html' if task_name == 'content' else 'md'}"
                    
                    if task_name in ["links", "scraped"]:
                        json_content = json.dumps(task_data, indent=2)
                        file_path = asset_manager.save_text_asset(filename, json_content)
                    else:
                        file_path = asset_manager.save_text_asset(filename, task_data)
                    
                    saved_files.append(file_path)
            
            # Print summary
            if saved_files:
                logger.info(f"\n📁 Comprehensive Test Assets ({len(saved_files)} files):")
                for file_path in saved_files:
                    logger.info(f"   {file_path}")
            
            return saved_files
            
        except Exception as e:
            logger.error(f"❌ Comprehensive test failed: {e}")
            return []

async def main():
    """Main test function"""
    parser = argparse.ArgumentParser(description="Test Cloudflare Browser Rendering API")
    parser.add_argument("--linkedin-job-id", help="LinkedIn job ID to test scraping")
    parser.add_argument("--comprehensive", action="store_true", help="Run comprehensive test")
    parser.add_argument("--basic", action="store_true", help="Run basic tests")
    args = parser.parse_args()
    
    # Load configuration
    dev_vars = load_dev_vars()
    
    api_token = dev_vars.get("BROWSER_RENDERING_TOKEN") or os.getenv("CLOUDFLARE_API_TOKEN")
    account_id = dev_vars.get("CLOUDFLARE_ACCOUNT_ID") or os.getenv("CLOUDFLARE_ACCOUNT_ID")
    linkedin_username = dev_vars.get("LINKEDIN_USERNAME") or os.getenv("LINKEDIN_USERNAME")
    linkedin_password = dev_vars.get("LINKEDIN_PASSWORD") or os.getenv("LINKEDIN_PASSWORD")
    
    # Validate configuration
    if not api_token or not account_id:
        logger.error("❌ Missing required configuration: BROWSER_RENDERING_TOKEN and CLOUDFLARE_ACCOUNT_ID")
        return
    
    logger.info(f"📋 Account ID: {account_id}")
    logger.info(f"🔑 API Token: {api_token[:8]}...")
    
    # Initialize client and asset manager
    client = CloudflareBrowserRenderingClient(api_token, account_id)
    asset_manager = AssetManager("scripts/assets/browser-render")
    
    all_saved_files = []
    
    try:
        # Run basic tests if requested or no specific test specified
        if args.basic or (not args.linkedin_job_id and not args.comprehensive):
            logger.info("🚀 Starting basic tests...")
            
            # Test basic functionality
            screenshot_file = await test_basic_screenshot(client, asset_manager)
            if screenshot_file:
                all_saved_files.append(screenshot_file)
            
            content_file = await test_content_extraction(client, asset_manager)
            if content_file:
                all_saved_files.append(content_file)
            
            markdown_file = await test_markdown_extraction(client, asset_manager)
            if markdown_file:
                all_saved_files.append(markdown_file)
            
            json_file = await test_json_extraction(client, asset_manager)
            if json_file:
                all_saved_files.append(json_file)
            
            pdf_file = await test_pdf_generation(client, asset_manager)
            if pdf_file:
                all_saved_files.append(pdf_file)
        
        # Run comprehensive test if requested
        if args.comprehensive:
            logger.info("🚀 Starting comprehensive test...")
            comp_files = await run_comprehensive_test(client, asset_manager)
            all_saved_files.extend(comp_files)
        
        # Run LinkedIn job scraping if job ID provided
        if args.linkedin_job_id:
            if not linkedin_username or not linkedin_password:
                logger.error("❌ LinkedIn credentials not available. Please set LINKEDIN_USERNAME and LINKEDIN_PASSWORD in .dev.vars")
                return
            
            logger.info("🚀 Starting LinkedIn job scraping test...")
            linkedin_files = await test_linkedin_job_scraping(
                client, asset_manager, args.linkedin_job_id, linkedin_username, linkedin_password
            )
            all_saved_files.extend(linkedin_files)
        
        # Final summary
        if all_saved_files:
            logger.info(f"\n🎉 All tests completed! Total files saved: {len(all_saved_files)}")
            logger.info("📁 All saved files:")
            for file_path in all_saved_files:
                logger.info(f"   {file_path}")
            
            # Log file reference for AI agents
            log_file = Path(__file__).parent / "browser_rendering_test.log"
            logger.info(f"\n📋 Detailed logs available at: {log_file}")
            logger.info(f"🤖 AI Agent: Review the log file for comprehensive test details")
        else:
            logger.warning("⚠️ No files were saved. Check the logs for errors.")
            log_file = Path(__file__).parent / "browser_rendering_test.log"
            logger.info(f"📋 Check detailed logs at: {log_file}")
    
    except Exception as e:
        logger.error(f"❌ Test execution failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())

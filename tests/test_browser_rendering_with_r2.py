#!/usr/bin/env python3
"""
Enhanced Cloudflare Browser Rendering API Test Script with R2 Upload
Combines browser rendering testing with R2 bucket upload capabilities
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

# Import the original test script components
from test_browser_rendering import (
    CloudflareBrowserRenderingClient, 
    AssetManager, 
    load_dev_vars,
    test_basic_screenshot,
    test_content_extraction,
    test_markdown_extraction,
    test_json_extraction,
    test_pdf_generation,
    test_linkedin_job_scraping,
    run_comprehensive_test
)

# Import R2 uploader
from r2_uploader import R2Uploader, load_worker_config

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

class EnhancedAssetManager(AssetManager):
    """Enhanced asset manager with R2 upload capabilities"""
    
    def __init__(self, local_assets_dir: str, r2_uploader: Optional[R2Uploader] = None):
        super().__init__(local_assets_dir)
        self.r2_uploader = r2_uploader
        self.uploaded_files = []
    
    def save_asset(self, filename: str, data: bytes, asset_type: str = "binary") -> str:
        """Save asset locally and optionally to R2 bucket"""
        # Save locally
        local_path = super().save_asset(filename, data, asset_type)
        
        # Upload to R2 if uploader is available
        if self.r2_uploader:
            r2_key = f"tests/assets/browser-render/{filename}"
            if self.r2_uploader.upload_file(local_path, r2_key):
                self.uploaded_files.append(f"R2: {r2_key}")
                logger.info(f"📦 Asset uploaded to R2: {r2_key}")
            else:
                logger.warning(f"⚠️ Failed to upload to R2: {filename}")
        
        return local_path
    
    def save_text_asset(self, filename: str, content: str) -> str:
        """Save text asset locally and optionally to R2 bucket"""
        # Save locally
        local_path = super().save_text_asset(filename, content)
        
        # Upload to R2 if uploader is available
        if self.r2_uploader:
            r2_key = f"tests/assets/browser-render/{filename}"
            if self.r2_uploader.upload_file(local_path, r2_key):
                self.uploaded_files.append(f"R2: {r2_key}")
                logger.info(f"📦 Text asset uploaded to R2: {r2_key}")
            else:
                logger.warning(f"⚠️ Failed to upload to R2: {filename}")
        
        return local_path
    
    def get_upload_summary(self) -> Dict[str, Any]:
        """Get summary of uploaded files"""
        return {
            "local_files": len([f for f in self.local_assets_dir.glob("*") if f.is_file()]),
            "r2_uploads": len(self.uploaded_files),
            "r2_files": self.uploaded_files
        }

async def run_tests_with_r2(
    client: CloudflareBrowserRenderingClient,
    asset_manager: EnhancedAssetManager,
    linkedin_job_id: Optional[str] = None,
    run_basic: bool = True,
    run_comprehensive: bool = False
):
    """Run all tests with R2 upload capabilities"""
    all_saved_files = []
    
    try:
        # Run basic tests if requested
        if run_basic:
            logger.info("🚀 Starting basic tests with R2 upload...")
            
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
        if run_comprehensive:
            logger.info("🚀 Starting comprehensive test with R2 upload...")
            comp_files = await run_comprehensive_test(client, asset_manager)
            all_saved_files.extend(comp_files)
        
        # Run LinkedIn job scraping if job ID provided
        if linkedin_job_id:
            dev_vars = load_dev_vars()
            linkedin_username = dev_vars.get("LINKEDIN_USERNAME") or os.getenv("LINKEDIN_USERNAME")
            linkedin_password = dev_vars.get("LINKEDIN_PASSWORD") or os.getenv("LINKEDIN_PASSWORD")
            
            if not linkedin_username or not linkedin_password:
                logger.error("❌ LinkedIn credentials not available. Please set LINKEDIN_USERNAME and LINKEDIN_PASSWORD in .dev.vars")
                return all_saved_files
            
            logger.info("🚀 Starting LinkedIn job scraping test with R2 upload...")
            linkedin_files = await test_linkedin_job_scraping(
                client, asset_manager, linkedin_job_id, linkedin_username, linkedin_password
            )
            all_saved_files.extend(linkedin_files)
        
        # Get upload summary
        summary = asset_manager.get_upload_summary()
        
        # Final summary
        logger.info(f"\n🎉 All tests completed!")
        logger.info(f"📁 Local files saved: {summary['local_files']}")
        logger.info(f"📦 R2 files uploaded: {summary['r2_uploads']}")
        
        if summary['r2_files']:
            logger.info("📦 R2 uploaded files:")
            for r2_file in summary['r2_files']:
                logger.info(f"   {r2_file}")
        
        if all_saved_files:
            logger.info("📁 All local files:")
            for file_path in all_saved_files:
                logger.info(f"   {file_path}")
        
        return all_saved_files
    
    except Exception as e:
        logger.error(f"❌ Test execution failed: {e}")
        return all_saved_files

async def main():
    """Main test function with R2 upload support"""
    parser = argparse.ArgumentParser(description="Test Cloudflare Browser Rendering API with R2 upload")
    parser.add_argument("--linkedin-job-id", help="LinkedIn job ID to test scraping")
    parser.add_argument("--comprehensive", action="store_true", help="Run comprehensive test")
    parser.add_argument("--basic", action="store_true", help="Run basic tests")
    parser.add_argument("--no-r2", action="store_true", help="Disable R2 upload (local only)")
    args = parser.parse_args()
    
    # Load configuration
    dev_vars = load_dev_vars()
    
    api_token = dev_vars.get("BROWSER_RENDERING_TOKEN") or os.getenv("CLOUDFLARE_API_TOKEN")
    account_id = dev_vars.get("CLOUDFLARE_ACCOUNT_ID") or os.getenv("CLOUDFLARE_ACCOUNT_ID")
    
    # Validate configuration
    if not api_token or not account_id:
        logger.error("❌ Missing required configuration: BROWSER_RENDERING_TOKEN and CLOUDFLARE_ACCOUNT_ID")
        return
    
    logger.info(f"📋 Account ID: {account_id}")
    logger.info(f"🔑 API Token: {api_token[:8]}...")
    
    # Initialize R2 uploader if not disabled
    r2_uploader = None
    if not args.no_r2:
        # Load worker config from .dev.vars first, then environment
        worker_config = load_worker_config()
        
        # Also try to load from dev_vars if available
        if not worker_config['worker_url']:
            worker_config['worker_url'] = dev_vars.get('WORKER_URL')
        if not worker_config['worker_api_key']:
            worker_config['worker_api_key'] = dev_vars.get('WORKER_API_KEY')
            
        if all(worker_config[key] for key in ['worker_url', 'worker_api_key']):
            try:
                r2_uploader = R2Uploader(
                    worker_url=worker_config['worker_url'],
                    worker_api_key=worker_config['worker_api_key']
                )
                logger.info("📦 R2 uploader initialized successfully")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize R2 uploader: {e}")
                logger.warning("Continuing with local-only mode...")
        else:
            logger.warning("⚠️ Worker configuration incomplete. Continuing with local-only mode...")
            logger.warning("Set WORKER_URL and WORKER_API_KEY for R2 upload via worker endpoint")
    else:
        logger.info("📁 Running in local-only mode (R2 upload disabled)")
    
    # Initialize client and enhanced asset manager
    client = CloudflareBrowserRenderingClient(api_token, account_id)
    asset_manager = EnhancedAssetManager("scripts/assets/browser-render", r2_uploader)
    
    # Run tests
    await run_tests_with_r2(
        client=client,
        asset_manager=asset_manager,
        linkedin_job_id=args.linkedin_job_id,
        run_basic=args.basic or (not args.linkedin_job_id and not args.comprehensive),
        run_comprehensive=args.comprehensive
    )

if __name__ == "__main__":
    asyncio.run(main())

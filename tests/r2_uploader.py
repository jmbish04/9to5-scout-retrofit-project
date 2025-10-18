#!/usr/bin/env python3
"""
R2 Bucket Upload Utility via Worker Endpoint
Uploads files from local assets directory to Cloudflare R2 bucket through worker API
"""

import os
import requests
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class R2Uploader:
    """Handles uploading files to Cloudflare R2 bucket via worker endpoint"""
    
    def __init__(self, worker_url: str, worker_api_key: str):
        self.worker_url = worker_url.rstrip('/')
        self.worker_api_key = worker_api_key
        self.upload_endpoint = f"{self.worker_url}/api/r2/upload"
        
        # Set up session with authentication
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {worker_api_key}',
            'User-Agent': 'BrowserRenderingTest/1.0'
        })
    
    def upload_file(self, local_file_path: str, r2_key: str) -> bool:
        """Upload a file to R2 bucket via worker endpoint"""
        try:
            # Determine content type based on file extension
            content_type = self._get_content_type(local_file_path)
            
            # Read file data
            with open(local_file_path, 'rb') as f:
                file_data = f.read()
            
            # Upload via worker endpoint
            response = self.session.post(
                self.upload_endpoint,
                params={'key': r2_key},
                data=file_data,
                headers={'Content-Type': content_type},
                timeout=30
            )
            
            if response.status_code == 201:
                result = response.json()
                logger.info(f"✅ Uploaded {local_file_path} to R2: {r2_key} (size: {result.get('size', 'unknown')} bytes)")
                return True
            else:
                logger.error(f"❌ Failed to upload {local_file_path}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to upload {local_file_path}: {e}")
            return False
    
    def _get_content_type(self, file_path: str) -> str:
        """Determine content type based on file extension"""
        path = Path(file_path)
        extension = path.suffix.lower()
        
        content_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.html': 'text/html',
            '.md': 'text/markdown',
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.xml': 'application/xml',
        }
        
        return content_types.get(extension, 'application/octet-stream')
    
    def upload_directory(self, local_dir: str, r2_prefix: str = "tests/assets/browser-render") -> int:
        """Upload all files from a directory to R2 bucket"""
        local_path = Path(local_dir)
        if not local_path.exists():
            logger.error(f"❌ Local directory does not exist: {local_dir}")
            return 0
        
        uploaded_count = 0
        
        for file_path in local_path.rglob('*'):
            if file_path.is_file():
                # Create R2 key with prefix
                relative_path = file_path.relative_to(local_path)
                r2_key = f"{r2_prefix}/{relative_path}"
                
                if self.upload_file(str(file_path), r2_key):
                    uploaded_count += 1
        
        logger.info(f"📦 Uploaded {uploaded_count} files to R2 bucket via worker")
        return uploaded_count
    
    def test_connection(self) -> bool:
        """Test connection to worker endpoint"""
        try:
            # Try to upload a small test file
            test_data = b"test"
            response = self.session.post(
                self.upload_endpoint,
                params={'key': 'test/connection-test.txt'},
                data=test_data,
                headers={'Content-Type': 'text/plain'},
                timeout=10
            )
            
            if response.status_code == 201:
                logger.info("✅ Worker endpoint connection test successful")
                return True
            else:
                logger.error(f"❌ Worker endpoint connection test failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Worker endpoint connection test failed: {e}")
            return False

def load_worker_config() -> dict:
    """Load worker configuration from environment variables"""
    return {
        'worker_url': os.getenv('WORKER_URL'),
        'worker_api_key': os.getenv('WORKER_API_KEY')
    }

def main():
    """Upload assets to R2 bucket via worker endpoint"""
    config = load_worker_config()
    
    # Validate configuration
    required_keys = ['worker_url', 'worker_api_key']
    missing_keys = [key for key in required_keys if not config[key]]
    
    if missing_keys:
        logger.error(f"❌ Missing worker configuration: {', '.join(missing_keys)}")
        logger.error("Please set the following environment variables:")
        logger.error("- WORKER_URL (e.g., https://your-worker.your-subdomain.workers.dev)")
        logger.error("- WORKER_API_KEY (API key for worker authentication)")
        return
    
    # Initialize uploader
    uploader = R2Uploader(
        worker_url=config['worker_url'],
        worker_api_key=config['worker_api_key']
    )
    
    # Test connection first
    if not uploader.test_connection():
        logger.error("❌ Failed to connect to worker endpoint. Check your configuration.")
        return
    
    # Upload assets
    local_assets_dir = "scripts/assets/browser-render"
    uploaded_count = uploader.upload_directory(local_assets_dir)
    
    if uploaded_count > 0:
        logger.info(f"🎉 Successfully uploaded {uploaded_count} files to R2 bucket via worker!")
    else:
        logger.warning("⚠️ No files were uploaded. Check the local assets directory.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    main()

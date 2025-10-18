#!/usr/bin/env python3
"""
Test R2 Upload via Worker Endpoint
Simple test script to verify the R2 upload functionality
"""

import os
import requests
import json
from pathlib import Path

def load_dev_vars():
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
        print("✅ Configuration loaded from .dev.vars")
    else:
        print("⚠️ .dev.vars file not found, using environment variables")
    
    return env_vars

def test_r2_upload():
    """Test R2 upload via worker endpoint"""
    # Load configuration
    dev_vars = load_dev_vars()
    
    worker_url = dev_vars.get("WORKER_URL") or os.getenv("WORKER_URL")
    worker_api_key = dev_vars.get("WORKER_API_KEY") or os.getenv("WORKER_API_KEY")
    
    if not worker_url or not worker_api_key:
        print("❌ Missing WORKER_URL or WORKER_API_KEY")
        return False
    
    print(f"🔗 Worker URL: {worker_url}")
    print(f"🔑 API Key: {worker_api_key[:8]}...")
    
    # Test data
    test_data = b"Hello, R2! This is a test upload from Python."
    test_key = "tests/browser-render/test-upload.txt"
    
    # Upload endpoint
    upload_url = f"{worker_url}/api/r2/upload"
    
    # Headers
    headers = {
        'Authorization': f'Bearer {worker_api_key}',
        'Content-Type': 'text/plain',
        'User-Agent': 'BrowserRenderingTest/1.0'
    }
    
    # Upload file
    print(f"📤 Uploading test file to: {upload_url}")
    print(f"📁 R2 Key: {test_key}")
    
    try:
        response = requests.post(
            upload_url,
            params={'key': test_key},
            data=test_data,
            headers=headers,
            timeout=30
        )
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📄 Response Body: {response.text}")
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Upload successful!")
            print(f"   Key: {result.get('key')}")
            print(f"   Size: {result.get('size')} bytes")
            print(f"   Message: {result.get('message')}")
            return True
        else:
            print(f"❌ Upload failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing R2 Upload via Worker Endpoint")
    print("=" * 50)
    
    success = test_r2_upload()
    
    print("=" * 50)
    if success:
        print("🎉 R2 upload test completed successfully!")
    else:
        print("💥 R2 upload test failed!")

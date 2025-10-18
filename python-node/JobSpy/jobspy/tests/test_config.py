#!/usr/bin/env python3
"""
Simple test to verify configuration is working properly.
"""

import os
import sys
from pathlib import Path

# Test environment variable loading
print("=" * 50)
print("Configuration Test")
print("=" * 50)

# Add the current directory to path to import demo
sys.path.insert(0, str(Path(__file__).parent))

try:
    import demo
    print("✅ Demo module imported successfully")

    print(f"\n📊 Configuration Values:")
    print(f"  Worker URL: {demo.WORKER_URL}")
    print(f"  API Key: {'Set' if demo.WORKER_API_KEY != 'your-api-key-here' else 'Not Set (placeholder)'}")
    print(f"  Model: {demo.DEFAULT_MODEL}")

    print(f"\n🧪 Environment Variables:")
    print(f"  WORKER_ENDPOINT_URI: {os.getenv('WORKER_ENDPOINT_URI', 'Not Set')}")
    print(f"  WORKER_API_KEY: {'Set' if os.getenv('WORKER_API_KEY') else 'Not Set'}")

    print(f"\n✅ Configuration test completed successfully!")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

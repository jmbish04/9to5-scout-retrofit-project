#!/usr/bin/env python3
"""
Test script to verify CloudflareAIDirect import works
"""
import sys
from pathlib import Path

try:
    from jobspy.cloudflare_ai.cloudflare_direct import CloudflareAIDirect
    print("✓ CloudflareAIDirect imported successfully")

    # Test creating an instance
    ai = CloudflareAIDirect()
    print(f"✓ CloudflareAIDirect instance created")
    print(f"  - Account ID: {ai.account_id}")
    print(f"  - API Token: {'set' if ai.api_token != 'your-api-token-here' else 'not set'}")

except Exception as e:
    print(f"✗ Error importing CloudflareAIDirect: {e}")
    import traceback
    traceback.print_exc()

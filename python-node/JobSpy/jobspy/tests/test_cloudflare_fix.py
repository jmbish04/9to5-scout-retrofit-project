#!/usr/bin/env python3
"""
Test script to verify the CloudFlare AI JSON parsing fixes.
"""

import json
from jobspy.cloudflare_ai import CloudflareAI

def test_json_fixing():
    """Test the JSON fixing methods with problematic JSON samples."""

    ai = CloudflareAI()

    # Test case 1: Incomplete JSON (truncated like in the log)
    incomplete_json = '''{
  "job_title": "Delivery Consultant- GenAI/ML & Data Science, Professional Services, AWS Industries",
  "job_description": "The Amazon Web Services Professional Services (ProServe) team is seeking a skilled Delivery Consultant...",
  "job_requirements": "Key job responsibilities: \\n- Designing, implementing, and building complex, scalable, and secure GenAI and ML applications and models built on AWS tailored to customer needs\\n- Providing technical guidance and implementation support throughout project delivery, with a focus on using AWS AI/ML services\\n- Collaborating with customer stakeholders to gather requirements and propose effective model training, building, and deployment strategies\\n- Acting as a trusted advisor to customers on industry trends and emerging technologies\\n- Sharing knowledge within the organization through'''

    # Test case 2: JSON with trailing comma
    json_with_comma = '''{
  "job_title": "Test Job",
  "job_description": "Test description",
  "job_requirements": "Test requirements",
}'''

    # Test case 3: JSON with unescaped newlines
    json_with_newlines = '''{
  "job_title": "Test Job",
  "job_description": "Test description\nWith newlines",
  "job_requirements": "Test requirements"
}'''

    schema = {
        "properties": {
            "job_title": {"type": "string"},
            "job_description": {"type": "string"},
            "job_requirements": {"type": "string"},
            "posted_date": {"type": "string"}
        }
    }

    print("🧪 Testing JSON fixing methods...")

    # Test 1: Incomplete JSON
    print("\n1️⃣ Testing incomplete JSON fix:")
    result1 = ai._extract_and_fix_json(incomplete_json, schema)
    if result1:
        print("   ✅ Successfully fixed incomplete JSON")
        print(f"   📄 Result keys: {list(result1.keys())}")
        print(f"   📝 Job title: {result1.get('job_title', 'N/A')[:50]}...")
    else:
        print("   ❌ Failed to fix incomplete JSON")

    # Test 2: Trailing comma
    print("\n2️⃣ Testing trailing comma fix:")
    result2 = ai._extract_and_fix_json(json_with_comma, schema)
    if result2:
        print("   ✅ Successfully fixed trailing comma JSON")
        print(f"   📄 Result keys: {list(result2.keys())}")
    else:
        print("   ❌ Failed to fix trailing comma JSON")

    # Test 3: Newlines
    print("\n3️⃣ Testing newline escaping:")
    result3 = ai._extract_and_fix_json(json_with_newlines, schema)
    if result3:
        print("   ✅ Successfully handled newlines in JSON")
        print(f"   📄 Result keys: {list(result3.keys())}")
    else:
        print("   ❌ Failed to handle newlines in JSON")

    print("\n🎯 Test Summary:")
    tests_passed = sum([1 for r in [result1, result2, result3] if r is not None])
    print(f"   Passed: {tests_passed}/3 tests")

    return tests_passed == 3

if __name__ == "__main__":
    success = test_json_fixing()
    if success:
        print("\n🎉 All JSON fixing tests passed!")
    else:
        print("\n⚠️  Some JSON fixing tests failed.")

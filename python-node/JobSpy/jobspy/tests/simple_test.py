#!/usr/bin/env python3
"""
Simple test to validate JSON parsing fixes for the specific error from the log.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

# Import the CloudflareAI class
from jobspy.cloudflare_ai import CloudflareAI

def test_specific_log_error():
    """Test the specific JSON parsing error from the log."""

    print("🧪 Testing CloudFlare AI JSON parsing fixes...")

    # The exact problematic JSON from the log
    problematic_json = '''{
  "job_title": "Delivery Consultant- GenAI/ML & Data Science, Professional Services, AWS Industries",
  "job_description": "The Amazon Web Services Professional Services (ProServe) team is seeking a skilled Delivery Consultant to join our team at Amazon Web Services (AWS). In this role, you'll work closely with customers to design, implement, and manage AWS solutions that meet their technical requirements and business objectives. You'll be a key player in driving customer success through their cloud journey, providing technical expertise and best practices throughout the project lifecycle. Possessing a deep understanding of AWS products and services, as a Delivery Consultant you will be proficient in architecting complex, scalable, and secure solutions tailored to meet the specific needs of each customer.",
  "job_requirements": "Key job responsibilities: \\n- Designing, implementing, and building complex, scalable, and secure GenAI and ML applications and models built on AWS tailored to customer needs\\n- Providing technical guidance and implementation support throughout project delivery, with a focus on using AWS AI/ML services\\n- Collaborating with customer stakeholders to gather requirements and propose effective model training, building, and deployment strategies\\n- Acting as a trusted advisor to customers on industry trends and emerging technologies\\n- Sharing knowledge within the organization through'''

    # Simple schema for testing
    test_schema = {
        "properties": {
            "job_title": {"type": "string"},
            "job_description": {"type": "string"},
            "job_requirements": {"type": "string"},
            "posted_date": {"type": "string"}
        }
    }

    # Create CloudflareAI instance
    ai = CloudflareAI()

    print("📝 Testing with problematic JSON from log...")
    print(f"   Length: {len(problematic_json)} characters")
    print(f"   Ends with: '{problematic_json[-50:]}'")

    # Test our JSON fixing method
    try:
        result = ai._extract_and_fix_json(problematic_json, test_schema)

        if result:
            print("   ✅ Successfully parsed and fixed JSON!")
            print(f"   📊 Extracted {len(result)} fields:")
            for key, value in result.items():
                if isinstance(value, str) and len(value) > 100:
                    print(f"     - {key}: {value[:50]}... ({len(value)} chars)")
                else:
                    print(f"     - {key}: {value}")
            return True
        else:
            print("   ❌ Failed to parse JSON")
            return False

    except Exception as e:
        print(f"   ❌ Exception occurred: {e}")
        return False

def test_json_completion():
    """Test the JSON completion method specifically."""

    print("\n🔧 Testing JSON completion method...")

    incomplete_json = '''{
  "job_title": "Test Job",
  "job_description": "Test description",
  "job_requirements": "Key responsibilities: \\n- Task 1\\n- Task 2\\n- Incomplete task'''

    schema = {
        "properties": {
            "job_title": {"type": "string"},
            "job_description": {"type": "string"},
            "job_requirements": {"type": "string"}
        }
    }

    ai = CloudflareAI()

    try:
        completed_json = ai._attempt_json_completion(incomplete_json, schema)
        print(f"   📝 Completed JSON: {completed_json}")

        # Try to parse the completed JSON
        import json
        parsed = json.loads(completed_json)
        print(f"   ✅ Successfully completed and parsed JSON with {len(parsed)} fields")
        return True

    except Exception as e:
        print(f"   ❌ JSON completion failed: {e}")
        return False

if __name__ == "__main__":
    print("🎯 CloudFlare AI JSON Parsing Fix Test\n")

    success1 = test_specific_log_error()
    success2 = test_json_completion()

    print(f"\n📊 Results:")
    print(f"   Specific log error: {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"   JSON completion: {'✅ PASS' if success2 else '❌ FAIL'}")

    if success1 and success2:
        print("\n🎉 All tests passed! The CloudFlare AI JSON parsing should now work correctly.")
    else:
        print("\n⚠️  Some tests failed. Additional debugging may be needed.")

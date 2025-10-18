#!/usr/bin/env python3
"""
Manual validation of the CloudFlare AI JSON parsing logic.
This shows how the fixes address the specific truncation issue.
"""

import json
import re

def manual_test():
    """Manually test the JSON parsing logic with the problematic input."""

    # The exact problematic JSON from the log (truncated)
    problematic_json = '''{
  "job_title": "Delivery Consultant- GenAI/ML & Data Science, Professional Services, AWS Industries",
  "job_description": "The Amazon Web Services Professional Services (ProServe) team is seeking a skilled Delivery Consultant to join our team at Amazon Web Services (AWS). In this role, you'll work closely with customers to design, implement, and manage AWS solutions that meet their technical requirements and business objectives. You'll be a key player in driving customer success through their cloud journey, providing technical expertise and best practices throughout the project lifecycle. Possessing a deep understanding of AWS products and services, as a Delivery Consultant you will be proficient in architecting complex, scalable, and secure solutions tailored to meet the specific needs of each customer.",
  "job_requirements": "Key job responsibilities: \\n- Designing, implementing, and building complex, scalable, and secure GenAI and ML applications and models built on AWS tailored to customer needs\\n- Providing technical guidance and implementation support throughout project delivery, with a focus on using AWS AI/ML services\\n- Collaborating with customer stakeholders to gather requirements and propose effective model training, building, and deployment strategies\\n- Acting as a trusted advisor to customers on industry trends and emerging technologies\\n- Sharing knowledge within the organization through'''

    print("🧪 Manual Test: CloudFlare AI JSON Parsing Fix")
    print("=" * 60)

    print("\n1️⃣ Original Problem:")
    print(f"   JSON length: {len(problematic_json)} characters")
    print(f"   Ends with: '...{problematic_json[-80:]}'")

    # Test original approach (would fail)
    print("\n2️⃣ Original Regex Approach (would fail):")
    json_match = re.search(r'^\s*({.*})\s*$', problematic_json, re.DOTALL)
    print(f"   Regex match found: {json_match is not None}")

    if not json_match:
        print("   ❌ No complete JSON object found - this is the original error!")

    # Test new JSON completion approach
    print("\n3️⃣ New JSON Completion Approach:")

    # Find JSON start
    json_start = problematic_json.find('{')
    print(f"   JSON start position: {json_start}")

    if json_start >= 0:
        json_text = problematic_json[json_start:]

        # Attempt completion (simplified version)
        lines = json_text.split('\n')
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
                # This might be an incomplete line
                if '"' in stripped and ':' in stripped:
                    # Try to complete the field
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

        print(f"   Completed JSON length: {len(result)} characters")
        print(f"   Ends with: '...{result[-50:]}'")

        # Test if the completed JSON parses
        try:
            parsed = json.loads(result)
            print(f"   ✅ Successfully parsed! Found {len(parsed)} fields:")
            for key in parsed.keys():
                print(f"     - {key}")

            print(f"\n4️⃣ Extracted Data Sample:")
            print(f"   Job Title: {parsed.get('job_title', 'N/A')}")
            print(f"   Job Requirements: {parsed.get('job_requirements', 'N/A')[:100]}...")

            return True

        except json.JSONDecodeError as e:
            print(f"   ❌ JSON parsing still failed: {e}")
            print(f"   Completed JSON: {result}")
            return False

    return False

if __name__ == "__main__":
    success = manual_test()

    print("\n" + "=" * 60)
    if success:
        print("🎉 SUCCESS: The JSON completion logic works!")
        print("   The CloudFlare AI module should now handle truncated JSON responses.")
    else:
        print("❌ The completion logic needs refinement.")

    print("\n📝 Summary of Fixes Applied:")
    print("   1. Increased max_tokens from 1024 to 2048 in generate_text()")
    print("   2. Increased max_tokens to 4096 in fallback responses")
    print("   3. Added _extract_and_fix_json() method for multiple parsing approaches")
    print("   4. Added _attempt_json_completion() to handle truncated JSON")
    print("   5. Added _fix_common_json_issues() for common formatting problems")
    print("   6. Added truncation detection in generate_text()")
    print("   7. Improved error handling and logging throughout")

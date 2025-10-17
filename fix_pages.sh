#!/bin/bash

# List of pages to fix (excluding index.html which is already fixed)
pages=(
    "public/agent-workflow-config.html"
    "public/browser-testing.html"
    "public/email-integration.html"
    "public/full-transparency.html"
    "public/inbox.html"
    "public/job-history-management.html"
    "public/prd.html"
)

# Fix each page
for page in "${pages[@]}"; do
    echo "Fixing $page..."
    
    # Add Tailwind CSS CDN after the title tag
    sed -i '' 's|<title>\([^<]*\)</title>|<title>\1</title>\n    <script src="https://cdn.tailwindcss.com"></script>|' "$page"
    
    # Check if nav.js script exists, if not add it before closing body tag
    if ! grep -q "nav.js" "$page"; then
        sed -i '' 's|</body>|    <script type="module" src="/js/nav.js"></script>\n</body>|' "$page"
    fi
    
    echo "Fixed $page"
done

echo "All pages fixed!"


import json
from bs4 import BeautifulSoup
from markdownify import markdownify as md

def extract_json_data(url, html_content):
    """
    Extracts structured job data from HTML content.
    - Prioritizes JSON-LD schemas.
    - Falls back to meta tags and semantic selectors.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # --- JSON-LD Extraction ---
    raw_jsonld = []
    detected_schema_org = {}
    json_ld_scripts = soup.find_all('script', type='application/ld+json')
    for script in json_ld_scripts:
        try:
            data = json.loads(script.string)
            raw_jsonld.append(data)
            if isinstance(data, list):
                for item in data:
                    if item.get('@type') == 'JobPosting':
                        detected_schema_org.update(item)
            elif data.get('@type') == 'JobPosting':
                detected_schema_org.update(data)
        except json.JSONDecodeError:
            continue

    # --- Meta/OG Tag Extraction ---
    meta = {
        'canonical': soup.find('link', rel='canonical')['href'] if soup.find('link', rel='canonical') else None,
        'robots': soup.find('meta', attrs={'name': 'robots'})['content'] if soup.find('meta', attrs={'name': 'robots'}) else None,
        'description': soup.find('meta', attrs={'name': 'description'})['content'] if soup.find('meta', attrs={'name': 'description'}) else None,
    }
    og = {
        tag.get('property')[3:]: tag.get('content')
        for tag in soup.find_all('meta', property=lambda x: x and x.startswith('og:'))
    }

    # --- Heuristic Extraction ---
    title = detected_schema_org.get('title') or og.get('title') or soup.title.string
    company = detected_schema_org.get('hiringOrganization', {}).get('name')
    
    # Simple text-based heuristics
    body_text = soup.get_text().lower()
    work_model = "remote" if "remote" in body_text else "hybrid" if "hybrid" in body_text else "onsite" if "onsite" in body_text else "unknown"
    
    # Find apply URL
    apply_url = None
    apply_keywords = ['apply', 'submit', 'careers', 'workday', 'greenhouse', 'lever', 'smartrecruiters']
    for a in soup.find_all('a', href=True):
        if any(keyword in a.text.lower() for keyword in apply_keywords) or \
           any(keyword in a['href'] for keyword in apply_keywords):
            apply_url = a['href']
            break

    # --- Assemble Final JSON ---
    normalized_data = {
        "url": url,
        "final_url": og.get('url', url),
        "title": title,
        "company": company,
        "location": detected_schema_org.get('jobLocation', {}).get('address', {}).get('addressLocality'),
        "work_model": work_model,
        "employment_type": detected_schema_org.get('employmentType', 'unknown'),
        "posted_at": detected_schema_org.get('datePosted'),
        "compensation": detected_schema_org.get('baseSalary', {}).get('value', {}),
        "description_html": str(soup.find('main')) or str(soup.find('article')) or str(soup.body),
        "description_text": soup.find('main').get_text(separator=' ', strip=True) if soup.find('main') else soup.body.get_text(separator=' ', strip=True),
        "apply_url": apply_url,
        "source": "linkedin" if "linkedin.com" in url else "indeed" if "indeed.com" in url else "google_search" if "google.com" in url else "company",
        "detected_schema_org": detected_schema_org,
        "raw_jsonld": raw_jsonld,
        "og": og,
        "meta": meta
    }
    
    return normalized_data

def extract_markdown(url, html_content):
    """Converts the main content of an HTML page to Markdown."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find the main content area
    main_content = soup.find('main') or soup.find('article') or soup.find(role='main') or soup.body
    
    # Convert to Markdown
    markdown_text = md(str(main_content), heading_style="ATX")
    
    title = soup.title.string or "No Title"
    
    return f"# {title}\n\n**Source URL:** {url}\n\n---\n\n{markdown_text}"

def extract_snapshot_data(url, html_content):
    """Extracts debugging and metadata information from the page."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Meta/OG Tags
    meta = {
        'canonical': soup.find('link', rel='canonical')['href'] if soup.find('link', rel='canonical') else None,
        'description': soup.find('meta', attrs={'name': 'description'})['content'] if soup.find('meta', attrs={'name': 'description'}) else None,
    }
    og = {
        tag.get('property')[3:]: tag.get('content')
        for tag in soup.find_all('meta', property=lambda x: x and x.startswith('og:'))
    }
    
    # Links
    all_links = sorted(list(set([a['href'] for a in soup.find_all('a', href=True)])))
    
    # Scripts and Styles
    scripts = sorted(list(set([s['src'] for s in soup.find_all('script', src=True)])))
    styles = sorted(list(set([l['href'] for l in soup.find_all('link', rel='stylesheet', href=True)])))

    return {
        "url": url,
        "title": soup.title.string,
        "meta": meta,
        "og": og,
        "links": all_links,
        "external_scripts": scripts,
        "external_styles": styles
    }

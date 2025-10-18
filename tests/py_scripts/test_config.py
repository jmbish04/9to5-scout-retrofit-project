import os
import logging

def get_delivered_assets_path(service_name: str) -> str:
    """
    Ensures a directory for a specific service exists within 'tests/delivered_assets/'
    and returns the absolute path to it.
    """
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    assets_dir = os.path.join(project_root, 'tests', 'delivered_assets', service_name)
    os.makedirs(assets_dir, exist_ok=True)
    return assets_dir

def setup_service_logger(service_name: str):
    """
    Configures a logger for a specific service.

    - Creates a log file at /tests/py_scripts/logs/{service_name}.log
    - Overwrites the log file on each run.
    - Returns the logger instance and the log file path.
    """
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    log_dir = os.path.join(project_root, 'tests', 'py_scripts', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    log_file_path = os.path.join(log_dir, f"{service_name}.log")

    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)

    if logger.hasHandlers():
        logger.handlers.clear()

    handler = logging.FileHandler(log_file_path, mode='w')
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    return logger, log_file_path

def load_dev_vars():
    """
    Loads variables from the .dev.vars file at the project root
    and returns them as a dictionary.
    """
    creds = {}
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dev_vars_path = os.path.join(project_root, '.dev.vars')

    try:
        with open(dev_vars_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                if '#' in line:
                    line = line.split('#', 1)[0].strip()

                key, sep, value = line.partition('=')
                if not sep:
                    continue
                
                key = key.strip()
                value = value.strip()
                
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                
                creds[key] = value
    except FileNotFoundError:
        print(f"Error: .dev.vars file not found at {dev_vars_path}")
        return {}
        
    return creds

# Load all variables from .dev.vars
_VARS = load_dev_vars()

# --- Publicly Exposed Config Variables ---
CLOUDFLARE_ACCOUNT_ID = _VARS.get('CLOUDFLARE_ACCOUNT_ID')
BROWSER_RENDERING_TOKEN = _VARS.get('BROWSER_RENDERING_TOKEN') or _VARS.get('CLOUDFLARE_API_TOKEN')
WORKER_API_KEY = _VARS.get('WORKER_API_KEY')
WORKER_URL = _VARS.get('WORKER_URL')
BUCKET_BASE_URL = _VARS.get('BUCKET_BASE_URL')
STEEL_API_KEY = _VARS.get('STEEL_API_KEY')
LINKEDIN_USERNAME = _VARS.get('LINKEDIN_USERNAME')
LINKEDIN_PASSWORD = _VARS.get('LINKEDIN_PASSWORD')
LOCAL_SCRAPER_URL = _VARS.get('LOCAL_SCRAPER_URL')
LOCAL_SCRAPER_API_KEY = _VARS.get('LOCAL_SCRAPER_API_KEY')
EMAIL_ROUTING_DOMAIN = _VARS.get('EMAIL_ROUTING_DOMAIN')
NOTIFICATION_EMAIL_ADDRESS = _VARS.get('NOTIFICATION_EMAIL_ADDRESS')
GITHUB_REPO = _VARS.get('GITHUB_REPO')
SERPAPI_API_KEY = _VARS.get('SERPAPI_API_KEY')

# --- Job Search Preferences ---
JOB_PREFERENCE_KEYWORDS = [
    "legal tech", "e-discovery", "litigation technology", "enterprise matter management",
    "information governance", "product operations", "program manager", "strategic operations",
    "solutions architect legal", "AI developer tooling", "LLM platform", "agent frameworks",
    "Cloudflare Workers", "data pipelines", "metrics & dashboards",
    "state government digital services", "public sector modernization"
]
JOB_PREFERENCE_LOCATIONS = [
    "California", "San Francisco Bay Area", "Remote", "New York, NY", "Austin, TX"
]

if not CLOUDFLARE_ACCOUNT_ID or not BROWSER_RENDERING_TOKEN:
    print("Warning: Essential Cloudflare credentials are missing from .dev.vars.")
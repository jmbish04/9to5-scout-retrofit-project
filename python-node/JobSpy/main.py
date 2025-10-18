# main.py
import os
import asyncio
import logging
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, Depends, HTTPException, Security, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from jobspy import scrape_jobs
import pandas as pd
import numpy as np

# --- Logging Setup ---
# Get the root logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# Remove existing handlers to avoid duplicates
for handler in logger.handlers:
    logger.removeHandler(handler)

# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# --- Custom Logging Handler for WebSocket ---
class WebSocketLogHandler(logging.Handler):
    def emit(self, record):
        log_entry = self.format(record)
        asyncio.create_task(manager.broadcast(log_entry))

# Add the custom handler to the root logger
ws_handler = WebSocketLogHandler()
ws_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(ws_handler)
# Also add a standard stream handler for console logging
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(stream_handler)


# --- Configuration ---
API_KEY = os.getenv("PYTHON_SCRAPER_API_KEY", "your_secret_api_key")
API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

app = FastAPI(
    title="JobSpy Scraper API",
    description="An API to trigger job scrapes using the JobSpy library, with real-time logging via WebSocket.",
    version="1.0.0",
)

# --- Security ---
async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key == API_KEY:
        return api_key
    else:
        raise HTTPException(
            status_code=403,
            detail="Could not validate credentials",
        )

# --- Pydantic Models for Request Body ---
class ScrapeRequest(BaseModel):
    site_name: List[str]
    search_term: str
    location: Optional[str] = None
    results_wanted: int = 20
    hours_old: Optional[int] = None
    country_indeed: Optional[str] = 'USA'
    linkedin_fetch_description: bool = False

# --- API Endpoints ---
@app.get("/")
async def get_frontend():
    return FileResponse('jobspy/ui/index.html')

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/scrape", dependencies=[Depends(get_api_key)])
async def run_scrape(request: ScrapeRequest):
    """
    Run a job scrape with the specified parameters and return the results.
    """
    logging.info(f"Received scrape request for sites: {request.site_name}, search: '{request.search_term}'")
    try:
        jobs_df = scrape_jobs(
            site_name=request.site_name,
            search_term=request.search_term,
            location=request.location,
            results_wanted=request.results_wanted,
            hours_old=request.hours_old,
            country_indeed=request.country_indeed,
            linkedin_fetch_description=request.linkedin_fetch_description,
        )

        if jobs_df is None or jobs_df.empty:
            logging.info("Scrape completed, but no jobs were found.")
            return {"status": "success", "message": "No jobs found.", "count": 0, "jobs": []}

        jobs_df = jobs_df.replace({pd.NA: None, np.nan: None})
        jobs_json = jobs_df.to_dict(orient='records')
        
        logging.info(f"Successfully scraped {len(jobs_json)} jobs.")
        return {
            "status": "success",
            "message": f"Found {len(jobs_json)} jobs.",
            "count": len(jobs_json),
            "jobs": jobs_json
        }
    except Exception as e:
        logging.error(f"An error occurred during scraping: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Main Execution ---
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8002))
    reload = os.getenv("RELOAD", "True").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
    )

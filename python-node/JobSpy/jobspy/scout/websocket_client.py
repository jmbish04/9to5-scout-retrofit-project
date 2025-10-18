import json
import os
import threading
import time
import websocket

# Include a default client identifier so the worker can track Python connections
WS_URL = os.environ.get("WS_URL", "wss://9to5-scout.hacolby.workers.dev/ws?client=python")
API_TOKEN = os.environ.get("API_TOKEN")


def send_scraped_data(ws: websocket.WebSocketApp, url: str, html: str):
    """Send scraped HTML content to the worker for processing."""
    payload = {
        "action": "process_scraped_data",
        "data": {
            "url": url,
            "html": html
        }
    }
    try:
        ws.send(json.dumps(payload))
        print(f"Sent scraped data for {url}")
    except Exception as e:
        print(f"Failed to send scraped data for {url}: {e}")


def on_message(ws: websocket.WebSocketApp, message: str):
    """Handle incoming WebSocket messages."""
    if message == "pong":
        return
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        print("Received non-JSON message:", message)
        return
    if data.get("type") == "pong":
        return
    print("Received:", data)
    if data.get("action") == "scrape" and data.get("url"):
        # Placeholder for real scraping logic
        url_to_scrape = data['url']
        print(f"Received scrape request for URL: {url_to_scrape}")
        # In a real implementation, you would scrape the URL here.
        # For demonstration, we'll send back some dummy HTML.
        dummy_html = f"<html><head><title>Job Page: {url_to_scrape}</title></head><body><h1>Job Title</h1></body></html>"
        send_scraped_data(ws, url_to_scrape, dummy_html)


def on_error(ws: websocket.WebSocketApp, error: Exception):
    print("WebSocket error:", error)


def on_close(ws: websocket.WebSocketApp, close_status_code, close_msg):
    print(f"Connection closed with status {close_status_code}: {close_msg}. Will attempt to reconnect.")


def on_open(ws: websocket.WebSocketApp):
    print("Connected to worker")

    def send_heartbeat():
        while True:
            try:
                ws.send("ping")
            except Exception:
                break
            time.sleep(30)

    threading.Thread(target=send_heartbeat, daemon=True).start()


def connect():
    headers = []
    if API_TOKEN:
        headers.append(f"Authorization: Bearer {API_TOKEN}")
    ws = websocket.WebSocketApp(
        WS_URL,
        header=headers,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )
    ws.run_forever(reconnect=5)  # Reconnect every 5 seconds

if __name__ == "__main__":
    connect()

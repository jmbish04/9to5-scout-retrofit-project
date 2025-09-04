import json
import os
import time
import websocket

WS_URL = os.environ.get("WS_URL", "wss://example.com/ws")
API_TOKEN = os.environ.get("API_TOKEN")


def on_message(ws: websocket.WebSocketApp, message: str):
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        print("Received non-JSON message:", message)
        return
    print("Received:", data)
    if data.get("action") == "scrape" and data.get("url"):
        # Placeholder for real scraping logic
        print(f"Would scrape URL: {data['url']}")


def on_error(ws: websocket.WebSocketApp, error: Exception):
    print("WebSocket error:", error)


def on_close(ws: websocket.WebSocketApp, close_status_code, close_msg):
    print("Connection closed, retrying in 5 seconds...", close_status_code, close_msg)
    time.sleep(5)
    connect()


def on_open(ws: websocket.WebSocketApp):
    print("Connected to worker")


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
    ws.run_forever()


if __name__ == "__main__":
    connect()

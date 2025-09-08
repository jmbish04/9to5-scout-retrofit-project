#!/bin/bash
set -e

python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

echo "Installation complete. Run 'source .venv/bin/activate && python client.py' to start the client."

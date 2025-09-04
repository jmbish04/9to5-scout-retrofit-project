#!/bin/bash
set -e

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "Installation complete. Run 'source .venv/bin/activate && python client.py' to start the client."

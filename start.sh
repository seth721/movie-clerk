#!/bin/bash
export PATH="/tmp/node-v20.11.0-darwin-arm64/bin:$PATH"
cd "$(dirname "$0")"
npm run dev

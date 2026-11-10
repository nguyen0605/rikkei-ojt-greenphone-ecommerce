#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$DIR/../scripts/run-backend.sh"
exec "$DIR/../scripts/run-backend.sh"

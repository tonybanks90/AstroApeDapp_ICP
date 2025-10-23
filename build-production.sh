#!/bin/bash

# Kill any running node processes to free memory
pkill -f node || true

# Clear system cache (Linux)
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# Build with maximum memory and reduced parallelism
cd src/AstroApe_frontend
NODE_OPTIONS='--max-old-space-size=14336 --max-semi-space-size=128' \
UV_THREADPOOL_SIZE=4 \
npm run build

cd ../..
echo "Build complete. Now deploy with: dfx deploy AstroApe_frontend --network ic"
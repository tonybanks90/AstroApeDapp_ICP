#!/bin/bash
WASM_PATH="/mnt/c/Users/user/Desktop/Astro/AstroApeDapp_ICP/AstroApeDapp_ICP/icrc1_ledger.wasm.gz"
WASM_HEX=$(hexdump -ve '1/1 "%02x"' "$WASM_PATH")
dfx deploy TokenFactory --argument "(blob \"$WASM_HEX\")"


export * from '../node_modules/@dfinity/candid/lib/esm/index.js';

// Polyfill missing uint8Equals function
export const uint8Equals = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.byteLength !== b.byteLength) return false;
    a = new Uint8Array(a);
    b = new Uint8Array(b);
    for (let i = 0; i < a.byteLength; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

// Polyfill missing uint8FromBufLike function
export const uint8FromBufLike = (buf) => {
    if (buf instanceof Uint8Array) {
        return buf;
    }
    if (ArrayBuffer.isView(buf)) {
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    if (buf instanceof ArrayBuffer) {
        return new Uint8Array(buf);
    }
    // Handle array-like or fallback
    return new Uint8Array(buf);
};

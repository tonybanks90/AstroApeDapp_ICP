
import * as Agent from '../node_modules/@dfinity/agent/lib/esm/index.js';

export * from '../node_modules/@dfinity/agent/lib/esm/index.js';

// Polyfill missing constant
export const IC_REQUEST_AUTH_DELEGATION_DOMAIN_SEPARATOR = new Uint8Array([
    105, 99, 45, 114, 101, 113, 117, 101, 115, 116, 45, 97, 117, 116, 104, 45, 100, 101, 108, 101, 103, 97, 116, 105, 111, 110,
]);

// Polyfill missing IC_REQUEST_DOMAIN_SEPARATOR
// 'ic-request'
export const IC_REQUEST_DOMAIN_SEPARATOR = new Uint8Array([
    105, 99, 45, 114, 101, 113, 117, 101, 115, 116,
]);

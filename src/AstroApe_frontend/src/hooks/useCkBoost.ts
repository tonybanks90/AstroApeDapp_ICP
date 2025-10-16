import { ckTESTBTCClient } from '@ckboost/client';

// Initialize client (ckTESTBTC is always testnet)
const client = new ckTESTBTCClient({
  host: 'https://icp-api.io'  // Optional: defaults to this
});

// Generate a deposit address for boost request
const result = await client.generateDepositAddress({
  amount: '0.01',           // 0.01 ckTESTBTC
  maxFeePercentage: 1.5,    // 1.5% maximum fee
  confirmationsRequired: 2   // Optional: override default confirmations
});

if (result.success) {
  const { requestId, address, amountRaw } = result.data;
  console.log(`Send ${amountRaw} satoshis to ${address}`);
  console.log(`Request ID: ${requestId}`);
} else {
  console.error('Error:', result.error.message);
}

// Check boost request status
const statusResult = await client.getBoostRequest('123');
if (statusResult.success) {
  const request = statusResult.data;
  console.log(`Status: ${request.status}`);
  console.log(`Received: ${request.receivedAmount} ckTESTBTC`);
}
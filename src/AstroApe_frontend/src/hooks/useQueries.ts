import { useQuery } from '@tanstack/react-query';
import { Principal } from '@dfinity/principal';
import { useSiweIdentity } from "ic-use-siwe-identity";


// Cryptocurrency balance queries with real API calls (removed ICP)
const LEDGER_CANISTER_IDS = {
  ckBTC: 'mxzaz-hqaaa-aaaar-qaada-cai',
  ckETH: 'ss2fx-dyaaa-aaaar-qacoq-cai',
  ckTESTBTC: 'mc6ru-gyaaa-aaaar-qaaaq-cai',
  cksepoliaETH: 'apia6-jaaaa-aaaar-qabma-cai',
};

interface ICRCAccount {
  owner: Principal;
  subaccount: [] | [Uint8Array];
}

interface CryptoBalance {
  balance: number;
  error?: string;
}

interface CryptoBalances {
  ckBTC: CryptoBalance;
  ckETH: CryptoBalance;
  ckTESTBTC: CryptoBalance;
  cksepoliaETH: CryptoBalance;
}

async function fetchTokenBalance(
  tokenName: string,
  canisterId: string, 
  account: ICRCAccount
): Promise<CryptoBalance> {
  console.log(`[${tokenName}] Starting balance fetch for canister: ${canisterId}, principal: ${account.owner.toString()}`);
  
  try {
    const agent = new (await import('@dfinity/agent')).HttpAgent({
      host: 'https://ic0.app',
    });

    console.log(`[${tokenName}] Created HTTP agent for IC network`);

    const actor = await import('@dfinity/agent').then(({ Actor }) =>
      Actor.createActor(
        ({ IDL }) => {
          return IDL.Service({
            icrc1_balance_of: IDL.Func([
              IDL.Record({
                owner: IDL.Principal,
                subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
              }),
            ], [IDL.Nat], ['query']),
            icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
          });
        },
        {
          agent,
          canisterId,
        }
      )
    );

    console.log(`[${tokenName}] Created actor for canister interaction`);

    const accountParam = {
      owner: account.owner,
      subaccount: account.subaccount.length > 0 ? [account.subaccount[0]] : [],
    };

    console.log(`[${tokenName}] Account parameter:`, {
      owner: accountParam.owner.toString(),
      subaccount: accountParam.subaccount.length > 0 ? 'provided' : 'empty array',
    });

    const [balance, decimals] = await Promise.all([
      (actor as any).icrc1_balance_of(accountParam),
      (actor as any).icrc1_decimals(),
    ]);

    console.log(`[${tokenName}] Raw balance: ${balance}, decimals: ${decimals}`);

    const balanceNumber = Number(balance) / Math.pow(10, Number(decimals));
    
    console.log(`[${tokenName}] Converted balance: ${balanceNumber}`);
    
    return { balance: balanceNumber };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${tokenName}] Failed to fetch balance for canister ${canisterId}:`, error);
    
    return { 
      balance: 0, 
      error: `Failed to fetch ${tokenName} balance: ${errorMessage}` 
    };
  }
}

export function useCryptoBalances(principalId: string) {
  return useQuery<CryptoBalances>({
    queryKey: ['cryptoBalances', principalId],
    queryFn: async () => {
      if (!principalId) {
        throw new Error('Principal ID is required');
      }

      let principal: Principal;
      try {
        principal = Principal.fromText(principalId);
      } catch {
        throw new Error(`Invalid principal ID: ${principalId}`);
      }

      const account: ICRCAccount = { 
        owner: principal, 
        subaccount: [] 
      };

      const [ckBTC, ckETH, ckTESTBTC, cksepoliaETH] = await Promise.allSettled([
        fetchTokenBalance('ckBTC', LEDGER_CANISTER_IDS.ckBTC, account),
        fetchTokenBalance('ckETH', LEDGER_CANISTER_IDS.ckETH, account),
        fetchTokenBalance('ckTESTBTC', LEDGER_CANISTER_IDS.ckTESTBTC, account),
        fetchTokenBalance('cksepoliaETH', LEDGER_CANISTER_IDS.cksepoliaETH, account),
      ]);

      const results: CryptoBalances = {
        ckBTC: ckBTC.status === 'fulfilled' ? ckBTC.value : { balance: 0, error: 'Failed to fetch ckBTC balance' },
        ckETH: ckETH.status === 'fulfilled' ? ckETH.value : { balance: 0, error: 'Failed to fetch ckETH balance' },
        ckTESTBTC: ckTESTBTC.status === 'fulfilled' ? ckTESTBTC.value : { balance: 0, error: 'Failed to fetch ckTESTBTC balance' },
        cksepoliaETH: cksepoliaETH.status === 'fulfilled' ? cksepoliaETH.value : { balance: 0, error: 'Failed to fetch cksepoliaETH balance' },
      };

      return results;
    },
    enabled: !!principalId,
    staleTime: 30 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Custom ICRC-2 token balance and metadata query
interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

interface CustomTokenBalance {
  balance: number;
  rawBalance: string;
  decimals: number;
}

interface CustomTokenData {
  metadata: TokenMetadata;
  balance: CustomTokenBalance;
}

export function useCustomTokenBalance(principalId: string, canisterId: string) {
  return useQuery<CustomTokenData>({
    queryKey: ['customTokenBalance', principalId, canisterId],
    queryFn: async () => {
      if (!principalId || !canisterId) {
        throw new Error('Principal ID and canister ID are required');
      }

      const principal = Principal.fromText(principalId);

      const agent = new (await import('@dfinity/agent')).HttpAgent({
        host: 'https://ic0.app',
      });

      const actor = await import('@dfinity/agent').then(({ Actor }) =>
        Actor.createActor(
          ({ IDL }) => {
            return IDL.Service({
              icrc1_balance_of: IDL.Func([
                IDL.Record({
                  owner: IDL.Principal,
                  subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
                }),
              ], [IDL.Nat], ['query']),
              icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
              icrc1_name: IDL.Func([], [IDL.Text], ['query']),
              icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
            });
          },
          { agent, canisterId }
        )
      );

      const account = { owner: principal, subaccount: [] };

      const [balance, decimals, name, symbol] = await Promise.all([
        (actor as any).icrc1_balance_of(account),
        (actor as any).icrc1_decimals(),
        (actor as any).icrc1_name(),
        (actor as any).icrc1_symbol(),
      ]);

      const balanceNumber = Number(balance) / Math.pow(10, Number(decimals));
      
      return {
        metadata: { name, symbol, decimals: Number(decimals) },
        balance: {
          balance: balanceNumber,
          rawBalance: balance.toString(),
          decimals: Number(decimals),
        },
      };
    },
    enabled: !!principalId && !!canisterId,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

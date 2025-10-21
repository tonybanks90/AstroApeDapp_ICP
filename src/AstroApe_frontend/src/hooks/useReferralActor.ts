import { useEffect, useState } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { useSiweIdentity } from 'ic-use-siwe-identity';
import { idlFactory } from '../../../declarations/Referral/Referral.did.js';
import type { _SERVICE } from '../../../declarations/Referral/Referral.did.js';

const REFERRAL_CANISTER_ID = process.env.CANISTER_ID_REFERRAL || 'your-canister-id';

export const useReferralActor = () => {
  const { identity, isInitializing } = useSiweIdentity();
  const [actor, setActor] = useState<_SERVICE | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initActor = async () => {
      try {
        setLoading(true);

        const agent = new HttpAgent({
          host: process.env.DFX_NETWORK === 'ic' 
            ? 'https://ic0.app' 
            : 'http://localhost:4943',
          identity: identity || undefined,
        });

        // Fetch root key for local development
        if (process.env.DFX_NETWORK !== 'ic') {
          await agent.fetchRootKey().catch(err => {
            console.warn('Unable to fetch root key. Check if local replica is running.');
            console.error(err);
          });
        }

        const referralActor = Actor.createActor<_SERVICE>(idlFactory, {
          agent,
          canisterId: REFERRAL_CANISTER_ID,
        });

        setActor(referralActor);
      } catch (error) {
        console.error('Error initializing referral actor:', error);
        setActor(null);
      } finally {
        setLoading(false);
      }
    };

    if (!isInitializing) {
      initActor();
    }
  }, [identity, isInitializing]);

  return { actor, loading, isAuthenticated: !!identity };
};
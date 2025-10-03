import { useInternetIdentity } from './useInternetIdentity';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type backendInterface } from '../../../declarations/Profile2/index.js';
import { createActorWithConfig } from '../ic/config.js';

interface ExtendedBackendInterface extends backendInterface {
    initializeAccessControl: () => Promise<void>;
}

const ACTOR_QUERY_KEY = 'actor';
export function useActor() {
    const { identity } = useInternetIdentity();
    const queryClient = useQueryClient();
    const actorQuery = useQuery<backendInterface>({
        queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
        queryFn: async () => {
            const isAuthenticated = !!identity;

            if (!isAuthenticated) {
                // Return anonymous actor if not authenticated
                return await createActorWithConfig();
            }

            const actorOptions = {
                agentOptions: {
                    identity
                }
            };

            const actor = await createActorWithConfig(actorOptions);
            // Check if initializeAccessControl exists and call it (some backends may not have this method)
            if (
                'initializeAccessControl' in actor &&
                typeof (actor as ExtendedBackendInterface).initializeAccessControl === 'function'
            ) {
                await (actor as ExtendedBackendInterface).initializeAccessControl();
            }
            return actor;
        },
        // Only refetch when identity changes
        staleTime: Infinity,
        // This will cause the actor to be recreated when the identity changes
        enabled: true
    });

    // When the actor changes, invalidate dependent queries
    useEffect(() => {
        if (actorQuery.data) {
            queryClient.invalidateQueries({
                predicate: (query) => {
                    return !query.queryKey.includes(ACTOR_QUERY_KEY);
                }
            });
            queryClient.refetchQueries({
                predicate: (query) => {
                    return !query.queryKey.includes(ACTOR_QUERY_KEY);
                }
            });
        }
    }, [actorQuery.data, queryClient]);

    return {
        actor: actorQuery.data || null,
        isFetching: actorQuery.isFetching
    };
}

import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory as Profile2_idl, canisterId as Profile2_id } from "../../../declarations/Profile2/index.js";

const DEFAULT_STORAGE_GATEWAY_URL = "https://dev-blob.caffeine.ai";
const DEFAULT_BUCKET_NAME = "default-bucket";

interface JsonConfig {
  backend_host: string;
  backend_canister_id: string;
}

interface Config {
  backend_host?: string;
  backend_canister_id: string;
  storage_gateway_url: string;
  bucket_name: string;
}

let configCache: Config | null = null;

export async function loadConfig(): Promise<Config> {
  if (configCache) return configCache;

  try {
    const response = await fetch("./env.json");
    const config = (await response.json()) as JsonConfig;
    const fullConfig: Config = {
      backend_host: config.backend_host === "undefined" ? undefined : config.backend_host,
      backend_canister_id:
        config.backend_canister_id === "undefined" ? Profile2_id : config.backend_canister_id,
      storage_gateway_url: process.env.STORAGE_GATEWAY_URL ?? DEFAULT_STORAGE_GATEWAY_URL,
      bucket_name: DEFAULT_BUCKET_NAME,
    };
    configCache = fullConfig;
    return fullConfig;
  } catch {
    const fallbackConfig: Config = {
      backend_host: undefined,
      backend_canister_id: Profile2_id,
      storage_gateway_url: DEFAULT_STORAGE_GATEWAY_URL,
      bucket_name: DEFAULT_BUCKET_NAME,
    };
    return fallbackConfig;
  }
}

function extractAgentErrorMessage(error: string): string {
  const errorString = String(error);
  const match = errorString.match(/with message:\s*'([^']+)'/s);
  return match ? match[1] : errorString;
}

function processError(e: unknown): never {
  if (e && typeof e === "object" && "message" in e) {
    throw new Error(extractAgentErrorMessage((e as any).message));
  } else throw e;
}

export async function createActorWithConfig() {
  const config = await loadConfig();

  const agent = new HttpAgent({
    host: config.backend_host ?? "https://ic0.app",
  });

  // Optional: verify if running locally
  if (process.env.DFX_NETWORK === "local") {
    await agent.fetchRootKey();
  }

  const actor = Actor.createActor(Profile2_idl, {
    agent,
    canisterId: config.backend_canister_id,
  });

  return actor;
}

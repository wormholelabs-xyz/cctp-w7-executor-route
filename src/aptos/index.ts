import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-aptos";
import { AptosCCTPExecutor } from "./executor";

export * from "./executor";

let _registered = false;

/** Explicitly register Aptos CCTP executor protocol. Idempotent. */
export function register(): void {
  if (_registered) return;
  _registered = true;
  registerProtocol(_platform, "CCTPExecutor", AptosCCTPExecutor);
}

// Backward-compatible: auto-register on import
// TODO: remove this next time we are cool with a major version bump and are OK requiring integrators to make code changes
register();

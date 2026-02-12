import {
  registerProtocol,
  protocolIsRegistered,
} from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-aptos";
import { AptosCCTPExecutor } from "./executor";

export * from "./executor";

/** Explicitly register Aptos CCTP executor protocol. Idempotent. */
export function register(topLevel = false): void {
  if (topLevel) {
    console.warn(
      "@wormhole-labs/cctp-executor-route/aptos: auto-registration on import is deprecated. Import { register } and call it explicitly.",
    );
  }
  if (!protocolIsRegistered(_platform, "CCTPExecutor")) {
    registerProtocol(_platform, "CCTPExecutor", AptosCCTPExecutor);
  }
}

// Backward-compatible: auto-register on import
// TODO: remove this next time we are cool with a major version bump and are OK requiring integrators to make code changes
register(true);

import {
  registerProtocol,
  protocolIsRegistered,
} from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-sui";
import { SuiCCTPExecutor } from "./executor";

export * from "./executor";

/** Explicitly register Sui CCTP executor protocol. Idempotent. */
export function register(topLevel = false): void {
  if (topLevel) {
    console.warn(
      "@wormhole-labs/cctp-executor-route/sui: auto-registration on import is deprecated. Import { register } and call it explicitly.",
    );
  }
  if (!protocolIsRegistered(_platform, "CCTPExecutor")) {
    registerProtocol(_platform, "CCTPExecutor", SuiCCTPExecutor);
  }
}

// Backward-compatible: auto-register on import
// TODO: remove this next time we are cool with a major version bump and are OK requiring integrators to make code changes
register(true);

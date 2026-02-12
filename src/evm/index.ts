import {
  registerProtocol,
  protocolIsRegistered,
} from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-evm";
import { EvmCCTPExecutor } from "./executor";
import { EvmCCTPv2Executor } from "./executorV2";

export * from "./executor";
export * from "./executorV2";

/** Explicitly register EVM CCTP executor protocols. Idempotent. */
export function register(topLevel = false): void {
  if (topLevel) {
    console.warn(
      "@wormhole-labs/cctp-executor-route/evm: auto-registration on import is deprecated. Import { register } and call it explicitly.",
    );
  }
  if (!protocolIsRegistered(_platform, "CCTPExecutor")) {
    registerProtocol(_platform, "CCTPExecutor", EvmCCTPExecutor);
  }
  if (!protocolIsRegistered(_platform, "CCTPv2Executor")) {
    registerProtocol(_platform, "CCTPv2Executor", EvmCCTPv2Executor);
  }
}

// Backward-compatible: auto-register on import
// TODO: remove this next time we are cool with a major version bump and are OK requiring integrators to make code changes
register(true);

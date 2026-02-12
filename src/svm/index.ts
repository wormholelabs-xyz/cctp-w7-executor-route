import {
  registerProtocol,
  protocolIsRegistered,
} from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-solana";
import { SvmCCTPExecutor } from "./executor";
import { SvmCCTPv2Executor } from "./executorV2";

export * from "./executor";
export * from "./executorV2";

/** Explicitly register SVM CCTP executor protocols. Idempotent. */
export function register(topLevel = false): void {
  if (topLevel) {
    console.warn(
      "@wormhole-labs/cctp-executor-route/svm: auto-registration on import is deprecated. Import { register } and call it explicitly.",
    );
  }
  if (!protocolIsRegistered(_platform, "CCTPExecutor")) {
    registerProtocol(_platform, "CCTPExecutor", SvmCCTPExecutor);
  }
  if (!protocolIsRegistered(_platform, "CCTPv2Executor")) {
    registerProtocol(_platform, "CCTPv2Executor", SvmCCTPv2Executor);
  }
}

// Backward-compatible: auto-register on import
// TODO: remove this next time we are cool with a major version bump and are OK requiring integrators to make code changes
register(true);

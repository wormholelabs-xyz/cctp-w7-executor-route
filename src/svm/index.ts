import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-solana";
import { SvmCCTPExecutor } from "./executor";
import { SvmCCTPv2Executor } from "./executorV2";

export * from "./executor";
export * from "./executorV2";

let _registered = false;

/** Explicitly register SVM CCTP executor protocols. Idempotent. */
export function register(): void {
  if (_registered) return;
  _registered = true;
  registerProtocol(_platform, "CCTPExecutor", SvmCCTPExecutor);
  registerProtocol(_platform, "CCTPv2Executor", SvmCCTPv2Executor);
}

// Backward-compatible: auto-register on import
// TODO: remove this next time we are cool with a major version bump and are OK requiring integrators to make code changes
register();

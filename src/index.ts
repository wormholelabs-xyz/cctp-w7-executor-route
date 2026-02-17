// IMPORTANT: register the platform specific implementations of the protocol
import { register as registerAptos } from "./aptos/index.js";
import { register as registerEvm } from "./evm/index.js";
import { register as registerSui } from "./sui/index.js";
import { register as registerSvm } from "./svm/index.js";

/** Register all CCTP executor platform protocols. Idempotent. */
export function register(topLevel = false): void {
  if (topLevel) {
    console.warn(
      "@wormhole-labs/cctp-executor-route: auto-registration on import is deprecated. Import { register } and call it explicitly.",
    );
  }
  registerAptos();
  registerEvm();
  registerSui();
  registerSvm();
}

// Backward-compatible: auto-register on import
// TODO: remove this next time we are cool with a major version bump and are OK requiring integrators to make code changes
register(true);

export * from "./routes";

// IMPORTANT: register the platform specific implementations of the protocol
import { register as registerAptos } from "./aptos/index.js";
import { register as registerEvm } from "./evm/index.js";
import { register as registerSui } from "./sui/index.js";
import { register as registerSvm } from "./svm/index.js";

let _registered = false;

/** Register all CCTP executor platform protocols. Idempotent. */
export function register(): void {
  if (_registered) return;
  _registered = true;
  registerAptos();
  registerEvm();
  registerSui();
  registerSvm();
}

// Backward-compatible: auto-register on import
// TODO: remove this next time we are cool with a major version bump and are OK requiring integrators to make code changes
register();

export * from "./routes";

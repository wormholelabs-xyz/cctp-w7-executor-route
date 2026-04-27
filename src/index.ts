// IMPORTANT: register the platform specific implementations of the protocol
import { register as registerAptos } from "./aptos/index.js";
import { register as registerEvm } from "./evm/index.js";
import { register as registerSui } from "./sui/index.js";
import { register as registerSvm } from "./svm/index.js";

/** Register all CCTP executor platform protocols. Idempotent. */
export function register(): void {
  registerAptos();
  registerEvm();
  registerSui();
  registerSvm();
}

export * from "./routes";

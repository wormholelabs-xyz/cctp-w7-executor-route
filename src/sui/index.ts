import {
  registerProtocol,
  protocolIsRegistered,
} from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-sui";
import { SuiCCTPExecutor } from "./executor";

export * from "./executor";

/** Explicitly register Sui CCTP executor protocol. Idempotent. */
export function register(): void {
  if (!protocolIsRegistered(_platform, "CCTPExecutor")) {
    registerProtocol(_platform, "CCTPExecutor", SuiCCTPExecutor);
  }
}

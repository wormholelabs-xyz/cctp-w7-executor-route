import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-aptos";
import { AptosCCTPExecutor } from "./executor";

export * from "./executor";

registerProtocol(_platform, "CCTPExecutor", AptosCCTPExecutor);

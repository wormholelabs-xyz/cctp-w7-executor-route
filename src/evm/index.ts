import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-evm";
import { EvmCCTPExecutor } from "./executor";

export * from "./executor";

registerProtocol(_platform, "CCTPExecutor", EvmCCTPExecutor);

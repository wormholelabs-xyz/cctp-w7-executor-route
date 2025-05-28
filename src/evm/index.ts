import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-evm";
import { EvmCCTPExecutor } from "./executor";
import { EvmCCTPv2Executor } from "./executorV2";

export * from "./executor";
export * from "./executorV2";

registerProtocol(_platform, "CCTPExecutor", EvmCCTPExecutor);
registerProtocol(_platform, "CCTPv2Executor", EvmCCTPv2Executor);

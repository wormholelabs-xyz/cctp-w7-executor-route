import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-solana";
import { SvmCCTPExecutor } from "./executor";
import { SvmCCTPv2Executor } from "./executorV2";

export * from "./executor";
export * from "./executorV2";

registerProtocol(_platform, "CCTPExecutor", SvmCCTPExecutor);
registerProtocol(_platform, "CCTPv2Executor", SvmCCTPv2Executor);

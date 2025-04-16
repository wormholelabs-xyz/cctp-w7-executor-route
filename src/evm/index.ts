import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-evm";
import { EvmCCTPW7Executor } from "./executor";
import "@wormhole-foundation/sdk-evm-cctp";

export * from "./executor";

registerProtocol(_platform, "CCTPW7Executor", EvmCCTPW7Executor);

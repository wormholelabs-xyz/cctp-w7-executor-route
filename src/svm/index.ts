import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-solana";
import { SvmCCTPW7Executor } from "./executor";

export * from "./executor";

registerProtocol(_platform, "CCTPW7Executor", SvmCCTPW7Executor);

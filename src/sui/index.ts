import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-sui";
import { SuiCCTPW7Executor } from "./executor";

export * from "./executor";

registerProtocol(_platform, "CCTPW7Executor", SuiCCTPW7Executor);

import { registerProtocol } from "@wormhole-foundation/sdk-definitions";
import { _platform } from "@wormhole-foundation/sdk-aptos";
import { AptosCCTPW7Executor } from "./executor";

export * from "./executor";

registerProtocol(_platform, "CCTPW7Executor", AptosCCTPW7Executor);

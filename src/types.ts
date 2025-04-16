import {
  Chain,
  AccountAddress,
  ChainAddress,
  UnsignedTransaction,
  Network,
} from "@wormhole-foundation/sdk-connect";

export interface CCTPW7Executor<
  N extends Network = Network,
  C extends Chain = Chain
> {
  transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    amount: bigint,
    signedQuote: Uint8Array,
    relayInstructions: Uint8Array,
    estimatedCost: bigint
  ): AsyncGenerator<UnsignedTransaction<N, C>>;
}

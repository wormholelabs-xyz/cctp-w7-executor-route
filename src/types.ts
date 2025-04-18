import {
  Chain,
  AccountAddress,
  ChainAddress,
  UnsignedTransaction,
  Network,
} from "@wormhole-foundation/sdk-connect";
import { QuoteDetails } from ".";

export interface CCTPW7Executor<
  N extends Network = Network,
  C extends Chain = Chain
> {
  transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    amount: bigint,
    details: QuoteDetails
  ): AsyncGenerator<UnsignedTransaction<N, C>>;
}

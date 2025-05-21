import {
  Chain,
  AccountAddress,
  ChainAddress,
  UnsignedTransaction,
  Network,
} from "@wormhole-foundation/sdk-connect";
import { CCTPv2QuoteDetails, QuoteDetails } from ".";
import { CircleV2Message } from "./layouts";

// CCTPv1
export interface CCTPExecutor<
  N extends Network = Network,
  C extends Chain = Chain
> {
  transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    details: QuoteDetails
  ): AsyncGenerator<UnsignedTransaction<N, C>>;
}

// CCTPv2
export interface CCTPv2Executor<
  N extends Network = Network,
  C extends Chain = Chain
> {
  transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    details: CCTPv2QuoteDetails
  ): AsyncGenerator<UnsignedTransaction<N, C>>;

  isTransferCompleted(message: CircleV2Message): Promise<boolean>;

  redeem(
    sender: AccountAddress<C>,
    message: CircleV2Message,
    attestation: string
  ): AsyncGenerator<UnsignedTransaction<N, C>>;
}

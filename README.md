# CCTP W7 Executor Route

# Transfer Example

This project includes an example script for testing a USDC token transfer between chains using the CCTPv1 Executor route. You can change the source and destination chains in the `examples/transfer.ts` file.

## Prerequisites

First, install dependencies and build the project:

```bash
npm ci && npm run build
```

## Configure Environment Variables

Set your private keys as environment variables:

```bash
export ETH_PRIVATE_KEY=<your_ethereum_private_key>
export SOLANA_PRIVATE_KEY=<your_solana_private_key>
```

## Run the Example

To fetch a quote for the transfer:

```bash
npm run examples:test
```

To actually send the transfer, set an additional environment variable:

```bash
SEND_TRANSFER=true npm run examples:test
```

> ⚠️ **Note:**
>
> - This example currently supports **EVM** and **Solana** chains only.
> - **Gas drop-off is not supported.**
> - Referrer fee and contract definitions are set to **1 BPS** in `src/consts`.

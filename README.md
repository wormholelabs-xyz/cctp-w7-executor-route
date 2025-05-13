# CCTP Executor Route

## Transfer Example

This project includes a script for testing a USDC token transfer using the CCTPv1 Executor route with a referrer fee. You can change the source and destination chains in the `examples/transfer.ts` file.

### Prerequisites

First, install dependencies and build the project:

```bash
npm ci && npm run build
```

### Configure Environment Variables

Set your private keys as environment variables:

```bash
export EVM_PRIVATE_KEY=<your_evm_private_key>
export SVM_PRIVATE_KEY=<your_svm_private_key>
export SUI_PRIVATE_KEY=<your_sui_private_key>
export APTOS_PRIVATE_KEY=<your_aptos_private_key>
```

### Run the Example

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
> - All relevant contract addresses and constants are defined in `src/consts`.

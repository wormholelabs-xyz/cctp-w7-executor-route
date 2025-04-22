# CCTP W7 Executor Route

## Releasing

To release this package, follow these steps:

1. **Create a New GitHub Release**
   - Tag the release with an appropriate [semantic version](https://semver.org/) (e.g., `0.1.0`, `1.0.0-beta`, etc.).
   - This will trigger the GitHub Actions workflow responsible for building and packing the package.

2. **GitHub Workflow**
   - The workflow will:
     - Build the package.
     - Create a tarball (`.tgz`).
     - Upload the resulting artifact to the assets section of the GitHub Release page.

3. **Installation**
   - The packed package can be installed in **Connect** or **Portal**.

4. **Usage**
   - Once installed, import the route using:

     ```ts
     import { CCTPW7ExecutorRoute } from "@wormhole-labs/cctp-w7-executor-route";
     ```

---

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
> - Referrer fee is set to **1 basis point** in `src/consts`.

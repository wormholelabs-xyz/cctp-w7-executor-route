# CCTP Executor Route

## Transfer Example

This project includes a script for testing a USDC token transfer using the CCTPv1 or CCTPv2 Executor routes with a referrer fee. You can change the source and destination chains in the `examples/transfer.ts` file.

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

⚠ This software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License. Or plainly spoken - this is a very complex piece of software which targets a bleeding-edge, experimental smart contract runtime. Mistakes happen, and no matter how hard you try and whether you pay someone to audit it, it may eat your tokens, set your printer on fire or startle your cat. Cryptocurrencies are a high-risk investment, no matter how fancy.

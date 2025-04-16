import { DeriveType, Layout } from "binary-layout";
// import { isAddressEqual, isHex, keccak256, recoverAddress } from "viem";
// import { sign } from "viem/accounts";

import { dateConversion } from "./conversions.js";

function normalize(amount: bigint, from: number, to: number) {
  if (from > to) {
    return amount / 10n ** BigInt(from - to);
  } else if (from < to) {
    return amount * 10n ** BigInt(to - from);
  }
  return amount;
}

function mul(a: bigint, b: bigint, decimals: number) {
  return (a * b) / 10n ** BigInt(decimals);
}
function div(a: bigint, b: bigint, decimals: number) {
  return (a * 10n ** BigInt(decimals)) / b;
}

export const quoteLayout = [
  {
    name: "quote",
    binary: "switch",
    idSize: 4,
    idTag: "prefix",
    layouts: [
      [
        [0x45513031, "EQ01"],
        [
          {
            name: "quoterAddress",
            binary: "bytes",
            size: 20,
            // custom: hexConversion,
          },
          {
            name: "payeeAddress",
            binary: "bytes",
            size: 32,
            // custom: hexConversion,
          },
          { name: "srcChain", binary: "uint", size: 2 },
          { name: "dstChain", binary: "uint", size: 2 },
          {
            name: "expiryTime",
            binary: "uint",
            size: 8,
            custom: dateConversion,
          },
          { name: "baseFee", binary: "uint", size: 8 },
          { name: "dstGasPrice", binary: "uint", size: 8 },
          { name: "srcPrice", binary: "uint", size: 8 },
          { name: "dstPrice", binary: "uint", size: 8 },
        ],
      ],
    ],
  },
] as const satisfies Layout;

export type Quote = DeriveType<typeof quoteLayout>;

export const signedQuoteLayout = [
  ...quoteLayout,
  //   { name: "signature", binary: "bytes", size: 65, custom: hexConversion },
  { name: "signature", binary: "bytes", size: 65 },
] as const satisfies Layout;

export type SignedQuote = DeriveType<typeof signedQuoteLayout>;

export const SIGNED_QUOTE_DECIMALS = 10;
export const MAX_U64 = 18446744073709551615n;

//// TODO: consider an EIP standard for signing
//export async function signQuote(quote: Quote, privateKey: `0x${string}`) {
//  const serialized = serialize(quoteLayout, quote);
//  const signature = await sign({
//    hash: keccak256(serialized),
//    privateKey,
//    to: "hex",
//  });
//  return concat([fromBytes(serialized, "hex"), signature]);
//}

//export async function verifySignedQuote(
//  signedQuote: SignedQuote,
//  allowedQuoterAddresses: `0x${string}`[],
//): Promise<void> {
//  if (
//    !allowedQuoterAddresses.find((allowed) =>
//      isAddressEqual(allowed, signedQuote.quote.quoterAddress),
//    )
//  ) {
//    throw new Error(
//      `Bad quoterAddress. Expected one of: ${allowedQuoterAddresses}, Received: ${signedQuote.quote.quoterAddress}`,
//    );
//  }
//  if (!isHex(signedQuote.signature)) {
//    throw new Error(`Bad signature`);
//  }
//  const recoveredPublicKey = await recoverAddress({
//    hash: keccak256(serialize(quoteLayout, signedQuote)),
//    signature: signedQuote.signature,
//  });
//  if (!isAddressEqual(recoveredPublicKey, signedQuote.quote.quoterAddress)) {
//    throw new Error(
//      `Bad quote signature recovery. Expected: ${signedQuote.quote.quoterAddress}, Received: ${recoveredPublicKey}`,
//    );
//  }
//}

export function estimateQuote(
  { quote }: Quote,
  gasLimit: bigint,
  msgValue: bigint,
  dstGasPriceDecimals: number,
  srcTokenDecimals: number,
  dstNativeDecimals: number
): bigint {
  const r = 18; // decimal resolution

  const srcChainValueForBaseFee = normalize(
    quote.baseFee,
    SIGNED_QUOTE_DECIMALS,
    srcTokenDecimals
  );

  const nSrcPrice = normalize(quote.srcPrice, SIGNED_QUOTE_DECIMALS, r);
  const nDstPrice = normalize(quote.dstPrice, SIGNED_QUOTE_DECIMALS, r);
  const scaledConversion = div(nDstPrice, nSrcPrice, r);

  const nGasLimitCost = normalize(
    gasLimit * quote.dstGasPrice,
    dstGasPriceDecimals,
    r
  );

  const srcChainValueForGasLimit = normalize(
    mul(nGasLimitCost, scaledConversion, r),
    r,
    srcTokenDecimals
  );

  const nMsgValue = normalize(msgValue, dstNativeDecimals, r);
  const srcChainValueForMsgValue = normalize(
    mul(nMsgValue, scaledConversion, r),
    r,
    srcTokenDecimals
  );
  return (
    srcChainValueForBaseFee +
    srcChainValueForGasLimit +
    srcChainValueForMsgValue
  );
}

import { DeriveType, Layout } from "binary-layout";

export enum RequestPrefix {
  ERM1 = "ERM1", // MM
  ERV1 = "ERV1", // VAA_V1
  ERN1 = "ERN1", // NTT_V1
  ERC1 = "ERC1", // CCTP_V1
}

export const cctpV1RequestLayout = [
  { name: "sourceDomain", binary: "uint", size: 4 },
  { name: "nonce", binary: "uint", size: 8 },
] as const satisfies Layout;

export type CCTPv1Request = DeriveType<typeof cctpV1RequestLayout>;

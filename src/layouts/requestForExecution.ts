import { DeriveType, Layout } from "binary-layout";

export enum RequestPrefix {
  ERM1 = "ERM1", // MM
  ERV1 = "ERV1", // VAA_V1
  ERN1 = "ERN1", // NTT_V1
  ERC1 = "ERC1", // CCTP_V1
  ERC2 = "ERC2", // CCTP_V2
}

export const cctpV1RequestLayout = [
  { name: "sourceDomain", binary: "uint", size: 4 },
  { name: "nonce", binary: "uint", size: 8 },
] as const satisfies Layout;

export type CCTPv1Request = DeriveType<typeof cctpV1RequestLayout>;

// TODO: where is this used?
export const cctpV2RequestLayout = [
  {
    name: "cctpV2Request",
    binary: "switch",
    idSize: 1,
    idTag: "cctpV2RequestPrefix",
    layouts: [[[0x01, "auto"], []]],
  },
] as const satisfies Layout;

export type CCTPv2Request = DeriveType<typeof cctpV2RequestLayout>;

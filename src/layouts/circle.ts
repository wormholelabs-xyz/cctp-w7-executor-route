import {
  deserializeLayout,
  LayoutToType,
  serializeLayout,
  type Layout,
} from "@wormhole-foundation/sdk-base";
import { layoutItems } from "@wormhole-foundation/sdk-definitions";

const { amountItem, circleDomainItem, universalAddressItem } = layoutItems;

const messageVersionItem = {
  binary: "uint",
  size: 4,
  custom: 1,
  omit: false,
} as const;

const circleV2NonceItem = {
  binary: "bytes",
  size: 32,
} as const satisfies Layout;

const finalityThresholdItem = {
  binary: "uint",
  size: 4,
} as const satisfies Layout;

const circleBurnMessageV2Layout = [
  { name: "version", ...messageVersionItem },
  { name: "burnToken", ...universalAddressItem },
  { name: "mintRecipient", ...universalAddressItem },
  { name: "amount", ...amountItem },
  { name: "messageSender", ...universalAddressItem },
  { name: "maxFee", ...amountItem },
  { name: "feeExecuted", ...amountItem },
  { name: "expirationBlock", ...amountItem }, // TODO: handle this?
  { name: "hookData", binary: "bytes" },
] as const satisfies Layout;

export type CircleBurnMessageV2 = LayoutToType<
  typeof circleBurnMessageV2Layout
>;

export const circleMessageV2Layout = [
  { name: "version", ...messageVersionItem },
  { name: "sourceDomain", ...circleDomainItem },
  { name: "destinationDomain", ...circleDomainItem },
  { name: "nonce", ...circleV2NonceItem },
  { name: "sender", ...universalAddressItem },
  { name: "recipient", ...universalAddressItem },
  { name: "destinationCaller", ...universalAddressItem },
  { name: "minFinalityThreshold", ...finalityThresholdItem },
  { name: "finalityThresholdExecuted", ...finalityThresholdItem },
  { name: "messageBody", binary: "bytes", layout: circleBurnMessageV2Layout },
] as const satisfies Layout;

export type CircleV2Message = LayoutToType<typeof circleMessageV2Layout>;

export const deserializeCircleV2Message = (msg: Uint8Array): CircleV2Message =>
  deserializeLayout(circleMessageV2Layout, msg);

export const serializeCircleV2Message = (msg: CircleV2Message): Uint8Array =>
  serializeLayout(circleMessageV2Layout, msg);

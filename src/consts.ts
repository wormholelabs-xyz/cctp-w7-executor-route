import {
  Chain,
  constMap,
  MapLevel,
  Network,
} from "@wormhole-foundation/sdk-connect";

const shimContract = [
  [
    "Testnet",
    [
      ["Sepolia", "0x57861330Ff78dB78E95dD792306E52286C444302"],
      ["BaseSepolia", "0xC280F102d2D7EC1390A456700F3471a883059F42"],
      ["Avalanche", "0x5C91b5dcd7DCd6a04cc2290e0420A8644402C7CC"],
    ],
  ],
] as const satisfies MapLevel<Network, MapLevel<Chain, string>>;

export const shimContracts = constMap(shimContract);

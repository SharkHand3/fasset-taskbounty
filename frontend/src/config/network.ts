import { defineChain } from "viem";

export const COSTON2_RPC_URL =
  process.env.NEXT_PUBLIC_COSTON2_RPC_URL ??
  "https://coston2-api.flare.network/ext/C/rpc";

export const coston2 = defineChain({
  id: 114,
  name: "Flare Testnet Coston2",
  nativeCurrency: {
    decimals: 18,
    name: "Coston2 Flare",
    symbol: "C2FLR",
  },
  rpcUrls: {
    default: {
      http: [COSTON2_RPC_URL],
      webSocket: ["wss://coston2-api.flare.network/ext/C/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
  testnet: true,
});

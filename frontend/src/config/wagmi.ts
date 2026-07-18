import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { COSTON2_RPC_URL, coston2 } from "@/config/network";

export const wagmiConfig = createConfig({
  chains: [coston2],
  connectors: [injected({ shimDisconnect: true })],
  ssr: true,
  transports: {
    [coston2.id]: http(COSTON2_RPC_URL, {
      retryCount: 2,
      timeout: 15_000,
    }),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

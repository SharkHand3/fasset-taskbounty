import { createPublicClient, http } from "viem";

import { COSTON2_RPC_URL, coston2 } from "@/config/network";

export const publicClient = createPublicClient({
  chain: coston2,
  transport: http(COSTON2_RPC_URL, {
    retryCount: 2,
    timeout: 15_000,
  }),
});
